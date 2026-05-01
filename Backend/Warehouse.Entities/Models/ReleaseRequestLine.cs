using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class ReleaseRequestLine
{
    public long ReleaseRequestLineId { get; set; }

    public long ReleaseRequestId { get; set; }

    public long ItemId { get; set; }

    public decimal RequestedQty { get; set; }

    public long UomId { get; set; }

    public string? Note { get; set; }

    public decimal ApprovedQty { get; set; }

    public decimal AllocatedQty { get; set; }

    public decimal IssuedQty { get; set; }

    public decimal? UnitCostAtIssue { get; set; }

    public long? PackagingSpecId { get; set; }

    public decimal? RemainingToIssue { get; set; }

    public string LineStatus { get; set; } = null!;

    public virtual ICollection<GoodsDeliveryNoteLine> GoodsDeliveryNoteLines { get; set; } = new List<GoodsDeliveryNoteLine>();

    public virtual Item Item { get; set; } = null!;

    public virtual PackagingSpec? PackagingSpec { get; set; }

    public virtual ReleaseRequest ReleaseRequest { get; set; } = null!;

    public virtual UnitOfMeasure Uom { get; set; } = null!;
}
