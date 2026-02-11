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

        // Note: GenericRepository usually returns IQueryable or IEnumerable. 
        // If it doesn't support Include, we might need to access Context or cast.
        // Assuming GenericRepository exposes Context or we can cast it, 
        // OR we just use GetAllAsync and load into memory if data is small (bad practice).
        // Best practice with current GenericRepo: utilize its Context if public, 
        // or check if it returns IQueryable.
        // Looking at previous `SupplierService`, it uses `GetAllAsync` returning `IEnumerable`.
        // However, `GenericRepository` has `_context` as protected but `Context` property public!
        // So we can use `_purchaseOrderRepository.Context.PurchaseOrders` to allow Includes.

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

            // Access via Context to use Include
            // CAST to GenericRepository to access Context if interface doesn't expose it, 
            // BUT standard way here:
            // Since GenericRepository definition showed: public Mkiwms4Context Context => _context;
            // We can treat it as `GenericRepository<PurchaseOrder>` if we inject it as such, 
            // OR we just cast strict. 
            // Better: use the repository's DbContext if exposed.
            
            // Let's check GenericRepository again... Yes, `public Mkiwms4Context Context => _context;`
            // But we inject `IGenericRepository`. Creating a helper to access DbContext or casting.
            
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
    }
}
