using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class GoodsReceiptNote
{
    public long Grnid { get; set; }

    public string Grncode { get; set; } = null!;

    public long? PurchaseOrderId { get; set; }

    public long SupplierId { get; set; }

    public long WarehouseId { get; set; }

    public DateOnly ReceiptDate { get; set; }

    public long CreatedBy { get; set; }

    public string Status { get; set; } = null!;

    public DateTime? SubmittedAt { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public DateTime? PostedAt { get; set; }

    public string? Note { get; set; }

    public virtual User CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<GoodsReceiptNoteLine> GoodsReceiptNoteLines { get; set; } = new List<GoodsReceiptNoteLine>();

    public virtual PurchaseOrder? PurchaseOrder { get; set; }

    public virtual Supplier Supplier { get; set; } = null!;

    public virtual Warehouse Warehouse { get; set; } = null!;
}
