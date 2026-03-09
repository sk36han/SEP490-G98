using System;
using System.Threading.Tasks;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service
{
    public class PurchaseOrderService : IPurchaseOrderService
    {
        public Task<PagedResponse<PurchaseOrderResponse>> GetPurchaseOrdersAsync(
            int page,
            int pageSize,
            string? poCode,
            string? supplierName,
            string? status,
            DateTime? fromDate,
            DateTime? toDate,
            string? requestedByName)
        {
            throw new NotImplementedException();
        }

        public Task<PurchaseOrderDetailResponse?> GetPurchaseOrderByIdAsync(long id)
        {
            throw new NotImplementedException();
        }

        public Task<PurchaseOrderDetailResponse> CreatePurchaseOrderAsync(long requestedByUserId, CreatePurchaseOrderRequest request)
        {
            throw new NotImplementedException();
        }

        public Task<bool> CancelPurchaseOrderAsync(long id)
                {
            throw new NotImplementedException();
        }
    }
}
