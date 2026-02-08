using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class InventoryAdjustmentRequest
{
    public long AdjustmentId { get; set; }

    public string AdjustmentCode { get; set; } = null!;

    public long? StocktakeId { get; set; }

    public int WarehouseId { get; set; }

    public long SubmittedBy { get; set; }

    public string Status { get; set; } = null!;

    public string? Reason { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public DateTime? PostedAt { get; set; }

    public virtual ICollection<InventoryAdjustmentLine> InventoryAdjustmentLines { get; set; } = new List<InventoryAdjustmentLine>();

    public virtual StocktakeSession? Stocktake { get; set; }

    public virtual User SubmittedByNavigation { get; set; } = null!;

    public virtual Warehouse Warehouse { get; set; } = null!;
}
