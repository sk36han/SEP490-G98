using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class PrintTemplate
{
    public long PrintTemplateId { get; set; }

    public string DocumentType { get; set; } = null!;

    public string TemplateName { get; set; } = null!;

    public bool IsDefault { get; set; }

    public string HtmlBody { get; set; } = null!;

    public string? PaperSize { get; set; }

    public DateTime CreatedAt { get; set; }
}
