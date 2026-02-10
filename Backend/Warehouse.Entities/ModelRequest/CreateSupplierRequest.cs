using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreateSupplierRequest
    {
        [Required]
        [MaxLength(50)]
        public string SupplierCode { get; set; } = null!;

        [Required]
        [MaxLength(255)]
        public string SupplierName { get; set; } = null!;

        [MaxLength(50)]
        public string? TaxCode { get; set; }

        [MaxLength(20)]
        public string? Phone { get; set; }

        [EmailAddress]
        public string? Email { get; set; }

        [MaxLength(255)]
        public string? Address { get; set; }
    }
}

