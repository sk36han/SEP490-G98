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
    public class StocktakeService : IStocktakeService
    {
        private readonly Mkiwms5Context _context;

        private static readonly string[] AllowedStatuses = { "DRAFT", "PROCESSING", "COMPLETED", "CANCELLED" };
        private static readonly string[] AllowedModes = { "FULL", "PARTIAL" };

        public StocktakeService(Mkiwms5Context context)
        {
            _context = context;
        }

        // ─────────────────────────────────────────────────────────────
        // 1. LIST / SEARCH  (with filters + progress fields + paging)
        // ─────────────────────────────────────────────────────────────
        public async Task<PagedResponse<StocktakeSummaryResponse>> GetStocktakesAsync(StocktakeListRequest request)
        {
            // ── Validate Status & Mode (business-layer guard, dù DTO đã có Regex) ──
            if (!string.IsNullOrWhiteSpace(request.Status) &&
                !AllowedStatuses.Contains(request.Status.ToUpper()))
            {
                throw new ArgumentException(
                    $"Status không hợp lệ. Chỉ chấp nhận: {string.Join(", ", AllowedStatuses)}.");
            }

            if (!string.IsNullOrWhiteSpace(request.Mode) &&
                !AllowedModes.Contains(request.Mode.ToUpper()))
            {
                throw new ArgumentException(
                    $"Mode không hợp lệ. Chỉ chấp nhận: {string.Join(", ", AllowedModes)}.");
            }

            // ── Validate date ranges ──
            if (request.PlannedFrom.HasValue && request.PlannedTo.HasValue &&
                request.PlannedFrom > request.PlannedTo)
            {
                throw new ArgumentException("PlannedFrom không được lớn hơn PlannedTo.");
            }
            if (request.StartedFrom.HasValue && request.StartedTo.HasValue &&
                request.StartedFrom > request.StartedTo)
            {
                throw new ArgumentException("StartedFrom không được lớn hơn StartedTo.");
            }
            if (request.EndedFrom.HasValue && request.EndedTo.HasValue &&
                request.EndedFrom > request.EndedTo)
            {
                throw new ArgumentException("EndedFrom không được lớn hơn EndedTo.");
            }

            // ── Build query ──
            var query = _context.StocktakeSessions
                .Include(s => s.Warehouse)
                .Include(s => s.CreatedByNavigation)
                .Include(s => s.StocktakeLines)
                .AsNoTracking()
                .AsQueryable();

            // ── FILTER: StocktakeCode (contains, case-insensitive) ──
            if (!string.IsNullOrWhiteSpace(request.StocktakeCode))
            {
                var code = request.StocktakeCode.Trim();
                query = query.Where(s => s.StocktakeCode.Contains(code));
            }

            // ── FILTER: WarehouseName (contains, case-insensitive) ──
            if (!string.IsNullOrWhiteSpace(request.WarehouseName))
            {
                var wName = request.WarehouseName.Trim();
                query = query.Where(s => s.Warehouse.WarehouseName.Contains(wName));
            }

            // ── FILTER: Status (exact, case-insensitive) ──
            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                var status = request.Status.ToUpper();
                query = query.Where(s => s.Status.ToUpper() == status);
            }

            // ── FILTER: Mode (exact, case-insensitive) ──
            if (!string.IsNullOrWhiteSpace(request.Mode))
            {
                var mode = request.Mode.ToUpper();
                query = query.Where(s => s.Mode.ToUpper() == mode);
            }

            // ── FILTER: CreatedByName (contains, case-insensitive) ──
            if (!string.IsNullOrWhiteSpace(request.CreatedByName))
            {
                var cName = request.CreatedByName.Trim();
                query = query.Where(s => s.CreatedByNavigation.FullName.Contains(cName));
            }

            // ── FILTER: PlannedAt range ──
            if (request.PlannedFrom.HasValue)
                query = query.Where(s => s.PlannedAt >= request.PlannedFrom.Value);
            if (request.PlannedTo.HasValue)
                query = query.Where(s => s.PlannedAt <= request.PlannedTo.Value.Date.AddDays(1).AddSeconds(-1));

            // ── FILTER: StartedAt range ──
            if (request.StartedFrom.HasValue)
                query = query.Where(s => s.StartedAt >= request.StartedFrom.Value);
            if (request.StartedTo.HasValue)
                query = query.Where(s => s.StartedAt <= request.StartedTo.Value.Date.AddDays(1).AddSeconds(-1));

            // ── FILTER: EndedAt range ──
            if (request.EndedFrom.HasValue)
                query = query.Where(s => s.EndedAt >= request.EndedFrom.Value);
            if (request.EndedTo.HasValue)
                query = query.Where(s => s.EndedAt <= request.EndedTo.Value.Date.AddDays(1).AddSeconds(-1));

            // ── Count total (before paging) ──
            var totalItems = await query.CountAsync();

            // ── Paging + Projection ──
            var items = await query
                .OrderByDescending(s => s.PlannedAt ?? s.StartedAt ?? DateTime.MinValue)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(s => new StocktakeSummaryResponse
                {
                    StocktakeId      = s.StocktakeId,
                    StocktakeCode    = s.StocktakeCode,
                    WarehouseId      = s.WarehouseId,
                    WarehouseName    = s.Warehouse.WarehouseName,
                    Status           = s.Status,
                    Mode             = s.Mode,
                    PlannedAt        = s.PlannedAt,
                    StartedAt        = s.StartedAt,
                    EndedAt          = s.EndedAt,
                    CreatedBy        = s.CreatedBy,
                    CreatedByName    = s.CreatedByNavigation.FullName,
                    Note             = s.Note,
                    // ── Progress fields (calculated) ──
                    TotalLines       = s.StocktakeLines.Count,
                    CountedLines     = s.StocktakeLines.Count(l => l.CountedQty != null),
                    VarianceLines    = s.StocktakeLines.Count(l => l.VarianceQty != null && l.VarianceQty != 0),
                    ProgressPercent  = s.StocktakeLines.Count == 0
                        ? 0
                        : Math.Round(
                            (decimal)s.StocktakeLines.Count(l => l.CountedQty != null)
                            / s.StocktakeLines.Count * 100, 1)
                })
                .ToListAsync();

            return new PagedResponse<StocktakeSummaryResponse>
            {
                Page       = request.Page,
                PageSize   = request.PageSize,
                TotalItems = totalItems,
                Items      = items
            };
        }

        // ─────────────────────────────────────────────────────────────
        // 2. DETAIL HEADER (by ID)
        // ─────────────────────────────────────────────────────────────
        public async Task<StocktakeDetailResponse?> GetStocktakeDetailAsync(long stocktakeId)
        {
            // ── Validate ID ──
            if (stocktakeId <= 0)
                throw new ArgumentException("StocktakeId phải là số nguyên dương.");

            var session = await _context.StocktakeSessions
                .Include(s => s.Warehouse)
                .Include(s => s.CreatedByNavigation)
                .Include(s => s.StocktakeLines)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.StocktakeId == stocktakeId);

            if (session == null)
                return null;

            var totalLines   = session.StocktakeLines.Count;
            var countedLines = session.StocktakeLines.Count(l => l.CountedQty != null);
            var varianceLines= session.StocktakeLines.Count(l => l.VarianceQty != null && l.VarianceQty != 0);

            return new StocktakeDetailResponse
            {
                StocktakeId   = session.StocktakeId,
                StocktakeCode = session.StocktakeCode,
                WarehouseId   = session.WarehouseId,
                WarehouseName = session.Warehouse.WarehouseName,
                Status        = session.Status,
                Mode          = session.Mode,
                PlannedAt     = session.PlannedAt,
                StartedAt     = session.StartedAt,
                EndedAt       = session.EndedAt,
                CreatedBy     = session.CreatedBy,
                CreatedByName = session.CreatedByNavigation.FullName,
                Note          = session.Note,
                // ── Progress fields ──
                TotalLines      = totalLines,
                CountedLines    = countedLines,
                VarianceLines   = varianceLines,
                ProgressPercent = totalLines == 0
                    ? 0
                    : Math.Round((decimal)countedLines / totalLines * 100, 1)
            };
        }
        // ─────────────────────────────────────────────────────────────
        // 3. CREATE DRAFT (FULL mode – kiểm kê toàn bộ kho)
        // ─────────────────────────────────────────────────────────────
        public async Task<StocktakeDetailResponse> CreateDraftAsync(
            CreateStocktakeDraftRequest request, long currentUserId)
        {
            // 1️⃣ Validate – kho tồn tại và đang hoạt động
            var warehouse = await _context.Warehouses
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.WarehouseId == request.WarehouseId);

            if (warehouse == null)
                throw new KeyNotFoundException(
                    $"Không tìm thấy kho với ID = {request.WarehouseId}.");

            if (!warehouse.IsActive)
                throw new InvalidOperationException(
                    $"Kho '{warehouse.WarehouseName}' đang bị vô hiệu hóa, không thể tạo phiếu kiểm kê.");

            // 2️⃣ Validate – không có phiên kiểm kê đang chạy (PROCESSING) trên kho này
            var hasPendingSession = await _context.StocktakeSessions
                .AnyAsync(s => s.WarehouseId == warehouse.WarehouseId
                            && (s.Status == "PROCESSING" || s.Status == "DRAFT"));

            if (hasPendingSession)
                throw new InvalidOperationException(
                    $"Kho '{warehouse.WarehouseName}' đang có phiên kiểm kê chưa hoàn thành " +
                    "(DRAFT hoặc IN_PROGRESS). Vui lòng hủy hoặc hoàn tất phiên đó trước.");

            // 3️⃣ Validate – ngày kiểm kê dự kiến không được ở quá khứ
            if (request.PlannedAt.HasValue && request.PlannedAt.Value.Date < DateTime.UtcNow.Date)
                throw new ArgumentException("Ngày kiểm kê dự kiến (PlannedAt) không được ở trong quá khứ.");

            // 4️⃣ Tạo mã phiếu tự động: ST-2025-0001
            var year = DateTime.UtcNow.Year;
            var countThisYear = await _context.StocktakeSessions
                .CountAsync(s => s.StocktakeCode.StartsWith($"ST-{year}-"));
            var newCode = $"ST-{year}-{(countThisYear + 1):D4}";

            // 5️⃣ Insert StocktakeSession (DRAFT, Mode = FULL)
            var session = new StocktakeSession
            {
                StocktakeCode = newCode,
                WarehouseId   = request.WarehouseId,
                Mode          = "FULL",
                Status        = "DRAFT",
                PlannedAt     = request.PlannedAt,
                Note          = request.Note,
                CreatedBy     = currentUserId
            };

            _context.StocktakeSessions.Add(session);
            await _context.SaveChangesAsync();

            // 6️⃣ Reload để lấy navigation properties (Warehouse, CreatedByNavigation)
            await _context.Entry(session).Reference(s => s.Warehouse).LoadAsync();
            await _context.Entry(session).Reference(s => s.CreatedByNavigation).LoadAsync();

            // 7️⃣ Return
            return new StocktakeDetailResponse
            {
                StocktakeId   = session.StocktakeId,
                StocktakeCode = session.StocktakeCode,
                WarehouseId   = session.WarehouseId,
                WarehouseName = session.Warehouse.WarehouseName,
                Status        = session.Status,
                Mode          = session.Mode,
                PlannedAt     = session.PlannedAt,
                StartedAt     = null,
                EndedAt       = null,
                CreatedBy     = session.CreatedBy,
                CreatedByName = session.CreatedByNavigation.FullName,
                Note          = session.Note,
                TotalLines    = 0,
                CountedLines  = 0,
                VarianceLines = 0,
                ProgressPercent = 0
            };
        }
        // ─────────────────────────────────────────────────────────────
        // 4. START STOCKTAKE (Snapshot tồn kho + Khóa kho)
        // ─────────────────────────────────────────────────────────────
        public async Task<StocktakeDetailResponse> StartStocktakeAsync(long stocktakeId, long currentUserId)
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

                if (session.Status != "DRAFT")
                    throw new InvalidOperationException("Chỉ có thể bắt đầu kiểm kê từ phiếu trạng thái DRAFT.");

                // 2. Lấy dữ liệu tồn kho hiện tại (InventoryOnHand)
                var inventory = await _context.InventoryOnHands
                    .Where(i => i.WarehouseId == session.WarehouseId)
                    .ToListAsync();

                if (inventory.Count == 0)
                    throw new InvalidOperationException("Kho này hiện không có sản phẩm nào có tồn kho để kiểm kê.");

                // 3. Sinh StocktakeLines (Snapshot)
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
                session.Status = "PROCESSING";
                session.StartedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // 5. Ghi Audit Log (sử dụng logic thủ công vì có thể chưa có repository cho AuditLog kiểu này)
                await _context.AuditLogs.AddAsync(new AuditLog
                {
                    ActorUserId = currentUserId,
                    Action = "START_STOCKTAKE",
                    EntityType = "StocktakeSession",
                    EntityId = session.StocktakeId,
                    Detail = $"Bắt đầu kiểm kê kho '{session.Warehouse.WarehouseName}' (Mã phiếu: {session.StocktakeCode}). Snapshot {lines.Count} mặt hàng.",
                    CreatedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();

                // 6. Trả về kết quả mới nhất
                return await GetStocktakeDetailAsync(session.StocktakeId) 
                       ?? throw new Exception("Lỗi sau khi lưu dữ liệu.");
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        // ─────────────────────────────────────────────────────────────
        // 5. HELPER: Kiểm tra kho có đang bị khóa (Freeze) hay không
        // ─────────────────────────────────────────────────────────────
        public async Task<bool> IsWarehouseFrozenAsync(long warehouseId)
        {
            return await _context.StocktakeSessions
                .AnyAsync(s => s.WarehouseId == warehouseId && s.Status == "PROCESSING");
        }

        // ─────────────────────────────────────────────────────────────
        // 6. COUNTING (Giai đoạn nhập số đếm)
        // ─────────────────────────────────────────────────────────────
        
        public async Task<PagedResponse<StocktakeLineResponse>> GetStocktakeLinesAsync(long stocktakeId, StocktakeLineFilterRequest request)
        {
            var query = _context.StocktakeLines
                .Include(l => l.Item)
                    .ThenInclude(i => i.BaseUom)
                .Where(l => l.StocktakeId == stocktakeId)
                .AsQueryable();

            // 1. Search (SKU / Name)
            if (!string.IsNullOrWhiteSpace(request.SearchQuery))
            {
                var search = request.SearchQuery.Trim().ToLower();
                query = query.Where(l => l.Item.ItemCode.ToLower().Contains(search) 
                                      || l.Item.ItemName.ToLower().Contains(search));
            }

            // 2. Filter theo trạng thái đếm
            if (!string.IsNullOrWhiteSpace(request.FilterType))
            {
                switch (request.FilterType.ToUpper())
                {
                    case "UNCOUNTED":
                        query = query.Where(l => l.CountedQty == null);
                        break;
                    case "DISCREPANCY":
                        query = query.Where(l => l.CountedQty != null && l.CountedQty != l.SystemQtySnapshot);
                        break;
                }
            }

            // 3. Paging
            var totalItems = await query.CountAsync();
            var items = await query
                .OrderBy(l => l.Item.ItemCode)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
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

            return new PagedResponse<StocktakeLineResponse>
            {
                Page = request.PageNumber,
                PageSize = request.PageSize,
                TotalItems = totalItems,
                Items = items
            };
        }

        public async Task<StocktakeLineResponse> UpdateCountedQtyAsync(long lineId, UpdateCountedQtyRequest request)
        {
            var line = await _context.StocktakeLines
                .Include(l => l.Item)
                    .ThenInclude(i => i.BaseUom)
                .Include(l => l.Stocktake)
                .FirstOrDefaultAsync(l => l.StocktakeLineId == lineId);

            if (line == null)
                throw new KeyNotFoundException($"Không tìm thấy dòng kiểm kê ID = {lineId}");

            if (line.Stocktake.Status != "PROCESSING")
                throw new InvalidOperationException("Chỉ có thể nhập số đếm khi phiếu ở trạng thái PROCESSING.");

            // Cập nhật SL thực tế và tính chênh lệch
            line.CountedQty = request.CountedQty;
            line.VarianceQty = line.CountedQty - line.SystemQtySnapshot;
            line.Note = request.Note;

            await _context.SaveChangesAsync();

            return new StocktakeLineResponse
            {
                StocktakeLineId = line.StocktakeLineId,
                ItemId = line.ItemId,
                ItemCode = line.Item.ItemCode,
                ItemName = line.Item.ItemName,
                UomName = line.Item.BaseUom.UomName,
                SystemQtySnapshot = line.SystemQtySnapshot,
                CountedQty = line.CountedQty,
                VarianceQty = line.VarianceQty,
                Note = line.Note
            };
        }

        public async Task<StocktakeDetailResponse> BulkMatchSystemQtyAsync(long stocktakeId, long currentUserId)
        {
            var session = await _context.StocktakeSessions
                .FirstOrDefaultAsync(s => s.StocktakeId == stocktakeId);

            if (session == null)
                throw new KeyNotFoundException($"Không tìm thấy phiếu kiểm kê ID = {stocktakeId}");

            if (session.Status != "PROCESSING")
                throw new InvalidOperationException("Chỉ có thể xử lý khi phiếu ở trạng thái PROCESSING.");

            // Lấy các dòng chưa đếm
            var uncountedLines = await _context.StocktakeLines
                .Where(l => l.StocktakeId == stocktakeId && l.CountedQty == null)
                .ToListAsync();

            if (uncountedLines.Count > 0)
            {
                foreach (var line in uncountedLines)
                {
                    line.CountedQty = line.SystemQtySnapshot;
                    line.VarianceQty = 0;
                }
                await _context.SaveChangesAsync();
                
                // Ghi Audit Log
                await _context.AuditLogs.AddAsync(new AuditLog
                {
                    ActorUserId = currentUserId,
                    Action = "BULK_MATCH_STOCKTAKE",
                    EntityType = "StocktakeSession",
                    EntityId = stocktakeId,
                    Detail = $"Đánh dấu {uncountedLines.Count} mặt hàng 'Số thực tế = Tồn hệ thống' cho mã phiếu {session.StocktakeCode}." ,
                    CreatedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }

            return await GetStocktakeDetailAsync(stocktakeId) 
                   ?? throw new Exception("Lỗi sau khi xử lý dữ liệu.");
        }

        public async Task<StocktakeDetailResponse> SubmitStocktakeAsync(long stocktakeId, long currentUserId)
        {
            var session = await _context.StocktakeSessions
                .Include(s => s.StocktakeLines)
                .Include(s => s.Warehouse)
                .FirstOrDefaultAsync(s => s.StocktakeId == stocktakeId);

            if (session == null)
                throw new KeyNotFoundException($"Không tìm thấy phiếu kiểm kê ID = {stocktakeId}");

            if (session.Status != "PROCESSING")
                throw new InvalidOperationException("Chỉ có thể gửi xác nhận khi phiếu ở trạng thái PROCESSING.");

            // Kiểm tra xem đã đếm hết chưa
            var hasUncounted = session.StocktakeLines.Any(l => l.CountedQty == null);
            if (hasUncounted)
                throw new InvalidOperationException("Vui lòng hoàn tất nhập số đếm cho tất cả các mặt hàng trước khi gửi xác nhận.");

            // Chuyển trạng thái
            session.Status = "PENDING_APPROVAL";

            await _context.SaveChangesAsync();

            // Ghi Audit Log
            await _context.AuditLogs.AddAsync(new AuditLog
            {
                ActorUserId = currentUserId,
                Action = "SUBMIT_STOCKTAKE",
                EntityType = "StocktakeSession",
                EntityId = stocktakeId,
                Detail = $"Gửi xác nhận hoàn tất đếm phiếu kiểm kê {session.StocktakeCode} tại kho {session.Warehouse.WarehouseName}. Đang chờ phê duyệt.",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return await GetStocktakeDetailAsync(stocktakeId) 
                   ?? throw new Exception("Lỗi sau khi lưu dữ liệu.");
        }

        // ─────────────────────────────────────────────────────────────
        // 7. APPROVAL (Giai đoạn phê duyệt)
        // ─────────────────────────────────────────────────────────────

        public async Task<StocktakeDetailResponse> ApproveStep1Async(long stocktakeId, StocktakeApprovalRequest request, long currentUserId)
        {
            var session = await _context.StocktakeSessions
                .FirstOrDefaultAsync(s => s.StocktakeId == stocktakeId);

            if (session == null)
                throw new KeyNotFoundException($"Không tìm thấy phiếu kiểm kê ID = {stocktakeId}");

            if (session.Status != "PENDING_APPROVAL")
                throw new InvalidOperationException("Chỉ có thể phê duyệt khi phiếu ở trạng thái PENDING_APPROVAL.");

            // Kiểm tra xem đã duyệt bước 1 chưa (tránh duyệt đè vô lý)
            var existing = await _context.DocumentApprovals
                .AnyAsync(a => a.DocType == "Stocktake" && a.DocId == stocktakeId && a.StageNo == 1 && a.Decision == "APPROVE");

            if (existing && request.Decision == "APPROVE")
                throw new InvalidOperationException("Bước 1 (Warehouse Manager) đã được phê duyệt trước đó.");

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    // 1. Ghi log phê duyệt
                    var approval = new DocumentApproval
                    {
                        DocType = "Stocktake",
                        DocId = stocktakeId,
                        StageNo = 1, // Manager
                        Decision = request.Decision,
                        Reason = request.Reason,
                        ActionBy = currentUserId,
                        ActionAt = DateTime.UtcNow
                    };
                    await _context.DocumentApprovals.AddAsync(approval);

                    // 2. Xử lý logic theo quyết định
                    if (request.Decision == "RECOUNT")
                    {
                        session.Status = "PROCESSING"; // Quay về đếm lại
                    }
                    else if (request.Decision == "REJECT")
                    {
                        session.Status = "CANCELLED"; // Từ chối - Hủy phiên
                    }
                    
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    // Ghi Audit Log tổng quát
                    await _context.AuditLogs.AddAsync(new AuditLog
                    {
                        ActorUserId = currentUserId,
                        Action = $"STAGE1_{request.Decision}",
                        EntityType = "StocktakeSession",
                        EntityId = stocktakeId,
                        Detail = $"Bước 1 (Manager): {request.Decision}. Lý do: {request.Reason}",
                        CreatedAt = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync();
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }

            return await GetStocktakeDetailAsync(stocktakeId) ?? throw new Exception("Lỗi xử lý.");
        }

        public async Task<StocktakeDetailResponse> ApproveStep2Async(long stocktakeId, StocktakeApprovalRequest request, long currentUserId)
        {
            var session = await _context.StocktakeSessions.FindAsync(stocktakeId);
            if (session == null) throw new KeyNotFoundException("Không thấy phiếu.");

            if (session.Status != "PENDING_APPROVAL")
                throw new InvalidOperationException("Trạng thái không hợp lệ để phê duyệt Bước 2.");

            // PHẢI có Bước 1 APPROVE rồi mới được làm Bước 2
            var step1Approved = await _context.DocumentApprovals
                .AnyAsync(a => a.DocType == "Stocktake" && a.DocId == stocktakeId && a.StageNo == 1 && a.Decision == "APPROVE");

            if (!step1Approved)
                throw new InvalidOperationException("Cần Warehouse Manager phê duyệt Bước 1 trước.");

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    var approval = new DocumentApproval
                    {
                        DocType = "Stocktake",
                        DocId = stocktakeId,
                        StageNo = 2, // Accountant
                        Decision = request.Decision,
                        Reason = request.Reason,
                        ActionBy = currentUserId,
                        ActionAt = DateTime.UtcNow
                    };
                    await _context.DocumentApprovals.AddAsync(approval);

                    if (request.Decision == "RECOUNT") session.Status = "PROCESSING";
                    else if (request.Decision == "REJECT") session.Status = "CANCELLED";

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }

            return await GetStocktakeDetailAsync(stocktakeId) ?? throw new Exception("Lỗi.");
        }

        public async Task<List<AdjustmentPreviewResponse>> GetAdjustmentPreviewAsync(long stocktakeId)
        {
            return await _context.StocktakeLines
                .Include(l => l.Item)
                    .ThenInclude(i => i.BaseUom)
                .Where(l => l.StocktakeId == stocktakeId && l.VarianceQty != 0)
                .Select(l => new AdjustmentPreviewResponse
                {
                    StocktakeLineId = l.StocktakeLineId,
                    ItemCode = l.Item.ItemCode,
                    ItemName = l.Item.ItemName,
                    UomName = l.Item.BaseUom.UomName,
                    SystemQtySnapshot = l.SystemQtySnapshot,
                    CountedQty = l.CountedQty ?? 0,
                    VarianceQty = l.VarianceQty ?? 0
                })
                .ToListAsync();
        }

        public async Task<List<StocktakeApprovalHistoryResponse>> GetApprovalHistoryAsync(long stocktakeId)
        {
            return await _context.DocumentApprovals
                .Include(a => a.ActionByNavigation)
                .Where(a => a.DocType == "Stocktake" && a.DocId == stocktakeId)
                .OrderBy(a => a.ActionAt)
                .Select(a => new StocktakeApprovalHistoryResponse
                {
                    ApprovalId = a.ApprovalId,
                    StageNo = a.StageNo,
                    Decision = a.Decision,
                    Reason = a.Reason,
                    ActionByName = a.ActionByNavigation.FullName,
                    ActionAt = a.ActionAt
                })
                .ToListAsync();
        }
    }
}
