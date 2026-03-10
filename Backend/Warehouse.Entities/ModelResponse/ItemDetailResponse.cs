namespace Warehouse.Entities.ModelResponse
{
    public class ItemDetailResponse
    {
        public ItemProductInfoResponse ProductInfo { get; set; } = new();
        public List<ItemWarehouseVariantResponse> VariantsByWarehouse { get; set; } = new();
        public List<ItemInventoryHistoryResponse> InventoryHistory { get; set; } = new();
    }

    public class ItemProductInfoResponse
    {
        public long ItemId { get; set; }
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string? ItemType { get; set; }
        public string? Description { get; set; }
        public string? CategoryName { get; set; }
        public string? BrandName { get; set; }
        public string? BaseUomName { get; set; }
        public string? PackagingSpecName { get; set; }
        public bool RequiresCo { get; set; }
        public bool RequiresCq { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? ImageUrl { get; set; }
        public decimal? PurchasePrice { get; set; }
        public decimal? SalePrice { get; set; }
    }

    public class ItemWarehouseVariantResponse
    {
        public long WarehouseId { get; set; }
        public string WarehouseName { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public string VariantName { get; set; } = string.Empty;
        public decimal OnHandQty { get; set; }
        public decimal AvailableQty { get; set; }
        public decimal ReservedQty { get; set; }
        public decimal PreOrderQty { get; set; }
        public bool IsDefaultWarehouse { get; set; }
    }

    public class ItemInventoryHistoryResponse
    {
        public string DocNo { get; set; } = string.Empty;
        public string MovementSign { get; set; } = string.Empty;
        public decimal Qty { get; set; }
        public DateTime TransactionAt { get; set; }
        public string? ActorName { get; set; }
        public string? Note { get; set; }
        public string SourceType { get; set; } = string.Empty;
    }
}
