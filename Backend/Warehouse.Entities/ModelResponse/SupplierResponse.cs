using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Warehouse.Entities.ModelResponse
{
    public class SupplierResponse
    {
        public long SupplierId { get; set; }
        public string? SupplierCode { get; set; }
        public string SupplierName { get; set; } = null!;
        public string? TaxCode { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public bool IsActive { get; set; }
    }
}
