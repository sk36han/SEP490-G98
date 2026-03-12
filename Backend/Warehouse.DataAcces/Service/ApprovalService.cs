using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
    public class ApprovalService : IApprovalService
    {
        private readonly Mkiwms5Context _context;

        public ApprovalService(Mkiwms5Context context)
        {
            _context = context;
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

            var combinedQuery = poQuery.Union(releasesQuery).Union(grnQuery).Union(gdnQuery).Union(adjustmentsQuery);

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
                .OrderBy(x => x.Status == "PENDING" ? 0 : 1)
                .ThenByDescending(x => x.SubmittedAt)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            return new PagedResult<ApprovalQueueResponse>(items, totalItems, filter.PageNumber, filter.PageSize);
        }

        public async Task<bool> ApproveRequestAsync(string requestType, long requestId, long currentUserId, string reason = null)
        {
            // Force reason to null when approving
            return await ProcessDecisionAsync(requestType, requestId, currentUserId, "APPROVED", null);
        }

        public async Task<bool> RejectRequestAsync(string requestType, long requestId, long currentUserId, string reason = null)
        {
            return await ProcessDecisionAsync(requestType, requestId, currentUserId, "REJECTED", reason);
        }

        private async Task<bool> ProcessDecisionAsync(string requestType, long requestId, long currentUserId, string decision, string reason)
        {
            string docType = "";
            bool found = false;

            if (requestType.Equals("PurchaseOrder", StringComparison.OrdinalIgnoreCase))
            {
                var po = await _context.PurchaseOrders.FindAsync(requestId);
                if (po != null && (po.Status == "PENDING" || po.Status == "DRAFT"))
                {
                    po.Status = decision;
                    docType = "PurchaseOrder";
                    found = true;
                }
            }
            else if (requestType.Equals("Release", StringComparison.OrdinalIgnoreCase))
            {
                var release = await _context.ReleaseRequests.FindAsync(requestId);
                if (release != null && release.Status == "PENDING")
                {
                    release.Status = decision;
                    docType = "ReleaseRequest";
                    found = true;
                }
            }
            else if (requestType.Equals("GoodsReceipt", StringComparison.OrdinalIgnoreCase))
            {
                var grn = await _context.GoodsReceiptNotes.FindAsync(requestId);
                if (grn != null && grn.Status == "PENDING")
                {
                    grn.Status = decision;
                    if (decision == "APPROVED") grn.ApprovedAt = DateTime.UtcNow;
                    docType = "GoodsReceiptNote";
                    found = true;
                }
            }
            else if (requestType.Equals("GoodsDelivery", StringComparison.OrdinalIgnoreCase))
            {
                var gdn = await _context.GoodsDeliveryNotes.FindAsync(requestId);
                if (gdn != null && gdn.Status == "PENDING")
                {
                    gdn.Status = decision;
                    if (decision == "APPROVED") gdn.ApprovedAt = DateTime.UtcNow;
                    docType = "GoodsDeliveryNote";
                    found = true;
                }
            }
            else if (requestType.Equals("InventoryAdjustment", StringComparison.OrdinalIgnoreCase))
            {
                var adjustment = await _context.InventoryAdjustmentRequests.FindAsync(requestId);
                if (adjustment != null && adjustment.Status == "PENDING")
                {
                    adjustment.Status = decision;
                    if (decision == "APPROVED") adjustment.ApprovedAt = DateTime.UtcNow;
                    docType = "InventoryAdjustment";
                    found = true;
                }
            }

            if (!found)
            {
                return false;
            }

            var log = new DocumentApproval
            {
                DocType = docType,
                DocId = requestId,
                StageNo = 1,
                Decision = decision,
                Reason = reason,
                ActionBy = currentUserId,
                ActionAt = DateTime.UtcNow
            };

            _context.DocumentApprovals.Add(log);
            await _context.SaveChangesAsync();
            return true;
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
                    .Include(x => x.InventoryAdjustmentLines)
                        .ThenInclude(l => l.Item)
                    .FirstOrDefaultAsync(x => x.AdjustmentId == requestId);

                if (adjustment == null) return null;

                return new
                {
                    adjustment.AdjustmentId,
                    adjustment.AdjustmentCode,
                    SubmittedBy = adjustment.SubmittedByNavigation?.FullName,
                    WarehouseName = adjustment.Warehouse?.WarehouseName,
                    adjustment.Status,
                    adjustment.Reason,
                    Lines = adjustment.InventoryAdjustmentLines.Select(l => new
                    {
                        l.AdjustmentLineId,
                        ItemCode = l.Item?.ItemCode,
                        ItemName = l.Item?.ItemName,
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
