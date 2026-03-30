using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
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

		// Role codes for approval stages
		// private const string ROLE_ACCOUNTANT = "ACCOUNTANT";   // Kế toán - Stage 1
		// private const string ROLE_DIRECTOR = "DIRECTOR";       // Giám đốc - Stage 2
		private const string ROLE_ACCOUNTANT = "KT"; 
        private const string ROLE_DIRECTOR = "GD";
		public GoodsDeliveryNoteService(Mkiwms5Context context, IStocktakeService stocktakeService, IAuditLogService auditLogService)
        {
            _context = context;
            _stocktakeService = stocktakeService;
            _auditLogService = auditLogService;
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
                         && l.Gdn.Status != "APPROVED"
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
                         && l.Gdn.Status != "APPROVED"
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

            // 12b. Validate PickingStrategy
            var pickingStrategy = (request.PickingStrategy ?? "FIFO").ToUpperInvariant();
            if (pickingStrategy != "FIFO" && pickingStrategy != "LIFO")
                throw new InvalidOperationException("Chiến lược xuất kho chỉ chấp nhận 'FIFO' hoặc 'LIFO'.");

            // 13. Generate GDN Code
            var gdnCode = await GenerateNextGdnCodeAsync();

            // 14. Calculate totals – UnitPrice lấy từ InventoryLot.UnitCost (lot đầu tiên theo FIFO/LIFO)
            decimal totalDeliveredQty = 0;
            decimal totalDeliveredAmount = 0;

            // Truy vấn lot đầu tiên (theo FIFO/LIFO) cho mỗi item trong kho này
            var allLots = await _context.InventoryLots
                .Where(lot => lot.WarehouseId == request.WarehouseId
                           && itemIds.Contains(lot.ItemId)
                           && lot.IsActive
                           && lot.Quantity > 0)
                .ToListAsync();

            var firstLotByItem = allLots
                .GroupBy(lot => lot.ItemId)
                .ToDictionary(
                    g => g.Key,
                    g => pickingStrategy == "LIFO"
                        ? g.OrderByDescending(lot => lot.ReceiptDate).First()
                        : g.OrderBy(lot => lot.ReceiptDate).First()
                );

            foreach (var line in request.Lines)
            {
                if (!firstLotByItem.ContainsKey(line.ItemId))
                    throw new InvalidOperationException(
                        $"Vật tư '{items[line.ItemId].ItemName}' không có lô hàng nào trong kho '{warehouse.WarehouseName}'.");

                var unitPrice = firstLotByItem[line.ItemId].UnitCost;
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
                Status = request.Status ?? "PENDING_ACC",
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

            // 16. Create GDN Lines – gán UnitPrice từ InventoryLot.UnitCost
            foreach (var line in request.Lines)
            {
                var unitPrice = firstLotByItem[line.ItemId].UnitCost;
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
                    Note = request.TransportInfo.Note
                };
                _context.TransportInfos.Add(transport);
            }

            // 18. Audit log
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Create,
                AuditEntity.GoodsDeliveryNote,
                gdn.Gdnid,
                $"Tạo phiếu xuất kho {gdnCode} từ yêu cầu {releaseRequest.ReleaseRequestCode}");

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

            var userRoleCode = user.UserRoleUser?.Role?.RoleCode;

            // 3. Determine current stage and validate role
            string decision = request.IsApproved ? "APPROVE" : "REJECT";

            if (gdn.Status == "PENDING_ACC")
            {
                // Stage 1: Kế toán duyệt
                if (userRoleCode != ROLE_ACCOUNTANT)
                    throw new InvalidOperationException(
                        "Chỉ Kế toán mới có quyền duyệt phiếu xuất kho ở giai đoạn này.");

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
                if (userRoleCode != ROLE_DIRECTOR)
                    throw new InvalidOperationException(
                        "Chỉ Giám đốc mới có quyền duyệt phiếu xuất kho ở giai đoạn này.");

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
                         $" (Stage: {(gdn.Status == "APPROVED" || gdn.Status == "REJECTED" ? "Final" : "Accountant")})" +
                         (string.IsNullOrEmpty(request.Reason) ? "" : $" - Lý do: {request.Reason}"));

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
                    Note = gdn.TransportInfo.Note
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

        // ==================== INVENTORY PROCESSING ON APPROVAL (FIFO/LIFO) ====================
        private async Task ProcessGDNApprovalInventoryAsync(GoodsDeliveryNote gdn, long userId)
        {
            // Xác định chiến lược xuất kho từ Note (hoặc mặc định FIFO)
            var pickingStrategy = "FIFO";
            if (!string.IsNullOrEmpty(gdn.Note))
            {
                var noteUpper = gdn.Note.ToUpperInvariant();
                if (noteUpper.Contains("[LIFO]"))
                    pickingStrategy = "LIFO";
                else if (noteUpper.Contains("[FIFO]"))
                    pickingStrategy = "FIFO";
            }

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
            await _context.SaveChangesAsync();

            foreach (var line in gdn.GoodsDeliveryNoteLines)
            {
                // 1. Cập nhật InventoryOnHand
                var inv = await _context.InventoryOnHands
                    .FirstOrDefaultAsync(i => i.WarehouseId == gdn.WarehouseId && i.ItemId == line.ItemId);

                if (inv != null)
                {
                    inv.OnHandQty -= line.ActualQty;
                    if (inv.ReservedQty >= line.ActualQty)
                        inv.ReservedQty -= line.ActualQty;
                    else
                        inv.ReservedQty = 0;
                    inv.UpdatedAt = DateTime.UtcNow;
                }

                // 2. Trừ tồn kho từ InventoryLots theo FIFO hoặc LIFO
                var lotsQuery = _context.InventoryLots
                    .Where(lot => lot.ItemId == line.ItemId
                               && lot.WarehouseId == gdn.WarehouseId
                               && lot.IsActive
                               && lot.Quantity > 0);

                var lots = pickingStrategy == "LIFO"
                    ? await lotsQuery.OrderByDescending(lot => lot.ReceiptDate).ToListAsync()
                    : await lotsQuery.OrderBy(lot => lot.ReceiptDate).ToListAsync();

                decimal remainingQty = line.ActualQty;
                long? firstLotId = null;

                foreach (var lot in lots)
                {
                    if (remainingQty <= 0) break;

                    var deductQty = Math.Min(lot.Quantity, remainingQty);
                    lot.Quantity -= deductQty;
                    remainingQty -= deductQty;

                    if (lot.Quantity == 0)
                        lot.IsActive = false;

                    // Ghi nhận lot đầu tiên cho GDN line
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
                        Note = $"Xuất kho theo GDN {gdn.Gdncode} ({pickingStrategy}) - Lot #{lot.LotId}"
                    });
                }

                // Gán LotId đầu tiên vào GDN line (tham chiếu lot chính)
                line.LotId = firstLotId;

                // 3. Cập nhật ReleaseRequestLine.IssuedQty
                if (line.ReleaseRequestLineId.HasValue)
                {
                    var rrLine = await _context.ReleaseRequestLines
                        .FirstOrDefaultAsync(l => l.ReleaseRequestLineId == line.ReleaseRequestLineId.Value);

                    if (rrLine != null)
                    {
                        rrLine.IssuedQty += line.ActualQty;
                    }
                }
            }

            // 4. Cập nhật LifecycleStatus của ReleaseRequest
            var rr = gdn.ReleaseRequest;
            if (rr != null)
            {
                var allLines = await _context.ReleaseRequestLines
                    .Where(l => l.ReleaseRequestId == rr.ReleaseRequestId)
                    .ToListAsync();

                var allFullyIssued = allLines.All(l => l.IssuedQty >= l.ApprovedQty);
                if (allFullyIssued)
                {
                    rr.LifecycleStatus = "IssueFull";
                }
                else
                {
                    rr.LifecycleStatus = "IssuePartial";
                }
            }

            gdn.PostedAt = DateTime.UtcNow;
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

        // ==================== UPDATE & CANCEL (Medium Priority) ====================

        public async Task<GoodsDeliveryNoteResponse> UpdateGDNAsync(long gdnId, long userId, CreateGDNRequest request)
        {
            var gdn = await _context.GoodsDeliveryNotes
                .Include(g => g.GoodsDeliveryNoteLines)
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

            // Xóa line cũ và thêm line mới (đơn giản hóa)
            _context.GoodsDeliveryNoteLines.RemoveRange(gdn.GoodsDeliveryNoteLines);
            
            decimal totalQty = 0;
            decimal totalAmount = 0;

            foreach (var lineReq in request.Lines)
            {
                var line = new GoodsDeliveryNoteLine
                {
                    Gdnid = gdn.Gdnid,
                    ItemId = lineReq.ItemId,
                    UomId = lineReq.UomId,
                    ActualQty = lineReq.ActualQty,
                    UnitPrice = lineReq.UnitPrice,
                    LineTotal = lineReq.ActualQty * lineReq.UnitPrice,
                    ReleaseRequestLineId = lineReq.ReleaseRequestLineId,
                    Note = lineReq.Note
                };
                gdn.GoodsDeliveryNoteLines.Add(line);
                totalQty += line.ActualQty;
                totalAmount += (line.LineTotal ?? 0);
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

            if (gdn.Status == "APPROVED" || gdn.Status == "CANCELLED")
                throw new InvalidOperationException($"Không thể hủy phiếu ở trạng thái {gdn.Status}.");

            gdn.Status = "CANCELLED";

            _context.AuditLogs.Add(new AuditLog
            {
                ActorUserId = userId,
                Action = "CANCEL",
                EntityType = "GoodsDeliveryNote",
                EntityId = gdnId,
                Detail = $"Hủy phiếu xuất kho {gdn.Gdncode}. Lý do: {reason}",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return true;
        }
        private const string ROLE_WAREHOUSE_KEEPER = "WAREHOUSE_KEEPER";

        public async Task<GoodsDeliveryNoteResponse> IssueGDNAsync(long gdnId, long userId, WarehouseIssueRequest request)
        {
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

            if (gdn.Status != "PENDING_ISSUE")
                throw new InvalidOperationException($"Phiếu xuất kho không ở trạng thái chờ xuất hàng. Trạng thái hiện tại: {gdn.Status}.");

            var user = await _context.Users
                .Include(u => u.UserRoleUser)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
                throw new KeyNotFoundException("Không tìm thấy người dùng.");

            var userRoleCode = user.UserRoleUser?.Role?.RoleCode;
            bool isWarehouseKeeper = userRoleCode == ROLE_WAREHOUSE_KEEPER || userRoleCode == "TK" || userRoleCode == "WAREHOUSE_KEEPER";// || userRoleCode == "WAREHOUSE_KEEPER"
			bool isAdmin = userRoleCode == "ADMIN";

            if (!isWarehouseKeeper && !isAdmin)
                throw new InvalidOperationException("Chỉ Thủ kho mới có quyền xác nhận xuất hàng.");

            if (!request.IsAllItemsFulfilled && request.Lines != null && request.Lines.Any())
            {
                var linesDict = gdn.GoodsDeliveryNoteLines.ToDictionary(l => l.GdnlineId, l => l);
                decimal newTotalQty = 0;
                decimal newTotalAmount = 0;

                foreach (var lineReq in request.Lines)
                {
                    if (linesDict.ContainsKey(lineReq.GdnLineId))
                    {
                        var line = linesDict[lineReq.GdnLineId];
                        line.ActualQty = lineReq.ActualQty;
                        line.LineTotal = line.ActualQty * (line.UnitPrice ?? 0);
                    }
                }

                foreach (var line in gdn.GoodsDeliveryNoteLines)
                {
                    newTotalQty += line.ActualQty;
                    newTotalAmount += (line.LineTotal ?? 0);
                }
                gdn.TotalDeliveredQty = newTotalQty;
                gdn.TotalDeliveredAmount = newTotalAmount;
            }

            if (!string.IsNullOrEmpty(request.Note))
            {
                gdn.Note = $"{gdn.Note} | Xác nhận bởi Thủ kho: {request.Note}".Trim();
            }

            if (await _stocktakeService.IsWarehouseFrozenAsync(gdn.WarehouseId))
                throw new InvalidOperationException($"Kho '{gdn.Warehouse.WarehouseName}' đang trong quá trình kiểm kê, không thể thực hiện xuất hàng.");

            await ProcessGDNApprovalInventoryAsync(gdn, userId);
            gdn.Status = "ISSUED";

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

            _context.AuditLogs.Add(new AuditLog
            {
                ActorUserId = userId,
                Action = "ISSUE",
                EntityType = "GoodsDeliveryNote",
                EntityId = gdn.Gdnid,
                Detail = $"Thủ kho xác nhận xuất hàng cho phiếu {gdn.Gdncode}.",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

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
