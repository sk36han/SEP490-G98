using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class PurchaseReturnNoteLine
{
    public long PurchaseReturnLineId { get; set; }

    public long PurchaseReturnId { get; set; }

    public decimal ReturnQty { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal? LineTotal { get; set; }

    public string? Reason { get; set; }

    public string? Note { get; set; }

    public long? RelatedGrnlineId { get; set; }

    public virtual PurchaseReturnNote PurchaseReturn { get; set; } = null!;

    public virtual GoodsReceiptNoteLine? RelatedGrnline { get; set; }
}
