using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdateSupplierRequest
    {
        [Required(ErrorMessage = "Tên nhà cung cấp không được để trống")]
        [MaxLength(255, ErrorMessage = "Tên nhà cung cấp tối đa 255 ký tự")]
        public string SupplierName { get; set; } = null!;

        [MaxLength(50, ErrorMessage = "Mã số thuế tối đa 50 ký tự")]
        public string? TaxCode { get; set; }

        [MaxLength(20, ErrorMessage = "Số điện thoại tối đa 20 ký tự")]
        [RegularExpression(@"^[\d\+\-\(\)\s]*$", ErrorMessage = "Số điện thoại không hợp lệ")]
        public string? Phone { get; set; }

        [MaxLength(255, ErrorMessage = "Email tối đa 255 ký tự")]
        [EmailAddress(ErrorMessage = "Email không đúng định dạng")]
        public string? Email { get; set; }

        [MaxLength(255, ErrorMessage = "Địa chỉ tối đa 255 ký tự")]
        public string? Address { get; set; }

        public bool IsActive { get; set; }
    }
}
