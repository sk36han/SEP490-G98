using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class VerifyOtpRequest
    {
        [Required(ErrorMessage = "UserId là bắt buộc")]
        public long UserId { get; set; }

        [Required(ErrorMessage = "Mã OTP là bắt buộc")]
        [StringLength(6, MinimumLength = 6, ErrorMessage = "Mã OTP phải có 6 ký tự")]
        public string Otp { get; set; } = null!;

        public bool RememberMe { get; set; }
    }
}
