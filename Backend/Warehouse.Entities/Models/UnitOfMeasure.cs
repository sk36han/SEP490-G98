using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class UnitOfMeasure
{
    public long UomId { get; set; }

    public string UomCode { get; set; } = null!;

    public string UomName { get; set; } = null!;

    public bool IsActive { get; set; }

    public virtual ICollection<GoodsDeliveryNoteLine> GoodsDeliveryNoteLines { get; set; } = new List<GoodsDeliveryNoteLine>();

    public virtual ICollection<GoodsReceiptNoteLine> GoodsReceiptNoteLines { get; set; } = new List<GoodsReceiptNoteLine>();

    public virtual ICollection<InventoryTransactionLine> InventoryTransactionLines { get; set; } = new List<InventoryTransactionLine>();

    public virtual ICollection<Item> Items { get; set; } = new List<Item>();

    public virtual ICollection<PurchaseOrderLine> PurchaseOrderLines { get; set; } = new List<PurchaseOrderLine>();

    public virtual ICollection<ReleaseRequestLine> ReleaseRequestLines { get; set; } = new List<ReleaseRequestLine>();
}
