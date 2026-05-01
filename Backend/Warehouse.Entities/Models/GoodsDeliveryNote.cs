using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class GoodsDeliveryNote
{
    public long Gdnid { get; set; }

    public string Gdncode { get; set; } = null!;

    public long ReleaseRequestId { get; set; }

    public long WarehouseId { get; set; }

    public DateOnly IssueDate { get; set; }

    public long CreatedBy { get; set; }

    public string Status { get; set; } = null!;

    public DateTime? SubmittedAt { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public DateTime? PostedAt { get; set; }

    public string? Note { get; set; }

    public decimal ShippingFee { get; set; }

    public bool IsPaid { get; set; }

    public string? PaymentMethod { get; set; }

    public decimal TotalDeliveredQty { get; set; }

    public decimal TotalDeliveredAmount { get; set; }

    public virtual User CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<GoodsDeliveryNoteLine> GoodsDeliveryNoteLines { get; set; } = new List<GoodsDeliveryNoteLine>();

    public virtual ReleaseRequest ReleaseRequest { get; set; } = null!;

    public virtual TransportInfo? TransportInfo { get; set; }

    public virtual Warehouse Warehouse { get; set; } = null!;
}
