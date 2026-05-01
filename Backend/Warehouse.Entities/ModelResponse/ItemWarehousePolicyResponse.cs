namespace Warehouse.Entities.ModelResponse
{
    public class ItemWarehousePolicyResponse
    {
        public long ItemWarehousePolicyId { get; set; }
        public long ItemId { get; set; }
        public long WarehouseId { get; set; }
        public decimal MinQty { get; set; }
        public decimal? ReorderQty { get; set; }
        public decimal OnHandQty { get; set; }
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string WarehouseName { get; set; } = string.Empty;
        public string? Uom { get; set; }
        public System.DateTime? CreatedAt { get; set; }
    }

    public class ItemWarehousePolicyListResponse
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalRecords { get; set; }
        public List<ItemWarehousePolicyResponse> Items { get; set; } = new();
    }
}
