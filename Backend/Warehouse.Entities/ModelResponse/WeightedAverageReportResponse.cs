using System.Collections.Generic;

namespace Warehouse.Entities.ModelResponse;

public class WeightedAverageReportResponse
{
    public int TotalMaterials { get; set; }
    public decimal TotalInventory { get; set; }
    public decimal AverageWeightedPrice { get; set; }
    public decimal TotalInventoryValue { get; set; }
    
    public int TotalRecords { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    
    public List<WeightedAverageReportItem> Items { get; set; } = new List<WeightedAverageReportItem>();
}

public class WeightedAverageReportItem
{
    public long ItemId { get; set; }
    public string ItemCode { get; set; } = null!;
    public string ItemName { get; set; } = null!;
    public long WarehouseId { get; set; }
    public string WarehouseName { get; set; } = null!;
    public decimal LatestImportPrice { get; set; }
    public decimal WeightedAveragePrice { get; set; }
    public decimal TotalInventory { get; set; }
    public decimal InventoryValue { get; set; }
}
