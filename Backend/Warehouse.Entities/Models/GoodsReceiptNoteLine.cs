using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class GoodsReceiptNoteLine
{
    public long GrnlineId { get; set; }

    public long Grnid { get; set; }

    public long ItemId { get; set; }

    public decimal? ExpectedQty { get; set; }

    public decimal ActualQty { get; set; }

    public int UomId { get; set; }

    public bool RequiresCocq { get; set; }

    public virtual ICollection<Certificate> Certificates { get; set; } = new List<Certificate>();

    public virtual GoodsReceiptNote Grn { get; set; } = null!;

    public virtual Item Item { get; set; } = null!;

    public virtual UnitOfMeasure Uom { get; set; } = null!;
}
