using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class Certificate
{
    public long CertificateId { get; set; }

    public long GrnlineId { get; set; }

    public string CertType { get; set; } = null!;

    public string? CertNo { get; set; }

    public string? IssuedBy { get; set; }

    public DateOnly? IssuedDate { get; set; }

    public string? Note { get; set; }

    public virtual GoodsReceiptNoteLine Grnline { get; set; } = null!;
}
