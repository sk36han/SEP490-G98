using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Warehouse.Entities.Constants;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service
{
    public class StocktakePlanService : IStocktakePlanService
    {
        private readonly Mkiwms5Context _context;
        private readonly IStocktakeService _stocktakeService;
        private readonly INotificationService _notificationService;
        private readonly IAuditLogService _auditLogService;

        private static readonly string[] AllowedStatuses = { "DRAFT", "PENDING_APPROVAL", "APPROVED", "CANCELLED" };
        private static readonly string[] AllowedModes = { "PERIODIC", "ADHOC" };

        public StocktakePlanService(Mkiwms5Context context, IStocktakeService stocktakeService, INotificationService notificationService, IAuditLogService auditLogService)
        {
            _context = context;
            _stocktakeService = stocktakeService;
            _notificationService = notificationService;
            _auditLogService = auditLogService;
        }

        public async Task<StocktakeDetailResponse> CreateStocktakePlanAsync(CreateStocktakeDraftRequest request, long currentUserId)
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

            // 2️⃣ Validate – không có phiên kiểm kê đang thực thi (IN_PROGRESS) trên kho này
            // Lưu ý: Cho phép tạo nhiều phiếu DRAFT trên cùng một kho
            var hasActiveSession = await _context.StocktakeSessions
                .AnyAsync(s => s.WarehouseId == warehouse.WarehouseId
                            && s.Status == "IN_PROGRESS");

            if (hasActiveSession)
                throw new InvalidOperationException(
                    $"Kho '{warehouse.WarehouseName}' đang có phiên kiểm kê đang thực thi (IN_PROGRESS). " +
                    "Vui lòng hoàn tất hoặc hủy phiên đó trước khi tạo mới.");

            // 3️⃣ Validate – ngày kiểm kê dự kiến không được ở quá khứ
            if (request.PlannedAt.HasValue && request.PlannedAt.Value.Date < DateTime.UtcNow.Date)
                throw new ArgumentException("Ngày kiểm kê dự kiến (PlannedAt) không được ở trong quá khứ.");

            // 4️⃣ Tạo mã phiếu tự động: ST-2025-0001
            var year = DateTime.UtcNow.Year;
            var countThisYear = await _context.StocktakeSessions
                .CountAsync(s => s.StocktakeCode.StartsWith($"ST-{year}-"));
            var newCode = $"ST-{year}-{(countThisYear + 1):D4}";

            // 5️⃣ Insert StocktakeSession (DRAFT)
            var session = new StocktakeSession
            {
                StocktakeCode = newCode,
                WarehouseId   = request.WarehouseId,
                Mode          = request.Mode.ToUpper(),
                Status        = request.Status?.ToUpper() ?? "DRAFT",
                PlannedAt     = request.PlannedAt,
                Note          = request.Note,
                CreatedBy     = currentUserId
            };

            try
            {
                _context.StocktakeSessions.Add(session);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                var innerMsg = ex.InnerException?.Message ?? ex.Message;
                throw new Exception($"Lỗi lưu Database: {innerMsg}");
            }

            return await _stocktakeService.GetStocktakeDetailAsync(session.StocktakeId) ?? throw new Exception("Không thể lấy chi tiết phiếu sau khi tạo.");
        }

        public async Task<StocktakeDetailResponse> SubmitStocktakePlanAsync(long stocktakeId, long currentUserId)
        {
            var session = await _context.StocktakeSessions
                .Include(s => s.Warehouse)
                .FirstOrDefaultAsync(s => s.StocktakeId == stocktakeId);

            if (session == null)
                throw new KeyNotFoundException($"Không tìm thấy kế hoạch kiểm kê ID = {stocktakeId}");

            if (session.Status != "DRAFT")
                throw new InvalidOperationException("Chỉ có thể gửi duyệt kế hoạch khi ở trạng thái DRAFT.");

            session.Status = "PENDING_APPROVAL";

            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.SubmitStocktakePlan,
                AuditEntity.StocktakeSession,
                stocktakeId,
                $"Gửi thông qua kế hoạch kiểm kê {session.StocktakeCode} tại kho {session.Warehouse.WarehouseName}. Đang chờ phê duyệt."
            );

            // Gửi thông báo cho Quản lý
            await _notificationService.CreateForRolesAsync(
                new[] { "MANAGER", "ADMIN" },
                "Kế hoạch kiểm kê mới chờ duyệt",
                $"Kế hoạch kiểm kê {session.StocktakeCode} vừa được gửi duyệt và đang chờ bạn phê duyệt.",
                "Stocktake",
                session.StocktakeId,
                currentUserId,
                "NewRequest"
            );

            return await _stocktakeService.GetStocktakeDetailAsync(stocktakeId) ?? throw new Exception("Lỗi sảy ra khi gửi thông qua kế hoạch.");
        }

        public async Task<StocktakeDetailResponse> ApproveStocktakePlanAsync(long stocktakeId, StocktakeApprovalRequest request, long currentUserId)
        {
             var session = await _context.StocktakeSessions
                .FirstOrDefaultAsync(s => s.StocktakeId == stocktakeId);

            if (session == null)
                throw new KeyNotFoundException($"Không tìm thấy kế hoạch kiểm kê ID = {stocktakeId}");

            if (session.Status != "PENDING_APPROVAL")
                throw new InvalidOperationException("Chỉ có thể phê duyệt kế hoạch khi ở trạng thái PENDING_APPROVAL.");

            if ((request.Decision == "REJECT" || request.Decision == "RECOUNT") && string.IsNullOrWhiteSpace(request.Reason))
                throw new ArgumentException($"Bắt buộc phải nhập lý do khi chọn quyết định '{request.Decision}'.");

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    // 1. Ghi log phê duyệt
                    var approval = new DocumentApproval
                    {
                        DocType = "STOCKTAKE", // Phải dùng 'STOCKTAKE' theo đúng ràng buộc CK_DA_DocType DB
                        DocId = stocktakeId,
                        StageNo = 1, // Tuỳ số cấp duyệt, có thể gộp chung hoặc tách riêng cho Plan stage
                        Decision = request.Decision,
                        Reason = request.Reason,
                        ActionBy = currentUserId,
                        ActionAt = DateTime.UtcNow
                    };
                    await _context.DocumentApprovals.AddAsync(approval);

                    // 2. Xử lý logic theo quyết định
                    if (request.Decision == "RECOUNT") // Tuỳ quy trình, có thể DRAFT -> PENDING -> DRAFT k có chuyện RECOUNT, RECOUNT dùng cho thực thi, từ chối (REJECT) mới trở lại DRAFT hoặc huỷ (CANCEL)
                    {
                         session.Status = "DRAFT";
                    }
                    else if (request.Decision == "REJECT")
                    {
                        session.Status = "CANCELLED"; // Từ chối - Hủy phiên
                    }
                    else if (request.Decision == "APPROVE")
                    {
                         session.Status = "APPROVED"; // Phê duyệt thành công -> Chờ qua giai đoạn Thực thi
                    }
                    
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    // Ghi Audit Log tổng quát
                    string auditAction = request.Decision == "APPROVE" ? AuditAction.Approve : (request.Decision == "REJECT" ? AuditAction.Reject : AuditAction.Update);
                    await _auditLogService.LogAsync(
                        currentUserId,
                        auditAction,
                        AuditEntity.StocktakeSession,
                        stocktakeId,
                        $"Phê duyệt kế hoạch kiểm kê: {request.Decision}. Lý do: {request.Reason}"
                    );

                    // Gửi thông báo kết quả cho người tạo
                    string statusText = session.Status == "APPROVED" ? "ĐÃ ĐƯỢC DUYỆT" : (session.Status == "CANCELLED" ? "BỊ TỪ CHỐI" : "YÊU CẦU CHỈNH SỬA");
                    await _notificationService.CreateAsync(
                        session.CreatedBy,
                        $"Kế hoạch kiểm kê {session.StocktakeCode} {statusText}",
                        $"Kế hoạch kiểm kê {session.StocktakeCode} của bạn đã {statusText.ToLower()}. Lý do: {request.Reason}",
                        "Stocktake",
                        session.StocktakeId,
                        "ApprovalResult",
                        (byte)(session.Status == "APPROVED" ? 1 : 2)
                    );
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }

            return await _stocktakeService.GetStocktakeDetailAsync(stocktakeId) ?? throw new Exception("Lỗi xử lý.");
        }

        public async Task<StocktakeDetailResponse> CancelStocktakeAsync(long stocktakeId, string reason, long currentUserId)
        {
            var session = await _context.StocktakeSessions
                .Include(s => s.Warehouse)
                .FirstOrDefaultAsync(s => s.StocktakeId == stocktakeId);

            if (session == null)
                throw new KeyNotFoundException("Không tìm thấy kế hoạch kiểm kê.");

            // Chỉ cho phép huỷ Plan khi vẫn chưa bắt đầu (IN_PROGRESS) - ví dụ DRAFT, PENDING_APPROVAL, APPROVED (chưa IN_PROGRESS)
            // Nếu qua IN_PROGRESS ròi thì là ở cụm Execution
            if (session.Status == "COMPLETED" || session.Status == "CANCELLED" || session.Status == "IN_PROGRESS")
                throw new InvalidOperationException($"Không thể hủy kế hoạch kiểm kê đang ở trạng thái {session.Status} qua API này.");

            session.Status = "CANCELLED";
            session.EndedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Ghi Audit Log
            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.CancelStocktakePlan,
                AuditEntity.StocktakeSession,
                stocktakeId,
                $"Hủy kế hoạch kiểm kê {session.StocktakeCode}. Lý do: {reason}"
            );

            // Gửi thông báo cho người tạo phiếu
            if (session.CreatedBy != currentUserId)
            {
                await _notificationService.CreateAsync(
                    session.CreatedBy,
                    $"Kế hoạch kiểm kê {session.StocktakeCode} ĐÃ HỦY",
                    $"Kế hoạch kiểm kê {session.StocktakeCode} tại kho {session.Warehouse.WarehouseName} đã bị hủy. Lý do: {reason}",
                    "Stocktake",
                    session.StocktakeId,
                    "StatusChange",
                    2
                );
            }

            return await _stocktakeService.GetStocktakeDetailAsync(stocktakeId) ?? throw new Exception("Lỗi khi lấy thông tin sau hủy.");
        }

        public async Task<PagedResponse<StocktakeSummaryResponse>> ListAllStocktakePlansAsync(StocktakeListRequest request)
        {
            // Trả về danh sách kế hoạch (nháp, chờ duyệt, đã duyệt), dùng chung query bên service chính
            // Hoặc có thể filter mặc định status APPROVED nư user request
            if(string.IsNullOrEmpty(request.Status)) {
                // Nếu user k truyen gi vao thi mặc định chả vê các kế hoạch sẵn sàng kiểm tra (mặc định = APPROVED) -- theo yêu cầu của user: "Danh sách các phiếu đã duyệt, sẵn sàng để kiểm."
                request.Status = "APPROVED";
            }
            return await _stocktakeService.GetStocktakesAsync(request);
        }
    }
}
