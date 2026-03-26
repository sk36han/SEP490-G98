using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class InventoryLot
{
    public long LotId { get; set; }

    public long ItemId { get; set; }

    public long WarehouseId { get; set; }

    public long? GrnlineId { get; set; }

    public DateTime ReceiptDate { get; set; }

    public decimal Quantity { get; set; }

    public decimal UnitCost { get; set; }

    public DateTime? ExpiryDate { get; set; }

    public bool IsActive { get; set; }

    public virtual ICollection<GoodsDeliveryNoteLine> GoodsDeliveryNoteLines { get; set; } = new List<GoodsDeliveryNoteLine>();

    public virtual GoodsReceiptNoteLine? Grnline { get; set; }

    public virtual ICollection<InventoryTransactionLine> InventoryTransactionLines { get; set; } = new List<InventoryTransactionLine>();

    public virtual Item Item { get; set; } = null!;

    public virtual Warehouse Warehouse { get; set; } = null!;
}
