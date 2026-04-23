using System;

namespace Warehouse.Entities.ModelResponse
{
    public class WarehouseHistoryResponse
    {
        public string VoucherCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public DateTime TransactionDate { get; set; }
        public string ApproverName { get; set; } = string.Empty;
    }
}
