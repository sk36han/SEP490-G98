using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Warehouse.Entities.ModelRequest
{
    public class ResetPasswordRequest
    {
        [Required(ErrorMessage = "Token is required")]
        public string Token { get; set; } = string.Empty;

        [Required(ErrorMessage = "New password is required")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be between 6 and 100 characters")]
        // Match frontend rule:
        // - min 6 chars
        // - no whitespace
        // - at least 1 uppercase A-Z
        // - at least 1 number 0-9
        // - at least 1 special char from the same set used in frontend
        [RegularExpression(
            @"^(?=\S{6,100}$)(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/\?]).*$",
            ErrorMessage = "Mật khẩu không hợp lệ. Mật khẩu phải có ít nhất 6 ký tự, không khoảng trắng, có chữ hoa, có số và có ký tự đặc biệt."
        )]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirm password is required")]
        [Compare("NewPassword", ErrorMessage = "Password and confirm password do not match")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
