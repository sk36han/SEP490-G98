using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class Receiver
{
    public long ReceiverId { get; set; }

    public string? ReceiverCode { get; set; }

    public string ReceiverName { get; set; } = null!;

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public string? Address { get; set; }

    public string? Notes { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<ReleaseRequest> ReleaseRequests { get; set; } = new List<ReleaseRequest>();
}
