namespace Warehouse.Entities.ModelResponse
{
    public class ItemParameterResponse
    {
        public long ParamId { get; set; }
        public string ParamCode { get; set; } = null!;
        public string ParamName { get; set; } = null!;
        public string DataType { get; set; } = null!;
        public bool IsActive { get; set; }
    }
}
