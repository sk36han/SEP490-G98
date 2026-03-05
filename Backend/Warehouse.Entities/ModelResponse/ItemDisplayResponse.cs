namespace Warehouse.Entities.ModelResponse
{
    public class ItemDisplayResponse
    {
        public long ItemId { get; set; }

        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string? ItemType { get; set; }
        public string? Description { get; set; }
        public string? CategoryName { get; set; }
        public bool RequiresCo { get; set; }
        public bool RequiresCq { get; set; }
        public bool IsActive { get; set; }
        public string? InventoryAccount { get; set; }
        public string? RevenueAccount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public decimal? PurchasePrice { get; set; }
        public decimal? SalePrice { get; set; }

        public decimal OnHandQty { get; set; }
        public decimal ReservedQty { get; set; }
        public decimal AvailableQty { get; set; }
    }
}
