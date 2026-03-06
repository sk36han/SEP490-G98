namespace Warehouse.Entities.ModelResponse
{
    public class BrandResponse
    {
        public long BrandId { get; set; }
        public string BrandName { get; set; } = null!;
        public bool IsActive { get; set; }
    }
}
