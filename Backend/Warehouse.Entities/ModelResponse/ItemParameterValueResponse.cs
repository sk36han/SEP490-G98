namespace Warehouse.Entities.ModelResponse
{
    public class ItemParameterValueResponse
    {
        public long ItemParamValueId { get; set; }
        public long ItemId { get; set; }
        public long ParamId { get; set; }
        public string? ParamValue { get; set; }
        
       
    }
}
