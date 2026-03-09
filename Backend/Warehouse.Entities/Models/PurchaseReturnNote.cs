using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class PurchaseReturnNote
{
    public long PurchaseReturnId { get; set; }

    public string ReturnCode { get; set; } = null!;

    public long? RelatedGrnid { get; set; }

    public DateTime ReturnDate { get; set; }

    public string Status { get; set; } = null!;

    public string? Reason { get; set; }

    public string? Note { get; set; }

    public decimal FeeAmount { get; set; }

    public string RefundStatus { get; set; } = null!;

    public decimal RefundedAmount { get; set; }

    public DateTime? RefundedAt { get; set; }

    public string? RefundMethod { get; set; }

    public string? RefundReference { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public long? ApprovedBy { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public DateTime? PostedAt { get; set; }

    public virtual User? ApprovedByNavigation { get; set; }

    public virtual User CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<PurchaseReturnNoteLine> PurchaseReturnNoteLines { get; set; } = new List<PurchaseReturnNoteLine>();

    public virtual GoodsReceiptNote? RelatedGrn { get; set; }
}
