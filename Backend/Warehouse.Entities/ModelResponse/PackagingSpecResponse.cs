namespace Warehouse.Entities.ModelResponse
{
    public class PackagingSpecResponse
    {
        public long PackagingSpecId { get; set; }
        public string SpecName { get; set; } = null!;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
    }
}
