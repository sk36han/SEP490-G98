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

        Task<SupplierResponse> CreateSupplierAsync(CreateSupplierRequest request, long currentUserId);

        Task<SupplierResponse> UpdateSupplierAsync(long id, UpdateSupplierRequest request, long currentUserId);

        Task<SupplierResponse> ToggleSupplierStatusAsync(long id, bool isActive);

        /// <summary>
        /// Lấy thông tin chi tiết nhà cung cấp theo ID (Get Supplier By ID)
        /// </summary>
        Task<SupplierResponse> GetSupplierByIdAsync(long id);

        /// <summary>
        /// Xem lịch sử giao dịch của nhà cung cấp (View Transaction History)
        /// </summary>
        Task<SupplierTransactionUnifiedResponse> GetSupplierTransactionsAsync(
            long supplierId,
            int page,
            int pageSize,
            string? transactionType,
            string? status,
            DateTime? fromDate,
            DateTime? toDate,
            string? detailType,
            long? detailDocId);
    }
}

