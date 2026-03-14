using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdateSupplierRequest
    {
        [Required(ErrorMessage = "Tên nhà cung cấp là bắt buộc")]
        [MaxLength(255, ErrorMessage = "Tên nhà cung cấp tối đa 255 ký tự")]
        [MinLength(1, ErrorMessage = "Tên nhà cung cấp không được để trống")]
        public string SupplierName { get; set; } = null!;

        [MaxLength(50, ErrorMessage = "Mã số thuế tối đa 50 ký tự")]
        [RegularExpression(@"^[0-9-]{10,13}$", ErrorMessage = "Mã số thuế không hợp lệ (chỉ gồm số và dấu gạch ngang, từ 10-13 ký tự)")]
        public string? TaxCode { get; set; }

        [MaxLength(20, ErrorMessage = "Số điện thoại tối đa 20 ký tự")]
        [RegularExpression(@"^(0[35789][0-9]{8})$", ErrorMessage = "Số điện thoại không hợp lệ (phải bắt đầu bằng 0 và có 10 chữ số)")]
        public string? Phone { get; set; }

        [MaxLength(100, ErrorMessage = "Email tối đa 100 ký tự")]
        [EmailAddress(ErrorMessage = "Địa chỉ email không hợp lệ")]
        public string? Email { get; set; }

        [MaxLength(255, ErrorMessage = "Địa chỉ tối đa 255 ký tự")]
        public string? Address { get; set; }

        [MaxLength(100, ErrorMessage = "Thành phố tối đa 100 ký tự")]
        public string? City { get; set; }

        [MaxLength(100, ErrorMessage = "Phường/Xã tối đa 100 ký tự")]
        public string? Ward { get; set; }

        [MaxLength(100, ErrorMessage = "Quận/Huyện tối đa 100 ký tự")]
        public string? District { get; set; }

        public bool IsActive { get; set; }
    }
}
