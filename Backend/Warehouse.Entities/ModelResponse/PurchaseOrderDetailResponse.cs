using System.Collections.Generic;

namespace Warehouse.Entities.ModelResponse
{
    public class PurchaseOrderDetailResponse : PurchaseOrderResponse
    {
        public List<PurchaseOrderLineResponse> PurchaseOrderLines { get; set; } = new List<PurchaseOrderLineResponse>();
    }
}
