using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdateReceiverRequest
    {
        [Required(ErrorMessage = "Tên người nhận không được để trống")]
        [MaxLength(300, ErrorMessage = "Tên người nhận tối đa 300 ký tự")]  // DB: nvarchar(300)
        public string ReceiverName { get; set; } = null!;

        [MaxLength(30, ErrorMessage = "Số điện thoại tối đa 30 ký tự")]     // DB: nvarchar(30)
        [RegularExpression(@"^[\d\+\-\(\)\s]*$", ErrorMessage = "Số điện thoại không hợp lệ")]
        public string? Phone { get; set; }

        [MaxLength(255, ErrorMessage = "Email tối đa 255 ký tự")]
        [EmailAddress(ErrorMessage = "Email không đúng định dạng")]
        public string? Email { get; set; }

        [MaxLength(500, ErrorMessage = "Địa chỉ tối đa 500 ký tự")]         // DB: nvarchar(500)
        public string? Address { get; set; }

        [MaxLength(100, ErrorMessage = "Thành phố tối đa 100 ký tự")]
        public string? City { get; set; }

        [MaxLength(100, ErrorMessage = "Phường/Xã tối đa 100 ký tự")]
        public string? Ward { get; set; }

        [MaxLength(100, ErrorMessage = "Quận/Huyện tối đa 100 ký tự")]
        public string? District { get; set; }

        [MaxLength(1000, ErrorMessage = "Ghi chú tối đa 1000 ký tự")]       // DB: nvarchar(1000)
        public string? Notes { get; set; }

        [MaxLength(200, ErrorMessage = "Chức vụ tối đa 200 ký tự")]         // DB: nvarchar(200)
        public string? Position { get; set; }

        public long? CompanyId { get; set; }    // FK Companies

        public bool IsActive { get; set; }
    }
}
