using System;

namespace Warehouse.Entities.ModelResponse
{
    public class CompanyResponse
    {
        public long CompanyId { get; set; }
        public string CompanyCode { get; set; } = null!;
        public string CompanyName { get; set; } = null!;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
