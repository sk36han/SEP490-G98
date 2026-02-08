using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class AuditLog
{
    public long AuditLogId { get; set; }

    public long ActorUserId { get; set; }

    public string Action { get; set; } = null!;

    public string EntityType { get; set; } = null!;

    public long? EntityId { get; set; }

    public string? Detail { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User ActorUser { get; set; } = null!;
}
