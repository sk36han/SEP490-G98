using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class InventoryOnHand
{
    public long InventoryId { get; set; }

    public int WarehouseId { get; set; }

    public long ItemId { get; set; }

    public decimal OnHandQty { get; set; }

    public decimal ReservedQty { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Item Item { get; set; } = null!;

    public virtual Warehouse Warehouse { get; set; } = null!;
}
