using System;

namespace Warehouse.Entities.Models;

public partial class ReleaseRequestEmailLog
{
    public long ReleaseRequestEmailLogId { get; set; }

    public long ReleaseRequestId { get; set; }

    public long SenderUserId { get; set; }

    public string ToEmails { get; set; } = null!;

    public string? CcEmails { get; set; }

    public string? BccEmails { get; set; }

    public string Subject { get; set; } = null!;

    public DateTime SentAt { get; set; }

    public string Status { get; set; } = null!;

    public string? ErrorMessage { get; set; }

    public virtual ReleaseRequest ReleaseRequest { get; set; } = null!;

    public virtual User SenderUser { get; set; } = null!;
}
