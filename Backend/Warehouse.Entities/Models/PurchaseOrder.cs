using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class PurchaseOrder
{
    public long PurchaseOrderId { get; set; }

    public string Pocode { get; set; } = null!;

    public long RequestedBy { get; set; }

    public long? SupplierId { get; set; }

    public DateOnly? RequestedDate { get; set; }

    public string? Justification { get; set; }

    public string Status { get; set; } = null!;

    public int CurrentStageNo { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateOnly? ExpectedDeliveryDate { get; set; }

    public string LifecycleStatus { get; set; } = null!;

    public decimal TotalAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal? NetAmount { get; set; }

    public long? ResponsibleUserId { get; set; }

    public long? WarehouseId { get; set; }

    public virtual ICollection<GoodsReceiptNote> GoodsReceiptNotes { get; set; } = new List<GoodsReceiptNote>();

    public virtual ICollection<PurchaseOrderLine> PurchaseOrderLines { get; set; } = new List<PurchaseOrderLine>();

    public virtual User RequestedByNavigation { get; set; } = null!;

    public virtual User? ResponsibleUser { get; set; }

    public virtual Supplier? Supplier { get; set; }

    public virtual Warehouse? Warehouse { get; set; }
}
