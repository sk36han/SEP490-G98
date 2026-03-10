namespace Warehouse.Entities.ModelResponse
{
    public class UnitOfMeasureResponse
    {
        public long UomId { get; set; }
        public string UomName { get; set; } = null!;
        public bool IsActive { get; set; }
    }
}
