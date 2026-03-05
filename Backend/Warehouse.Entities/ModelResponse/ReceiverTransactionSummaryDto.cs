namespace Warehouse.Entities.ModelResponse
{
    public class ReceiverTransactionSummaryDto
    {
        public int TotalReleaseRequests { get; set; }
        public int TotalGoodsDeliveryNotes { get; set; }
        public decimal TotalQuantityRequested { get; set; }
        public decimal TotalQuantityDelivered { get; set; }
    }
}
