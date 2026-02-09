using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class ReleaseRequestLine
{
    public long ReleaseRequestLineId { get; set; }

    public long ReleaseRequestId { get; set; }

    public long ItemId { get; set; }

    public decimal RequestedQty { get; set; }

    public int UomId { get; set; }

    public string? Note { get; set; }

    public virtual Item Item { get; set; } = null!;

    public virtual ReleaseRequest ReleaseRequest { get; set; } = null!;

    public virtual UnitOfMeasure Uom { get; set; } = null!;
}
