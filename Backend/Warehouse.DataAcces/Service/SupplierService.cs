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

        public async Task<List<SupplierResponse>> GetSupplierListAsync()
        {
            var suppliers = await _supplierRepository.GetAllAsync();

            return suppliers
                .Where(s => s.IsActive)
                .OrderBy(s => s.SupplierName)
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
        }
    }
}
