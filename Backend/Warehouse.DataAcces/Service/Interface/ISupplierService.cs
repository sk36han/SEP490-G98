using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface ISupplierService
    {
        Task<PagedResponse<SupplierResponse>> GetSuppliersAsync(
            int page,
            int pageSize,
            string? supplierCode,
            string? supplierName,
            string? taxCode,
            bool? isActive,
            DateTime? fromDate,
            DateTime? toDate
        );

        Task<SupplierResponse> CreateSupplierAsync(CreateSupplierRequest request);

        Task<SupplierResponse> UpdateSupplierAsync(long id, UpdateSupplierRequest request);

        Task<SupplierResponse> ToggleSupplierStatusAsync(long id, bool isActive);
    }
}

