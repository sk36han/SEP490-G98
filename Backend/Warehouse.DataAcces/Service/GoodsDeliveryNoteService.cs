using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
    public class GoodsDeliveryNoteService : IGoodsDeliveryNoteService
    {
        private readonly Mkiwms5Context _context;

        // Role codes for approval stages
        private const string ROLE_ACCOUNTANT = "ACCOUNTANT";   // Kế toán - Stage 1
        private const string ROLE_DIRECTOR = "DIRECTOR";       // Giám đốc - Stage 2

        public GoodsDeliveryNoteService(Mkiwms5Context context)
        {
            _context = context;
        }

        // ==================== LIST ====================
        public async Task<PagedResponse<GoodsDeliveryNoteResponse>> GetGoodsDeliveryNotesAsync(int page, int pageSize)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;

            var query = _context.GoodsDeliveryNotes
                .Include(g => g.ReleaseRequest)
                    .ThenInclude(rr => rr.Receiver)
                        .ThenInclude(r => r.Company)
                            .ThenInclude(c => c.Addresses)
                .Include(g => g.Warehouse)
                .Include(g => g.CreatedByNavigation)
                .AsQueryable();

            var totalItems = await query.CountAsync();

            var items = await query
                .OrderByDescending(g => g.Gdnid)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
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
                    ReceiverName = (g.ReleaseRequest != null && g.ReleaseRequest.Receiver != null) ? g.ReleaseRequest.Receiver.ReceiverName : null,
                    CompanyId = (g.ReleaseRequest != null && g.ReleaseRequest.Receiver != null) ? g.ReleaseRequest.Receiver.CompanyId : null,
                    CompanyName = (g.ReleaseRequest != null && g.ReleaseRequest.Receiver != null && g.ReleaseRequest.Receiver.Company != null) ? g.ReleaseRequest.Receiver.Company.CompanyName : null,
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
                Page = page,
                PageSize = pageSize,
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

            // 3. Validate Warehouse exists and is active
            var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.WarehouseId == request.WarehouseId);
            if (warehouse == null)
                throw new KeyNotFoundException("Không tìm thấy kho xuất.");
            if (!warehouse.IsActive)
                throw new InvalidOperationException("Kho xuất đang không hoạt động.");

            // 4. Validate Lines not empty
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

            foreach (var line in request.Lines)
            {
                if (line.ReleaseRequestLineId.HasValue)
                {
                    if (!rrLines.ContainsKey(line.ReleaseRequestLineId.Value))
                        throw new InvalidOperationException(
                            $"Dòng yêu cầu xuất kho (ReleaseRequestLineId = {line.ReleaseRequestLineId}) không thuộc yêu cầu xuất kho này.");

                    var rrLine = rrLines[line.ReleaseRequestLineId.Value];

                    // Check remaining to issue
                    var remainingToIssue = rrLine.ApprovedQty - rrLine.IssuedQty;
                    if (line.ActualQty > remainingToIssue)
                        throw new InvalidOperationException(
                            $"Số lượng thực xuất ({line.ActualQty}) của vật tư '{items[line.ItemId].ItemName}' " +
                            $"vượt quá số lượng còn lại cho phép xuất ({remainingToIssue}).");

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

            foreach (var line in request.Lines)
            {
                if (!inventories.ContainsKey(line.ItemId))
                    throw new InvalidOperationException(
                        $"Vật tư '{items[line.ItemId].ItemName}' không có tồn kho tại kho '{warehouse.WarehouseName}'.");

                var inv = inventories[line.ItemId];
                if (line.ActualQty > inv.OnHandQty)
                    throw new InvalidOperationException(
                        $"Số lượng xuất ({line.ActualQty}) của vật tư '{items[line.ItemId].ItemName}' vượt quá tồn kho ({inv.OnHandQty}).");
            }

            // 11. Validate PaymentMethod if IsPaid
            if (request.IsPaid && string.IsNullOrWhiteSpace(request.PaymentMethod))
                throw new InvalidOperationException("Phải nhập phương thức thanh toán khi đã đánh dấu đã thanh toán.");

            // 12. Validate string lengths to match DB constraints
            if (!string.IsNullOrEmpty(request.Note) && request.Note.Length > 1000)
                throw new InvalidOperationException("Ghi chú không được vượt quá 1000 ký tự.");
            if (!string.IsNullOrEmpty(request.PaymentMethod) && request.PaymentMethod.Length > 30)
                throw new InvalidOperationException("Phương thức thanh toán không được vượt quá 30 ký tự.");

            // 13. Generate GDN Code
            var gdnCode = await GenerateNextGdnCodeAsync();

            // 14. Calculate totals
            decimal totalDeliveredQty = 0;
            decimal totalDeliveredAmount = 0;

            foreach (var line in request.Lines)
            {
                totalDeliveredQty += line.ActualQty;
                totalDeliveredAmount += line.ActualQty * (line.UnitPrice ?? 0);
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
                Note = request.Note,
                ShippingFee = shippingFee,
                IsPaid = request.IsPaid,
                PaymentMethod = request.PaymentMethod,
                TotalDeliveredQty = totalDeliveredQty,
                TotalDeliveredAmount = totalDeliveredAmount
            };

            // If created with non-DRAFT status, set SubmittedAt
            if (gdn.Status != "DRAFT")
            {
                gdn.SubmittedAt = DateTime.UtcNow;
            }

            _context.GoodsDeliveryNotes.Add(gdn);
            await _context.SaveChangesAsync();

            // 16. Create GDN Lines
            foreach (var line in request.Lines)
            {
                var gdnLine = new GoodsDeliveryNoteLine
                {
                    Gdnid = gdn.Gdnid,
                    ItemId = line.ItemId,
                    RequestedQty = line.RequestedQty,
                    ActualQty = line.ActualQty,
                    UomId = line.UomId,
                    ReleaseRequestLineId = line.ReleaseRequestLineId,
                    UnitPrice = line.UnitPrice,
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
            var auditLog = new AuditLog
            {
                ActorUserId = userId,
                Action = "CREATE",
                EntityType = "GoodsDeliveryNote",
                EntityId = gdn.Gdnid,
                Detail = $"Tạo phiếu xuất kho {gdnCode} từ yêu cầu {releaseRequest.ReleaseRequestCode}",
                CreatedAt = DateTime.UtcNow
            };
            _context.AuditLogs.Add(auditLog);

            await _context.SaveChangesAsync();

            var addr = releaseRequest.Receiver?.Company?.Addresses?.FirstOrDefault(a => a.IsDefault && a.IsActive) 
                       ?? releaseRequest.Receiver?.Company?.Addresses?.FirstOrDefault(a => a.IsActive);

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
                    .ThenInclude(rr => rr.ReleaseRequestLines)
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

            if (gdn.Status == "PENDING_ACCOUNTANT")
            {
                // Stage 1: Kế toán duyệt
                if (userRoleCode != ROLE_ACCOUNTANT)
                    throw new InvalidOperationException(
                        "Chỉ Kế toán mới có quyền duyệt phiếu xuất kho ở giai đoạn này.");

                if (request.IsApproved)
                {
                    // Approved by Accountant → move to Director
                    gdn.Status = "PENDING_DIRECTOR";
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
            else if (gdn.Status == "PENDING_DIRECTOR")
            {
                // Stage 2: Giám đốc duyệt
                if (userRoleCode != ROLE_DIRECTOR)
                    throw new InvalidOperationException(
                        "Chỉ Giám đốc mới có quyền duyệt phiếu xuất kho ở giai đoạn này.");

                if (request.IsApproved)
                {
                    // Final approval → APPROVED
                    gdn.Status = "APPROVED";
                    gdn.ApprovedAt = DateTime.UtcNow;

                    // Update ReleaseRequestLine.IssuedQty and inventory
                    await ProcessGDNApprovalInventoryAsync(gdn, userId);
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
            _context.AuditLogs.Add(new AuditLog
            {
                ActorUserId = userId,
                Action = request.IsApproved ? "APPROVE" : "REJECT",
                EntityType = "GoodsDeliveryNote",
                EntityId = gdn.Gdnid,
                Detail = $"{(request.IsApproved ? "Duyệt" : "Từ chối")} phiếu xuất kho {gdn.Gdncode}" +
                         $" (Stage: {(gdn.Status == "APPROVED" || gdn.Status == "REJECTED" ? "Final" : "Accountant")})" +
                         (string.IsNullOrEmpty(request.Reason) ? "" : $" - Lý do: {request.Reason}"),
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return MapToListResponse(gdn);
        }

        // ==================== DETAIL ====================
        public async Task<GDNDetailResponse> GetGDNDetailAsync(long gdnId)
        {
            var gdn = await _context.GoodsDeliveryNotes
                .Include(g => g.ReleaseRequest)
                    .ThenInclude(rr => rr.Receiver)
                        .ThenInclude(r => r.Company)
                            .ThenInclude(c => c.Addresses)
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

            // Get approval history
            var approvals = await _context.DocumentApprovals
                .Where(da => da.DocType == "GDN" && da.DocId == gdnId)
                .Include(da => da.ActionByNavigation)
                .OrderBy(da => da.StageNo)
                .ToListAsync();

            var lines = gdn.GoodsDeliveryNoteLines.Select(l => new GDNLineDetailResponse
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
                Note = l.Note
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

        // ==================== INVENTORY PROCESSING ON APPROVAL ====================
        private async Task ProcessGDNApprovalInventoryAsync(GoodsDeliveryNote gdn, long userId)
        {
            var txn = new InventoryTransaction
            {
                TxnType = "ISSUE",
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

                _context.InventoryTransactionLines.Add(new InventoryTransactionLine
                {
                    InventoryTxnId = txn.InventoryTxnId,
                    ItemId = line.ItemId,
                    QtyChange = -line.ActualQty,
                    UomId = line.UomId,
                    Note = $"Xuất kho theo GDN {gdn.Gdncode}"
                });

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

            var rr = gdn.ReleaseRequest;
            if (rr != null)
            {
                var allLines = await _context.ReleaseRequestLines
                    .Where(l => l.ReleaseRequestId == rr.ReleaseRequestId)
                    .ToListAsync();

                var allFullyIssued = allLines.All(l => l.IssuedQty >= l.ApprovedQty);
                if (allFullyIssued)
                {
                    rr.LifecycleStatus = "Closed";
                }
                else
                {
                    rr.LifecycleStatus = "PartiallyIssued";
                }
            }

            gdn.PostedAt = DateTime.UtcNow;
        }

        // ==================== HELPERS ====================
        private GoodsDeliveryNoteResponse MapToListResponse(GoodsDeliveryNote gdn)
        {
            return new GoodsDeliveryNoteResponse
            {
                GdnId = gdn.Gdnid,
                GdnCode = gdn.Gdncode,
                IssueDate = gdn.IssueDate,
                Status = gdn.Status,
                IsPaid = gdn.IsPaid,
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
                Note = gdn.Note
            };
        }

        private async Task<string> GenerateNextGdnCodeAsync()
        {
            var gdnCodes = await _context.GoodsDeliveryNotes
                .Where(g => g.Gdncode.StartsWith("GDN"))
                .Select(g => g.Gdncode)
                .ToListAsync();

            var maxNumber = 0;
            foreach (var code in gdnCodes)
            {
                if (code.Length <= 3) continue;
                var numberPart = code.Substring(3).TrimStart('-');
                if (int.TryParse(numberPart, out var number) && number > maxNumber)
                    maxNumber = number;
            }

            return $"GDN{maxNumber + 1}";
        }
    }
}
