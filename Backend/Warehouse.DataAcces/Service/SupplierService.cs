using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service
{
    public class SupplierService : ISupplierService
    {
        private readonly IGenericRepository<Supplier> _supplierRepository;

        public SupplierService(IGenericRepository<Supplier> supplierRepository)
        {
            _supplierRepository = supplierRepository;
        }

        public async Task<PagedResponse<SupplierResponse>> GetSuppliersAsync(
            int page,
            int pageSize,
            string? supplierCode,
            string? supplierName,
            string? taxCode,
            bool? isActive,
            DateTime? fromDate,
            DateTime? toDate)
        {
            // 🔒 Safety
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;

            // 1️⃣ Lấy toàn bộ supplier
            var suppliers = await _supplierRepository.GetAllAsync();
            var query = suppliers.AsQueryable();

            // 2️⃣ SEARCH (tách field)
            if (!string.IsNullOrWhiteSpace(supplierCode))
            {
                query = query.Where(s =>
                    s.SupplierCode != null &&
                    s.SupplierCode.Contains(supplierCode));
            }

            if (!string.IsNullOrWhiteSpace(supplierName))
            {
                query = query.Where(s =>
                    s.SupplierName.Contains(supplierName));
            }

            if (!string.IsNullOrWhiteSpace(taxCode))
            {
                query = query.Where(s =>
                    s.TaxCode != null &&
                    s.TaxCode.Contains(taxCode));
            }

            // 3️⃣ FILTER
            if (isActive.HasValue)
            {
                query = query.Where(s => s.IsActive == isActive.Value);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(s => s.CreatedAt >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(s => s.CreatedAt <= toDate.Value);
            }

            // 4️⃣ TOTAL (sau search + filter)
            var totalItems = query.Count();

            // 5️⃣ PAGING
            var items = query
                .OrderBy(s => s.SupplierName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new SupplierResponse
                {
                    SupplierId = s.SupplierId,
                    SupplierCode = s.SupplierCode,
                    SupplierName = s.SupplierName,
                    TaxCode = s.TaxCode,
                    Phone = s.Phone,
                    Email = s.Email,
                    Address = s.Address,
                    IsActive = s.IsActive
                })
                .ToList();

            // 6️⃣ Response
            return new PagedResponse<SupplierResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = items
            };
        }
    }
}
