using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class LoginRequest
    {
        [Required(ErrorMessage = "Email hoặc Username là bắt buộc")]
        public string Identifier { get; set; } = null!;

        [Required(ErrorMessage = "Password là bắt buộc")]
        public string Password { get; set; } = null!;

        public bool RememberMe { get; set; } = false;
    }
}
