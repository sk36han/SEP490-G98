namespace Warehouse.Entities.ModelResponse
{
    public class SupplierTransactionSummaryDto
    {
        public int TotalPurchaseOrders { get; set; }
        public int TotalGoodsReceiptNotes { get; set; }
        public decimal TotalQuantityReceived { get; set; }
        public decimal TotalQuantityOrdered { get; set; }
    }
}
