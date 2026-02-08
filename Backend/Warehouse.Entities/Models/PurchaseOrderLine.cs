using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class PurchaseOrderLine
{
    public long PurchaseOrderLineId { get; set; }

    public long PurchaseOrderId { get; set; }

    public long ItemId { get; set; }

    public decimal OrderedQty { get; set; }

    public int UomId { get; set; }

    public string? Note { get; set; }

    public virtual Item Item { get; set; } = null!;

    public virtual PurchaseOrder PurchaseOrder { get; set; } = null!;

    public virtual UnitOfMeasure Uom { get; set; } = null!;
}
