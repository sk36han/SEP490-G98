using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdateReceiverRequest
    {
        [Required(ErrorMessage = "Tên người nhận không được để trống")]
        [MaxLength(255, ErrorMessage = "Tên người nhận tối đa 255 ký tự")]
        public string ReceiverName { get; set; } = null!;

        [MaxLength(20, ErrorMessage = "Số điện thoại tối đa 20 ký tự")]
        [RegularExpression(@"^[\d\+\-\(\)\s]*$", ErrorMessage = "Số điện thoại không hợp lệ")]
        public string? Phone { get; set; }

        [MaxLength(255, ErrorMessage = "Email tối đa 255 ký tự")]
        [EmailAddress(ErrorMessage = "Email không đúng định dạng")]
        public string? Email { get; set; }

        [MaxLength(255, ErrorMessage = "Địa chỉ tối đa 255 ký tự")]
        public string? Address { get; set; }

        [MaxLength(500, ErrorMessage = "Ghi chú tối đa 500 ký tự")]
        public string? Notes { get; set; }

        public bool IsActive { get; set; }
    }
}
