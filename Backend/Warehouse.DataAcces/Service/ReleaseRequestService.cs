using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using System.IO;
using System.Net;
using System.Net.Mail;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _hostEnvironment;

        public ReleaseRequestService(
            Mkiwms5Context context,
            IStocktakeService stocktakeService,
            INotificationService notificationService,
            IAuditLogService auditLogService,
            IDocumentAttachmentService documentAttachmentService,
            IConfiguration configuration,
            IWebHostEnvironment hostEnvironment)
        {
            _context = context;
            _stocktakeService = stocktakeService;
            _notificationService = notificationService;
            _auditLogService = auditLogService;
            _documentAttachmentService = documentAttachmentService;
            _configuration = configuration;
            _hostEnvironment = hostEnvironment;
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
                Status = request.Status ?? "DRAFT",
				IsPartialDeliveryAllowed = request.IsPartialDeliveryAllowed,
                LifecycleStatus = "IssuePending",
                CreatedAt = now,
                SubmittedAt = request.Status == "PENDING_ACC" ? now : null,
                IsQuotationFlow = request.IsQuotationFlow,
                QuotationStatus = request.IsQuotationFlow ? "DRAFT" : null,
                QuotationVersion = 1
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
                if (line.UnitPrice.HasValue
                    && unitCostsDb.TryGetValue(line.ItemId, out var weightedAvgCost)
                    && line.UnitPrice.Value < weightedAvgCost)
                {
                    throw new InvalidOperationException(
                        $"Đơn giá của vật tư '{items[line.ItemId].ItemName}' không được nhỏ hơn giá bình quân gia quyền ({weightedAvgCost}).");
                }

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
                    CreatedAt = rr.CreatedAt,
                    IsQuotationFlow = rr.IsQuotationFlow,
                    QuotationStatus = rr.QuotationStatus,
                    QuotationSentAt = rr.QuotationSentAt,
                    QuotationConfirmedAt = rr.QuotationConfirmedAt,
                    QuotationVersion = rr.QuotationVersion
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

            var relatedGdns = await _context.GoodsDeliveryNotes
                .Where(g => g.ReleaseRequestId == id)
                .Select(g => new RrRelatedGdnSnapshot
                {
                    Gdnid = g.Gdnid,
                    Gdncode = g.Gdncode,
                    CreatedBy = g.CreatedBy,
                    SubmittedAt = g.SubmittedAt,
                    ApprovedAt = g.ApprovedAt,
                    PostedAt = g.PostedAt
                })
                .ToListAsync();

            var gdnIds = relatedGdns.Select(g => g.Gdnid).ToList();
            var auditLogs = await _context.AuditLogs
                .Include(a => a.ActorUser)
                .Where(a =>
                    (a.EntityType == AuditEntity.ReleaseRequest && a.EntityId == id) ||
                    (a.EntityType == AuditEntity.GoodsDeliveryNote && a.EntityId.HasValue && gdnIds.Contains(a.EntityId.Value)))
                .ToListAsync();

            var historyEvents = BuildReleaseRequestHistoryEvents(rr, approvals, relatedGdns, auditLogs);

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
                IsQuotationFlow = rr.IsQuotationFlow,
                QuotationStatus = rr.QuotationStatus,
                QuotationSentAt = rr.QuotationSentAt,
                QuotationConfirmedAt = rr.QuotationConfirmedAt,
                QuotationVersion = rr.QuotationVersion,
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
                    IssuedQty = l.IssuedQty,
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
                }).ToList(),
                HistoryEvents = historyEvents
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

            if (request.IsQuotationFlow.HasValue)
            {
                rr.IsQuotationFlow = request.IsQuotationFlow.Value;
                if (request.IsQuotationFlow.Value && string.IsNullOrWhiteSpace(rr.QuotationStatus))
                    rr.QuotationStatus = "DRAFT";
            }

            // 8.2. Cập nhật trạng thái và validate nếu gửi duyệt
            string oldStatus = rr.Status;
            bool shouldNotifyAccountantOnSubmit = false;
            if (!string.IsNullOrEmpty(request.Status))
            {
                if (request.Status == "PENDING_ACC" && oldStatus == "DRAFT")
                {
                    if (rr.IsQuotationFlow && rr.QuotationStatus != "CONFIRMED")
                        throw new InvalidOperationException("RR báo giá chỉ được gửi duyệt khi đã Chốt báo giá.");

                    // Kiểm tra hồ sơ bắt buộc khi gửi duyệt (Kiểm tra trong database)
                    var hasQuotation = await _context.DocumentAttachments.AnyAsync(a => a.DocType == "GIR" && a.DocId == id && a.AttachmentType == "QUOTATION");
                    var hasContract = await _context.DocumentAttachments.AnyAsync(
                        a => a.DocType == "GIR" && a.DocId == id && (a.AttachmentType == "CONTRACT" || a.AttachmentType == "CO"));

                    if (!hasQuotation) throw new InvalidOperationException("Vui lòng tải lên tài liệu Báo giá trước khi gửi duyệt.");
                    if (!hasContract) throw new InvalidOperationException("Vui lòng tải lên tài liệu Hợp đồng trước khi gửi duyệt.");

                    rr.Status = "PENDING_ACC";
                    rr.SubmittedAt = DateTime.UtcNow;
                    shouldNotifyAccountantOnSubmit = true;
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
                    if (lineReq.UnitPrice.HasValue
                        && unitCostsDb.TryGetValue(lineReq.ItemId, out var weightedAvgCost)
                        && lineReq.UnitPrice.Value < weightedAvgCost)
                    {
                        var itemName = items.TryGetValue(lineReq.ItemId, out var item)
                            ? item.ItemName
                            : $"ID {lineReq.ItemId}";
                        throw new InvalidOperationException(
                            $"Đơn giá của vật tư '{itemName}' không được nhỏ hơn giá bình quân gia quyền ({weightedAvgCost}).");
                    }

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

            if (shouldNotifyAccountantOnSubmit)
            {
                var requesterName = await _context.Users
                    .Where(u => u.UserId == rr.RequestedBy)
                    .Select(u => u.FullName)
                    .FirstOrDefaultAsync() ?? "Người dùng";

                await _notificationService.CreateForRolesAsync(
                    new[] { UserRoleConstants.Accountant },
                    "Yêu cầu xuất kho mới chờ duyệt",
                    $"Yêu cầu xuất kho {rr.ReleaseRequestCode} vừa được gửi duyệt bởi {requesterName}.",
                    "Release",
                    rr.ReleaseRequestId,
                    rr.RequestedBy,
                    NotificationTypes.NewRequest
                );
            }

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
                    var hasContract = await _context.DocumentAttachments.AnyAsync(
                        a => a.DocType == "GIR" && a.DocId == id && (a.AttachmentType == "CONTRACT" || a.AttachmentType == "CO"));

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

        public async Task<byte[]> ExportQuotationExcelAsync(long id, long userId, ExportRrQuotationExcelRequest request)
        {
            var rr = await GetReleaseRequestByIdAsync(id)
                ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu xuất kho.");

            var lines = rr.Lines ?? new List<ReleaseRequestLineResponse>();
            if (lines.Count == 0)
                throw new InvalidOperationException("RR không có dòng hàng để xuất báo giá.");

            var templatePath = ResolveQuotationTemplatePath();
            if (string.IsNullOrWhiteSpace(templatePath) || !File.Exists(templatePath))
                throw new InvalidOperationException(
                    "Không tìm thấy file mẫu báo giá MK (Mau-bao-gia-MK.xlsx). Hãy đặt file vào wwwroot/templates hoặc cấu hình Quotation:TemplatePath.");

            var vatPercent = _configuration.GetValue("Quotation:VatPercent", 8m);
            if (vatPercent < 0 || vatPercent > 100)
                vatPercent = 8m;
            var quoteNo = string.IsNullOrWhiteSpace(request?.QuotationNo)
                ? throw new InvalidOperationException("Vui lòng nhập Số báo giá.")
                : request.QuotationNo.Trim();
            var notes = NormalizeQuotationNotes(request?.Notes);

            using var templateStream = File.OpenRead(templatePath);
            using var workbook = new XLWorkbook(templateStream);
            var ws = workbook.Worksheets.First();
            ApplyQuotationStampOverlay(ws);

            // Giữ nguyên bố cục tổng thể của template (không chèn cột toàn sheet để tránh lệch chữ ký/dấu).
            // Chỉ tách vùng bảng hàng: B = Mã hàng, C:E = Tên hàng.
            ws.Range("B19:E19").Unmerge();
            ws.Cell("B19").Value = "Mã sản phẩm";
            ws.Range("C19:E19").Merge();
            ws.Cell("C19").Value = "Tên hàng hóa sản phẩm";

            var customer = !string.IsNullOrWhiteSpace(rr.Receiver?.CompanyName)
                ? rr.Receiver!.CompanyName!.Trim()
                : (rr.Receiver?.ReceiverName ?? string.Empty).Trim();
            ws.Cell("C12").Value = customer;

            var draftLocal = ToVietnamLocal(rr.CreatedAt);
            ws.Cell("A9").Value = $"Số: {quoteNo}";
            ws.Cell("A10").Value = $"Ngày: {draftLocal:dd/MM/yyyy}";
            // Metadata để validate import đúng RR (ẩn với người dùng).
            ws.Cell("Z1").Value = rr.ReleaseRequestCode ?? string.Empty;
            ws.Column("Z").Hide();

            const int templateFirstDataRow = 20;
            const int templateFirstTotalRow = 22;
            var lineCount = lines.Count;
            var rowShift = 0;

            if (lineCount == 1)
            {
                ws.Row(21).Delete();
                rowShift = -1;
            }
            else if (lineCount > 2)
            {
                ws.Row(templateFirstTotalRow).InsertRowsAbove(lineCount - 2);
                rowShift = lineCount - 2;
            }

            var firstDataRow = templateFirstDataRow;
            var lastDataRow = templateFirstDataRow + lineCount - 1;
            var subtotalRow = lastDataRow + 1;
            var vatRow = subtotalRow + 1;
            var grandRow = subtotalRow + 2;

            for (var i = 0; i < lineCount; i++)
            {
                var line = lines[i];
                var r = firstDataRow + i;

                ws.Cell(r, 1).Value = i + 1;
                ws.Cell(r, 2).Value = line.ItemCode ?? string.Empty;
                ws.Range(ws.Cell(r, 2), ws.Cell(r, 5)).Unmerge();
                ws.Range(ws.Cell(r, 3), ws.Cell(r, 5)).Merge();
                ws.Cell(r, 3).Value = line.ItemName ?? string.Empty;
                ws.Cell(r, 6).Value = FormatUomForQuotationExcel(line.UomName);
                ws.Cell(r, 7).Value = line.RequestedQty;
                var price = line.UnitPrice ?? 0;
                ws.Cell(r, 8).Value = price;
                ws.Cell(r, 9).FormulaA1 = $"H{r}*G{r}";
            }

            // Tổng / VAT / sau thuế — cột thành tiền là I (9), nhãn tổng ở C:H.
            ws.Range(ws.Cell(subtotalRow, 2), ws.Cell(subtotalRow, 8)).Unmerge();
            ws.Range(ws.Cell(subtotalRow, 3), ws.Cell(subtotalRow, 8)).Merge();
            ws.Cell(subtotalRow, 3).Value = "Tổng tiền hàng (VND)";
            ws.Cell(subtotalRow, 9).FormulaA1 = $"SUM(I{firstDataRow}:I{lastDataRow})";

            ws.Range(ws.Cell(vatRow, 2), ws.Cell(vatRow, 8)).Unmerge();
            ws.Range(ws.Cell(vatRow, 3), ws.Cell(vatRow, 8)).Merge();
            ws.Cell(vatRow, 3).Value = $"Thuế VAT {vatPercent}%";
            var vatFactor = (vatPercent / 100m).ToString(CultureInfo.InvariantCulture);
            ws.Cell(vatRow, 9).FormulaA1 = $"I{subtotalRow}*{vatFactor}";

            ws.Range(ws.Cell(grandRow, 2), ws.Cell(grandRow, 8)).Unmerge();
            ws.Range(ws.Cell(grandRow, 3), ws.Cell(grandRow, 8)).Merge();
            ws.Cell(grandRow, 3).Value = "Tổng giá trị sau thuế (VND)";
            ws.Cell(grandRow, 9).FormulaA1 = $"I{subtotalRow}+I{vatRow}";

            // Vùng ghi chú gốc bắt đầu tại A27; cần dịch theo số dòng đã chèn/xóa phía trên.
            ApplyCustomQuotationNotes(ws, notes, 27 + rowShift);

            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            return ms.ToArray();
        }

        private static List<(string Title, string Detail)> NormalizeQuotationNotes(List<RrQuotationNoteItemRequest>? notes)
        {
            const int maxNotes = 4;
            if (notes == null || notes.Count == 0)
                throw new InvalidOperationException("Vui lòng nhập ít nhất 1 ghi chú báo giá.");
            if (notes.Count > maxNotes)
                throw new InvalidOperationException($"Chỉ hỗ trợ tối đa {maxNotes} ghi chú báo giá (A27:A30).");

            var normalized = notes
                .Select((n, idx) => new
                {
                    Index = idx + 1,
                    Title = n?.Title?.Trim() ?? string.Empty,
                    Detail = n?.Detail?.Trim() ?? string.Empty
                })
                .ToList();

            var invalid = normalized.FirstOrDefault(x => string.IsNullOrWhiteSpace(x.Title) || string.IsNullOrWhiteSpace(x.Detail));
            if (invalid != null)
                throw new InvalidOperationException($"Ghi chú dòng {invalid.Index} phải có đủ tiêu đề và nội dung.");

            return normalized.Select(x => (x.Title, x.Detail)).ToList();
        }

        private static void ApplyCustomQuotationNotes(IXLWorksheet ws, List<(string Title, string Detail)> notes, int firstNoteRow)
        {
            const int fixedNoteRows = 4; // A27:A30
            var noteCount = Math.Min(notes.Count, fixedNoteRows);

            for (var i = 0; i < noteCount; i++)
            {
                var row = firstNoteRow + i;
                var (title, detail) = notes[i];
                ws.Range(row, 1, row, 3).Unmerge();
                ws.Range(row, 4, row, 9).Unmerge();
                ws.Range(row, 4, row, 9).Merge();
                ws.Cell(row, 1).Value = title;
                var detailCell = ws.Cell(row, 4);
                detailCell.Value = detail;
                detailCell.Style.Alignment.WrapText = true;
                detailCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Top;

                // Excel thường không auto-fit đúng chiều cao cho ô đã merge.
                // Tính gần đúng số dòng hiển thị để tăng chiều cao row tương ứng.
                var estimatedLines = EstimateWrappedLineCount(detail);
                var baseHeight = ws.Row(row).Height > 0 ? ws.Row(row).Height : 15d;
                var targetHeight = Math.Max(baseHeight, 18d + ((estimatedLines - 1) * 14d));
                ws.Row(row).Height = targetHeight;
            }

            // Xóa sạch phần ghi chú mẫu còn dư theo đúng vùng cố định A27:A30.
            for (var row = firstNoteRow + noteCount; row < firstNoteRow + fixedNoteRows; row++)
            {
                ws.Range(row, 1, row, 3).Unmerge();
                ws.Range(row, 4, row, 9).Unmerge();
                ws.Range(row, 4, row, 9).Merge();
                ws.Cell(row, 1).Value = string.Empty;
                ws.Cell(row, 4).Value = string.Empty;
                ws.Row(row).Height = 15d;
            }
        }

        private static int EstimateWrappedLineCount(string? text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return 1;

            const int charsPerVisualLine = 68;
            var normalized = text.Replace("\r\n", "\n").Replace('\r', '\n');
            var physicalLines = normalized.Split('\n');

            var total = 0;
            foreach (var line in physicalLines)
            {
                var len = line.Length;
                total += Math.Max(1, (int)Math.Ceiling(len / (double)charsPerVisualLine));
            }
            return Math.Max(1, total);
        }

        private string? ResolveQuotationTemplatePath() => ResolveQuotationTemplatePathFromConfig(_configuration);

        private void ApplyQuotationStampOverlay(IXLWorksheet ws)
        {
            var stampPath = ResolveQuotationStampPathFromConfig(_configuration);
            if (string.IsNullOrWhiteSpace(stampPath) || !File.Exists(stampPath))
                return;

            var configuredScale = _configuration.GetValue("Quotation:StampScale", 0.95d);
            var scale = configuredScale < 0.2d || configuredScale > 3d ? 0.95d : configuredScale;

            // Overlay con dấu mới tại khu vực ký bên phải của mẫu báo giá.
            // Dùng overlay để giữ nguyên bố cục template hiện tại.
            ws.AddPicture(stampPath)
                .MoveTo(ws.Cell("H35"))
                .Scale(scale);
        }

        private static string? ResolveQuotationTemplatePathFromConfig(IConfiguration configuration)
        {
            var cfg = configuration["Quotation:TemplatePath"];
            if (!string.IsNullOrWhiteSpace(cfg) && File.Exists(cfg))
                return cfg;

            var baseDir = AppContext.BaseDirectory;
            var candidates = new[]
            {
                Path.Combine(baseDir, "wwwroot", "templates", "Mau-bao-gia-MK.xlsx"),
                Path.Combine(baseDir, "Templates", "Mau-bao-gia-MK.xlsx"),
                Path.Combine(baseDir, "Mau-bao-gia-MK.xlsx"),
            };
            return candidates.FirstOrDefault(File.Exists);
        }

        private static string? ResolveQuotationStampPathFromConfig(IConfiguration configuration)
        {
            var cfg = configuration["Quotation:StampImagePath"];
            if (!string.IsNullOrWhiteSpace(cfg) && File.Exists(cfg))
                return cfg;

            var baseDir = AppContext.BaseDirectory;
            var candidates = new[]
            {
                Path.Combine(baseDir, "wwwroot", "templates", "quotation-stamp.png"),
                Path.Combine(baseDir, "Templates", "quotation-stamp.png"),
                Path.Combine(baseDir, "quotation-stamp.png"),
            };
            return candidates.FirstOrDefault(File.Exists);
        }

        private static DateTime ToVietnamLocal(DateTime createdAt)
        {
            var utc = createdAt.Kind switch
            {
                DateTimeKind.Utc => createdAt,
                DateTimeKind.Local => createdAt.ToUniversalTime(),
                _ => DateTime.SpecifyKind(createdAt, DateTimeKind.Utc),
            };
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
                return TimeZoneInfo.ConvertTimeFromUtc(utc, tz);
            }
            catch
            {
                return createdAt.ToLocalTime();
            }
        }

        /// <summary>
        /// Đưa tên ĐVT trong báo giá Excel sang tiếng Việt khi master data đang lưu dạng tiếng Anh/mã quốc tế.
        /// Không khớp bảng ánh xạ thì giữ nguyên (đã là tiếng Việt vẫn hiển thị đúng).
        /// </summary>
        private static string FormatUomForQuotationExcel(string? uomName)
        {
            if (string.IsNullOrWhiteSpace(uomName))
                return string.Empty;

            var key = uomName.Trim();
            if (QuotationUomEnglishToVietnamese.TryGetValue(key, out var direct))
                return direct;

            foreach (var part in key.Split(new[] { ' ', '\t', '/', '-', '(', ')', ',', ';' }, StringSplitOptions.RemoveEmptyEntries))
            {
                if (QuotationUomEnglishToVietnamese.TryGetValue(part, out var mapped))
                    return mapped;
            }

            return key;
        }

        private static readonly Dictionary<string, string> QuotationUomEnglishToVietnamese =
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["PCS"] = "Cái",
                ["PC"] = "Cái",
                ["PIECE"] = "Cái",
                ["PIECES"] = "Cái",
                ["UNIT"] = "Cái",
                ["UNITS"] = "Cái",
                ["EACH"] = "Cái",
                ["EA"] = "Cái",
                ["PAIR"] = "Đôi",
                ["PR"] = "Đôi",
                ["BOX"] = "Hộp",
                ["PACK"] = "Gói",
                ["PKG"] = "Gói",
                ["PK"] = "Gói",
                ["SET"] = "Bộ",
                ["BAG"] = "Bao",
                ["SACK"] = "Bao",
                ["ROLL"] = "Cuộn",
                ["ROL"] = "Cuộn",
                ["SHEET"] = "Tờ",
                ["TUBE"] = "Ống",
                ["CAN"] = "Lon",
                ["BOTTLE"] = "Chai",
                ["BT"] = "Chai",
                ["DRUM"] = "Thùng phuy",
                ["CTN"] = "Thùng",
                ["CARTON"] = "Thùng",
                ["CASE"] = "Thùng",
                ["PALLET"] = "Pallet",
                ["PLT"] = "Pallet",
                ["DOZEN"] = "Tá",
                ["DZ"] = "Tá",
                ["KG"] = "kg",
                ["KGS"] = "kg",
                ["KILOGRAM"] = "kg",
                ["KILOGRAMS"] = "kg",
                ["G"] = "gam",
                ["GRAM"] = "gam",
                ["GRAMS"] = "gam",
                ["GAM"] = "gam",
                ["TON"] = "tấn",
                ["TONS"] = "tấn",
                ["MT"] = "tấn",
                ["M"] = "mét",
                ["METER"] = "mét",
                ["METRE"] = "mét",
                ["METERS"] = "mét",
                ["CM"] = "cm",
                ["MM"] = "mm",
                ["L"] = "lít",
                ["LIT"] = "lít",
                ["LITER"] = "lít",
                ["LITRE"] = "lít",
                ["LITERS"] = "lít",
                ["ML"] = "mililít",
                ["M2"] = "m²",
                ["M3"] = "m³",
                ["SQ.M"] = "m²",
                ["SQM"] = "m²",
                ["CBM"] = "m³",
            };

        public async Task SendQuotationEmailAsync(long id, long userId, SendRrQuotationEmailRequest request)
        {
            var rr = await _context.ReleaseRequests
                .Include(x => x.Receiver)
                .FirstOrDefaultAsync(x => x.ReleaseRequestId == id)
                ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu xuất kho.");

            if (rr.Status != "DRAFT" || !rr.IsQuotationFlow)
                throw new InvalidOperationException("Chỉ gửi báo giá khi RR đang ở trạng thái DRAFT và bật luồng báo giá.");

            var excelBytes = await ExportQuotationExcelAsync(id, userId, new ExportRrQuotationExcelRequest
            {
                QuotationNo = request.QuotationNo,
                Notes = request.Notes
            });
            var fileName = $"{rr.ReleaseRequestCode}-quotation.xlsx";

            var smtpSection = _configuration.GetSection("Smtp");
            var host = smtpSection["Host"];
            var username = smtpSection["Username"];
            var password = smtpSection["Password"];
            var fromName = smtpSection["FromName"] ?? "MKI WMS";
            var port = int.Parse(smtpSection["Port"] ?? "587");
            var enableSsl = bool.Parse(smtpSection["EnableSsl"] ?? "true");

            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
                throw new InvalidOperationException("Thiếu cấu hình SMTP để gửi email.");

            var toList = request.ToEmails?.Where(e => !string.IsNullOrWhiteSpace(e)).Select(e => e.Trim()).Distinct().ToList() ?? new();
            if (toList.Count == 0 && !string.IsNullOrWhiteSpace(rr.Receiver?.Email))
                toList.Add(rr.Receiver.Email.Trim());
            if (toList.Count == 0)
                throw new InvalidOperationException("Không có email người nhận hợp lệ.");

            var log = new ReleaseRequestEmailLog
            {
                ReleaseRequestId = rr.ReleaseRequestId,
                SenderUserId = userId,
                ToEmails = string.Join(";", toList),
                CcEmails = request.CcEmails == null ? null : string.Join(";", request.CcEmails),
                BccEmails = request.BccEmails == null ? null : string.Join(";", request.BccEmails),
                Subject = request.Subject,
                SentAt = DateTime.UtcNow,
                Status = "FAILED"
            };

            try
            {
                using var message = new MailMessage
                {
                    From = new MailAddress(username, fromName),
                    Subject = request.Subject,
                    Body = request.Body,
                    IsBodyHtml = true
                };
                toList.ForEach(x => message.To.Add(x));
                request.CcEmails?.Where(x => !string.IsNullOrWhiteSpace(x)).ToList().ForEach(x => message.CC.Add(x.Trim()));
                request.BccEmails?.Where(x => !string.IsNullOrWhiteSpace(x)).ToList().ForEach(x => message.Bcc.Add(x.Trim()));

                var stream = new MemoryStream(excelBytes);
                message.Attachments.Add(new Attachment(stream, fileName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));

                using var smtp = new SmtpClient(host, port)
                {
                    EnableSsl = enableSsl,
                    Credentials = new NetworkCredential(username, password)
                };
                await smtp.SendMailAsync(message);

                log.Status = "SENT";
                rr.QuotationStatus = "SENT";
                rr.QuotationSentAt = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                log.ErrorMessage = ex.Message;
                throw;
            }
            finally
            {
                _context.Set<ReleaseRequestEmailLog>().Add(log);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<ReleaseRequestDetailResponse> ImportQuotationExcelAsync(long id, long userId, IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new InvalidOperationException("Tệp import không hợp lệ.");

            var rr = await _context.ReleaseRequests
                .Include(r => r.ReleaseRequestLines)
                    .ThenInclude(l => l.Item)
                .FirstOrDefaultAsync(r => r.ReleaseRequestId == id)
                ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu xuất kho.");

            if (rr.Status != "DRAFT" || !rr.IsQuotationFlow)
                throw new InvalidOperationException("Chỉ import báo giá khi RR là DRAFT và bật luồng báo giá.");

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            var fileBytes = ms.ToArray();
            if (fileBytes.Length < 4
                || fileBytes[0] != (byte)'P'
                || fileBytes[1] != (byte)'K')
            {
                throw new InvalidOperationException(
                    "File import không đúng định dạng .xlsx hợp lệ. Vui lòng dùng file Excel do hệ thống xuất ra.");
            }

            XLWorkbook wb;
            try
            {
                wb = new XLWorkbook(new MemoryStream(fileBytes, writable: false));
            }
            catch (Exception ex) when (ex.Message.Contains("Bad binary signature", StringComparison.OrdinalIgnoreCase))
            {
                // Fallback: một số workbook mở được trên Excel nhưng ClosedXML có thể lỗi khi load trực tiếp từ stream.
                // Thử lại bằng file tạm trên đĩa để tăng khả năng tương thích.
                var tempPath = Path.Combine(Path.GetTempPath(), $"rr-import-{Guid.NewGuid():N}.xlsx");
                try
                {
                    await File.WriteAllBytesAsync(tempPath, fileBytes);
                    wb = new XLWorkbook(tempPath);
                }
                catch
                {
                    throw new InvalidOperationException(
                        "Không thể đọc file import. Vui lòng dùng đúng file Excel (.xlsx) do hệ thống xuất ra và thử lại.");
                }
                finally
                {
                    try
                    {
                        if (File.Exists(tempPath)) File.Delete(tempPath);
                    }
                    catch
                    {
                        // Bỏ qua lỗi xóa file tạm
                    }
                }
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException(
                    "File import không hợp lệ hoặc đã bị hỏng. Vui lòng kiểm tra lại file Excel rồi thử lại.", ex);
            }
            using (wb)
            {
            var ws = wb.Worksheets.FirstOrDefault() ?? throw new InvalidOperationException("File Excel không hợp lệ.");

            var headerRow = 5;
            var dataStart = 6;
            var colItemCode = 1;
            var colUnitPrice = 5;

            var a19 = ws.Cell(19, 1).GetString().Trim();
            var b19 = ws.Cell(19, 2).GetString().Trim();
            if (a19.Contains("STT", StringComparison.OrdinalIgnoreCase)
                && (b19.Contains("ItemCode", StringComparison.OrdinalIgnoreCase)
                    || b19.Contains("Mã hàng", StringComparison.OrdinalIgnoreCase)
                    || b19.Contains("Mã sản phẩm", StringComparison.OrdinalIgnoreCase)))
            {
                headerRow = 19;
                dataStart = 20;
                colItemCode = 2;
                colUnitPrice = 9;
            }
            else if (!string.Equals(ws.Cell(headerRow, colItemCode).GetString().Trim(), "ItemCode", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Template Excel không đúng định dạng: cần mẫu MK (hàng 19: STT + Mã hàng) hoặc mẫu cũ (hàng 5: ItemCode).");
            }

            var row = dataStart;
            var seenCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var lineByItemCode = rr.ReleaseRequestLines
                .Where(l => l.Item != null && !string.IsNullOrWhiteSpace(l.Item.ItemCode))
                .ToDictionary(l => l.Item!.ItemCode, l => l, StringComparer.OrdinalIgnoreCase);

            var embeddedRrCode = ws.Cell("Z1").GetString().Trim();
            if (string.IsNullOrWhiteSpace(embeddedRrCode))
            {
                throw new InvalidOperationException(
                    "File import không đúng định dạng do hệ thống xuất ra. Vui lòng dùng đúng file Excel báo giá đã export từ RR.");
            }
            if (!string.Equals(embeddedRrCode, rr.ReleaseRequestCode, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"Báo giá này thuộc yêu cầu '{embeddedRrCode}', không phải '{rr.ReleaseRequestCode}'. Vui lòng kiểm tra lại.");
            }

            while (row < 5000)
            {
                var itemCode = ws.Cell(row, colItemCode).GetString().Trim();
                if (string.IsNullOrWhiteSpace(itemCode))
                    break;

                var labelProbe = ws.Cell(row, 3).GetString().Trim();
                if (labelProbe.StartsWith("Tổng tiền", StringComparison.OrdinalIgnoreCase)
                    || itemCode.StartsWith("Tổng", StringComparison.OrdinalIgnoreCase))
                    break;

                if (!seenCodes.Add(itemCode))
                    throw new InvalidOperationException($"Dòng {row}: ItemCode '{itemCode}' bị trùng trong file.");
                if (!lineByItemCode.TryGetValue(itemCode, out var rrLine))
                    throw new InvalidOperationException($"Dòng {row}: ItemCode '{itemCode}' không tồn tại trong RR.");

                if (!decimal.TryParse(ws.Cell(row, colUnitPrice).GetString(), out var unitPrice))
                    unitPrice = ws.Cell(row, colUnitPrice).GetValue<decimal>();
                if (unitPrice < 0)
                    throw new InvalidOperationException($"Dòng {row}: UnitPrice không hợp lệ.");

                rrLine.UnitCostAtIssue = unitPrice;
                row++;
            }

            if (row == dataStart)
                throw new InvalidOperationException("Không đọc được dòng dữ liệu nào từ file (thiếu ItemCode).");

            rr.QuotationVersion += 1;
            rr.QuotationStatus = "DRAFT";
            await _context.SaveChangesAsync();
            await _auditLogService.LogAsync(userId, "IMPORT_QUOTATION", "ReleaseRequest", id, $"Import báo giá excel cho {rr.ReleaseRequestCode}");

            return await GetReleaseRequestByIdAsync(id)
                ?? throw new Exception("Lỗi khi lấy thông tin yêu cầu xuất kho.");
            }
        }

        public async Task<ReleaseRequestDetailResponse> ConfirmQuotationAsync(long id, long userId, ConfirmRrQuotationRequest request)
        {
            var rr = await _context.ReleaseRequests
                .Include(x => x.ReleaseRequestLines)
                .FirstOrDefaultAsync(x => x.ReleaseRequestId == id)
                ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu xuất kho.");
            if (rr.Status != "DRAFT" || !rr.IsQuotationFlow)
                throw new InvalidOperationException("Chỉ chốt báo giá khi RR DRAFT và thuộc luồng báo giá.");
            // Bắt buộc user phải upload lại báo giá chính thức trước khi chốt.
            // Không tự động xuất + ghi đè file báo giá ở bước chốt để đảm bảo đúng file đã làm việc với khách.
            var hasQuotationAttachment = await _context.DocumentAttachments
                .AnyAsync(a => a.DocType == "GIR" && a.DocId == id && a.AttachmentType == "QUOTATION");
            if (!hasQuotationAttachment)
                throw new InvalidOperationException("Vui lòng tải lên file Báo giá chính thức trước khi chốt báo giá.");

            var hasContractAttachment = await _context.DocumentAttachments
                .AnyAsync(a => a.DocType == "GIR" && a.DocId == id && (a.AttachmentType == "CONTRACT" || a.AttachmentType == "CO"));
            if (!hasContractAttachment)
                throw new InvalidOperationException("Vui lòng tải lên tài liệu Hợp đồng trước khi chốt báo giá.");

            rr.QuotationStatus = "CONFIRMED";
            rr.QuotationConfirmedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var submitRequest = new UpdateReleaseRequestRequest
            {
                Status = "PENDING_ACC",
                Lines = rr.ReleaseRequestLines.Select(l => new UpdateReleaseRequestLineRequest
                {
                    ReleaseRequestLineId = l.ReleaseRequestLineId,
                    ItemId = l.ItemId,
                    RequestedQty = l.RequestedQty,
                    UomId = l.UomId,
                    Note = l.Note,
                    UnitPrice = l.UnitCostAtIssue,
                    PackagingSpecId = l.PackagingSpecId
                }).ToList()
            };
            var updated = await UpdateReleaseRequestAsync(id, userId, submitRequest);

            await _auditLogService.LogAsync(userId, "CONFIRM_QUOTATION", "ReleaseRequest", id, $"Chốt báo giá {rr.ReleaseRequestCode}. {request.Note}");

            return updated;
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
                IsQuotationFlow = rr.IsQuotationFlow,
                QuotationStatus = rr.QuotationStatus,
                QuotationSentAt = rr.QuotationSentAt,
                QuotationConfirmedAt = rr.QuotationConfirmedAt,
                QuotationVersion = rr.QuotationVersion,
                Attachments = attachments ?? new(),
                HistoryEvents = new(),
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

        private static List<OutboundHistoryEventResponse> BuildReleaseRequestHistoryEvents(
            ReleaseRequest rr,
            List<DocumentApproval> approvals,
            List<RrRelatedGdnSnapshot> relatedGdns,
            List<AuditLog> auditLogs)
        {
            var events = new List<OutboundHistoryEventResponse>();

            events.Add(new OutboundHistoryEventResponse
            {
                EventType = "RR_CREATED",
                Title = "Tạo yêu cầu xuất kho",
                Description = rr.ReleaseRequestCode,
                OccurredAt = rr.CreatedAt,
                Source = "RR",
                SourceId = rr.ReleaseRequestId,
                ActorUserId = rr.RequestedBy,
                ActorName = rr.RequestedByNavigation?.FullName
            });

            if (rr.SubmittedAt.HasValue)
            {
                events.Add(new OutboundHistoryEventResponse
                {
                    EventType = "RR_SUBMITTED",
                    Title = "Gửi duyệt yêu cầu xuất kho",
                    Description = rr.ReleaseRequestCode,
                    OccurredAt = rr.SubmittedAt.Value,
                    Source = "RR",
                    SourceId = rr.ReleaseRequestId,
                    ActorUserId = rr.RequestedBy,
                    ActorName = rr.RequestedByNavigation?.FullName
                });
            }

            if (rr.QuotationSentAt.HasValue)
            {
                events.Add(new OutboundHistoryEventResponse
                {
                    EventType = "QUOTATION_SENT",
                    Title = "Gửi báo giá",
                    Description = rr.ReleaseRequestCode,
                    OccurredAt = rr.QuotationSentAt.Value,
                    Source = "RR",
                    SourceId = rr.ReleaseRequestId
                });
            }

            if (rr.QuotationConfirmedAt.HasValue)
            {
                events.Add(new OutboundHistoryEventResponse
                {
                    EventType = "QUOTATION_CONFIRMED",
                    Title = "Chốt báo giá",
                    Description = rr.ReleaseRequestCode,
                    OccurredAt = rr.QuotationConfirmedAt.Value,
                    Source = "RR",
                    SourceId = rr.ReleaseRequestId
                });
            }

            events.AddRange(approvals.Select(a => new OutboundHistoryEventResponse
            {
                EventType = $"RR_{a.Decision}",
                Title = a.Decision == "APPROVE" ? "Duyệt yêu cầu xuất kho" : "Từ chối yêu cầu xuất kho",
                Description = a.Reason,
                OccurredAt = a.ActionAt,
                Source = "RR_APPROVAL",
                SourceId = a.ApprovalId,
                ActorUserId = a.ActionBy,
                ActorName = a.ActionByNavigation?.FullName
            }));

            foreach (var g in relatedGdns)
            {
                if (g.SubmittedAt.HasValue)
                {
                    events.Add(new OutboundHistoryEventResponse
                    {
                        EventType = "GDN_SUBMITTED",
                        Title = "Tạo/Gửi phiếu xuất kho",
                        Description = g.Gdncode,
                        OccurredAt = g.SubmittedAt.Value,
                        Source = "GDN",
                        SourceId = g.Gdnid,
                        ActorUserId = g.CreatedBy
                    });
                }
                if (g.ApprovedAt.HasValue)
                {
                    events.Add(new OutboundHistoryEventResponse
                    {
                        EventType = "GDN_ISSUED",
                        Title = "Xác nhận xuất kho",
                        Description = g.Gdncode,
                        OccurredAt = g.ApprovedAt.Value,
                        Source = "GDN",
                        SourceId = g.Gdnid
                    });
                }
                if (g.PostedAt.HasValue)
                {
                    events.Add(new OutboundHistoryEventResponse
                    {
                        EventType = "GDN_POSTED",
                        Title = "Xác nhận giao hàng",
                        Description = g.Gdncode,
                        OccurredAt = g.PostedAt.Value,
                        Source = "GDN",
                        SourceId = g.Gdnid
                    });
                }
            }

            events.AddRange(auditLogs.Select(a => new OutboundHistoryEventResponse
            {
                EventType = $"{a.EntityType}_{a.Action}",
                Title = $"{a.Action} {a.EntityType}",
                Description = a.Detail,
                OccurredAt = a.CreatedAt,
                Source = "AUDIT",
                SourceId = a.AuditLogId,
                ActorUserId = a.ActorUserId,
                ActorName = a.ActorUser?.FullName ?? a.ActorUser?.Username
            }));

            return events
                .GroupBy(e => new { e.EventType, e.OccurredAt, e.Source, e.SourceId })
                .Select(g => g.First())
                .OrderByDescending(e => e.OccurredAt)
                .ToList();
        }

        private sealed class RrRelatedGdnSnapshot
        {
            public long Gdnid { get; set; }
            public string Gdncode { get; set; } = string.Empty;
            public long CreatedBy { get; set; }
            public DateTime? SubmittedAt { get; set; }
            public DateTime? ApprovedAt { get; set; }
            public DateTime? PostedAt { get; set; }
        }
    }
}
