using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
    public class GoodsDeliveryNoteService : IGoodsDeliveryNoteService
    {
        private readonly Mkiwms5Context _context;
        private readonly IStocktakeService _stocktakeService;
        private readonly IAuditLogService _auditLogService;
        private readonly IDocumentAttachmentService _documentAttachmentService;
        private readonly INotificationService _notificationService;


		public GoodsDeliveryNoteService(Mkiwms5Context context, IStocktakeService stocktakeService, IAuditLogService auditLogService, IDocumentAttachmentService documentAttachmentService, INotificationService notificationService)
        {
            _context = context;
            _stocktakeService = stocktakeService;
            _auditLogService = auditLogService;
            _documentAttachmentService = documentAttachmentService;
            _notificationService = notificationService;
        }

        // ==================== LIST ====================
        public async Task<PagedResponse<GoodsDeliveryNoteResponse>> GetGoodsDeliveryNotesAsync(GDNListRequest request)
        {
            var query = _context.GoodsDeliveryNotes
                .Include(g => g.ReleaseRequest)
                    .ThenInclude(rr => rr.Receiver)
                        .ThenInclude(r => r.Company)
                            .ThenInclude(c => c.Addresses)
                .Include(g => g.Warehouse)
                .Include(g => g.CreatedByNavigation)
                .AsNoTracking()
                .AsQueryable();

            // Filter: Search (Code, RR Code, Receiver, Company)
            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var s = request.Search.Trim().ToLower();
                query = query.Where(g => g.Gdncode.ToLower().Contains(s)
                                      || (g.ReleaseRequest != null && g.ReleaseRequest.ReleaseRequestCode.ToLower().Contains(s))
                                      || (g.ReleaseRequest != null && g.ReleaseRequest.Receiver.ReceiverName.ToLower().Contains(s))
                                      || (g.ReleaseRequest != null && g.ReleaseRequest.Receiver.Company.CompanyName.ToLower().Contains(s)));
            }

            // Filter: Status
            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                query = query.Where(g => g.Status == request.Status);
            }

            // Filter: Warehouse
            if (request.WarehouseId.HasValue)
            {
                query = query.Where(g => g.WarehouseId == request.WarehouseId);
            }

            // Filter: CreatedByName
            if (!string.IsNullOrWhiteSpace(request.CreatedByName))
            {
                var n = request.CreatedByName.Trim().ToLower();
                query = query.Where(g => g.CreatedByNavigation.FullName.ToLower().Contains(n));
            }

            // Filter: Date Range
            if (request.FromDate.HasValue)
            {
                query = query.Where(g => g.IssueDate >= request.FromDate.Value);
            }
            if (request.ToDate.HasValue)
            {
                query = query.Where(g => g.IssueDate <= request.ToDate.Value);
            }

            var totalItems = await query.CountAsync();
            var items = await query
                .OrderByDescending(g => g.Gdnid)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(g => new GoodsDeliveryNoteResponse
                {
                    GdnId = g.Gdnid,
                    GdnCode = g.Gdncode,
                    IssueDate = g.IssueDate,
                    Status = g.Status,
                    IsPaid = g.IsPaid,
                    ReleaseRequestId = g.ReleaseRequestId,
                    ReleaseRequestCode = g.ReleaseRequest != null ? g.ReleaseRequest.ReleaseRequestCode : null,
                    WarehouseId = g.WarehouseId,
                    WarehouseName = g.Warehouse != null ? g.Warehouse.WarehouseName : null,
                    CreatedBy = g.CreatedBy,
                    CreatedByName = g.CreatedByNavigation != null ? g.CreatedByNavigation.FullName : null,
                    TotalDeliveredQty = g.TotalDeliveredQty,
                    TotalDeliveredAmount = g.TotalDeliveredAmount,
                    ShippingFee = g.ShippingFee,
                    NetAmount = g.TotalDeliveredAmount + g.ShippingFee,
                    SubmittedAt = g.SubmittedAt,
                    ApprovedAt = g.ApprovedAt,
                    PostedAt = g.PostedAt,
                    Note = g.Note,
                    ReceiverId = g.ReleaseRequest != null ? (long?)g.ReleaseRequest.ReceiverId : null,
                    ReceiverName = g.ReleaseRequest != null ? g.ReleaseRequest.Receiver.ReceiverName : null,
                    CompanyId = g.ReleaseRequest != null ? g.ReleaseRequest.Receiver.CompanyId : null,
                    CompanyName = (g.ReleaseRequest != null && g.ReleaseRequest.Receiver != null) ? g.ReleaseRequest.Receiver.Company.CompanyName : null,
                    ReceiverAddress = (g.ReleaseRequest != null && g.ReleaseRequest.Receiver != null && g.ReleaseRequest.Receiver.Company != null) 
                        ? (g.ReleaseRequest.Receiver.Company.Addresses
                            .OrderByDescending(a => a.IsDefault)
                            .ThenByDescending(a => a.IsActive)
                            .Select(a => a.AddressDetail)
                            .FirstOrDefault())
                        : null
                })
                .ToListAsync();

            return new PagedResponse<GoodsDeliveryNoteResponse>
            {
                Page = request.Page,
                PageSize = request.PageSize,
                TotalItems = totalItems,
                Items = items
            };
        }

        // ==================== CREATE ====================
        public async Task<GoodsDeliveryNoteResponse> CreateGDNAsync(long userId, CreateGDNRequest request)
        {
            // 1. Validate User exists and is active
            var user = await _context.Users
                .Include(u => u.UserRoleUser)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
                throw new KeyNotFoundException("Không tìm thấy người dùng.");
            if (!user.IsActive)
                throw new InvalidOperationException("Tài khoản người dùng đã bị vô hiệu hóa.");

            // 2. Validate ReleaseRequest exists and is APPROVED
            var releaseRequest = await _context.ReleaseRequests
                .Include(rr => rr.ReleaseRequestLines)
                .Include(rr => rr.Receiver)
                    .ThenInclude(r => r.Company)
                        .ThenInclude(c => c.Addresses)
                .FirstOrDefaultAsync(rr => rr.ReleaseRequestId == request.ReleaseRequestId);

            if (releaseRequest == null)
                throw new KeyNotFoundException("Không tìm thấy yêu cầu xuất kho (Release Request).");

            if (releaseRequest.Status != "APPROVED")
                throw new InvalidOperationException($"Yêu cầu xuất kho phải ở trạng thái APPROVED để tạo phiếu xuất. Trạng thái hiện tại: {releaseRequest.Status}.");

            // 2a. Validate Warehouse match between RR and GDN
            if (releaseRequest.WarehouseId != request.WarehouseId)
                throw new InvalidOperationException($"Kho xuất ({request.WarehouseId}) không khớp với kho trong yêu cầu xuất kho ({releaseRequest.WarehouseId}).");

            // 3. Validate Warehouse exists and is active
            var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.WarehouseId == request.WarehouseId);
            if (warehouse == null)
                throw new KeyNotFoundException("Không tìm thấy kho xuất.");
            if (!warehouse.IsActive)
                throw new InvalidOperationException("Kho xuất đang không hoạt động.");

            // Kiểm tra kho có đang bị khóa (kiểm kê) không
            if (await _stocktakeService.IsWarehouseFrozenAsync(request.WarehouseId))
                throw new InvalidOperationException($"Kho '{warehouse.WarehouseName}' đang trong quá trình kiểm kê, không thể tạo phiếu xuất kho.");

            // 4. Validate IssueDate >= Today
            var today = DateTime.UtcNow.Date;
            if (request.IssueDate.ToDateTime(TimeOnly.MinValue).Date < today)
                throw new InvalidOperationException("Ngày xuất kho không được ở trong quá khứ.");

            // 5. Validate Lines not empty
            if (request.Lines == null || request.Lines.Count == 0)
                throw new InvalidOperationException("Phải có ít nhất 1 dòng sản phẩm trong phiếu xuất kho.");

            // 5. Validate duplicate items in lines
            var duplicateItems = request.Lines
                .GroupBy(l => new { l.ItemId, l.ReleaseRequestLineId })
                .Where(g => g.Count() > 1)
                .Select(g => g.Key.ItemId)
                .ToList();
            if (duplicateItems.Any())
                throw new InvalidOperationException($"Có vật tư bị trùng lặp trong danh sách: ItemId = {string.Join(", ", duplicateItems)}.");

            // 6. Validate all Items exist and are active
            var itemIds = request.Lines.Select(x => x.ItemId).Distinct().ToList();
            var items = await _context.Items
                .Where(i => itemIds.Contains(i.ItemId))
                .ToDictionaryAsync(i => i.ItemId, i => i);

            foreach (var line in request.Lines)
            {
                if (!items.ContainsKey(line.ItemId))
                    throw new KeyNotFoundException($"Vật tư với ID {line.ItemId} không tồn tại trong hệ thống.");
                if (!items[line.ItemId].IsActive)
                    throw new InvalidOperationException($"Vật tư '{items[line.ItemId].ItemName}' (ID: {line.ItemId}) đang không hoạt động.");
            }

            // 7. Validate all UOMs exist
            var uomIds = request.Lines.Select(x => x.UomId).Distinct().ToList();
            var uoms = await _context.UnitOfMeasures
                .Where(u => uomIds.Contains(u.UomId))
                .ToDictionaryAsync(u => u.UomId, u => u);

            foreach (var line in request.Lines)
            {
                if (!uoms.ContainsKey(line.UomId))
                    throw new KeyNotFoundException($"Đơn vị tính với ID {line.UomId} không tồn tại.");
            }

            // 8. Validate ReleaseRequestLineIds belong to this RR + check RemainingToIssue
            var rrLines = releaseRequest.ReleaseRequestLines.ToDictionary(l => l.ReleaseRequestLineId, l => l);

            // Tính tổng pending GDN lines cho các RR lines của phiếu xuất này
            var requestLineIds = request.Lines
                .Where(l => l.ReleaseRequestLineId.HasValue)
                .Select(l => l.ReleaseRequestLineId!.Value)
                .ToList();

            var pendingGdnLines = await _context.GoodsDeliveryNoteLines
                .Include(l => l.Gdn)
                .Where(l => l.ReleaseRequestLineId.HasValue && requestLineIds.Contains(l.ReleaseRequestLineId.Value)
                         && l.Gdn.Status != "ISSUED"
                         && l.Gdn.Status != "POSTED"
                         && l.Gdn.Status != "REJECTED"
                         && l.Gdn.Status != "CANCELLED")
                .ToListAsync();

            var pendingQtyByRrLineId = pendingGdnLines
                .GroupBy(l => l.ReleaseRequestLineId!.Value)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.ActualQty));

            foreach (var line in request.Lines)
            {
                if (line.ReleaseRequestLineId.HasValue)
                {
                    if (!rrLines.ContainsKey(line.ReleaseRequestLineId.Value))
                        throw new InvalidOperationException(
                            $"Dòng yêu cầu xuất kho (ReleaseRequestLineId = {line.ReleaseRequestLineId}) không thuộc yêu cầu xuất kho này.");

                    var rrLine = rrLines[line.ReleaseRequestLineId.Value];

                    var pendingQty = pendingQtyByRrLineId.ContainsKey(line.ReleaseRequestLineId.Value) 
                        ? pendingQtyByRrLineId[line.ReleaseRequestLineId.Value] : 0;

                    // Check remaining to issue
                    var remainingToIssue = rrLine.ApprovedQty - rrLine.IssuedQty - pendingQty;
                    if (line.ActualQty > remainingToIssue)
                        throw new InvalidOperationException(
                            $"Số lượng thực xuất ({line.ActualQty}) của vật tư '{items[line.ItemId].ItemName}' " +
                            $"vượt quá lượng cho phép ({remainingToIssue}). (Đã cấp: {rrLine.IssuedQty}, Đang chờ ở phiếu khác: {pendingQty})");

                    // Check ItemId matches
                    if (rrLine.ItemId != line.ItemId)
                        throw new InvalidOperationException(
                            $"Vật tư (ItemId = {line.ItemId}) không khớp với dòng yêu cầu xuất kho (ReleaseRequestLineId = {line.ReleaseRequestLineId}).");
                }
            }

            // 9. Validate ActualQty > 0
            foreach (var line in request.Lines)
            {
                if (line.ActualQty <= 0)
                    throw new InvalidOperationException(
                        $"Số lượng thực xuất của vật tư '{items[line.ItemId].ItemName}' phải lớn hơn 0.");
            }

            // 10. Validate inventory availability (OnHandQty)
            var inventories = await _context.InventoryOnHands
                .Where(inv => inv.WarehouseId == request.WarehouseId && itemIds.Contains(inv.ItemId))
                .ToDictionaryAsync(inv => inv.ItemId, inv => inv);

            var pendingGdnLinesByItem = await _context.GoodsDeliveryNoteLines
                .Include(l => l.Gdn)
                .Where(l => itemIds.Contains(l.ItemId)
                         && l.Gdn.WarehouseId == request.WarehouseId
                         && l.Gdn.Status != "ISSUED"
                         && l.Gdn.Status != "POSTED"
                         && l.Gdn.Status != "REJECTED"
                         && l.Gdn.Status != "CANCELLED")
                .ToListAsync();

            var pendingQtyByItem = pendingGdnLinesByItem
                .GroupBy(l => l.ItemId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.ActualQty));

            foreach (var line in request.Lines)
            {
                if (!inventories.ContainsKey(line.ItemId))
                    throw new InvalidOperationException(
                        $"Vật tư '{items[line.ItemId].ItemName}' không có tồn kho tại kho '{warehouse.WarehouseName}'.");

                var inv = inventories[line.ItemId];
                var pendingQtyForInv = pendingQtyByItem.ContainsKey(line.ItemId) ? pendingQtyByItem[line.ItemId] : 0;
                var availableStock = inv.OnHandQty - pendingQtyForInv;

                if (line.ActualQty > availableStock)
                    throw new InvalidOperationException(
                        $"Số lượng xuất ({line.ActualQty}) của '{items[line.ItemId].ItemName}' vượt khả dụng ({availableStock}). Tồn tại kho: {inv.OnHandQty}, Đang chờ xuất phiếu khác: {pendingQtyForInv}.");
            }

            // 11. Validate PaymentMethod if IsPaid
            if (request.IsPaid && string.IsNullOrWhiteSpace(request.PaymentMethod))
                throw new InvalidOperationException("Phải nhập phương thức thanh toán khi đã đánh dấu đã thanh toán.");

            // 12. Validate string lengths to match DB constraints
            if (!string.IsNullOrEmpty(request.Note) && request.Note.Length > 1000)
                throw new InvalidOperationException("Ghi chú không được vượt quá 1000 ký tự.");
            if (!string.IsNullOrEmpty(request.PaymentMethod) && request.PaymentMethod.Length > 30)
                throw new InvalidOperationException("Phương thức thanh toán không được vượt quá 30 ký tự.");

            // 12b. Enforce FIFO Picking Strategy
            var pickingStrategy = "FIFO";

            // 13. Generate GDN Code
            var gdnCode = await GenerateNextGdnCodeAsync();

            // 14. Calculate totals – UnitPrice tính bình quân gia quyền từ các lô (FIFO/LIFO)
            decimal totalDeliveredQty = 0;
            decimal totalDeliveredAmount = 0;

            // Xây dựng map ItemId → Số lượng cần xuất
            var itemQtyMap = request.Lines
                .GroupBy(l => l.ItemId)
                .ToDictionary(g => g.Key, g => g.Sum(l => l.ActualQty));

            var unitPriceByItem = await GetItemWeightedUnitPricesFromLotsAsync(request.WarehouseId, itemQtyMap);

            foreach (var line in request.Lines)
            {
                decimal unitPrice = 0;
                // Ưu tiên lấy giá đã chốt từ RR
                if (line.ReleaseRequestLineId.HasValue && rrLines.ContainsKey(line.ReleaseRequestLineId.Value))
                {
                    unitPrice = rrLines[line.ReleaseRequestLineId.Value].UnitCostAtIssue ?? 0;
                }

                // Nếu RR không có giá hoặc không theo RR, lấy giá tính toán theo FIFO
                if (unitPrice <= 0)
                {
                    unitPrice = unitPriceByItem.ContainsKey(line.ItemId) ? unitPriceByItem[line.ItemId] : 0;
                }

                if (unitPrice <= 0)
                    throw new InvalidOperationException(
                        $"Vật tư '{items[line.ItemId].ItemName}' không có lô hàng nào hợp lệ và không có giá từ yêu cầu.");

                totalDeliveredQty += line.ActualQty;
                totalDeliveredAmount += line.ActualQty * unitPrice;
            }

            var shippingFee = request.ShippingFee ?? 0;

            // 15. Create GDN entity (status = DRAFT or specified)
            var gdn = new GoodsDeliveryNote
            {
                Gdncode = gdnCode,
                ReleaseRequestId = request.ReleaseRequestId,
                WarehouseId = request.WarehouseId,
                IssueDate = request.IssueDate,
                CreatedBy = userId,
                Status = request.Status ?? "PENDING_ISSUE",
                Note = $"[{pickingStrategy}] {request.Note ?? ""}".Trim(),
                ShippingFee = shippingFee,
                IsPaid = request.IsPaid,
                PaymentMethod = request.PaymentMethod,
                TotalDeliveredQty = totalDeliveredQty,
                TotalDeliveredAmount = totalDeliveredAmount,
                ReleaseRequest = releaseRequest,
                CreatedByNavigation = user,
                Warehouse = warehouse
            };

            // If created with non-DRAFT status, set SubmittedAt
            if (gdn.Status != "DRAFT")
            {
                gdn.SubmittedAt = DateTime.UtcNow;
            }

            _context.GoodsDeliveryNotes.Add(gdn);
            await _context.SaveChangesAsync();

            // 16. Create GDN Lines – gán UnitPrice (Ưu tiên từ RR)
            foreach (var line in request.Lines)
            {
                decimal unitPrice = 0;
                if (line.ReleaseRequestLineId.HasValue && rrLines.ContainsKey(line.ReleaseRequestLineId.Value))
                {
                    unitPrice = rrLines[line.ReleaseRequestLineId.Value].UnitCostAtIssue ?? 0;
                }

                if (unitPrice <= 0)
                {
                    unitPrice = unitPriceByItem.ContainsKey(line.ItemId) ? unitPriceByItem[line.ItemId] : 0;
                }

                var gdnLine = new GoodsDeliveryNoteLine
                {
                    Gdnid = gdn.Gdnid,
                    ItemId = line.ItemId,
                    RequestedQty = line.RequestedQty,
                    ActualQty = line.ActualQty,
                    UomId = line.UomId,
                    ReleaseRequestLineId = line.ReleaseRequestLineId,
                    UnitPrice = unitPrice,
                    LineTotal = line.ActualQty * unitPrice,
                    RequiresCertificateCopy = line.RequiresCertificateCopy,
                    Note = line.Note
                };
                _context.GoodsDeliveryNoteLines.Add(gdnLine);
            }

            // 17. Create TransportInfo if provided
            if (request.TransportInfo != null)
            {
                var transport = new TransportInfo
                {
                    Gdnid = gdn.Gdnid,
                    CarrierName = request.TransportInfo.CarrierName,
                    DriverName = request.TransportInfo.DriverName,
                    DriverPhone = request.TransportInfo.DriverPhone,
                    LicensePlate = request.TransportInfo.LicensePlate,
                    Note = request.TransportInfo.Note,
                    IsActive = true
                };
                _context.TransportInfos.Add(transport);
            }

            // 18. Audit log
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Create,
                AuditEntity.GoodsDeliveryNote,
                gdn.Gdnid,
                $"Tạo phiếu xuất kho {gdnCode} từ yêu cầu {releaseRequest.ReleaseRequestCode}. Trạng thái: PENDING_ISSUE");

            await _context.SaveChangesAsync();

            var addr = releaseRequest.Receiver?.Company?.Addresses?
                .OrderByDescending(a => a.IsDefault)
                .ThenByDescending(a => a.IsActive)
                .FirstOrDefault();

            // 19. Return response
            return new GoodsDeliveryNoteResponse
            {
                GdnId = gdn.Gdnid,
                GdnCode = gdn.Gdncode,
                IssueDate = gdn.IssueDate,
                Status = gdn.Status,
                IsPaid = gdn.IsPaid,
                ReleaseRequestId = gdn.ReleaseRequestId,
                ReleaseRequestCode = releaseRequest.ReleaseRequestCode,
                WarehouseId = gdn.WarehouseId,
                WarehouseName = warehouse.WarehouseName,
                CreatedBy = gdn.CreatedBy,
                CreatedByName = user.FullName,
                TotalDeliveredQty = gdn.TotalDeliveredQty,
                TotalDeliveredAmount = gdn.TotalDeliveredAmount,
                ShippingFee = gdn.ShippingFee,
                NetAmount = gdn.TotalDeliveredAmount + gdn.ShippingFee,
                SubmittedAt = gdn.SubmittedAt,
                ApprovedAt = gdn.ApprovedAt,
                PostedAt = gdn.PostedAt,
                Note = gdn.Note,
                ReceiverId = releaseRequest.ReceiverId,
                ReceiverName = releaseRequest.Receiver?.ReceiverName,
                CompanyId = releaseRequest.Receiver?.CompanyId,
                CompanyName = releaseRequest.Receiver?.Company?.CompanyName,
                ReceiverAddress = addr?.AddressDetail
            };
        }

        // ==================== APPROVE (2-stage: Kế toán → Giám đốc) ====================
        public async Task<GoodsDeliveryNoteResponse> ApproveGDNAsync(long gdnId, long userId, ApproveGDNRequest request)
        {
            // 1. Validate GDN exists
            var gdn = await _context.GoodsDeliveryNotes
                .Include(g => g.ReleaseRequest)
                    .ThenInclude(rr => rr.Receiver)
                        .ThenInclude(r => r.Company)
                            .ThenInclude(c => c.Addresses)
                .Include(g => g.Warehouse)
                .Include(g => g.CreatedByNavigation)
                .Include(g => g.GoodsDeliveryNoteLines)
                .FirstOrDefaultAsync(g => g.Gdnid == gdnId);

            if (gdn == null)
                throw new KeyNotFoundException("Không tìm thấy phiếu xuất kho.");

            // 2. Validate user exists and get role
            var user = await _context.Users
                .Include(u => u.UserRoleUser)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
                throw new KeyNotFoundException("Không tìm thấy người dùng.");
            // 3. Determine current stage and validate role
            string decision = request.IsApproved ? "APPROVE" : "REJECT";

            if (!request.IsApproved && string.IsNullOrWhiteSpace(request.Reason))
                throw new ArgumentException("Bắt buộc phải nhập lý do khi từ chối yêu cầu.");

            if (gdn.Status == "PENDING_ACC")
            {
                // Stage 1: Kế toán duyệt
                if (request.IsApproved)
                {
                    // Approved by Accountant → move to Director
                    gdn.Status = "PENDING_DIR";
                }
                else
                {
                    // Rejected by Accountant
                    gdn.Status = "REJECTED";
                }

                // Log approval to DocumentApproval (Stage 1)
                _context.DocumentApprovals.Add(new DocumentApproval
                {
                    DocType = "GDN",
                    DocId = gdn.Gdnid,
                    StageNo = 1,
                    Decision = decision,
                    Reason = request.Reason,
                    ActionBy = userId,
                    ActionAt = DateTime.UtcNow
                });
            }
            else if (gdn.Status == "PENDING_DIR")
            {
                // Stage 2: Giám đốc duyệt

                if (request.IsApproved)
                {
                    // Kiểm tra kho có đang bị khóa (kiểm kê) không trước khi chốt trừ hàng
                    if (await _stocktakeService.IsWarehouseFrozenAsync(gdn.WarehouseId))
                        throw new InvalidOperationException($"Kho '{gdn.Warehouse.WarehouseName}' đang trong quá trình kiểm kê, không thể duyệt chốt phiếu xuất kho.");

                    // Final approval by Director -> move to PENDING_ISSUE for Warehouse Keeper
                    gdn.Status = "PENDING_ISSUE";
                    gdn.ApprovedAt = DateTime.UtcNow;

                    // Do NOT process inventory here anymore. It will be done by Warehouse Keeper.
                    // await ProcessGDNApprovalInventoryAsync(gdn, userId);
                }
                else
                {
                    // Rejected by Director
                    gdn.Status = "REJECTED";
                }

                // Log approval to DocumentApproval (Stage 2)
                _context.DocumentApprovals.Add(new DocumentApproval
                {
                    DocType = "GDN",
                    DocId = gdn.Gdnid,
                    StageNo = 2,
                    Decision = decision,
                    Reason = request.Reason,
                    ActionBy = userId,
                    ActionAt = DateTime.UtcNow
                });
            }
            else
            {
                throw new InvalidOperationException(
                    $"Phiếu xuất kho không ở trạng thái chờ duyệt. Trạng thái hiện tại: {gdn.Status}.");
            }

            // Audit log
            await _auditLogService.LogAsync(
                userId,
                request.IsApproved ? AuditAction.Approve : AuditAction.Reject,
                AuditEntity.GoodsDeliveryNote,
                gdn.Gdnid,
                $"{(request.IsApproved ? "Duyệt" : "Từ chối")} phiếu xuất kho {gdn.Gdncode}" +
                         $" (Stage: {(gdn.Status == "PENDING_ISSUE" || gdn.Status == "REJECTED" ? "Director" : "Accountant")})" +
                         (string.IsNullOrEmpty(request.Reason) ? "" : $" - Lý do: {request.Reason}"));

            await _context.SaveChangesAsync();

            // Gửi thông báo chuyển cấp hoặc kết quả
            if (request.IsApproved)
            {
                if (gdn.Status == "PENDING_DIR")
                {
                    // Thông báo cho Giám đốc
                    await _notificationService.CreateForRolesAsync(
                        new[] { "GD" },
                        "Phiếu xuất kho chờ Giám đốc duyệt",
                        $"Phiếu xuất {gdn.Gdncode} đã được Kế toán duyệt và đang chờ bạn phê duyệt cuối cùng.",
                        "GoodsDelivery",
                        gdn.Gdnid,
                        userId,
                        "NewRequest"
                    );
                }
                else if (gdn.Status == "PENDING_ISSUE")
                {
                    // Thông báo cho Thủ kho
                    await _notificationService.CreateForRolesAsync(
                        new[] { "TK" },
                        "Phiếu xuất kho sẵn sàng xuất hàng",
                        $"Phiếu xuất {gdn.Gdncode} đã được Giám đốc phê duyệt. Vui lòng thực hiện xuất hàng thực tế.",
                        "GoodsDelivery",
                        gdn.Gdnid,
                        userId,
                        "WarehouseAction"
                    );

                    // Thông báo cho người tạo phiếu biết đã duyệt xong
                    await _notificationService.CreateAsync(
                        gdn.CreatedBy,
                        $"Phiếu xuất kho {gdn.Gdncode} ĐÃ ĐƯỢC DUYỆT",
                        $"Phiếu xuất kho {gdn.Gdncode} đã được Giám đốc phê duyệt. Thủ kho sẽ thực hiện xuất hàng.",
                        "GoodsDelivery",
                        gdn.Gdnid,
                        "ApprovalResult",
                        0
                    );
                }
            }
            else
            {
                // Thông báo bị từ chối cho người tạo
                await _notificationService.CreateAsync(
                    gdn.CreatedBy,
                    $"Phiếu xuất kho {gdn.Gdncode} BỊ TỪ CHỐI",
                    $"Phiếu xuất kho {gdn.Gdncode} của bạn đã bị từ chối bởi {user.FullName}. Lý do: {request.Reason}",
                    "GoodsDelivery",
                    gdn.Gdnid,
                    "ApprovalResult",
                    2 // Warning
                );
            }

            var rr = gdn.ReleaseRequest;
            var receiver = rr?.Receiver;
            var company = receiver?.Company;
            var addr = company?.Addresses?
                .OrderByDescending(a => a.IsDefault)
                .ThenByDescending(a => a.IsActive)
                .FirstOrDefault();

            return new GoodsDeliveryNoteResponse
            {
                GdnId = gdn.Gdnid,
                GdnCode = gdn.Gdncode,
                IssueDate = gdn.IssueDate,
                Status = gdn.Status,
                IsPaid = gdn.IsPaid,
                ReleaseRequestId = gdn.ReleaseRequestId,
                ReleaseRequestCode = rr?.ReleaseRequestCode,
                WarehouseId = gdn.WarehouseId,
                WarehouseName = gdn.Warehouse?.WarehouseName,
                CreatedBy = gdn.CreatedBy,
                CreatedByName = gdn.CreatedByNavigation?.FullName,
                TotalDeliveredQty = gdn.TotalDeliveredQty,
                TotalDeliveredAmount = gdn.TotalDeliveredAmount,
                ShippingFee = gdn.ShippingFee,
                NetAmount = gdn.TotalDeliveredAmount + gdn.ShippingFee,
                SubmittedAt = gdn.SubmittedAt,
                ApprovedAt = gdn.ApprovedAt,
                PostedAt = gdn.PostedAt,
                Note = gdn.Note,
                ReceiverId = receiver?.ReceiverId,
                ReceiverName = receiver?.ReceiverName,
                CompanyId = receiver?.CompanyId,
                CompanyName = company?.CompanyName,
                ReceiverAddress = addr?.AddressDetail
            };
        }

        // ==================== DETAIL ====================
        public async Task<GDNDetailResponse> GetGDNDetailAsync(long gdnId)
        {
            var gdn = await _context.GoodsDeliveryNotes
                .Include(g => g.ReleaseRequest)
                    .ThenInclude(rr => rr.RequestedByNavigation)
                .Include(g => g.ReleaseRequest)
                    .ThenInclude(rr => rr.Receiver)
                        .ThenInclude(r => r.Company)
                            .ThenInclude(c => c.Addresses)
                .Include(g => g.ReleaseRequest)
                    .ThenInclude(rr => rr.ReleaseRequestLines)
                .Include(g => g.Warehouse)
                .Include(g => g.CreatedByNavigation)
                .Include(g => g.TransportInfo)
                .Include(g => g.GoodsDeliveryNoteLines)
                    .ThenInclude(l => l.Item)
                .Include(g => g.GoodsDeliveryNoteLines)
                    .ThenInclude(l => l.Uom)
                .FirstOrDefaultAsync(g => g.Gdnid == gdnId);

            if (gdn == null)
                throw new KeyNotFoundException("Không tìm thấy phiếu xuất kho.");

            // Get inventory for stock qty
            var itemIds = gdn.GoodsDeliveryNoteLines.Select(l => l.ItemId).Distinct().ToList();
            var stocks = await _context.InventoryOnHands
                .Where(i => i.WarehouseId == gdn.WarehouseId && itemIds.Contains(i.ItemId))
                .ToDictionaryAsync(i => i.ItemId, i => i.OnHandQty);

            // Fetch approval history
            var approvals = await _context.DocumentApprovals
                .Where(da => da.DocType == "GDN" && da.DocId == gdnId)
                .Include(da => da.ActionByNavigation)
                .OrderBy(da => da.StageNo)
                .ToListAsync();

            var lines = gdn.GoodsDeliveryNoteLines.Select(l => 
            {
                var rrLine = gdn.ReleaseRequest?.ReleaseRequestLines?.FirstOrDefault(rl => rl.ReleaseRequestLineId == l.ReleaseRequestLineId);
                
                decimal previouslyDelivered = rrLine?.IssuedQty ?? 0;
                if (gdn.PostedAt != null)
                {
                    previouslyDelivered -= l.ActualQty;
                }
                if (previouslyDelivered < 0) previouslyDelivered = 0;

                decimal approvedQty = rrLine?.ApprovedQty ?? 0;
                decimal remainingQty = approvedQty - previouslyDelivered - l.ActualQty;
                if (remainingQty < 0) remainingQty = 0;

                return new GDNLineDetailResponse
                {
                    GdnLineId = l.GdnlineId,
                    ItemId = l.ItemId,
                    ItemCode = l.Item?.ItemCode,
                    ItemName = l.Item?.ItemName,
                    RequestedQty = l.RequestedQty,
                    ActualQty = l.ActualQty,
                    UomId = l.UomId,
                    UomName = l.Uom?.UomName,
                    UnitPrice = l.UnitPrice,
                    LineTotal = l.LineTotal,
                    RequiresCertificateCopy = l.RequiresCertificateCopy,
                    ReleaseRequestLineId = l.ReleaseRequestLineId,
                    LotId = l.LotId,
                    Note = l.Note,
                    
                    // New fields
                    StockQty = stocks.ContainsKey(l.ItemId) ? stocks[l.ItemId] : 0,
                    ApprovedQty = approvedQty,
                    PreviouslyDeliveredQty = previouslyDelivered,
                    RemainingQty = remainingQty
                };
            }).ToList();

            GDNTransportInfoResponse? transportInfoResponse = null;
            if (gdn.TransportInfo != null)
            {
                transportInfoResponse = new GDNTransportInfoResponse
                {
                    TransportId = gdn.TransportInfo.TransportId,
                    CarrierName = gdn.TransportInfo.CarrierName,
                    DriverName = gdn.TransportInfo.DriverName,
                    DriverPhone = gdn.TransportInfo.DriverPhone,
                    LicensePlate = gdn.TransportInfo.LicensePlate,
                    Note = gdn.TransportInfo.Note,
                    IsActive = gdn.TransportInfo.IsActive
                };
            }

            GDNReceiverInfo? receiverInfo = null;
            if (gdn.ReleaseRequest?.Receiver != null)
            {
                var r = gdn.ReleaseRequest.Receiver;
                var addr = r.Company?.Addresses?.FirstOrDefault(a => a.IsDefault && a.IsActive) 
                           ?? r.Company?.Addresses?.FirstOrDefault(a => a.IsActive);

                receiverInfo = new GDNReceiverInfo
                {
                    ReceiverId = r.ReceiverId,
                    ReceiverName = r.ReceiverName,
                    Phone = r.Phone,
                    Email = r.Email,
                    CompanyId = r.CompanyId,
                    CompanyName = r.Company?.CompanyName,
                    Notes = r.Notes,
                    Address = addr?.AddressDetail ?? r.Address,
                    City = addr?.City ?? r.City,
                    District = addr?.District ?? r.District,
                    Ward = addr?.Ward ?? r.Ward
                };
            }

            return new GDNDetailResponse
            {
                GdnId = gdn.Gdnid,
                GdnCode = gdn.Gdncode,
                IssueDate = gdn.IssueDate,
                Status = gdn.Status,
                IsPaid = gdn.IsPaid,
                PaymentMethod = gdn.PaymentMethod,
                ReleaseRequestId = gdn.ReleaseRequestId,
                ReleaseRequestCode = gdn.ReleaseRequest?.ReleaseRequestCode,
                WarehouseId = gdn.WarehouseId,
                WarehouseName = gdn.Warehouse?.WarehouseName,
                CreatedBy = gdn.CreatedBy,
                CreatedByName = gdn.CreatedByNavigation?.FullName,
                TotalDeliveredQty = gdn.TotalDeliveredQty,
                TotalDeliveredAmount = gdn.TotalDeliveredAmount,
                ShippingFee = gdn.ShippingFee,
                NetAmount = gdn.TotalDeliveredAmount + gdn.ShippingFee,
                SubmittedAt = gdn.SubmittedAt,
                ApprovedAt = gdn.ApprovedAt,
                PostedAt = gdn.PostedAt,
                Note = gdn.Note,
                
                // Release Request header info
                RequesterName = gdn.ReleaseRequest?.RequestedByNavigation?.FullName,
                RequestDate = gdn.ReleaseRequest?.RequestedDate,
                ExpectedDate = gdn.ReleaseRequest?.ExpectedDate,

                TransportInfo = transportInfoResponse,
                Receiver = receiverInfo,
                Lines = lines,
                Approvals = approvals.Select(a => new GDNApprovalResponse
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

        // ==================== INVENTORY PROCESSING ON APPROVAL (FIFO ONLY) ====================
        private async Task ProcessGDNApprovalInventoryAsync(GoodsDeliveryNote gdn, long userId)
        {
            // 0. Tạo InventoryTransaction header
            var txn = new InventoryTransaction
            {
                TxnType = "OUTBOUND",
                TxnDate = DateTime.UtcNow,
                WarehouseId = gdn.WarehouseId,
                ReferenceType = "GDN",
                ReferenceId = gdn.Gdnid,
                Status = "POSTED",
                PostedBy = userId,
                PostedAt = DateTime.UtcNow
            };
            _context.InventoryTransactions.Add(txn);
            await _context.SaveChangesAsync(); // Lưu để có InventoryTxnId

            // 1. Lấy hàng loạt tồn kho theo ItemIds trong GDN lines
            var itemIds = gdn.GoodsDeliveryNoteLines.Select(l => l.ItemId).Distinct().ToList();

            var inventories = await _context.InventoryOnHands
                .Where(i => i.WarehouseId == gdn.WarehouseId && itemIds.Contains(i.ItemId))
                .ToDictionaryAsync(i => i.ItemId, i => i);

            var allLots = await _context.InventoryLots
                .Where(lot => lot.WarehouseId == gdn.WarehouseId
                           && itemIds.Contains(lot.ItemId)
                           && lot.IsActive
                           && lot.Quantity > 0)
                .OrderBy(lot => lot.ReceiptDate)
                .ToListAsync();

            // 2. Tạo map RR Lines đã Include sẵn (tránh N+1 query)
            var rrLinesDict = gdn.ReleaseRequest?.ReleaseRequestLines?
                .ToDictionary(l => l.ReleaseRequestLineId, l => l)
                ?? new Dictionary<long, ReleaseRequestLine>();

            // 3. Xử lý từng dòng GDN
            foreach (var line in gdn.GoodsDeliveryNoteLines)
            {
                // 3a. Trừ InventoryOnHand
                if (inventories.TryGetValue(line.ItemId, out var inv))
                {
                    inv.OnHandQty -= line.ActualQty;
                    if (inv.ReservedQty >= line.ActualQty)
                        inv.ReservedQty -= line.ActualQty;
                    else
                        inv.ReservedQty = 0;
                    inv.UpdatedAt = DateTime.UtcNow;
                }

                // 3b. Trừ tồn kho từ InventoryLots theo FIFO
                var lotsForItem = allLots.Where(lot => lot.ItemId == line.ItemId).ToList();
                decimal remainingQty = line.ActualQty;
                long? firstLotId = null;

                foreach (var lot in lotsForItem)
                {
                    if (remainingQty <= 0) break;

                    var deductQty = Math.Min(lot.Quantity, remainingQty);
                    lot.Quantity -= deductQty;
                    remainingQty -= deductQty;

                    if (lot.Quantity == 0)
                        lot.IsActive = false;

                    if (firstLotId == null)
                        firstLotId = lot.LotId;

                    // Tạo InventoryTransactionLine cho mỗi lot
                    _context.InventoryTransactionLines.Add(new InventoryTransactionLine
                    {
                        InventoryTxnId = txn.InventoryTxnId,
                        ItemId = line.ItemId,
                        QtyChange = -deductQty,
                        UomId = line.UomId,
                        LotId = lot.LotId,
                        Note = $"Xuất kho FIFO theo GDN {gdn.Gdncode} - Lot #{lot.LotId}"
                    });
                }

                // Gán LotId đầu tiên vào GDN line
                line.LotId = firstLotId;

                // 3c. Cập nhật ReleaseRequestLine.IssuedQty (dùng dữ liệu đã Include, không query lại)
                if (line.ReleaseRequestLineId.HasValue
                    && rrLinesDict.TryGetValue(line.ReleaseRequestLineId.Value, out var rrLine))
                {
                    rrLine.IssuedQty += line.ActualQty;

                    // Cập nhật LineStatus
                    if (rrLine.IssuedQty >= rrLine.ApprovedQty)
                    {
                        rrLine.LineStatus = "IssueFull";
                    }
                    else if (rrLine.IssuedQty > 0)
                    {
                        rrLine.LineStatus = "IssuePartial";
                    }
                }
            }

            // 4. Cập nhật LifecycleStatus của ReleaseRequest (dùng dữ liệu in-memory đã cập nhật)
            var rr = gdn.ReleaseRequest;
            if (rr != null && rr.ReleaseRequestLines != null)
            {
                var allFullyIssued = rr.ReleaseRequestLines.All(l => l.IssuedQty >= l.ApprovedQty);
                rr.LifecycleStatus = allFullyIssued ? "IssueFull" : "IssuePartial";
            }

            // PostedAt sẽ được gán ở ConfirmDeliveryAsync (bước POSTED), không gán ở đây
        }

        // ==================== HELPERS ====================
        private async Task<string> GenerateNextGdnCodeAsync()
        {
            var year = DateTime.UtcNow.Year;
            var prefix = $"GDN-{year}-";

            var countThisYear = await _context.GoodsDeliveryNotes
                .CountAsync(g => g.Gdncode.StartsWith(prefix));

            return $"{prefix}{(countThisYear + 1):D4}";
        }

        /// <summary>
        /// Tính giá đơn giá bình quân gia quyền dựa trên FIFO (Lô cũ nhất).
        /// </summary>
        private async Task<Dictionary<long, decimal>> GetItemWeightedUnitPricesFromLotsAsync(
            long warehouseId, Dictionary<long, decimal> itemQtyMap)
        {
            var itemIds = itemQtyMap.Keys.ToList();

            var allLots = await _context.InventoryLots
                .Where(lot => lot.WarehouseId == warehouseId
                           && itemIds.Contains(lot.ItemId)
                           && lot.IsActive
                           && lot.Quantity > 0)
                .ToListAsync();

            var result = new Dictionary<long, decimal>();

            foreach (var itemId in itemIds)
            {
                var requestedQty = itemQtyMap[itemId];

                // Sắp xếp lô theo FIFO
                var lots = allLots
                    .Where(lot => lot.ItemId == itemId)
                    .OrderBy(lot => lot.ReceiptDate)
                    .ToList();

                if (lots.Count == 0)
                {
                    result[itemId] = 0;
                    continue;
                }

                // Mô phỏng lấy hàng từ nhiều lô và tính tổng giá trị
                decimal remainingQty = requestedQty;
                decimal totalCost = 0;
                decimal totalPickedQty = 0;

                foreach (var lot in lots)
                {
                    if (remainingQty <= 0) break;

                    var pickQty = Math.Min(lot.Quantity, remainingQty);
                    totalCost += pickQty * lot.UnitCost;
                    totalPickedQty += pickQty;
                    remainingQty -= pickQty;
                }

                // Tính giá bình quân gia quyền
                result[itemId] = totalPickedQty > 0
                    ? Math.Round(totalCost / totalPickedQty, 2)
                    : 0;
            }

            return result;
        }

        // ==================== UPDATE & CANCEL (Medium Priority) ====================

        public async Task<GoodsDeliveryNoteResponse> UpdateGDNAsync(long gdnId, long userId, CreateGDNRequest request)
        {
            var gdn = await _context.GoodsDeliveryNotes
                .Include(g => g.GoodsDeliveryNoteLines)
                .Include(g => g.ReleaseRequest)
                    .ThenInclude(rr => rr.ReleaseRequestLines)
                .Include(g => g.ReleaseRequest)
                    .ThenInclude(rr => rr.Receiver)
                        .ThenInclude(r => r.Company)
                            .ThenInclude(c => c.Addresses)
                .Include(g => g.Warehouse)
                .Include(g => g.CreatedByNavigation)
                .FirstOrDefaultAsync(g => g.Gdnid == gdnId);

            if (gdn == null) throw new KeyNotFoundException("Không tìm thấy phiếu xuất kho.");
            if (gdn.Status != "PENDING_ACC")
                throw new InvalidOperationException($"Không thể cập nhật phiếu ở trạng thái {gdn.Status}.");

            // Kiểm tra kho có đang bị khóa (kiểm kê) không
            if (await _stocktakeService.IsWarehouseFrozenAsync(gdn.WarehouseId))
                throw new InvalidOperationException($"Kho đang trong quá trình kiểm kê, không thể cập nhật phiếu xuất kho.");

            // Validate IssueDate >= Today
            var today = DateTime.UtcNow.Date;
            if (request.IssueDate.ToDateTime(TimeOnly.MinValue).Date < today)
                throw new InvalidOperationException("Ngày xuất kho không được ở trong quá khứ.");

            // Cập nhật thông tin chung
            gdn.IssueDate = request.IssueDate;
            gdn.Note = request.Note;
            gdn.ShippingFee = request.ShippingFee ?? 0;

            // 12b. Enforce FIFO Picking Strategy
            var pickingStrategy = "FIFO";

            // Xây dựng map ItemId → Số lượng cần xuất
            var itemQtyMap = request.Lines
                .GroupBy(l => l.ItemId)
                .ToDictionary(g => g.Key, g => g.Sum(l => l.ActualQty));

            var unitPriceByItem = await GetItemWeightedUnitPricesFromLotsAsync(gdn.WarehouseId, itemQtyMap);

            // Xóa line cũ và thêm line mới (đơn giản hóa)
            _context.GoodsDeliveryNoteLines.RemoveRange(gdn.GoodsDeliveryNoteLines);
            
            decimal totalQty = 0;
            decimal totalAmount = 0;

            var rrLines = gdn.ReleaseRequest?.ReleaseRequestLines.ToDictionary(l => l.ReleaseRequestLineId, l => l)
                        ?? new Dictionary<long, ReleaseRequestLine>();

            foreach (var lineReq in request.Lines)
            {
                decimal unitPrice = 0;
                // Ưu tiên lấy giá từ RR
                if (lineReq.ReleaseRequestLineId.HasValue && rrLines.ContainsKey(lineReq.ReleaseRequestLineId.Value))
                {
                    unitPrice = rrLines[lineReq.ReleaseRequestLineId.Value].UnitCostAtIssue ?? 0;
                }

                // Fallback nếu không có giá RR
                if (unitPrice <= 0)
                {
                    unitPrice = unitPriceByItem.ContainsKey(lineReq.ItemId) ? unitPriceByItem[lineReq.ItemId] : 0;
                }

                var lineTotal = lineReq.ActualQty * unitPrice;

                var line = new GoodsDeliveryNoteLine
                {
                    Gdnid = gdn.Gdnid,
                    ItemId = lineReq.ItemId,
                    UomId = lineReq.UomId,
                    ActualQty = lineReq.ActualQty,
                    UnitPrice = unitPrice,
                    LineTotal = lineTotal,
                    ReleaseRequestLineId = lineReq.ReleaseRequestLineId,
                    Note = lineReq.Note
                };
                gdn.GoodsDeliveryNoteLines.Add(line);
                totalQty += line.ActualQty;
                totalAmount += lineTotal;
            }

            gdn.TotalDeliveredQty = totalQty;
            gdn.TotalDeliveredAmount = totalAmount;

            await _context.SaveChangesAsync();

            var rr = gdn.ReleaseRequest;
            var receiver = rr?.Receiver;
            var company = receiver?.Company;
            var addr = company?.Addresses?
                .OrderByDescending(a => a.IsDefault)
                .ThenByDescending(a => a.IsActive)
                .FirstOrDefault();

            return new GoodsDeliveryNoteResponse
            {
                GdnId = gdn.Gdnid,
                GdnCode = gdn.Gdncode,
                IssueDate = gdn.IssueDate,
                Status = gdn.Status,
                IsPaid = gdn.IsPaid,
                ReleaseRequestId = gdn.ReleaseRequestId,
                ReleaseRequestCode = rr?.ReleaseRequestCode,
                WarehouseId = gdn.WarehouseId,
                WarehouseName = gdn.Warehouse?.WarehouseName,
                CreatedBy = gdn.CreatedBy,
                CreatedByName = gdn.CreatedByNavigation?.FullName,
                TotalDeliveredQty = gdn.TotalDeliveredQty,
                TotalDeliveredAmount = gdn.TotalDeliveredAmount,
                ShippingFee = gdn.ShippingFee,
                NetAmount = gdn.TotalDeliveredAmount + gdn.ShippingFee,
                SubmittedAt = gdn.SubmittedAt,
                ApprovedAt = gdn.ApprovedAt,
                PostedAt = gdn.PostedAt,
                Note = gdn.Note,
                ReceiverId = receiver?.ReceiverId,
                ReceiverName = receiver?.ReceiverName,
                CompanyId = receiver?.CompanyId,
                CompanyName = company?.CompanyName,
                ReceiverAddress = addr?.AddressDetail
            };
        }

        public async Task<bool> CancelGDNAsync(long gdnId, long userId, string reason)
        {
            var gdn = await _context.GoodsDeliveryNotes.FirstOrDefaultAsync(g => g.Gdnid == gdnId);
            if (gdn == null) throw new KeyNotFoundException("Không tìm thấy phiếu xuất kho.");

            if (gdn.Status == "ISSUED" || gdn.Status == "POSTED" || gdn.Status == "CANCELLED")
                throw new InvalidOperationException($"Không thể hủy phiếu ở trạng thái {gdn.Status}.");

            gdn.Status = "CANCELLED";

            await _auditLogService.LogAsync(
                userId,
                "CANCEL",
                "GoodsDeliveryNote",
                gdnId,
                $"Hủy phiếu xuất kho {gdn.Gdncode}. Lý do: {reason}"
            );

            await _context.SaveChangesAsync();
            return true;
        }
        public async Task<GoodsDeliveryNoteResponse> IssueGDNAsync(long gdnId, long userId, WarehouseIssueRequest request)
        {
            var gdn = await _context.GoodsDeliveryNotes
                .Include(g => g.ReleaseRequest)
                    .ThenInclude(rr => rr.Receiver)
                        .ThenInclude(r => r.Company)
                            .ThenInclude(c => c.Addresses)
                .Include(g => g.ReleaseRequest)
                    .ThenInclude(rr => rr.ReleaseRequestLines)
                .Include(g => g.Warehouse)
                .Include(g => g.CreatedByNavigation)
                .Include(g => g.GoodsDeliveryNoteLines)
                    .ThenInclude(l => l.Item)
                .Include(g => g.GoodsDeliveryNoteLines)
                    .ThenInclude(l => l.Uom)
                .FirstOrDefaultAsync(g => g.Gdnid == gdnId);

            if (gdn == null)
                throw new KeyNotFoundException("Không tìm thấy phiếu xuất kho.");

            if (gdn.Status != "PENDING_ISSUE")
                throw new InvalidOperationException($"Phiếu xuất kho không ở trạng thái chờ xuất hàng. Trạng thái hiện tại: {gdn.Status}.");

            var user = await _context.Users
                .Include(u => u.UserRoleUser)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
                throw new KeyNotFoundException("Không tìm thấy người dùng.");

            // 11. Cập nhật số lượng thực xuất (nếu có gửi kèm danh sách chi tiết)
            if (request.Lines != null && request.Lines.Any())
            {
                var linesDict = gdn.GoodsDeliveryNoteLines.ToDictionary(l => l.GdnlineId, l => l);
                string partialNote = "";

                foreach (var lineReq in request.Lines)
                {
                    if (!linesDict.TryGetValue(lineReq.GdnLineId, out var line))
                        throw new KeyNotFoundException($"Dòng vật tư với ID {lineReq.GdnLineId} không thuộc phiếu xuất {gdn.Gdncode}.");

                    if (lineReq.ActualQty > line.RequestedQty)
                        throw new InvalidOperationException(
                            $"Số lượng thực xuất ({lineReq.ActualQty}) của '{line.Item?.ItemName ?? line.ItemId.ToString()}' " +
                            $"không được vượt quá số lượng ban đầu ({line.RequestedQty}).");

                    if (lineReq.ActualQty < line.RequestedQty)
                    {
                        var diff = line.RequestedQty - lineReq.ActualQty;
                        partialNote += $"- {line.Item?.ItemName ?? line.ItemId.ToString()}: Xuất thiếu {diff} {line.Uom?.UomName}. ";
                    }

                    line.ActualQty = lineReq.ActualQty;
                    line.LineTotal = line.ActualQty * (line.UnitPrice ?? 0);
                    _context.Entry(line).State = EntityState.Modified;
                }

                if (!string.IsNullOrEmpty(partialNote))
                {
                    var partialMsg = $"[Lưu ý Xuất thiếu] {partialNote.Trim()}";
                    gdn.Note = string.IsNullOrEmpty(gdn.Note) ? partialMsg : $"{gdn.Note} | {partialMsg}";
                }

                gdn.TotalDeliveredQty = gdn.GoodsDeliveryNoteLines.Sum(l => l.ActualQty);
                gdn.TotalDeliveredAmount = gdn.GoodsDeliveryNoteLines.Sum(l => l.LineTotal ?? 0);
            }
            else if (request.IsAllItemsFulfilled)
            {
                foreach (var line in gdn.GoodsDeliveryNoteLines)
                {
                    line.ActualQty = line.RequestedQty ?? 0;
                    line.LineTotal = line.ActualQty * (line.UnitPrice ?? 0);
                    _context.Entry(line).State = EntityState.Modified;
                }
                gdn.TotalDeliveredQty = gdn.GoodsDeliveryNoteLines.Sum(l => l.ActualQty);
                gdn.TotalDeliveredAmount = gdn.GoodsDeliveryNoteLines.Sum(l => l.LineTotal ?? 0);
            }

            if (!string.IsNullOrEmpty(request.Note))
            {
                var noteAddition = $"Xác nhận bởi Thủ kho: {request.Note}".Trim();
                gdn.Note = string.IsNullOrEmpty(gdn.Note) ? noteAddition : $"{gdn.Note} | {noteAddition}";
            }

            if (await _stocktakeService.IsWarehouseFrozenAsync(gdn.WarehouseId))
                throw new InvalidOperationException($"Kho '{gdn.Warehouse.WarehouseName}' đang trong quá trình kiểm kê, không thể thực hiện xuất hàng.");

            // [Điều chỉnh] Thực hiện trừ hàng thực tế ngay khi Thủ kho xác nhận xuất hàng
            gdn.Status = "ISSUED";
            await ProcessGDNApprovalInventoryAsync(gdn, userId);

            _context.DocumentApprovals.Add(new DocumentApproval
            {
                DocType = "GDN",
                DocId = gdn.Gdnid,
                StageNo = 3,
                Decision = "ISSUE",
                Reason = request.Note,
                ActionBy = userId,
                ActionAt = DateTime.UtcNow
            });

            await _auditLogService.LogAsync(
                userId,
                "ISSUE",
                "GoodsDeliveryNote",
                gdn.Gdnid,
                $"Thủ kho xác nhận xuất hàng cho phiếu {gdn.Gdncode}."
            );

            await _context.SaveChangesAsync();

            // Thông báo cho người tạo là hàng đã được xuất (Thủ kho xác nhận)
            await _notificationService.CreateAsync(
                gdn.CreatedBy,
                $"Phiếu xuất kho {gdn.Gdncode} ĐÃ XUẤT HÀNG",
                $"Thủ kho đã xác nhận xuất hàng cho phiếu {gdn.Gdncode}. Vui lòng kiểm tra và hoàn tất hồ sơ.",
                "GoodsDelivery",
                gdn.Gdnid,
                "ShippingStatus",
                1
            );

            var rr = gdn.ReleaseRequest;
            var receiver = rr?.Receiver;
            var company = receiver?.Company;
            var addr = company?.Addresses?.OrderByDescending(a => a.IsDefault).ThenByDescending(a => a.IsActive).FirstOrDefault();

            return new GoodsDeliveryNoteResponse
            {
                GdnId = gdn.Gdnid,
                GdnCode = gdn.Gdncode,
                IssueDate = gdn.IssueDate,
                Status = gdn.Status,
                IsPaid = gdn.IsPaid,
                ReleaseRequestId = gdn.ReleaseRequestId,
                ReleaseRequestCode = rr?.ReleaseRequestCode,
                WarehouseId = gdn.WarehouseId,
                WarehouseName = gdn.Warehouse?.WarehouseName,
                CreatedBy = gdn.CreatedBy,
                CreatedByName = gdn.CreatedByNavigation?.FullName,
                TotalDeliveredQty = gdn.TotalDeliveredQty,
                TotalDeliveredAmount = gdn.TotalDeliveredAmount,
                ShippingFee = gdn.ShippingFee,
                NetAmount = gdn.TotalDeliveredAmount + gdn.ShippingFee,
                SubmittedAt = gdn.SubmittedAt,
                ApprovedAt = gdn.ApprovedAt,
                PostedAt = gdn.PostedAt,
                Note = gdn.Note,
                ReceiverId = receiver?.ReceiverId,
                ReceiverName = receiver?.ReceiverName,
                CompanyId = receiver?.CompanyId,
                CompanyName = company?.CompanyName,
                ReceiverAddress = addr?.AddressDetail
            };
        }

        // ==================== CONFIRM DELIVERY (POSTED) ====================
        public async Task<GoodsDeliveryNoteResponse> ConfirmDeliveryAsync(long gdnId, long userId, IFormFile evidenceFile, string note)
        {
            var gdn = await _context.GoodsDeliveryNotes
                .Include(g => g.ReleaseRequest)
                    .ThenInclude(rr => rr.Receiver)
                        .ThenInclude(r => r.Company)
                            .ThenInclude(c => c.Addresses)
                .Include(g => g.ReleaseRequest)
                    .ThenInclude(rr => rr.ReleaseRequestLines)
                .Include(g => g.Warehouse)
                .Include(g => g.CreatedByNavigation)
                .Include(g => g.GoodsDeliveryNoteLines)
                .FirstOrDefaultAsync(g => g.Gdnid == gdnId);

            if (gdn == null)
                throw new KeyNotFoundException("Không tìm thấy phiếu xuất kho.");

            if (gdn.Status != "ISSUED")
                throw new InvalidOperationException($"Không thể xác nhận hoàn tất phiếu ở trạng thái {gdn.Status}. Cần phải ở trạng thái ISSUED.");

            if (evidenceFile == null || evidenceFile.Length == 0)
                throw new InvalidOperationException("Bắt buộc phải tải lên ảnh chụp Phiếu xuất kho có đầy đủ chữ ký xác nhận của Khách hàng và Thủ kho để hoàn tất.");

            var user = await _context.Users
                .Include(u => u.UserRoleUser)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
                throw new KeyNotFoundException("Không tìm thấy người dùng.");

            // Upload the file
            var fileUrl = await _documentAttachmentService.UploadAttachmentAsync(
                docType: "GDN",
                docId: gdn.Gdnid,
                file: evidenceFile,
                userId: userId,
                attachmentType: "EVIDENCE"
			);

            // Ghi nhận chứng từ hoàn tất
            gdn.Status = "POSTED";
            if (!string.IsNullOrEmpty(note))
            {
                var noteAddition = $"Minh chứng: {note}".Trim();
                if (string.IsNullOrEmpty(gdn.Note))
                    gdn.Note = noteAddition;
                else if (!gdn.Note.Contains(noteAddition))
                    gdn.Note = $"{gdn.Note} | {noteAddition}";
            }

            // Cập nhật thời điểm hoàn thành toàn bộ quy trình
            gdn.PostedAt = DateTime.UtcNow;

            // Document Approval
            _context.DocumentApprovals.Add(new DocumentApproval
            {
                DocType = "GDN",
                DocId = gdn.Gdnid,
                StageNo = 4,
                Decision = "POSTED",
                Reason = note ?? "Upload bằng chứng xuất hàng",
                ActionBy = userId,
                ActionAt = DateTime.UtcNow
            });

            // Audit log
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Close,
                AuditEntity.GoodsDeliveryNote,
                gdn.Gdnid,
                $"Hoàn tất xuất kho phiếu {gdn.Gdncode}. Đã tải lên ảnh Phiếu xuất có chữ ký xác nhận: {fileUrl}."
            );

            await _context.SaveChangesAsync();

            // Thông báo hoàn tất phiếu (Accountant / Manager đóng phiếu)
            await _notificationService.CreateAsync(
                gdn.CreatedBy,
                $"Phiếu xuất kho {gdn.Gdncode} HOÀN TẤT",
                $"Phiếu xuất kho {gdn.Gdncode} đã được xác nhận hoàn tất và ghi sổ thành công.",
                "GoodsDelivery",
                gdn.Gdnid,
                "ApprovalResult",
                1
            );

            var rr = gdn.ReleaseRequest;
            var receiver = rr?.Receiver;
            var company = receiver?.Company;
            var addr = company?.Addresses?.OrderByDescending(a => a.IsDefault).ThenByDescending(a => a.IsActive).FirstOrDefault();

            return new GoodsDeliveryNoteResponse
            {
                GdnId = gdn.Gdnid,
                GdnCode = gdn.Gdncode,
                IssueDate = gdn.IssueDate,
                Status = gdn.Status,
                IsPaid = gdn.IsPaid,
                ReleaseRequestId = gdn.ReleaseRequestId,
                ReleaseRequestCode = rr?.ReleaseRequestCode,
                WarehouseId = gdn.WarehouseId,
                WarehouseName = gdn.Warehouse?.WarehouseName,
                CreatedBy = gdn.CreatedBy,
                CreatedByName = gdn.CreatedByNavigation?.FullName,
                TotalDeliveredQty = gdn.TotalDeliveredQty,
                TotalDeliveredAmount = gdn.TotalDeliveredAmount,
                ShippingFee = gdn.ShippingFee,
                NetAmount = gdn.TotalDeliveredAmount + gdn.ShippingFee,
                SubmittedAt = gdn.SubmittedAt,
                ApprovedAt = gdn.ApprovedAt,
                PostedAt = gdn.PostedAt,
                Note = gdn.Note,
                ReceiverId = receiver?.ReceiverId,
                ReceiverName = receiver?.ReceiverName,
                CompanyId = receiver?.CompanyId,
                CompanyName = company?.CompanyName,
                ReceiverAddress = addr?.AddressDetail
            };
        }
    }
}
