using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class InventoryTransactionLine
{
    public long InventoryTxnLineId { get; set; }

    public long InventoryTxnId { get; set; }

    public long ItemId { get; set; }

    public decimal QtyChange { get; set; }

    public long UomId { get; set; }

    public string? Note { get; set; }

    public virtual InventoryTransaction InventoryTxn { get; set; } = null!;

    public virtual Item Item { get; set; } = null!;

    public virtual UnitOfMeasure Uom { get; set; } = null!;
}
