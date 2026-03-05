using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class DocumentAttachment
{
    public long AttachmentId { get; set; }

    public string DocType { get; set; } = null!;

    public long DocId { get; set; }

    public string AttachmentType { get; set; } = null!;

    public string FileName { get; set; } = null!;

    public string FileUrlOrPath { get; set; } = null!;

    public long UploadedBy { get; set; }

    public DateTime UploadedAt { get; set; }

    public virtual User UploadedByNavigation { get; set; } = null!;
}
