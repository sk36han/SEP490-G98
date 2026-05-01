namespace Warehouse.Entities.ModelResponse
{
    public class ItemDetailResponse
    {
        public ItemProductInfoResponse ProductInfo { get; set; } = new();
        public List<ItemWarehouseVariantResponse> VariantsByWarehouse { get; set; } = new();
        public List<ItemInventoryHistoryResponse> InventoryHistory { get; set; } = new();
        public int HistoryTotalCount { get; set; }
    }

    public class ItemProductInfoResponse
    {
        public long ItemId { get; set; }
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string? ItemType { get; set; }
        public string? Description { get; set; }
        /// <summary>FK danh mục — cần cho form chỉnh sửa (trước đây API chỉ trả tên).</summary>
        public long? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public long? BrandId { get; set; }
        public string? BrandName { get; set; }
        public long BaseUomId { get; set; }
        public string? BaseUomName { get; set; }
        public long? PackagingSpecId { get; set; }
        public string? PackagingSpecName { get; set; }
        /// <summary>Tham số/thông số gắn vật tư (ParamId đầu tiên nếu có nhiều dòng).</summary>
        public long? SpecId { get; set; }
        public string? SpecName { get; set; }
        public bool RequiresCo { get; set; }
        public bool RequiresCq { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? ImageUrl { get; set; }
        public decimal? PurchasePrice { get; set; }
        public decimal? SalePrice { get; set; }
        public string? Specification { get; set; }
        public long? DefaultWarehouseId { get; set; }
        public string? DefaultWarehouseName { get; set; }

        /// <summary>Các dòng giá trị thông số gắn vật tư (ItemParameterValues + tên Param).</summary>
        public List<ItemParameterValueBriefResponse> ParameterValues { get; set; } = new();
    }

    /// <summary>Dòng thông số trên vật tư — dùng cho chi tiết & hiển thị.</summary>
    public class ItemParameterValueBriefResponse
    {
        public long ItemParamValueId { get; set; }
        public long ParamId { get; set; }
        public string ParamCode { get; set; } = string.Empty;
        public string ParamName { get; set; } = string.Empty;
        public string? ParamValue { get; set; }
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
        public long ReferenceId { get; set; }
    }
}
