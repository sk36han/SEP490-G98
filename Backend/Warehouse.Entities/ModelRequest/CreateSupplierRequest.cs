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
        [Required(ErrorMessage = "Mã nhà cung cấp là bắt buộc")]
        [MaxLength(50)]
        public string SupplierCode { get; set; } = null!;

        [Required(ErrorMessage = "Tên nhà cung cấp là bắt buộc")]
        [MaxLength(255)]
        [MinLength(1, ErrorMessage = "Tên nhà cung cấp không được để trống")]
        public string SupplierName { get; set; } = null!;

        [MaxLength(50)]
        [RegularExpression(@"^[0-9-]{10,13}$", ErrorMessage = "Mã số thuế không hợp lệ (chỉ gồm số và dấu gạch ngang, từ 10-13 ký tự)")]
        public string? TaxCode { get; set; }

        [MaxLength(20)]
        [RegularExpression(@"^(0[35789][0-9]{8})$", ErrorMessage = "Số điện thoại không hợp lệ (phải bắt đầu bằng 0 và có 10 chữ số)")]
        public string? Phone { get; set; }

        [EmailAddress(ErrorMessage = "Địa chỉ email không hợp lệ")]
        [MaxLength(100)]
        public string? Email { get; set; }

        [MaxLength(255)]
        public string? Address { get; set; }

        [MaxLength(100)]
        public string? City { get; set; }

        [MaxLength(100)]
        public string? Ward { get; set; }

        [MaxLength(100)]
        public string? District { get; set; }
    }
}

