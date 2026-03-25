using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class FilterTransportInfoRequest : FilterRequest
    {
        public string? Keyword { get; set; }
        public long? Gdnid { get; set; }
    }
}
