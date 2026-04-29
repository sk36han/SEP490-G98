using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;
using Warehouse.Entities.Constants;

namespace Warehouse.DataAcces.Service
{
    public class ApprovalService : IApprovalService
    {
        private readonly Mkiwms5Context _context;
        private readonly IServiceProvider _serviceProvider;
        private readonly INotificationService _notificationService;
        private readonly IAuditLogService _auditLogService;

        public ApprovalService(Mkiwms5Context context, IServiceProvider serviceProvider)
        {
            _context = context;
            _serviceProvider = serviceProvider;
            _notificationService = serviceProvider.GetRequiredService<INotificationService>();
            _auditLogService = serviceProvider.GetRequiredService<IAuditLogService>();
        }

        public async Task<PagedResult<ApprovalQueueResponse>> GetPendingApprovalsAsync(ApprovalQueueFilterRequest filter)
        {
            var poQuery = _context.PurchaseOrders
                .Select(po => new ApprovalQueueResponse
                {
                    RequestId = po.PurchaseOrderId,
                    RequestCode = po.Pocode,
                    RequestType = "PurchaseOrder",
                    Priority = "Normal",
                    SubmittedBy = po.RequestedBy,
                    SubmittedByName = po.RequestedByNavigation.FullName,
                    SubmittedAt = po.SubmittedAt ?? po.CreatedAt,
                    Status = po.Status,
                    Note = po.Justification
                });

            var releasesQuery = _context.ReleaseRequests
                .Select(r => new ApprovalQueueResponse
                {
                    RequestId = r.ReleaseRequestId,
                    RequestCode = r.ReleaseRequestCode,
                    RequestType = "Release",
                    Priority = "Normal",
                    SubmittedBy = r.RequestedBy,
                    SubmittedByName = r.RequestedByNavigation.FullName,
                    SubmittedAt = r.SubmittedAt ?? r.CreatedAt,
                    Status = r.Status,
                    Note = r.Purpose
                });

            var grnQuery = _context.GoodsReceiptNotes
                .Select(g => new ApprovalQueueResponse
                {
                    RequestId = g.Grnid,
                    RequestCode = g.Grncode,
                    RequestType = "GoodsReceipt",
                    Priority = "Normal",
                    SubmittedBy = g.CreatedBy,
                    SubmittedByName = g.CreatedByNavigation.FullName,
                    SubmittedAt = g.SubmittedAt,
                    Status = g.Status,
                    Note = g.Note
                });

            var gdnQuery = _context.GoodsDeliveryNotes
                .Select(g => new ApprovalQueueResponse
                {
                    RequestId = g.Gdnid,
                    RequestCode = g.Gdncode,
                    RequestType = "GoodsDelivery",
                    Priority = "Normal",
                    SubmittedBy = g.CreatedBy,
                    SubmittedByName = g.CreatedByNavigation.FullName,
                    SubmittedAt = g.SubmittedAt,
                    Status = g.Status,
                    Note = g.Note
                });

            var adjustmentsQuery = _context.InventoryAdjustmentRequests
                .Select(a => new ApprovalQueueResponse
                {
                    RequestId = a.AdjustmentId,
                    RequestCode = a.AdjustmentCode,
                    RequestType = "InventoryAdjustment",
                    Priority = "Normal",
                    SubmittedBy = a.SubmittedBy,
                    SubmittedByName = a.SubmittedByNavigation.FullName,
                    SubmittedAt = a.SubmittedAt,
                    Status = a.Status,
                    Note = a.Reason
                });

            var combinedQuery = poQuery
                .Union(releasesQuery)
                .Union(grnQuery)
                .Union(gdnQuery)
                .Union(adjustmentsQuery)
                .Where(x => x.Status != null);

            if (!string.IsNullOrEmpty(filter.Status))
            {
                var lowerStatus = filter.Status.ToLower();
                combinedQuery = combinedQuery.Where(x => x.Status != null && x.Status.ToLower().StartsWith(lowerStatus));
            }

            if (!string.IsNullOrEmpty(filter.RequestType))
            {
                var lowerType = filter.RequestType.ToLower();
                combinedQuery = combinedQuery.Where(x => x.RequestType.ToLower() == lowerType);
            }

            if (!string.IsNullOrEmpty(filter.Priority))
            {
                var lowerPriority = filter.Priority.ToLower();
                combinedQuery = combinedQuery.Where(x => x.Priority.ToLower() == lowerPriority);
            }

            if (filter.SubmittedDateFrom.HasValue)
            {
                combinedQuery = combinedQuery.Where(x => x.SubmittedAt >= filter.SubmittedDateFrom.Value);
            }

            if (filter.SubmittedDateTo.HasValue)
            {
                combinedQuery = combinedQuery.Where(x => x.SubmittedAt <= filter.SubmittedDateTo.Value);
            }

            var totalItems = await combinedQuery.CountAsync();

            var items = await combinedQuery
                .OrderBy(x => x.Status != null && x.Status.ToLower().StartsWith("pending") ? 0 : 1)
                .ThenByDescending(x => x.SubmittedAt)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            return new PagedResult<ApprovalQueueResponse>(items, totalItems, filter.PageNumber, filter.PageSize);
        }

        public async Task<ApprovalResult> ApproveRequestAsync(string requestType, long requestId, long currentUserId, string reason = null)
        {
            return await ProcessDecisionAsync(requestType, requestId, currentUserId, "APPROVED", reason);
        }

        public async Task<ApprovalResult> RejectRequestAsync(string requestType, long requestId, long currentUserId, string reason = null)
        {
            return await ProcessDecisionAsync(requestType, requestId, currentUserId, "REJECTED", reason);
        }

        private async Task<ApprovalResult> ProcessDecisionAsync(string requestType, long requestId, long currentUserId, string decision, string reason)
        {
            if (string.IsNullOrWhiteSpace(requestType))
                return ApprovalResult.Failed("Loại yêu cầu (RequestType) không được để trống.");

            if (decision == "REJECTED" && string.IsNullOrWhiteSpace(reason))
                return ApprovalResult.Failed("Bắt buộc phải nhập lý do khi từ chối yêu cầu.");

            bool IsPending(string status) =>
                !string.IsNullOrEmpty(status) &&
                status.StartsWith("PENDING", StringComparison.OrdinalIgnoreCase);

            string normalizedType = requestType.Trim().ToLowerInvariant();
            string? docType = null;
            string currentStatus = "Unknown";
            bool found = false;

            switch (normalizedType)
            {
                case "purchaseorder":
                    var po = await _context.PurchaseOrders.FindAsync(requestId);
                    if (po != null)
                    {
                        found = true;
                        currentStatus = po.Status ?? "NULL";
                        if (IsPending(po.Status))
                        {
                            po.Status = decision;
                            docType = "PR";
                        }
                    }
                    else return ApprovalResult.Failed($"Không tìm thấy đơn PurchaseOrder với ID {requestId}.", 404);
                    break;

                case "release":
                    // Delegate to ReleaseRequestService for full business logic (2-stage, inventory)
                    try
                    {
                        var rrService = _serviceProvider.GetRequiredService<IReleaseRequestService>();
                        var rrApproveRequest = new ApproveReleaseRequest
                        {
                            IsApproved = decision == "APPROVED",
                            Reason = reason
                        };
                        await rrService.ApproveReleaseRequestAsync(requestId, currentUserId, rrApproveRequest);
                        return ApprovalResult.Succeeded($"Thực hiện thành công: Đã xử lý yêu cầu xuất kho.");
                    }
                    catch (KeyNotFoundException ex)
                    {
                        return ApprovalResult.Failed(ex.Message, 404);
                    }
                    catch (InvalidOperationException ex)
                    {
                        return ApprovalResult.Failed(ex.Message, 400);
                    }

                case "goodsreceipt":
                    var grn = await _context.GoodsReceiptNotes.FindAsync(requestId);
                    if (grn != null)
                    {
                        found = true;
                        currentStatus = grn.Status ?? "NULL";
                        if (IsPending(grn.Status))
                        {
                            grn.Status = decision;
                            docType = "GRN";
                        }
                    }
                    else return ApprovalResult.Failed($"Không tìm thấy đơn GoodsReceiptNote với ID {requestId}.", 404);
                    break;

                case "goodsdelivery":
                    return ApprovalResult.Failed("Phiếu xuất kho (GDN) không còn yêu cầu phê duyệt trong quy trình mới.", 400);

                case "inventoryadjustment":
                    var adjustment = await _context.InventoryAdjustmentRequests.FindAsync(requestId);
                    if (adjustment != null)
                    {
                        found = true;
                        currentStatus = adjustment.Status ?? "NULL";
                        if (IsPending(adjustment.Status))
                        {
                            adjustment.Status = decision;
                            docType = "ADJ";
                        }
                    }
                    else return ApprovalResult.Failed($"Không tìm thấy đơn InventoryAdjustment với ID {requestId}.", 404);
                    break;

                default:
                    return ApprovalResult.Failed($"Loại yêu cầu '{requestType}' không hợp lệ (Dữ liệu không nằm trong danh mục hỗ trợ).", 400);
            }

            if (!found)
                return ApprovalResult.Failed($"Dữ liệu không tồn tại: Không thấy bản ghi {requestType} với mã định danh {requestId}.", 404);

            if (docType == null)
                return ApprovalResult.Failed($"Lỗi nghiệp vụ: Đơn {requestType} hiện có trạng thái '{currentStatus}', hệ thống chỉ chấp nhận xử lý khi đơn ở trạng thái 'PENDING'.", 400);

            try
            {
                // Map internal status strings to DB-allowed Decision strings (CK_DA_Decision)
                string dbDecision = decision switch
                {
                    "APPROVED" => "APPROVE",
                    "REJECTED" => "REJECT",
                    _ => decision.Length > 20 ? decision.Substring(0, 20) : decision
                };

                var log = new DocumentApproval
                {
                    DocType = docType,
                    DocId = requestId,
                    StageNo = 1,
                    Decision = dbDecision,
                    Reason = reason,
                    ActionBy = currentUserId,
                    ActionAt = DateTime.UtcNow,
                };

                _context.DocumentApprovals.Add(log);
                await _context.SaveChangesAsync();

                // Lưu AuditLog
                string auditAction = decision == "APPROVED" ? AuditAction.Approve : AuditAction.Reject;
                string auditEntity = normalizedType switch
                {
                    "purchaseorder" => AuditEntity.PurchaseOrder,
                    "release" => AuditEntity.ReleaseRequest,
                    "goodsdelivery" => AuditEntity.GoodsDeliveryNote,
                    "stocktake" => AuditEntity.Stocktake,
                    _ => normalizedType.ToUpper()
                };

                await _auditLogService.LogAsync(
                    currentUserId,
                    auditAction,
                    auditEntity,
                    requestId,
                    $"{auditAction} yêu cầu {requestType} ID: {requestId}. {(!string.IsNullOrEmpty(reason) ? $"Lý do: {reason}" : "")}"
                );

                // Gửi thông báo cho người tạo đơn (trừ Release và GoodsDelivery đã được xử lý ở Service riêng)
                if (normalizedType != "release" && normalizedType != "goodsdelivery")
                {
                    long? requesterId = null;
                    string code = "";
                    string displayType = "";
                    PurchaseOrder? purchaseOrderForNotify = null;

                    if (normalizedType == "purchaseorder")
                    {
                        purchaseOrderForNotify = await _context.PurchaseOrders.FindAsync(requestId);
                        requesterId = purchaseOrderForNotify?.RequestedBy;
                        code = purchaseOrderForNotify?.Pocode ?? "";
                        displayType = "Đơn mua hàng";
                    }
                    else if (normalizedType == "goodsreceipt")
                    {
                        var grn = await _context.GoodsReceiptNotes.FindAsync(requestId);
                        requesterId = grn?.CreatedBy;
                        code = grn?.Grncode ?? "";
                        displayType = "Phiếu nhập kho";
                    }
                    else if (normalizedType == "inventoryadjustment")
                    {
                        var adj = await _context.InventoryAdjustmentRequests.FindAsync(requestId);
                        requesterId = adj?.SubmittedBy;
                        code = adj?.AdjustmentCode ?? "";
                        displayType = "Phiếu kiểm kê/điều chỉnh";
                    }

                    if (requesterId.HasValue)
                    {
                        string statusText = decision == "APPROVED" ? "ĐƯỢC DUYỆT" : "BỊ TỪ CHỐI";
                        string reasonText = string.IsNullOrEmpty(reason) ? "" : $". Lý do: {reason}";
                        
                        await _notificationService.CreateAsync(
                            requesterId.Value,
                            $"{displayType} {code} {statusText}",
                            $"Đơn {code} của bạn đã {statusText.ToLower()}{reasonText}.",
                            requestType,
                            requestId,
                            NotificationTypes.ApprovalResult,
                            (byte)(decision == "APPROVED" ? NotificationSeverity.Warning : NotificationSeverity.Error)
                        );
                    }

                    // Khi KT duyệt PO thì phát thêm thông báo cho Sale Support để theo dõi xử lý tiếp.
                    if (normalizedType == "purchaseorder" && decision == "APPROVED")
                    {
                        var approverRoleCodes = await _context.UserRoles
                            .Include(ur => ur.Role)
                            .Where(ur => ur.UserId == currentUserId)
                            .Select(ur => ur.Role.RoleCode)
                            .ToListAsync();

                        var approvedByAccountant = approverRoleCodes
                            .Any(rc => string.Equals(rc, UserRoleConstants.Accountant, StringComparison.OrdinalIgnoreCase));

                        if (approvedByAccountant)
                        {
                            await _notificationService.CreateForRolesAsync(
                                new[] { UserRoleConstants.SaleSupport },
                                "Đơn mua hàng đã được Kế toán duyệt",
                                $"Đơn mua hàng {code} đã được Kế toán duyệt. Vui lòng theo dõi và xử lý bước tiếp theo.",
                                "PurchaseOrder",
                                requestId,
                                null,
                                NotificationTypes.StatusChange,
                                (byte)NotificationSeverity.Info
                            );
                        }
                    }
                }

                return ApprovalResult.Succeeded($"Thực hiện thành công: Đã chuyển trạng thái đơn {requestType} sang '{decision}'.");
            }
            catch (Exception ex)
            {
                var fullMessage = ex.InnerException != null 
                    ? $"{ex.Message} Inner Error: {ex.InnerException.Message}" 
                    : ex.Message;
                return ApprovalResult.Failed($"Lỗi hệ thống (Internal Server Error): {fullMessage}", 500);
            }
        }

        public async Task<object?> GetRequestDetailAsync(string requestType, long requestId)
        {
            if (requestType.Equals("PurchaseOrder", StringComparison.OrdinalIgnoreCase))
            {
                var po = await _context.PurchaseOrders
                    .Include(x => x.RequestedByNavigation)
                    .Include(x => x.Supplier)
                    .Include(x => x.PurchaseOrderLines)
                        .ThenInclude(l => l.Item)
                    .Include(x => x.PurchaseOrderLines)
                        .ThenInclude(l => l.Uom)
                    .FirstOrDefaultAsync(x => x.PurchaseOrderId == requestId);
                
                if (po == null) return null;

                return new
                {
                    po.PurchaseOrderId,
                    po.Pocode,
                    RequestedBy = po.RequestedByNavigation?.FullName,
                    SupplierName = po.Supplier?.SupplierName,
                    po.RequestedDate,
                    po.ExpectedDeliveryDate,
                    po.Status,
                    po.Justification,
                    Lines = po.PurchaseOrderLines.Select(l => new
                    {
                        l.PurchaseOrderLineId,
                        ItemCode = l.Item?.ItemCode,
                        ItemName = l.Item?.ItemName,
                        l.OrderedQty,
                        l.ReceivedQty,
                        UomName = l.Uom?.UomName,
                        l.Note,
                        l.LineStatus
                    })
                };
            }
            else if (requestType.Equals("Release", StringComparison.OrdinalIgnoreCase))
            {
                var release = await _context.ReleaseRequests
                    .Include(x => x.RequestedByNavigation)
                    .Include(x => x.Receiver)
                    .Include(x => x.Warehouse)
                    .Include(x => x.ReleaseRequestLines)
                        .ThenInclude(l => l.Item)
                    .Include(x => x.ReleaseRequestLines)
                        .ThenInclude(l => l.Uom)
                    .FirstOrDefaultAsync(x => x.ReleaseRequestId == requestId);
                
                if (release == null) return null;

                return new
                {
                    release.ReleaseRequestId,
                    release.ReleaseRequestCode,
                    RequestedBy = release.RequestedByNavigation?.FullName,
                    ReceiverName = release.Receiver?.ReceiverName,
                    WarehouseName = release.Warehouse?.WarehouseName,
                    release.RequestedDate,
                    release.Status,
                    release.Purpose,
                    Lines = release.ReleaseRequestLines.Select(l => new
                    {
                        l.ReleaseRequestLineId,
                        ItemCode = l.Item?.ItemCode,
                        ItemName = l.Item?.ItemName,
                        l.RequestedQty,
                        UomName = l.Uom?.UomName,
                        l.Note
                    })
                };
            }
            else if (requestType.Equals("GoodsReceipt", StringComparison.OrdinalIgnoreCase))
            {
                var grn = await _context.GoodsReceiptNotes
                    .Include(x => x.CreatedByNavigation)
                    .Include(x => x.Supplier)
                    .Include(x => x.Warehouse)
                    .Include(x => x.GoodsReceiptNoteLines)
                        .ThenInclude(l => l.Item)
                    .Include(x => x.GoodsReceiptNoteLines)
                        .ThenInclude(l => l.Uom)
                    .FirstOrDefaultAsync(x => x.Grnid == requestId);

                if (grn == null) return null;

                return new
                {
                    grn.Grnid,
                    grn.Grncode,
                    CreatedBy = grn.CreatedByNavigation?.FullName,
                    SupplierName = grn.Supplier?.SupplierName,
                    WarehouseName = grn.Warehouse?.WarehouseName,
                    grn.ReceiptDate,
                    grn.Status,
                    grn.Note,
                    Lines = grn.GoodsReceiptNoteLines.Select(l => new
                    {
                        l.GrnlineId,
                        ItemCode = l.Item?.ItemCode,
                        ItemName = l.Item?.ItemName,
                        l.ExpectedQty,
                        l.ActualQty,
                        UomName = l.Uom?.UomName,
                        l.RequiresCocq
                    })
                };
            }
            else if (requestType.Equals("GoodsDelivery", StringComparison.OrdinalIgnoreCase))
            {
                var gdn = await _context.GoodsDeliveryNotes
                    .Include(x => x.CreatedByNavigation)
                    .Include(x => x.Warehouse)
                    .Include(x => x.GoodsDeliveryNoteLines)
                        .ThenInclude(l => l.Item)
                    .Include(x => x.GoodsDeliveryNoteLines)
                        .ThenInclude(l => l.Uom)
                    .FirstOrDefaultAsync(x => x.Gdnid == requestId);

                if (gdn == null) return null;

                return new
                {
                    gdn.Gdnid,
                    gdn.Gdncode,
                    CreatedBy = gdn.CreatedByNavigation?.FullName,
                    WarehouseName = gdn.Warehouse?.WarehouseName,
                    gdn.IssueDate,
                    gdn.Status,
                    gdn.Note,
                    Lines = gdn.GoodsDeliveryNoteLines.Select(l => new
                    {
                        l.GdnlineId,
                        ItemCode = l.Item?.ItemCode,
                        ItemName = l.Item?.ItemName,
                        l.RequestedQty,
                        l.ActualQty,
                        UomName = l.Uom?.UomName
                    })
                };
            }
            else if (requestType.Equals("InventoryAdjustment", StringComparison.OrdinalIgnoreCase))
            {
                var adjustment = await _context.InventoryAdjustmentRequests
                    .Include(x => x.SubmittedByNavigation)
                    .Include(x => x.Warehouse)
                    .Include(x => x.Stocktake)
                    .Include(x => x.InventoryAdjustmentLines)
                        .ThenInclude(l => l.Item)
                            .ThenInclude(i => i.BaseUom)
                    .FirstOrDefaultAsync(x => x.AdjustmentId == requestId);

                if (adjustment == null) return null;

                return new
                {
                    adjustment.AdjustmentId,
                    adjustment.AdjustmentCode,
                    StocktakeCode = adjustment.Stocktake?.StocktakeCode,
                    SubmittedBy = adjustment.SubmittedByNavigation?.FullName,
                    WarehouseName = adjustment.Warehouse?.WarehouseName,
                    WarehouseCode = adjustment.Warehouse?.WarehouseCode,
                    adjustment.Status,
                    adjustment.Reason,
                    adjustment.SubmittedAt,
                    adjustment.ApprovedAt,
                    adjustment.PostedAt,
                    Lines = adjustment.InventoryAdjustmentLines.Select(l => new
                    {
                        l.AdjustmentLineId,
                        ItemCode = l.Item?.ItemCode,
                        ItemName = l.Item?.ItemName,
                        UomName = l.Item?.BaseUom?.UomName,
                        l.SystemQty,
                        l.CountedQty,
                        l.QtyChange,
                        l.Note
                    })
                };
            }

            return null;
        }
    }
}
