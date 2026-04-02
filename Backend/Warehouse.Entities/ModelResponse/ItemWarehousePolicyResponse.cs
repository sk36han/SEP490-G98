namespace Warehouse.Entities.ModelResponse;

public class ItemWarehousePolicyResponse
{
    public long ItemWarehousePolicyId { get; set; }
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = null!;
    public string ItemName { get; set; } = null!;
    public long WarehouseId { get; set; }
    public string WarehouseName { get; set; } = null!;
    public string? Uom { get; set; }
    public decimal MinQty { get; set; }
    public decimal? ReorderQty { get; set; }
    public decimal OnHandQty { get; set; }
}

public class ItemWarehousePolicyListResponse
{
    public int TotalRecords { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public List<ItemWarehousePolicyResponse> Items { get; set; } = new List<ItemWarehousePolicyResponse>();
}
