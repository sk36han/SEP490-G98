using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service
{
    public class StocktakeExecutionService : IStocktakeExecutionService
    {
        private readonly Mkiwms5Context _context;
        private readonly IStocktakeService _stocktakeService;

        public StocktakeExecutionService(Mkiwms5Context context, IStocktakeService stocktakeService)
        {
            _context = context;
            _stocktakeService = stocktakeService;
        }

        public async Task<StocktakeDetailResponse> StartStocktakeExecutionAsync(long stocktakeId, long currentUserId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Tìm phiếu kiểm kê
                var session = await _context.StocktakeSessions
                    .Include(s => s.Warehouse)
                    .Include(s => s.CreatedByNavigation)
                    .FirstOrDefaultAsync(s => s.StocktakeId == stocktakeId);

                if (session == null)
                    throw new KeyNotFoundException($"Không tìm thấy phiếu kiểm kê ID = {stocktakeId}.");

                // Đã chuyển check từ DRAFT sang APPROVED theo requirement mới
                if (session.Status != "APPROVED")
                    throw new InvalidOperationException("Chỉ có thể bắt đầu kiểm kê từ kế hoạch đã được duyệt (APPROVED).");

                // 2. Lấy dữ liệu tồn kho hiện tại (InventoryOnHand)
                var inventory = await _context.InventoryOnHands
                    .Where(i => i.WarehouseId == session.WarehouseId)
                    .ToListAsync();

                if (inventory.Count == 0)
                    throw new InvalidOperationException("Kho này hiện không có sản phẩm nào có tồn kho để kiểm kê.");

                // 3. Xóa Lines cũ nếu đã tồn tại (tránh vi phạm UNIQUE constraint UQ_STL)
                // Có thể xảy ra nếu StartExecution được gọi lại sau lần trước thất bại
                var existingLines = await _context.StocktakeLines
                    .Where(l => l.StocktakeId == stocktakeId)
                    .ToListAsync();
                if (existingLines.Any())
                    _context.StocktakeLines.RemoveRange(existingLines);

                // 4. Sinh StocktakeLines mới (Snapshot thời điểm hiện tại)
                var lines = inventory.Select(inv => new StocktakeLine
                {
                    StocktakeId = session.StocktakeId,
                    ItemId = inv.ItemId,
                    SystemQtySnapshot = inv.OnHandQty,
                    CountedQty = null,
                    VarianceQty = null,
                    Note = null
                }).ToList();

                _context.StocktakeLines.AddRange(lines);

                // 4. Cập nhật trạng thái Session
                session.Status = "IN_PROGRESS";
                session.StartedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // 5. Ghi Audit Log
                await _context.AuditLogs.AddAsync(new AuditLog
                {
                    ActorUserId = currentUserId,
                    Action = "START_STOCKTAKE_EXECUTION",
                    EntityType = "StocktakeSession",
                    EntityId = session.StocktakeId,
                    Detail = $"Bắt đầu thực thi kiểm kê kho '{session.Warehouse.WarehouseName}' (Mã phiếu: {session.StocktakeCode}). Snapshot {lines.Count} mặt hàng.",
                    CreatedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();

                // 6. Trả về kết quả mới nhất
                return await _stocktakeService.GetStocktakeDetailAsync(session.StocktakeId) 
                       ?? throw new Exception("Lỗi sau khi lưu dữ liệu.");
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<PagedResponse<StocktakeLineResponse>> GetStocktakeLinesAsync(long stocktakeId, StocktakeLineFilterRequest request)
        {
            return await _stocktakeService.GetStocktakeLinesAsync(stocktakeId, request);
        }

        public async Task<StocktakeLineResponse> UpdateActualCountedQtyAsync(long lineId, UpdateCountedQtyRequest request)
        {
            return await _stocktakeService.UpdateCountedQtyAsync(lineId, request);
        }

        public async Task<StocktakeDetailResponse> BulkMatchSystemQtyAsync(long stocktakeId, long currentUserId)
        {
            return await _stocktakeService.BulkMatchSystemQtyAsync(stocktakeId, currentUserId);
        }

        public async Task<StocktakeDetailResponse> SubmitStocktakeResultsAsync(long stocktakeId, long currentUserId)
        {
            return await _stocktakeService.SubmitStocktakeAsync(stocktakeId, currentUserId);
        }

        public async Task<List<AdjustmentPreviewResponse>> GetAdjustmentPreviewAsync(long stocktakeId)
        {
            return await _stocktakeService.GetAdjustmentPreviewAsync(stocktakeId);
        }

        public async Task<StocktakeDetailResponse> ApproveAndFinalizeResultsAsync(long stocktakeId, StocktakeApprovalRequest request, long currentUserId)
        {
            // Thực hiện Duyệt kết quả đếm (từ PENDING_APPROVAL chờ sếp duyệt -> sang COMPLETED)
            // Khác với StocktakePlan, đây là duyệt số liệu thực thi, khi duyệt nếu khác biệt -> sinh Adjustment -> COMPLETED
            
            var session = await _context.StocktakeSessions
                .Include(s => s.StocktakeLines)
                .Include(s => s.Warehouse)
                .FirstOrDefaultAsync(s => s.StocktakeId == stocktakeId);

            if (session == null)
                throw new KeyNotFoundException($"Không tìm thấy phiếu kiểm kê ID = {stocktakeId}");

            if (session.Status != "PENDING_APPROVAL")
                throw new InvalidOperationException("Chỉ có thể chốt số liệu khi kết quả đang chờ duyệt (PENDING_APPROVAL).");

            var discrepancyLines = session.StocktakeLines.Where(l => l.VarianceQty != 0).ToList();

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    // 1. Ghi log phê duyệt kết quả thực thi
                    var approval = new DocumentApproval
                    {
                        DocType = "STOCKTAKE",
                        DocId = stocktakeId,
                        StageNo = 1,
                        Decision = request.Decision,
                        Reason = request.Reason,
                        ActionBy = currentUserId,
                        ActionAt = DateTime.UtcNow
                    };
                    await _context.DocumentApprovals.AddAsync(approval);

                    // Nếu đồng ý duyệt luôn và chốt (Approve)
                    if (request.Decision == "APPROVE")
                    {
                        // 2. Tự động sinh Adjustment Request nếu có lệch
                        if (discrepancyLines.Any())
                        {
                            var year = DateTime.UtcNow.Year;
                            var adjCount = await _context.InventoryAdjustmentRequests
                                .CountAsync(a => a.AdjustmentCode.StartsWith($"ADJ-{year}-"));
                            var adjCode = $"ADJ-{year}-{(adjCount + 1):D4}";

                            var adjRequest = new InventoryAdjustmentRequest
                            {
                                AdjustmentCode = adjCode,
                                StocktakeId = stocktakeId,
                                WarehouseId = session.WarehouseId,
                                SubmittedBy = currentUserId,
                                Status = "POSTED",
                                Reason = $"Điều chỉnh tự động từ phiếu kiểm đếm {session.StocktakeCode}",
                                SubmittedAt = DateTime.UtcNow,
                                ApprovedAt = DateTime.UtcNow,
                                PostedAt = DateTime.UtcNow
                            };
                            await _context.InventoryAdjustmentRequests.AddAsync(adjRequest);
                            await _context.SaveChangesAsync();

                            foreach (var line in discrepancyLines)
                            {
                                var adjLine = new InventoryAdjustmentLine
                                {
                                    AdjustmentId = adjRequest.AdjustmentId,
                                    ItemId = line.ItemId,
                                    SystemQty = line.SystemQtySnapshot,
                                    CountedQty = line.CountedQty ?? 0,
                                    QtyChange = line.VarianceQty,
                                    Note = line.Note
                                };
                                await _context.InventoryAdjustmentLines.AddAsync(adjLine);

                                var onHand = await _context.InventoryOnHands
                                    .FirstOrDefaultAsync(oh => oh.WarehouseId == session.WarehouseId && oh.ItemId == line.ItemId);

                                if (onHand != null)
                                {
                                    onHand.OnHandQty += (line.VarianceQty ?? 0);
                                    onHand.UpdatedAt = DateTime.UtcNow;
                                }
                            }
                        }

                        // 3. Chốt kết quả => COMPLETED (mở khóa kho)
                        session.Status = "COMPLETED";
                        session.EndedAt = DateTime.UtcNow;

                        // Ghi Audit Log "COMPLETED"
                        await _context.AuditLogs.AddAsync(new AuditLog
                        {
                            ActorUserId = currentUserId,
                            Action = "APPROVE_AND_FINALIZE_STOCKTAKE",
                            EntityType = "StocktakeSession",
                            EntityId = stocktakeId,
                            Detail = $"Chốt kiểm đếm phiếu {session.StocktakeCode}. " + (discrepancyLines.Any() ? "Đã điều chỉnh tự động." : "Số liệu khớp 100%."),
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                    else if (request.Decision == "RECOUNT")
                    {
                        // Nếu cấp trên yêu cầu đếm lại
                        session.Status = "IN_PROGRESS";
                    }
                    else if (request.Decision == "REJECT")
                    {
                         session.Status = "CANCELLED";
                         session.EndedAt = DateTime.UtcNow;
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }

            return await _stocktakeService.GetStocktakeDetailAsync(stocktakeId) ?? throw new Exception("Lỗi sau khi xử lý chốt.");
        }

        public async Task<StocktakeDetailResponse> CancelStocktakeAsync(long stocktakeId, string reason, long currentUserId)
        {
             var session = await _context.StocktakeSessions
                .Include(s => s.Warehouse)
                .FirstOrDefaultAsync(s => s.StocktakeId == stocktakeId);

            if (session == null)
                throw new KeyNotFoundException("Không tìm thấy phiếu kiểm kê.");

            // Huỷ phiếu đang đếm hoặc đang chờ chốt (IN_PROGRESS, PENDING_APPROVAL) để giải phóng kho
            if (session.Status == "COMPLETED" || session.Status == "CANCELLED" || session.Status == "DRAFT" || session.Status == "APPROVED")
                throw new InvalidOperationException($"Không thể hủy phiếu kiểm kê thực thi đang ở trạng thái '{session.Status}'.");

            session.Status = "CANCELLED";
            session.EndedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _context.AuditLogs.AddAsync(new AuditLog
            {
                ActorUserId = currentUserId,
                Action = "CANCEL_STOCKTAKE_EXECUTION",
                EntityType = "StocktakeSession",
                EntityId = stocktakeId,
                Detail = $"Hủy quá trình thực thi kiểm kê {session.StocktakeCode}. Lý do: {reason}",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return await _stocktakeService.GetStocktakeDetailAsync(stocktakeId) ?? throw new Exception("Lỗi khi lấy thông tin sau hủy.");
        }

        public async Task<List<StocktakeApprovalHistoryResponse>> GetApprovalHistoryAsync(long stocktakeId)
        {
            return await _stocktakeService.GetApprovalHistoryAsync(stocktakeId);
        }

        public async Task<PagedResponse<StocktakeSummaryResponse>> ListAllCompletedStocktakesAsync(StocktakeListRequest request)
        {
            if (string.IsNullOrEmpty(request.Status)) {
                request.Status = "COMPLETED";
            }
            return await _stocktakeService.GetStocktakesAsync(request);
        }

        public async Task<StocktakeSheetResponse> GetStocktakeSheetDataAsync(long stocktakeId)
        {
            var detail = await _stocktakeService.GetStocktakeDetailAsync(stocktakeId);
            if (detail == null)
                throw new KeyNotFoundException($"Không tìm thấy phiếu kiểm kê ID = {stocktakeId}");

            var lines = await _context.StocktakeLines
                .Include(l => l.Item)
                    .ThenInclude(i => i.BaseUom)
                .Where(l => l.StocktakeId == stocktakeId)
                .OrderBy(l => l.Item.ItemCode)
                .Select(l => new StocktakeLineResponse
                {
                    StocktakeLineId = l.StocktakeLineId,
                    ItemId = l.ItemId,
                    ItemCode = l.Item.ItemCode,
                    ItemName = l.Item.ItemName,
                    UomName = l.Item.BaseUom.UomName,
                    SystemQtySnapshot = l.SystemQtySnapshot,
                    CountedQty = l.CountedQty,
                    VarianceQty = l.VarianceQty,
                    Note = l.Note
                })
                .ToListAsync();

            return new StocktakeSheetResponse
            {
                Header = detail,
                Lines = lines
            };
        }
    }
}
