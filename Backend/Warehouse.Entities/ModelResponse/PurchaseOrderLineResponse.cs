using System;

namespace Warehouse.Entities.ModelResponse
{
    public class PurchaseOrderLineResponse
    {
        public long PurchaseOrderLineId { get; set; }
        public long PurchaseOrderId { get; set; }
        
        public long ItemId { get; set; }
        public string ItemCode { get; set; } = null!;
        public string ItemName { get; set; } = null!;
        
        public decimal OrderedQty { get; set; }
        
        public long UomId { get; set; }
        public string UomName { get; set; } = null!;
        
        public string? Note { get; set; }
    }
}
