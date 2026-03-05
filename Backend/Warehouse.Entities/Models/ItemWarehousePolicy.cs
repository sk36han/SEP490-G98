using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class ItemWarehousePolicy
{
    public long ItemWarehousePolicyId { get; set; }

    public long ItemId { get; set; }

    public long WarehouseId { get; set; }

    public decimal MinQty { get; set; }

    public decimal? ReorderQty { get; set; }

    public virtual Item Item { get; set; } = null!;

    public virtual Warehouse Warehouse { get; set; } = null!;
}
