using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class PurchaseOrderLine
{
    public long PurchaseOrderLineId { get; set; }

    public long PurchaseOrderId { get; set; }

    public long ItemId { get; set; }

    public decimal OrderedQty { get; set; }

    public long UomId { get; set; }

    public string? Note { get; set; }

    public decimal ReceivedQty { get; set; }

    public string LineStatus { get; set; } = null!;

    public decimal? UnitPrice { get; set; }

    public string? Currency { get; set; }

    public decimal? LineTotal { get; set; }

    public virtual ICollection<GoodsReceiptNoteLine> GoodsReceiptNoteLines { get; set; } = new List<GoodsReceiptNoteLine>();

    public virtual Item Item { get; set; } = null!;

    public virtual PurchaseOrder PurchaseOrder { get; set; } = null!;

    public virtual UnitOfMeasure Uom { get; set; } = null!;
}
