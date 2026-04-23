using System;

namespace Warehouse.Entities.ModelResponse
{
    public class WarehouseHistoryResponse
    {
        public string VoucherCode { get; set; } = string.Empty;
        public string? RelatedDocumentCode { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public DateTime TransactionDate { get; set; }
        public string ExecutorName { get; set; } = string.Empty;
        public string? Note { get; set; }
    }
}
