using System;

namespace Warehouse.Entities.ModelResponse
{
    public class AddressResponse
    {
        public long AddressId { get; set; }
        public long CompanyId { get; set; }
        public string? AddressName { get; set; }
        public string AddressDetail { get; set; } = null!;
        public string? District { get; set; }
        public string? City { get; set; }
        public string? Ward { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
    }
}
