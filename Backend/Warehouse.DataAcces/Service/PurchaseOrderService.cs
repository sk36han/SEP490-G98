using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service
{
    public class PurchaseOrderService : IPurchaseOrderService
    {
        private readonly IGenericRepository<PurchaseOrder> _purchaseOrderRepository;



        public PurchaseOrderService(IGenericRepository<PurchaseOrder> purchaseOrderRepository)
        {
            _purchaseOrderRepository = purchaseOrderRepository;
        }

        public async Task<PagedResponse<PurchaseOrderResponse>> GetPurchaseOrdersAsync(
            int page,
            int pageSize,
            string? poCode,
            string? supplierName,
            string? status,
            DateTime? fromDate,
            DateTime? toDate,
            string? requestedByName)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;


            
            var context = ((GenericRepository<PurchaseOrder>)_purchaseOrderRepository).Context;

            var query = context.PurchaseOrders
                .Include(po => po.Supplier)
                .Include(po => po.RequestedByNavigation)
                .AsQueryable();

            // 1. SEARCH & FILTER
            if (!string.IsNullOrWhiteSpace(poCode))
            {
                query = query.Where(po => po.Pocode.Contains(poCode));
            }

            if (!string.IsNullOrWhiteSpace(supplierName))
            {
                query = query.Where(po => po.Supplier != null && po.Supplier.SupplierName.Contains(supplierName));
            }
            
            if (!string.IsNullOrWhiteSpace(requestedByName))
            {
                query = query.Where(po => po.RequestedByNavigation.FullName.Contains(requestedByName));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                // Exact match for status usually, or contains? Let's use Contains for flexibility or specific if Enum
                // Status is string in DB.
                query = query.Where(po => po.Status == status);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(po => po.CreatedAt >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(po => po.CreatedAt <= toDate.Value);
            }

            // 2. Total
            var totalItems = await query.CountAsync();

            // 3. Paging
            var items = await query
                .OrderByDescending(po => po.CreatedAt) // Newest first
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(po => new PurchaseOrderResponse
                {
                    PurchaseOrderId = po.PurchaseOrderId,
                    Pocode = po.Pocode,
                    RequestedBy = po.RequestedBy,
                    SupplierId = po.SupplierId,
                    RequestedDate = po.RequestedDate,
                    Justification = po.Justification,
                    Status = po.Status,
                    CurrentStageNo = po.CurrentStageNo,
                    CreatedAt = po.CreatedAt,
                    SubmittedAt = po.SubmittedAt,
                    UpdatedAt = po.UpdatedAt,
                    SupplierName = po.Supplier != null ? po.Supplier.SupplierName : null,
                    RequestedByName = po.RequestedByNavigation.FullName
                })
                .ToListAsync();

            // 4. Return
            return new PagedResponse<PurchaseOrderResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = items
            };
        }

        public async Task<PurchaseOrderDetailResponse?> GetPurchaseOrderByIdAsync(long id)
        {
            var context = ((GenericRepository<PurchaseOrder>)_purchaseOrderRepository).Context;

            var po = await context.PurchaseOrders
                .Include(p => p.Supplier)
                .Include(p => p.RequestedByNavigation)
                .Include(p => p.PurchaseOrderLines)
                    .ThenInclude(line => line.Item)
                .Include(p => p.PurchaseOrderLines)
                    .ThenInclude(line => line.Uom)
                .FirstOrDefaultAsync(p => p.PurchaseOrderId == id);

            if (po == null)
            {
                return null;
            }

            return new PurchaseOrderDetailResponse
            {
                PurchaseOrderId = po.PurchaseOrderId,
                Pocode = po.Pocode,
                RequestedBy = po.RequestedBy,
                SupplierId = po.SupplierId,
                RequestedDate = po.RequestedDate,
                Justification = po.Justification,
                Status = po.Status,
                CurrentStageNo = po.CurrentStageNo,
                CreatedAt = po.CreatedAt,
                SubmittedAt = po.SubmittedAt,
                UpdatedAt = po.UpdatedAt,
                SupplierName = po.Supplier != null ? po.Supplier.SupplierName : null,
                RequestedByName = po.RequestedByNavigation.FullName,
                PurchaseOrderLines = po.PurchaseOrderLines.Select(line => new PurchaseOrderLineResponse
                {
                    PurchaseOrderLineId = line.PurchaseOrderLineId,
                    PurchaseOrderId = line.PurchaseOrderId,
                    ItemId = line.ItemId,
                    ItemCode = line.Item.ItemCode,
                    ItemName = line.Item.ItemName,
                    OrderedQty = line.OrderedQty,
                    UomId = line.UomId,
                    UomName = line.Uom.UomName,
                    Note = line.Note
                }).ToList()
            };
        }
    }
}
