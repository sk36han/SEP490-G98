namespace Warehouse.Entities.ModelRequest
{
    public class UpdatePrintTemplateRequest
    {
        public string DocumentType { get; set; } = null!;
        public string TemplateName { get; set; } = null!;
        public bool IsDefault { get; set; }
        public string HtmlBody { get; set; } = null!;
        public string? PaperSize { get; set; }
    }
}
