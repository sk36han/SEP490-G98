using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Warehouse.Entities.ModelRequest;

public class SendRrQuotationEmailRequest
{
    [Required]
    public List<string> ToEmails { get; set; } = new();

    public List<string>? CcEmails { get; set; }

    public List<string>? BccEmails { get; set; }

    [Required]
    [MaxLength(500)]
    public string Subject { get; set; } = null!;

    [Required]
    public string Body { get; set; } = null!;
}

public class ConfirmRrQuotationRequest
{
    [MaxLength(500)]
    public string? Note { get; set; }
}

public class ImportRrQuotationExcelRequest
{
    [Required]
    public IFormFile File { get; set; } = null!;
}
