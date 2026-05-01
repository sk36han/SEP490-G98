namespace Warehouse.Entities.ModelResponse
{
    public class LocationLedgerEntryResponse
    {
        public long InventoryTxnLineId { get; set; }
        public DateTime TxnDate { get; set; }
        public string? VoucherCode { get; set; }
        public string? ReferenceType { get; set; }
        public long ReferenceId { get; set; }
        public string? TxnType { get; set; }
        public long ItemId { get; set; }
        public string? ItemCode { get; set; }
        public string? ItemName { get; set; }
        public decimal QtyChange { get; set; }
        public decimal BalanceBefore { get; set; }
        public decimal BalanceAfter { get; set; }
        public string? PerformedByName { get; set; }
        public string? Note { get; set; }
    }
}
