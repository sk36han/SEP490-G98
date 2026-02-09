using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class UserRole
{
    public long UserRoleId { get; set; }

    public long UserId { get; set; }

    public int RoleId { get; set; }

    public DateTime AssignedAt { get; set; }

    public long? AssignedBy { get; set; }

    public virtual User? AssignedByNavigation { get; set; }

    public virtual Role Role { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
