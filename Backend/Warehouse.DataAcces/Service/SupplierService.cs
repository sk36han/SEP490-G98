using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.DataAcces.Service
{
    public class SupplierService : ISupplierService
    {
        private readonly IGenericRepository<Supplier> _supplierRepository;

        public SupplierService(IGenericRepository<Supplier> supplierRepository)
        {
            _supplierRepository = supplierRepository;
        }

        public async Task<SupplierResponse> CreateSupplierAsync(CreateSupplierRequest request)
        {
            // 1️⃣ Check duplicate SupplierCode
            var suppliers = await _supplierRepository.GetAllAsync();
            if (suppliers.Any(s => s.SupplierCode == request.SupplierCode))
            {
                throw new InvalidOperationException("Supplier code already exists");
            }

            // 2️⃣ Create entity
            var supplier = new Supplier
            {
                SupplierCode = request.SupplierCode,
                SupplierName = request.SupplierName,
                TaxCode = request.TaxCode,
                Phone = request.Phone,
                Email = request.Email,
                Address = request.Address,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            // 3️⃣ Save
            await _supplierRepository.CreateAsync(supplier);

            // 4️⃣ Return response
            return new SupplierResponse
            {
                SupplierId = supplier.SupplierId,
                SupplierCode = supplier.SupplierCode,
                SupplierName = supplier.SupplierName,
                TaxCode = supplier.TaxCode,
                Phone = supplier.Phone,
                Email = supplier.Email,
                Address = supplier.Address,
                IsActive = supplier.IsActive
            };
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
            // Safety
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;

            // 1. Get all
            var suppliers = await _supplierRepository.GetAllAsync();
            var query = suppliers.AsQueryable();

            // 2. SEARCH (tách field)
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

            // 3. FILTER
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

            // 4. Total after search + filter
            var totalItems = query.Count();

            // 5. Paging
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

            // 6. Return
            return new PagedResponse<SupplierResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = items
            };
        }

        public async Task<SupplierResponse> UpdateSupplierAsync(long id, UpdateSupplierRequest request)
        {
            // 1️⃣ Check supplier exists
            var supplier = await _supplierRepository.GetByIdAsync(id);
            if (supplier == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy nhà cung cấp với ID = {id}");
            }

            // 2️⃣ Check duplicate Email (if provided and different from current)
            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var allSuppliers = await _supplierRepository.GetAllAsync();
                var duplicateEmail = allSuppliers.Any(s =>
                    s.SupplierId != id &&
                    !string.IsNullOrWhiteSpace(s.Email) &&
                    s.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase));

                if (duplicateEmail)
                {
                    throw new InvalidOperationException("Email đã được sử dụng bởi nhà cung cấp khác");
                }
            }

            // 3️⃣ Map request fields to entity (keep SupplierCode & CreatedAt unchanged)
            supplier.SupplierName = request.SupplierName;
            supplier.TaxCode = request.TaxCode;
            supplier.Phone = request.Phone;
            supplier.Email = request.Email;
            supplier.Address = request.Address;
            supplier.IsActive = request.IsActive;

            // 4️⃣ Save
            await _supplierRepository.UpdateAsync(supplier);

            // 5️⃣ Return response
            return new SupplierResponse
            {
                SupplierId = supplier.SupplierId,
                SupplierCode = supplier.SupplierCode,
                SupplierName = supplier.SupplierName,
                TaxCode = supplier.TaxCode,
                Phone = supplier.Phone,
                Email = supplier.Email,
                Address = supplier.Address,
                IsActive = supplier.IsActive
            };
        }
    }
}

