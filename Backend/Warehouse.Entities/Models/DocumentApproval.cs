using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class DocumentApproval
{
    public long ApprovalId { get; set; }

    public string DocType { get; set; } = null!;

    public long DocId { get; set; }

    public int StageNo { get; set; }

    public string Decision { get; set; } = null!;

    public string? Reason { get; set; }

    public long ActionBy { get; set; }

    public DateTime ActionAt { get; set; }

    public virtual User ActionByNavigation { get; set; } = null!;
}
