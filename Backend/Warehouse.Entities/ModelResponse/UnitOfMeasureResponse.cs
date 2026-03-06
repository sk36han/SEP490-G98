namespace Warehouse.Entities.ModelResponse
{
    public class UnitOfMeasureResponse
    {
        public long UomId { get; set; }
        public string UomCode { get; set; } = null!;
        public string UomName { get; set; } = null!;
        public bool IsActive { get; set; }
    }
}
