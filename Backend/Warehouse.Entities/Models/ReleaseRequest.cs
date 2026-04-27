using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class ReleaseRequest
{
    public long ReleaseRequestId { get; set; }

    public string ReleaseRequestCode { get; set; } = null!;

    public long RequestedBy { get; set; }

    public long ReceiverId { get; set; }

    public long WarehouseId { get; set; }

    public DateOnly? RequestedDate { get; set; }

    public string? Purpose { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public DateOnly? ExpectedDate { get; set; }

    public string LifecycleStatus { get; set; } = null!;

    public bool IsPartialDeliveryAllowed { get; set; }

    public bool IsQuotationFlow { get; set; }

    public string? QuotationStatus { get; set; }

    public DateTime? QuotationSentAt { get; set; }

    public DateTime? QuotationConfirmedAt { get; set; }

    public int QuotationVersion { get; set; }

    public virtual ICollection<GoodsDeliveryNote> GoodsDeliveryNotes { get; set; } = new List<GoodsDeliveryNote>();

    public virtual Receiver Receiver { get; set; } = null!;

    public virtual ICollection<ReleaseRequestEmailLog> ReleaseRequestEmailLogs { get; set; } = new List<ReleaseRequestEmailLog>();

    public virtual ICollection<ReleaseRequestLine> ReleaseRequestLines { get; set; } = new List<ReleaseRequestLine>();

    public virtual User RequestedByNavigation { get; set; } = null!;

    public virtual Warehouse Warehouse { get; set; } = null!;
}
 