using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class InventoryAdjustmentLine
{
    public long AdjustmentLineId { get; set; }

    public long AdjustmentId { get; set; }

    public long ItemId { get; set; }

    public decimal SystemQty { get; set; }

    public decimal CountedQty { get; set; }

    public decimal? QtyChange { get; set; }

    public string? Note { get; set; }

    public virtual InventoryAdjustmentRequest Adjustment { get; set; } = null!;

    public virtual Item Item { get; set; } = null!;
}
