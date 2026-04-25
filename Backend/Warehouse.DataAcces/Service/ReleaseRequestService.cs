using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;
using Warehouse.Entities.Constants;

namespace Warehouse.DataAcces.Service
{
    public class ReleaseRequestService : IReleaseRequestService
    {
        private readonly Mkiwms5Context _context;
        private readonly IStocktakeService _stocktakeService;
        private readonly INotificationService _notificationService;
        private readonly IAuditLogService _auditLogService;
        private readonly IDocumentAttachmentService _documentAttachmentService;

        public ReleaseRequestService(Mkiwms5Context context, IStocktakeService stocktakeService, INotificationService notificationService, IAuditLogService auditLogService, IDocumentAttachmentService documentAttachmentService)
        {
            _context = context;
            _stocktakeService = stocktakeService;
            _notificationService = notificationService;
            _auditLogService = auditLogService;
            _documentAttachmentService = documentAttachmentService;
        }

        // ──────────────────────────── CREATE ────────────────────────────

        public async Task<ReleaseRequestDetailResponse> CreateReleaseRequestAsync(
            long requestedByUserId,
            CreateReleaseRequestRequest request)
        {
        
            // 2. Validate: Kho xuất
            var warehouse = await _context.Warehouses
                .FirstOrDefaultAsync(w => w.WarehouseId == request.WarehouseId);
            if (warehouse == null)
                throw new KeyNotFoundException("Không tìm thấy kho xuất.");
            if (!warehouse.IsActive)
                throw new InvalidOperationException("Kho xuất đang không hoạt động.");

            // Kiểm tra kho có đang bị khóa (kiểm kê) không
            if (await _stocktakeService.IsWarehouseFrozenAsync(request.WarehouseId))
                throw new InvalidOperationException($"Kho '{warehouse.WarehouseName}' đang trong quá trình kiểm kê, không thể tạo yêu cầu xuất kho.");

            // Kiểm tra Người nhận (Receiver)
            var receiver = await _context.Receivers
                .Include(r => r.Company)
                .FirstOrDefaultAsync(r => r.ReceiverId == request.ReceiverId);
            if (receiver == null)
                throw new KeyNotFoundException("Không tìm thấy người nhận.");
            if (!receiver.IsActive)
                throw new InvalidOperationException("Người nhận đang không hoạt động.");

            // Validate: Người nhận phải thuộc Công ty đã chọn (nếu có truyền CompanyId)
            if (request.CompanyId.HasValue && receiver.CompanyId != request.CompanyId.Value)
            {
                throw new InvalidOperationException("Người nhận không thuộc công ty đã chọn.");
            }

            // Ghi đè địa chỉ hệ thống của người nhận nếu có chọn Address từ bảng
            if (request.AddressId.HasValue)
            {
                var addr = await _context.Addresses.FirstOrDefaultAsync(a => a.AddressId == request.AddressId.Value);
                if (addr == null)
                    throw new KeyNotFoundException("Không tìm thấy địa chỉ đã chọn.");
                
                // Validate địa chỉ phải thuộc công ty
                if (request.CompanyId.HasValue && addr.CompanyId != request.CompanyId.Value)
                    throw new InvalidOperationException("Địa chỉ không thuộc công ty đã chọn.");

                // Cập nhật đè địa chỉ vào bản ghi Receiver theo đúng logic hệ thống hiện tại
                receiver.Address = addr.AddressDetail;
                receiver.City = addr.City;
                receiver.District = addr.District;
                receiver.Ward = addr.Ward;
            }

            // 4. Validate: Người tạo
            var requestedByUser = await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == requestedByUserId);
            if (requestedByUser == null)
                throw new KeyNotFoundException("Không tìm thấy người tạo yêu cầu.");

            // 5. Validate: Không có vật tư trùng lặp
            if (request.Lines.GroupBy(l => l.ItemId).Any(g => g.Count() > 1))
                throw new InvalidOperationException("Một vật tư không được xuất hiện nhiều hơn 1 lần.");

            // 6. Validate: Tất cả vật tư tồn tại + đang hoạt động
            var itemIds = request.Lines.Select(l => l.ItemId).Distinct().ToList();
            var items = await _context.Items
                .Include(i => i.PackagingSpec)
                .Where(i => itemIds.Contains(i.ItemId))
                .ToDictionaryAsync(i => i.ItemId, i => i);

            if (items.Count != itemIds.Count)
                throw new KeyNotFoundException("Có vật tư không tồn tại trong hệ thống.");
            if (items.Values.Any(i => !i.IsActive))
                throw new InvalidOperationException("Có vật tư đang không hoạt động.");

            // 7. Validate: Đơn vị tính tồn tại
            var uomIds = request.Lines.Select(l => l.UomId).Distinct().ToList();
            var uoms = await _context.UnitOfMeasures
                .Where(u => uomIds.Contains(u.UomId))
                .ToDictionaryAsync(u => u.UomId, u => u);

            if (uoms.Count != uomIds.Count)
                throw new KeyNotFoundException("Có đơn vị tính không tồn tại trong hệ thống.");

            // 8. Tạo mã yêu cầu xuất kho tự động
            var rrCode = await GenerateNextRRCodeAsync();
            var now = DateTime.UtcNow;

            // 9. Tạo entity ReleaseRequest
            var releaseRequest = new ReleaseRequest
            {
                ReleaseRequestCode = rrCode,
                RequestedBy = requestedByUserId,
                ReceiverId = request.ReceiverId,
                WarehouseId = request.WarehouseId,
                RequestedDate = DateOnly.FromDateTime(now),
                ExpectedDate = request.ExpectedDate,
                Purpose = request.Purpose,
                Status = request.Status ?? "PENDING_ACC",
				IsPartialDeliveryAllowed = request.IsPartialDeliveryAllowed,
                LifecycleStatus = "IssuePending",
                CreatedAt = now,
                SubmittedAt = now
            };

            // Lấy giá vốn kho (InventoryOnHand) để fallback
            // Lấy giá vốn kho (InventoryOnHand) để fallback
            var itemIdsForPrice = request.Lines.Select(l => l.ItemId).Distinct().ToList();

            // 9. Lấy dữ liệu tồn kho hàng loạt để tối ưu hiệu năng
            var inventories = await _context.InventoryOnHands
                .Where(inv => inv.WarehouseId == request.WarehouseId && itemIdsForPrice.Contains(inv.ItemId))
                .ToDictionaryAsync(inv => inv.ItemId, inv => inv);

            var unitCostsDb = inventories.ToDictionary(kvp => kvp.Key, kvp => kvp.Value.UnitCost);

            // 10. Tạo các dòng vật tư và thực hiện giữ hàng (ReservedQty)
            foreach (var line in request.Lines)
            {
                decimal unitPrice = line.UnitPrice ?? (unitCostsDb.TryGetValue(line.ItemId, out var cost) ? cost : 0);

                var rrLine = new ReleaseRequestLine
                {
                    ItemId = line.ItemId,
                    RequestedQty = line.RequestedQty,
                    UomId = line.UomId,
                    Note = line.Note,
                    ApprovedQty = line.RequestedQty, // Tự động duyệt luôn số lượng yêu cầu
                    AllocatedQty = 0, // Sẽ được gán bên dưới tùy theo logic giữ hàng
                    IssuedQty = 0,
                    LineStatus = "Open",
                    UnitCostAtIssue = unitPrice,
                    PackagingSpecId = line.PackagingSpecId ?? items[line.ItemId].PackagingSpecId
                };
                releaseRequest.ReleaseRequestLines.Add(rrLine);

                // Chỉ thực hiện giữ hàng (ReservedQty) nếu trạng thái không phải là DRAFT
                if (releaseRequest.Status != "DRAFT")
                {
                    if (!inventories.TryGetValue(line.ItemId, out var inventory))
                    {
                        throw new KeyNotFoundException($"Không tìm thấy bản ghi tồn kho cho vật tư '{items[line.ItemId].ItemName}' tại kho {warehouse.WarehouseName}.");
                    }

                    var availableQty = inventory.OnHandQty - inventory.ReservedQty;

                    if (!request.IsPartialDeliveryAllowed)
                    {
                        // ═══ XUẤT HẾT 1 LẦN: Phải đủ hàng mới cho gửi duyệt ═══
                        if (availableQty < line.RequestedQty)
                        {
                            var shortageQty = line.RequestedQty - availableQty;
                            throw new InvalidOperationException(
                                $"Vật tư '{items[line.ItemId].ItemName}' không đủ số lượng khả dụng để xuất hết 1 lần. " +
                                $"Yêu cầu: {line.RequestedQty}, Khả dụng: {availableQty}, Cần nhập thêm: {shortageQty}.");
                        }
                        // Giữ toàn bộ số lượng yêu cầu
                        rrLine.AllocatedQty = line.RequestedQty;
                        inventory.ReservedQty += line.RequestedQty;
                    }
                    else
                    {
                        // ═══ XUẤT NHIỀU LẦN: Chỉ giữ đúng số khả dụng thực tế ═══
                        var allocateQty = Math.Min(line.RequestedQty, availableQty);
                        rrLine.AllocatedQty = allocateQty;

                        if (allocateQty > 0)
                        {
                            inventory.ReservedQty += allocateQty;
                        }
                        // Không chặn gửi duyệt dù chưa đủ hàng
                    }

                    inventory.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    // DRAFT: không giữ hàng, AllocatedQty = 0
                    rrLine.AllocatedQty = 0;
                }
            }

            // 11. Audit log
            await _auditLogService.LogAsync(
                requestedByUserId,
                "CREATE",
                "ReleaseRequest",
                releaseRequest.ReleaseRequestId,
                $"Tạo mới yêu cầu xuất kho {rrCode}"
            );

            // 12. Lưu vào database
            _context.ReleaseRequests.Add(releaseRequest);
            await _context.SaveChangesAsync();

            // Gửi thông báo cho Kế toán nếu đơn ở trạng thái PENDING_ACC để kiểm tra hồ sơ
            if (releaseRequest.Status == "PENDING_ACC")
            {
                await _notificationService.CreateForRolesAsync(
                    new[] { UserRoleConstants.Accountant },
                    "Yêu cầu xuất kho mới chờ duyệt",
                    $"Yêu cầu xuất kho {rrCode} vừa được tạo bởi {requestedByUser.FullName} và đang chờ bạn phê duyệt hồ sơ.",
                    "Release",
                    releaseRequest.ReleaseRequestId,
                    requestedByUserId,
                    NotificationTypes.NewRequest
                );
            }

            // 13. Trả về response chi tiết — tồn khả dụng = OnHand − Reserved (đã cập nhật sau bước giữ hàng)
            var availableQtyByItemId = inventories.ToDictionary(
                kvp => kvp.Key,
                kvp =>
                {
                    var a = kvp.Value.OnHandQty - kvp.Value.ReservedQty;
                    return a < 0 ? 0 : a;
                });
            return MapToDetailResponse(releaseRequest, warehouse, receiver, requestedByUser, items, uoms, unitCostsDb, availableQtyByItemId);
        }

        // ──────────────────────────── LIST ────────────────────────────

        public async Task<PagedResponse<ReleaseRequestResponse>> GetReleaseRequestsAsync(
            int page, int pageSize)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;

            var query = _context.ReleaseRequests
                .Include(rr => rr.Warehouse)
                .Include(rr => rr.Receiver)
                    .ThenInclude(rc => rc.Company)
                .Include(rr => rr.RequestedByNavigation)
                .Include(rr => rr.ReleaseRequestLines)
                .AsQueryable();

            var totalItems = await query.CountAsync();

            var items = await query
                .OrderByDescending(rr => rr.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(rr => new ReleaseRequestResponse
                {
                    ReleaseRequestId = rr.ReleaseRequestId,
                    ReleaseRequestCode = rr.ReleaseRequestCode,
                    Status = rr.Status,
                    LifecycleStatus = rr.LifecycleStatus,
                    RequestedDate = rr.RequestedDate,
                    ExpectedDate = rr.ExpectedDate,
                    Purpose = rr.Purpose,
                    WarehouseId = rr.WarehouseId,
                    WarehouseName = rr.Warehouse != null ? rr.Warehouse.WarehouseName : null,
                    ReceiverId = rr.ReceiverId,
                    ReceiverName = rr.Receiver != null ? rr.Receiver.ReceiverName : null,
                    CompanyId = rr.Receiver != null ? rr.Receiver.CompanyId : null,
                    CompanyName = (rr.Receiver != null && rr.Receiver.Company != null) ? rr.Receiver.Company.CompanyName : null,
                    ReceiverAddress = rr.Receiver != null ? rr.Receiver.Address : null,
                    RequestedBy = rr.RequestedBy,
                    RequestedByName = rr.RequestedByNavigation != null ? rr.RequestedByNavigation.FullName : null,
                    TotalItems = rr.ReleaseRequestLines.Count,
                    TotalRequestedQty = rr.ReleaseRequestLines.Sum(l => l.RequestedQty),
                    IsPartialDeliveryAllowed = rr.IsPartialDeliveryAllowed,
                    CreatedAt = rr.CreatedAt
                })
                .ToListAsync();

            return new PagedResponse<ReleaseRequestResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = items
            };
        }

        // ──────────────────────────── DETAIL ────────────────────────────

        public async Task<ReleaseRequestDetailResponse?> GetReleaseRequestByIdAsync(long id)
        {
            var rr = await _context.ReleaseRequests
                .Include(r => r.Warehouse)
                .Include(r => r.Receiver)
                    .ThenInclude(x => x.Company)
                .Include(r => r.RequestedByNavigation)
                .Include(r => r.ReleaseRequestLines)
                    .ThenInclude(l => l.Item)
                .Include(r => r.ReleaseRequestLines)
                    .ThenInclude(l => l.Uom)
                .Include(r => r.ReleaseRequestLines)
                    .ThenInclude(l => l.PackagingSpec)
                .FirstOrDefaultAsync(r => r.ReleaseRequestId == id);

            if (rr == null) return null;

            // Query lịch sử duyệt từ DocumentApprovals
            var approvals = await _context.DocumentApprovals
                .Include(a => a.ActionByNavigation)
                .Where(a => a.DocType == "GIR" && a.DocId == id)
                .OrderBy(a => a.StageNo)
                .ThenBy(a => a.ActionAt)
                .ToListAsync();

            // Lấy thời gian duyệt cuối cùng (APPROVE decision)
            var lastApproval = approvals
                .LastOrDefault(a => a.Decision == "APPROVE");

            // Lấy giá vốn bình quân gia quyền từ InventoryOnHand
            var itemIdsInLines = rr.ReleaseRequestLines.Select(l => l.ItemId).Distinct().ToList();
            var costPrices = await _context.InventoryOnHands
                .Where(inv => inv.WarehouseId == rr.WarehouseId && itemIdsInLines.Contains(inv.ItemId))
                .ToDictionaryAsync(inv => inv.ItemId, inv => inv.UnitCost);

            // Tồn khả dụng tại kho xuất: Σ(OnHand − Reserved) theo ItemId (không âm)
            var stockQtyRows = await _context.InventoryOnHands
                .Where(inv => inv.WarehouseId == rr.WarehouseId && itemIdsInLines.Contains(inv.ItemId))
                .GroupBy(inv => inv.ItemId)
                .Select(g => new { ItemId = g.Key, Qty = g.Sum(x => x.OnHandQty - x.ReservedQty) })
                .ToListAsync();
            var stockQtys = stockQtyRows.ToDictionary(x => x.ItemId, x => x.Qty < 0 ? 0 : x.Qty);

            // Lấy danh sách tệp đính kèm (Báo giá, Hợp đồng)
            var attachments = await _context.DocumentAttachments
                .Where(a => a.DocType == "GIR" && a.DocId == id)
                .Select(a => new ReleaseRequestAttachmentResponse
                {
                    AttachmentId = a.AttachmentId,
                    FileName = a.FileName,
                    FileUrl = a.FileUrlOrPath,
                    AttachmentType = a.AttachmentType,
                    UploadedAt = a.UploadedAt
                })
                .ToListAsync();

            return new ReleaseRequestDetailResponse
            {
                ReleaseRequestId = rr.ReleaseRequestId,
                ReleaseRequestCode = rr.ReleaseRequestCode,
                Status = rr.Status,
                LifecycleStatus = rr.LifecycleStatus,
                RequestedDate = rr.RequestedDate,
                ExpectedDate = rr.ExpectedDate,
                Purpose = rr.Purpose,
                WarehouseId = rr.WarehouseId,
                WarehouseName = rr.Warehouse?.WarehouseName,
                RequestedBy = rr.RequestedBy,
                RequestedByName = rr.RequestedByNavigation?.FullName,
                Receiver = rr.Receiver != null ? new ReleaseRequestReceiverInfo
                {
                    ReceiverId = rr.Receiver.ReceiverId,
                    ReceiverName = rr.Receiver.ReceiverName,
                    Phone = rr.Receiver.Phone,
                    Email = rr.Receiver.Email,
                    CompanyId = rr.Receiver.CompanyId,
                    CompanyName = rr.Receiver.Company?.CompanyName,
                    Notes = rr.Receiver.Notes,
                    Address = rr.Receiver.Address,
                    City = rr.Receiver.City,
                    District = rr.Receiver.District,
                    Ward = rr.Receiver.Ward
                } : null,
                IsPartialDeliveryAllowed = rr.IsPartialDeliveryAllowed,
                TotalRequestedQty = rr.ReleaseRequestLines.Sum(l => l.RequestedQty),
                TotalAmount = rr.ReleaseRequestLines.Sum(l => l.RequestedQty * (l.UnitCostAtIssue ?? 0)),
                CreatedAt = rr.CreatedAt,
                SubmittedAt = rr.SubmittedAt,
                ApprovedAt = lastApproval?.ActionAt,
                Attachments = attachments,
                Lines = rr.ReleaseRequestLines.Select(l => new ReleaseRequestLineResponse
                {
                    ReleaseRequestLineId = l.ReleaseRequestLineId,
                    ItemId = l.ItemId,
                    ItemCode = l.Item?.ItemCode,
                    ItemName = l.Item?.ItemName,
                    RequestedQty = l.RequestedQty,
                    UomId = l.UomId,
                    UomName = l.Uom?.UomName,
                    Note = l.Note,
                    ApprovedQty = l.ApprovedQty,
                    AllocatedQty = l.AllocatedQty,
                    LineStatus = l.LineStatus,
                    StockQty = stockQtys.TryGetValue(l.ItemId, out var sq) ? sq : 0,
                    CostPrice = costPrices.TryGetValue(l.ItemId, out var cp) ? cp : 0,
                    UnitPrice = l.UnitCostAtIssue ?? 0,
                    PackagingSpecId = l.PackagingSpecId,
                    PackagingSpecName = l.PackagingSpec?.SpecName
                }).ToList(),
                Approvals = approvals.Select(a => new RRApprovalResponse
                {
                    ApprovalId = a.ApprovalId,
                    StageNo = a.StageNo,
                    Decision = a.Decision,
                    Reason = a.Reason,
                    ActionBy = a.ActionBy,
                    ActionByName = a.ActionByNavigation?.FullName,
                    ActionAt = a.ActionAt
                }).ToList()
            };
        }

        // ──────────────────────────── UPDATE ────────────────────────────

        public async Task<ReleaseRequestDetailResponse> UpdateReleaseRequestAsync(
            long id, long userId, UpdateReleaseRequestRequest request)
        {
            // 1. Lấy yêu cầu xuất kho cùng lines
            var rr = await _context.ReleaseRequests
                .Include(r => r.Receiver)
                .Include(r => r.ReleaseRequestLines)
                .FirstOrDefaultAsync(r => r.ReleaseRequestId == id);

            if (rr == null)
                throw new KeyNotFoundException("Không tìm thấy yêu cầu xuất kho.");

            // 2. Chỉ cho phép sửa khi trạng thái PENDING hoặc DRAFT
            var editableStatuses = new[] { "DRAFT", "PENDING_ACC" };
            if (!editableStatuses.Contains(rr.Status))
                throw new InvalidOperationException("Chỉ có thể sửa yêu cầu xuất kho đang ở trạng thái chờ duyệt hoặc nháp.");

            // Kiểm tra kho hiện tại có đang bị khóa không
            if (await _stocktakeService.IsWarehouseFrozenAsync(rr.WarehouseId))
                throw new InvalidOperationException($"Kho '{rr.Warehouse.WarehouseName}' đang trong quá trình kiểm kê, không thể cập nhật yêu cầu xuất kho.");

            // 3. Không cho sửa nếu đã có phiếu xuất kho (GDN)
            var hasGdn = await _context.GoodsDeliveryNotes
                .AnyAsync(g => g.ReleaseRequestId == id && g.Status == "POSTED");
            if (hasGdn)
                throw new InvalidOperationException("Không thể sửa yêu cầu xuất kho đã có phiếu xuất.");

            // 4. Lưu lại ID kho cũ để xử lý chuyển giữ hàng nếu có đổi kho
            long oldWarehouseId = rr.WarehouseId;

            // 5. Cập nhật kho xuất
            if (request.WarehouseId.HasValue && request.WarehouseId.Value != oldWarehouseId)
            {
                var warehouse = await _context.Warehouses
                    .FirstOrDefaultAsync(w => w.WarehouseId == request.WarehouseId.Value);
                if (warehouse == null)
                    throw new KeyNotFoundException("Không tìm thấy kho xuất.");
                if (!warehouse.IsActive)
                    throw new InvalidOperationException("Kho xuất đang không hoạt động.");
                rr.WarehouseId = request.WarehouseId.Value;
            }

            // 5. Cập nhật người nhận
            if (request.ReceiverId.HasValue && request.ReceiverId.Value != rr.ReceiverId)
            {
                var newReceiver = await _context.Receivers
                    .FirstOrDefaultAsync(r => r.ReceiverId == request.ReceiverId.Value);
                if (newReceiver == null)
                    throw new KeyNotFoundException("Không tìm thấy người nhận mới.");
                if (!newReceiver.IsActive)
                    throw new InvalidOperationException("Người nhận mới đang không hoạt động.");
                
                rr.ReceiverId = request.ReceiverId.Value;
                // Nếu đổi người nhận thì dùng người nhận mới để update info bên dưới
                rr.Receiver = newReceiver; 
            }

            // Validate Người nhận thuộc Công ty đã chọn (nếu có truyền CompanyId)
            if (request.CompanyId.HasValue && rr.Receiver.CompanyId != request.CompanyId.Value)
            {
                throw new InvalidOperationException("Người nhận không thuộc công ty đã chọn.");
            }

            // Ghi đè địa chỉ hệ thống của người nhận nếu có chọn Address từ bảng
            if (request.AddressId.HasValue)
            {
                var addr = await _context.Addresses.FirstOrDefaultAsync(a => a.AddressId == request.AddressId.Value);
                if (addr == null)
                    throw new KeyNotFoundException("Không tìm thấy địa chỉ đã chọn.");
                
                // Validate địa chỉ phải thuộc công ty
                if (request.CompanyId.HasValue && addr.CompanyId != request.CompanyId.Value)
                    throw new InvalidOperationException("Địa chỉ không thuộc công ty đã chọn.");

                // Cập nhật đè địa chỉ vào bản ghi Receiver theo đúng logic hệ thống hiện tại
                rr.Receiver.Address = addr.AddressDetail;
                rr.Receiver.City = addr.City;
                rr.Receiver.District = addr.District;
                rr.Receiver.Ward = addr.Ward;
            }

            // 7. Cập nhật ngày xuất dự kiến
            if (request.ExpectedDate.HasValue)
                rr.ExpectedDate = request.ExpectedDate;

            // 8. Cập nhật ghi chú
            if (request.Purpose != null)
                rr.Purpose = request.Purpose;

            // 8.1. Cập nhật flag xuất từng phần
            if (request.IsPartialDeliveryAllowed.HasValue)
                rr.IsPartialDeliveryAllowed = request.IsPartialDeliveryAllowed.Value;

            // 8.2. Cập nhật trạng thái và validate nếu gửi duyệt
            string oldStatus = rr.Status;
            if (!string.IsNullOrEmpty(request.Status))
            {
                if (request.Status == "PENDING_ACC" && oldStatus == "DRAFT")
                {
                    // Kiểm tra hồ sơ bắt buộc khi gửi duyệt (Kiểm tra trong database)
                    var hasQuotation = await _context.DocumentAttachments.AnyAsync(a => a.DocType == "GIR" && a.DocId == id && a.AttachmentType == "QUOTATION");
                    var hasContract = await _context.DocumentAttachments.AnyAsync(a => a.DocType == "GIR" && a.DocId == id && a.AttachmentType == "CONTRACT");

                    if (!hasQuotation) throw new InvalidOperationException("Vui lòng tải lên tài liệu Báo giá trước khi gửi duyệt.");
                    if (!hasContract) throw new InvalidOperationException("Vui lòng tải lên tài liệu Hợp đồng trước khi gửi duyệt.");

                    rr.Status = "PENDING_ACC";
                    rr.SubmittedAt = DateTime.UtcNow;
                }
                else
                {
                    rr.Status = request.Status;
                }
            }

            // 9. Cập nhật danh sách vật tư (nếu có)
            if (request.Lines != null)
            {
                if (request.Lines.Count == 0)
                    throw new InvalidOperationException("Yêu cầu xuất kho phải có ít nhất 1 vật tư.");

                // Validate không trùng vật tư
                if (request.Lines.GroupBy(l => l.ItemId).Any(g => g.Count() > 1))
                    throw new InvalidOperationException("Một vật tư không được xuất hiện nhiều hơn 1 lần.");

                // Validate vật tư tồn tại + hoạt động
                var itemIds = request.Lines.Select(l => l.ItemId).Distinct().ToList();
                var items = await _context.Items
                    .Include(i => i.PackagingSpec)
                    .Where(i => itemIds.Contains(i.ItemId))
                    .ToDictionaryAsync(i => i.ItemId, i => i);

                if (items.Count != itemIds.Count)
                    throw new KeyNotFoundException("Có vật tư không tồn tại trong hệ thống.");
                if (items.Values.Any(i => !i.IsActive))
                    throw new InvalidOperationException("Có vật tư đang không hoạt động.");

                // Validate đơn vị tính
                var uomIds = request.Lines.Select(l => l.UomId).Distinct().ToList();
                var uomCount = await _context.UnitOfMeasures.CountAsync(u => uomIds.Contains(u.UomId));
                if (uomCount != uomIds.Count)
                    throw new KeyNotFoundException("Có đơn vị tính không tồn tại trong hệ thống.");

                // Lấy danh sách ID dòng cũ cần giữ lại
                var keepLineIds = request.Lines
                    .Where(l => l.ReleaseRequestLineId.HasValue && l.ReleaseRequestLineId > 0)
                    .Select(l => l.ReleaseRequestLineId!.Value)
                    .ToHashSet();

                // 9a. Xóa dòng cũ không còn trong request: Trả lại ReservedQty cho kho cũ
                var linesToRemove = rr.ReleaseRequestLines
                    .Where(l => !keepLineIds.Contains(l.ReleaseRequestLineId))
                    .ToList();

                // Lấy tất cả itemIds cần xử lý tồn kho (cả dòng mới, dòng update và dòng bị xóa)
                var allItemIds = request.Lines.Select(l => l.ItemId)
                    .Concat(linesToRemove.Select(l => l.ItemId))
                    .Distinct()
                    .ToList();

                // Fetch tồn kho hàng loạt (cả kho cũ và kho mới nếu đổi kho)
                var inventories = await _context.InventoryOnHands
                    .Where(inv => (inv.WarehouseId == rr.WarehouseId || inv.WarehouseId == oldWarehouseId) && allItemIds.Contains(inv.ItemId))
                    .ToListAsync();

                var inventoriesDict = inventories
                    .GroupBy(inv => new { inv.WarehouseId, inv.ItemId })
                    .ToDictionary(g => g.Key, g => g.First());

                var unitCostsDb = inventories
                    .Where(inv => inv.WarehouseId == rr.WarehouseId)
                    .ToDictionary(inv => inv.ItemId, inv => inv.UnitCost);

                foreach (var line in linesToRemove)
                {
                    // Chỉ trả lại ReservedQty nếu trạng thái hiện tại không phải là DRAFT
                    if (rr.Status != "DRAFT")
                    {
                        if (inventoriesDict.TryGetValue(new { WarehouseId = oldWarehouseId, ItemId = line.ItemId }, out var inventory))
                        {
                            inventory.ReservedQty -= line.AllocatedQty;
                            if (inventory.ReservedQty < 0) inventory.ReservedQty = 0;
                            inventory.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                    _context.ReleaseRequestLines.Remove(line);
                }

                // 9b. Cập nhật dòng cũ + thêm dòng mới
                foreach (var lineReq in request.Lines)
                {
                    decimal unitPrice = lineReq.UnitPrice ?? (unitCostsDb.TryGetValue(lineReq.ItemId, out var cost) ? cost : 0);

                    if (lineReq.ReleaseRequestLineId.HasValue && lineReq.ReleaseRequestLineId > 0)
                    {
                        // Cập nhật dòng đã có
                        var existingLine = rr.ReleaseRequestLines
                            .FirstOrDefault(l => l.ReleaseRequestLineId == lineReq.ReleaseRequestLineId.Value);
                        if (existingLine == null)
                            throw new KeyNotFoundException($"Không tìm thấy dòng vật tư với ID = {lineReq.ReleaseRequestLineId}.");

                        // Xử lý ReservedQty (Chỉ thực hiện nếu trạng thái không phải là DRAFT)
                        if (rr.Status != "DRAFT")
                        {
                            if (rr.WarehouseId != oldWarehouseId)
                            {
                                // Nếu đổi kho: Trả hàng kho cũ, giữ hàng kho mới
                                if (inventoriesDict.TryGetValue(new { WarehouseId = oldWarehouseId, ItemId = existingLine.ItemId }, out var oldInv))
                                {
                                    oldInv.ReservedQty -= existingLine.AllocatedQty;
                                }

                                if (!inventoriesDict.TryGetValue(new { WarehouseId = rr.WarehouseId, ItemId = existingLine.ItemId }, out var newInv))
                                {
                                    throw new KeyNotFoundException($"Vật tư {existingLine.ItemId} không có trong kho mới {rr.WarehouseId}.");
                                }
                                
                                var availableQty = newInv.OnHandQty - newInv.ReservedQty;
                                
                                if (!rr.IsPartialDeliveryAllowed)
                                {
                                    // XUẤT 1 LẦN: Phải đủ hàng
                                    if (availableQty < lineReq.RequestedQty)
                                    {
                                        var shortageQty = lineReq.RequestedQty - availableQty;
                                        throw new InvalidOperationException($"Vật tư '{items[existingLine.ItemId].ItemName}' không đủ số lượng khả dụng tại kho mới để xuất 1 lần. Yêu cầu: {lineReq.RequestedQty}, Khả dụng: {availableQty}, Cần nhập thêm: {shortageQty}.");
                                    }
                                    existingLine.AllocatedQty = lineReq.RequestedQty;
                                    newInv.ReservedQty += lineReq.RequestedQty;
                                }
                                else
                                {
                                    // XUẤT NHIỀU LẦN: Giữ số có thể
                                    var allocateQty = Math.Min(lineReq.RequestedQty, availableQty);
                                    existingLine.AllocatedQty = allocateQty;
                                    if (allocateQty > 0) newInv.ReservedQty += allocateQty;
                                }
                            }
                            else
                            {
                                // Nếu cùng kho: Tính chênh lệch Delta = Số_mới - Số_cũ
                                decimal delta = lineReq.RequestedQty - existingLine.AllocatedQty;
                                if (inventoriesDict.TryGetValue(new { WarehouseId = rr.WarehouseId, ItemId = existingLine.ItemId }, out var inv))
                                {
                                    if (!rr.IsPartialDeliveryAllowed)
                                    {
                                        // XUẤT 1 LẦN
                                        if (delta > 0)
                                        {
                                            var availableQty = inv.OnHandQty - inv.ReservedQty;
                                            if (availableQty < delta)
                                            {
                                                var shortageQty = delta - availableQty;
                                                throw new InvalidOperationException($"Vật tư '{items[existingLine.ItemId].ItemName}' không đủ số lượng khả dụng để cập nhật xuất 1 lần. Yêu cầu thêm: {delta}, Khả dụng: {availableQty}, Cần nhập thêm: {shortageQty}.");
                                            }
                                        }
                                        existingLine.AllocatedQty = lineReq.RequestedQty;
                                        inv.ReservedQty += delta;
                                    }
                                    else
                                    {
                                        // XUẤT NHIỀU LẦN
                                        var availableQty = inv.OnHandQty - inv.ReservedQty;
                                        if (delta > 0)
                                        {
                                            var allocateDelta = Math.Min(delta, availableQty);
                                            existingLine.AllocatedQty += allocateDelta;
                                            if (allocateDelta > 0) inv.ReservedQty += allocateDelta;
                                        }
                                        else if (delta < 0)
                                        {
                                            // Giảm yêu cầu
                                            var returnQty = Math.Abs(delta);
                                            // Nhưng chỉ trả lại tối đa lượng đã lấy
                                            var returnCap = Math.Min(returnQty, existingLine.AllocatedQty);
                                            existingLine.AllocatedQty -= returnCap;
                                            inv.ReservedQty -= returnCap;
                                        }
                                    }
                                }
                            }
                        }

                        existingLine.ItemId = lineReq.ItemId;
                        existingLine.RequestedQty = lineReq.RequestedQty;
                        existingLine.ApprovedQty = lineReq.RequestedQty; // Tự động duyệt số lượng mới
                        existingLine.UomId = lineReq.UomId;
                        existingLine.Note = lineReq.Note;
                        existingLine.UnitCostAtIssue = unitPrice;
                        existingLine.PackagingSpecId = lineReq.PackagingSpecId ?? items[lineReq.ItemId].PackagingSpecId;
                    }
                    else
                    {
                        // Thêm dòng mới
                        var newLine = new ReleaseRequestLine
                        {
                            ItemId = lineReq.ItemId,
                            RequestedQty = lineReq.RequestedQty,
                            UomId = lineReq.UomId,
                            Note = lineReq.Note,
                            ApprovedQty = lineReq.RequestedQty, // Tự động duyệt dòng mới
                            AllocatedQty = 0, // Mặc định là 0, sẽ được logic xử lý tồn kho phía dưới cập nhật nếu cần
                            IssuedQty = 0,
                            LineStatus = "Open",
                            UnitCostAtIssue = unitPrice,
                            PackagingSpecId = lineReq.PackagingSpecId ?? items[lineReq.ItemId].PackagingSpecId
                        };
                        rr.ReleaseRequestLines.Add(newLine);

                        // Giữ hàng cho dòng mới tại kho hiện tại (Chỉ khi status != DRAFT)
                        if (rr.Status != "DRAFT")
                        {
                            if (!inventoriesDict.TryGetValue(new { WarehouseId = rr.WarehouseId, ItemId = lineReq.ItemId }, out var inv))
                            {
                                throw new KeyNotFoundException($"Vật tư {lineReq.ItemId} không có trong kho {rr.WarehouseId}.");
                            }

                            var availableQty = inv.OnHandQty - inv.ReservedQty;

                            if (!rr.IsPartialDeliveryAllowed)
                            {
                                // XUẤT 1 LẦN
                                if (availableQty < lineReq.RequestedQty)
                                {
                                    var shortageQty = lineReq.RequestedQty - availableQty;
                                    throw new InvalidOperationException($"Vật tư '{items[lineReq.ItemId].ItemName}' không đủ số lượng khả dụng để thêm mới xuất 1 lần. Yêu cầu: {lineReq.RequestedQty}, Khả dụng: {availableQty}, Cần nhập thêm: {shortageQty}.");
                                }
                                newLine.AllocatedQty = lineReq.RequestedQty;
                                inv.ReservedQty += lineReq.RequestedQty;
                            }
                            else
                            {
                                // XUẤT NHIỀU LẦN
                                var allocateQty = Math.Min(lineReq.RequestedQty, availableQty);
                                newLine.AllocatedQty = allocateQty;
                                if (allocateQty > 0) inv.ReservedQty += allocateQty;
                            }

                            inv.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                }
            }
            else if (oldWarehouseId != rr.WarehouseId && rr.Status != "DRAFT")
            {
                // Trường hợp request.Lines null nhưng WarehouseId thay đổi và không phải DRAFT
                // Phải chuyển toàn bộ giữ hàng từ kho cũ sang kho mới
                foreach (var line in rr.ReleaseRequestLines)
                {
                    var oldInv = await _context.InventoryOnHands
                        .FirstOrDefaultAsync(ioh => ioh.WarehouseId == oldWarehouseId && ioh.ItemId == line.ItemId);
                    if (oldInv != null) oldInv.ReservedQty -= line.AllocatedQty;

                    var newInv = await _context.InventoryOnHands
                        .FirstOrDefaultAsync(ioh => ioh.WarehouseId == rr.WarehouseId && ioh.ItemId == line.ItemId);
                    if (newInv != null)
                    {
                        var availableQty = newInv.OnHandQty - newInv.ReservedQty;
                        if (availableQty < line.AllocatedQty)
                            throw new InvalidOperationException($"Vật tư ID {line.ItemId} không đủ số lượng ở kho mới. Yêu cầu: {line.AllocatedQty}, Khả dụng: {availableQty}.");

                        newInv.ReservedQty += line.AllocatedQty;
                    }
                    else
                    {
                        throw new KeyNotFoundException($"Vật tư ID {line.ItemId} không có trong kho mới {rr.WarehouseId}.");
                    }
                }
            }

            // 9. Audit log
            await _auditLogService.LogAsync(
                userId,
                "UPDATE",
                "ReleaseRequest",
                rr.ReleaseRequestId,
                $"Cập nhật yêu cầu xuất kho {rr.ReleaseRequestCode}"
            );

            await _context.SaveChangesAsync();

            // 12. Trả về chi tiết sau cập nhật
            return await GetReleaseRequestByIdAsync(rr.ReleaseRequestId)
                ?? throw new Exception("Lỗi khi lấy thông tin yêu cầu xuất kho.");
        }  

        public async Task<bool> CancelReleaseRequestAsync(long id, long userId)
        {
            var rr = await _context.ReleaseRequests
                .Include(r => r.ReleaseRequestLines)
                .FirstOrDefaultAsync(r => r.ReleaseRequestId == id);

            if (rr == null) return false;

            // 1. Giải phóng hàng đã giữ (ReservedQty) trong kho nếu trạng thái trước đó không phải DRAFT
            if (rr.Status != "DRAFT")
            {
                await ReleaseReservedQtyAsync(rr);
            }

            // 2. Chuyển trạng thái đơn thành CANCELLED
            rr.Status = "CANCELLED";
            rr.LifecycleStatus = "Cancelled";

            // 3. Ghi audit log
            await _auditLogService.LogAsync(
                userId,
                "CANCEL",
                "ReleaseRequest",
                rr.ReleaseRequestId,
                $"Hủy yêu cầu xuất kho {rr.ReleaseRequestCode}"
            );

            await _context.SaveChangesAsync();

            // Gửi thông báo cho Kế toán biết đơn đã bị hủy
            await _notificationService.CreateForRolesAsync(
                new[] { UserRoleConstants.Accountant },
                "Yêu cầu xuất kho bị hủy",
                $"Yêu cầu xuất kho {rr.ReleaseRequestCode} đã bị hủy.",
                "Release",
                rr.ReleaseRequestId,
                userId,
                NotificationTypes.StatusChange
            );

            return true;
        }

        // ──────────────────────────── CLOSE ────────────────────────────

        public async Task<bool> CloseReleaseRequestAsync(long id, long userId)
        {
            var rr = await _context.ReleaseRequests
                .Include(r => r.ReleaseRequestLines)
                .FirstOrDefaultAsync(r => r.ReleaseRequestId == id);

            if (rr == null) return false;

            // Chỉ cho phép đóng khi đã APPROVED
            if (rr.Status != "APPROVED")
                throw new InvalidOperationException("Chỉ có thể đóng yêu cầu xuất kho đang ở trạng thái đã duyệt (APPROVED).");
                
            if (rr.LifecycleStatus == "IssueFull" || rr.LifecycleStatus == "Closed" || rr.LifecycleStatus == "Cancelled")
                throw new InvalidOperationException($"Không thể đóng yêu cầu xuất kho ở trạng thái '{rr.LifecycleStatus}'.");

            // 1. Lấy dữ liệu tồn kho hàng loạt để tối ưu
            var itemIds = rr.ReleaseRequestLines.Select(l => l.ItemId).Distinct().ToList();
            var inventories = await _context.InventoryOnHands
                .Where(ioh => ioh.WarehouseId == rr.WarehouseId && itemIds.Contains(ioh.ItemId))
                .ToDictionaryAsync(ioh => ioh.ItemId, ioh => ioh);

            // 2. Giải phóng hàng còn dư (ReservedQty)
            foreach (var line in rr.ReleaseRequestLines)
            {
                // Lượng dư chưa xuất: AllocatedQty (lượng đã giữ) - IssuedQty (lượng thực tế đã xuất)
                decimal remainingReserve = line.AllocatedQty - line.IssuedQty;
                
                if (remainingReserve > 0 && inventories.TryGetValue(line.ItemId, out var inventory))
                {
                    if (inventory.ReservedQty >= remainingReserve)
                        inventory.ReservedQty -= remainingReserve;
                    else
                        inventory.ReservedQty = 0;
                        
                    inventory.UpdatedAt = DateTime.UtcNow;
                    
                    // Cập nhật lại AllocatedQty bằng IssuedQty để phản ánh không còn giữ hàng dư
                    line.AllocatedQty = line.IssuedQty;
                }
            }

            // Chuyển trạng thái đơn thành CLOSED
            rr.Status = "CLOSED";
            rr.LifecycleStatus = "Closed";

            // Ghi audit log
            await _auditLogService.LogAsync(
                userId,
                "CLOSE",
                "ReleaseRequest",
                rr.ReleaseRequestId,
                $"Đóng yêu cầu xuất kho {rr.ReleaseRequestCode} và giải phóng tồn kho đã giữ"
            );

            await _context.SaveChangesAsync();

            // Gửi thông báo cho người tạo đơn biết đơn đã đóng
            if (rr.RequestedBy != userId)
            {
                await _notificationService.CreateAsync(
                    rr.RequestedBy,
                    $"Yêu cầu xuất kho {rr.ReleaseRequestCode} ĐÃ ĐÓNG",
                    $"Yêu cầu xuất kho {rr.ReleaseRequestCode} đã được đóng. Hàng giữ dư đã được giải phóng.",
                    "Release",
                    rr.ReleaseRequestId,
                    NotificationTypes.StatusChange,
                    (byte)NotificationSeverity.Info
                );
            }

            return true;
        }

        // ──────────────────────────── APPROVE (Kế toán duyệt) ────────────────────────────

		public async Task<ReleaseRequestDetailResponse> ApproveReleaseRequestAsync(
            long id, long userId, ApproveReleaseRequest request)
        {
            // 1. Lấy RR kèm lines
            var rr = await _context.ReleaseRequests
                .Include(r => r.ReleaseRequestLines)
                .Include(r => r.Warehouse)
                .FirstOrDefaultAsync(r => r.ReleaseRequestId == id);

            if (rr == null)
                throw new KeyNotFoundException("Không tìm thấy yêu cầu xuất kho.");

            // 2. Lấy user và role
            var user = await _context.Users
                .Include(u => u.UserRoleUser)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
                throw new KeyNotFoundException("Không tìm thấy người dùng.");

            var userRoleCode = user.UserRoleUser?.Role?.RoleCode;
            string decision = request.IsApproved ? "APPROVE" : "REJECT";

            if (!request.IsApproved && string.IsNullOrWhiteSpace(request.Reason))
                throw new ArgumentException("Bắt buộc phải nhập lý do khi từ chối yêu cầu.");

            // 3. Xử lý theo trạng thái hiện tại (Chỉ 1 bước: Kế toán duyệt)
            if (rr.Status == "PENDING_ACC")
            {
                if (request.IsApproved)
                {
                    // Kiểm tra hồ sơ bắt buộc khi duyệt
                    var hasQuotation = await _context.DocumentAttachments.AnyAsync(a => a.DocType == "GIR" && a.DocId == id && a.AttachmentType == "QUOTATION");
                    var hasContract = await _context.DocumentAttachments.AnyAsync(a => a.DocType == "GIR" && a.DocId == id && a.AttachmentType == "CONTRACT");

                    if (!hasQuotation) throw new InvalidOperationException("Không thể duyệt: Thiếu tài liệu Báo giá.");
                    if (!hasContract) throw new InvalidOperationException("Không thể duyệt: Thiếu tài liệu Hợp đồng.");

                    rr.Status = "APPROVED";

                    var approvedQtyMap = request.Lines?.ToDictionary(l => l.ReleaseRequestLineId, l => l.ApprovedQty) 
                                         ?? new Dictionary<long, decimal>();

                    // Lấy dữ liệu tồn kho hàng loạt
                    var itemIds = rr.ReleaseRequestLines.Select(l => l.ItemId).Distinct().ToList();
                    var inventories = await _context.InventoryOnHands
                        .Where(ioh => ioh.WarehouseId == rr.WarehouseId && itemIds.Contains(ioh.ItemId))
                        .ToDictionaryAsync(ioh => ioh.ItemId, ioh => ioh);

                    foreach (var rrLine in rr.ReleaseRequestLines)
                    {
                        decimal approvedQty = approvedQtyMap.ContainsKey(rrLine.ReleaseRequestLineId) 
                            ? approvedQtyMap[rrLine.ReleaseRequestLineId] 
                            : rrLine.RequestedQty;

                        if (approvedQty > rrLine.RequestedQty)
                            throw new InvalidOperationException(
                                $"Số lượng duyệt ({approvedQty}) không được vượt quá số lượng yêu cầu.");

                        decimal oldAllocated = rrLine.AllocatedQty;
                        rrLine.ApprovedQty = approvedQty;
                        rrLine.AllocatedQty = approvedQty;

                        decimal delta = approvedQty - oldAllocated;
                        if (delta != 0 && inventories.TryGetValue(rrLine.ItemId, out var inventory))
                        {
                            inventory.ReservedQty += delta;
                            if (inventory.ReservedQty < 0) inventory.ReservedQty = 0;
                            inventory.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                }
                else
                {
                    rr.Status = "REJECTED";
                    // Giải phóng hàng đã giữ khi từ chối
                    await ReleaseReservedQtyAsync(rr);
                }

                _context.DocumentApprovals.Add(new DocumentApproval
                {
                    DocType = "GIR",
                    DocId = rr.ReleaseRequestId,
                    StageNo = 1,
                    Decision = decision,
                    Reason = request.Reason,
                    ActionBy = userId,
                    ActionAt = DateTime.UtcNow
                });
            }
            else
            {
                throw new InvalidOperationException(
                    $"Yêu cầu xuất kho không ở trạng thái chờ duyệt. Trạng thái hiện tại: {rr.Status}.");
            }

            await _auditLogService.LogAsync(
                userId,
                request.IsApproved ? "APPROVE" : "REJECT",
                "ReleaseRequest",
                rr.ReleaseRequestId,
                $"{(request.IsApproved ? "Duyệt" : "Từ chối")} yêu cầu xuất kho {rr.ReleaseRequestCode}" +
                         (string.IsNullOrEmpty(request.Reason) ? "" : $" - Lý do: {request.Reason}")
            );

            await _context.SaveChangesAsync();

            // Gửi thông báo kết quả cho người tạo đơn
            string statusText = rr.Status == "APPROVED" ? "ĐƯỢC DUYỆT" : "BỊ TỪ CHỐI";
            string reasonText = string.IsNullOrEmpty(request.Reason) ? "" : $". Lý do: {request.Reason}";

            await _notificationService.CreateAsync(
                rr.RequestedBy,
                $"Yêu cầu xuất kho {rr.ReleaseRequestCode} {statusText}",
                $"Yêu cầu xuất kho {rr.ReleaseRequestCode} của bạn đã {statusText.ToLower()}{reasonText}.",
                "Release",
                rr.ReleaseRequestId,
                NotificationTypes.ApprovalResult,
                (byte)(rr.Status == "APPROVED" ? NotificationSeverity.Warning : NotificationSeverity.Error)
            );

            // Gửi thêm thông báo cho bộ phận Thủ kho (TK) nếu đơn được phê duyệt
            if (rr.Status == "APPROVED")
            {
                await _notificationService.CreateForRolesAsync(
                    new[] { UserRoleConstants.Storekeeper },
                    "Yêu cầu xuất kho mới chờ xuất hàng",
                    $"Yêu cầu xuất kho {rr.ReleaseRequestCode} đã được Kế toán phê duyệt hồ sơ. Vui lòng chuẩn bị hàng và tạo phiếu xuất kho (GDN).",
                    "Release",
                    rr.ReleaseRequestId,
                    userId,
                    NotificationTypes.NewRequest
                );
            }

            return await GetReleaseRequestByIdAsync(id)
                ?? throw new Exception("Lỗi khi lấy thông tin yêu cầu xuất kho.");
        }

        /// <summary>
        /// Giải phóng toàn bộ ReservedQty đã giữ cho RR (dùng khi reject/cancel)
        /// </summary>
        private async Task ReleaseReservedQtyAsync(ReleaseRequest rr)
        {
            var itemIds = rr.ReleaseRequestLines.Select(l => l.ItemId).Distinct().ToList();
            var inventories = await _context.InventoryOnHands
                .Where(ioh => ioh.WarehouseId == rr.WarehouseId && itemIds.Contains(ioh.ItemId))
                .ToDictionaryAsync(ioh => ioh.ItemId, ioh => ioh);

            foreach (var line in rr.ReleaseRequestLines)
            {
                if (inventories.TryGetValue(line.ItemId, out var inventory))
                {
                    inventory.ReservedQty -= line.AllocatedQty;
                    if (inventory.ReservedQty < 0) inventory.ReservedQty = 0;
                    inventory.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        // ──────────────────────────── HELPERS ────────────────────────────
        /// <summary>
        /// Tạo mã yêu cầu xuất kho tự tăng: RR-001, RR-002, RR-003, ...
        /// </summary>
        private async Task<string> GenerateNextRRCodeAsync()
        {
            var year = DateTime.Now.Year;
            var prefix = $"RR-{year}-";
            
            var lastCode = await _context.ReleaseRequests
                .Where(r => r.ReleaseRequestCode.StartsWith(prefix))
                .OrderByDescending(r => r.ReleaseRequestCode)
                .Select(r => r.ReleaseRequestCode)
                .FirstOrDefaultAsync();

            var nextNumber = 1;
            if (lastCode != null)
            {
                var parts = lastCode.Split('-');
                if (parts.Length == 3 && int.TryParse(parts[2], out var lastNumber))
                {
                    nextNumber = lastNumber + 1;
                }
            }
            else
            {
                // Fallback cho logic cũ nếu không tìm thấy prefix năm hiện tại: Lấy mã có số lớn nhất bằng cách sắp xếp theo mã giảm dần
                var lastAnyCode = await _context.ReleaseRequests
                    .OrderByDescending(r => r.ReleaseRequestCode)
                    .Select(r => r.ReleaseRequestCode)
                    .FirstOrDefaultAsync();

                if (lastAnyCode != null)
                {
                    var parts = lastAnyCode.Split('-');
                    var lastPart = parts.Last();
                    if (int.TryParse(lastPart, out var number))
                        nextNumber = number + 1;
                }
            }

            return $"{prefix}{nextNumber:D3}";
        }

       
        /// Map entity sang response chi tiết (dùng khi vừa tạo xong)
      
        private static ReleaseRequestDetailResponse MapToDetailResponse(
            ReleaseRequest rr,
            Warehouse.Entities.Models.Warehouse warehouse,
            Receiver receiver,
            User requestedByUser,
            Dictionary<long, Item> items,
            Dictionary<long, UnitOfMeasure> uoms,
            Dictionary<long, decimal> costPrices,
            Dictionary<long, decimal> availableQtyByItemId,
            List<ReleaseRequestAttachmentResponse>? attachments = null)
        {
            return new ReleaseRequestDetailResponse
            {
                ReleaseRequestId = rr.ReleaseRequestId,
                ReleaseRequestCode = rr.ReleaseRequestCode,
                Status = rr.Status,
                LifecycleStatus = rr.LifecycleStatus,
                RequestedDate = rr.RequestedDate,
                ExpectedDate = rr.ExpectedDate,
                Purpose = rr.Purpose,
                WarehouseId = rr.WarehouseId,
                WarehouseName = warehouse.WarehouseName,
                RequestedBy = rr.RequestedBy,
                RequestedByName = requestedByUser.FullName,
                Receiver = new ReleaseRequestReceiverInfo
                {
                    ReceiverId = receiver.ReceiverId,
                    ReceiverName = receiver.ReceiverName,
                    Phone = receiver.Phone,
                    Email = receiver.Email,
                    CompanyId = receiver.CompanyId,
                    CompanyName = receiver.Company?.CompanyName,
                    Notes = receiver.Notes,
                    Address = receiver.Address,
                    City = receiver.City,
                    District = receiver.District,
                    Ward = receiver.Ward
                },
                TotalItems = rr.ReleaseRequestLines.Count,
                TotalRequestedQty = rr.ReleaseRequestLines.Sum(l => l.RequestedQty),
                TotalAmount = rr.ReleaseRequestLines.Sum(l => l.RequestedQty * (l.UnitCostAtIssue ?? 0)),
                CreatedAt = rr.CreatedAt,
                SubmittedAt = rr.SubmittedAt,
                Attachments = attachments ?? new(),
                Lines = rr.ReleaseRequestLines.Select(l => new ReleaseRequestLineResponse
                {
                    ReleaseRequestLineId = l.ReleaseRequestLineId,
                    ItemId = l.ItemId,
                    ItemCode = items.ContainsKey(l.ItemId) ? items[l.ItemId].ItemCode : null,
                    ItemName = items.ContainsKey(l.ItemId) ? items[l.ItemId].ItemName : null,
                    RequestedQty = l.RequestedQty,
                    UomId = l.UomId,
                    UomName = uoms.ContainsKey(l.UomId) ? uoms[l.UomId].UomName : null,
                    Note = l.Note,
                    ApprovedQty = l.ApprovedQty,
                    AllocatedQty = l.AllocatedQty,
                    IssuedQty = l.IssuedQty,
                    LineStatus = l.LineStatus,
                    StockQty = availableQtyByItemId.TryGetValue(l.ItemId, out var sq) ? sq : 0,
                    CostPrice = costPrices.TryGetValue(l.ItemId, out var cp) ? cp : 0,
                    UnitPrice = l.UnitCostAtIssue ?? 0,
                    PackagingSpecId = l.PackagingSpecId,
                    PackagingSpecName = items.ContainsKey(l.ItemId) && items[l.ItemId].PackagingSpec != null ? items[l.ItemId].PackagingSpec!.SpecName : null
                }).ToList()
            };
        }
    }
}
