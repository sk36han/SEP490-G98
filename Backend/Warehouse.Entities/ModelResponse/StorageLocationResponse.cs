namespace Warehouse.Entities.ModelResponse
{
    public class StorageLocationResponse
    {
        public long LocationId { get; set; }
        public long WarehouseId { get; set; }
        public string? WarehouseName { get; set; }
        public string LocationCode { get; set; } = null!;
        public string? LocationName { get; set; }
        public bool IsActive { get; set; }
        public decimal CurrentQty { get; set; }
        public string? CurrentItemsSummary { get; set; }
    }
}
