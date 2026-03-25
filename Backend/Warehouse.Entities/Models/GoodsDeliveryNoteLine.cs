using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class GoodsDeliveryNoteLine
{
    public long GdnlineId { get; set; }

    public long Gdnid { get; set; }

    public long ItemId { get; set; }

    public decimal? RequestedQty { get; set; }

    public decimal ActualQty { get; set; }

    public long UomId { get; set; }

    public long? ReleaseRequestLineId { get; set; }

    public decimal? UnitPrice { get; set; }

    public string? Note { get; set; }

    public bool RequiresCertificateCopy { get; set; }

    public decimal? LineTotal { get; set; }

    public virtual GoodsDeliveryNote Gdn { get; set; } = null!;

    public virtual Item Item { get; set; } = null!;

    public virtual ReleaseRequestLine? ReleaseRequestLine { get; set; }

    public virtual UnitOfMeasure Uom { get; set; } = null!;
}
