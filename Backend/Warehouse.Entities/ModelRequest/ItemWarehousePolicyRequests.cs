using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest;

public class CreateItemWarehousePolicyRequest
{
    [Required]
    public long ItemId { get; set; }

    [Required]
    public long WarehouseId { get; set; }

    [Required]
    [Range(0, (double)decimal.MaxValue)]
    public decimal MinQty { get; set; }

    [Range(0, (double)decimal.MaxValue)]
    public decimal? ReorderQty { get; set; }
}

public class UpdateItemWarehousePolicyRequest
{
    [Required]
    [Range(0, (double)decimal.MaxValue)]
    public decimal MinQty { get; set; }

    [Range(0, (double)decimal.MaxValue)]
    public decimal? ReorderQty { get; set; }
}

public class ItemWarehousePolicyFilterRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Keyword { get; set; }
    public long? WarehouseId { get; set; }
    public string? StatusFilter { get; set; } // "under" | "safe"
}
