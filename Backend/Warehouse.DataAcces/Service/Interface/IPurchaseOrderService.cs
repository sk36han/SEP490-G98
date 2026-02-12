using System;
using System.Threading.Tasks;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IPurchaseOrderService
    {
        Task<PagedResponse<PurchaseOrderResponse>> GetPurchaseOrdersAsync(
            int page,
            int pageSize,
            string? poCode,
            string? supplierName,
            string? status,
            DateTime? fromDate,
            DateTime? toDate,
            string? requestedByName
        );

        Task<PurchaseOrderDetailResponse?> GetPurchaseOrderByIdAsync(long id);
    }
}
