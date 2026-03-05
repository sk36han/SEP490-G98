namespace Warehouse.Entities.ModelResponse
{
    public class ReceiverTransactionDto
    {
        public long TransactionId { get; set; }
        public DateTime TransactionDate { get; set; }
        public string TransactionCode { get; set; } = string.Empty;
        public string TransactionType { get; set; } = string.Empty; // "RR" or "GDN"
        public string Status { get; set; } = string.Empty;
        public string? Note { get; set; }
        public string? WarehouseName { get; set; }
        public string? CreatedBy { get; set; }
        public int ItemCount { get; set; }
        public decimal TotalQuantity { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
