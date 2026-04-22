using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdateProfileRequest
    {
        [Required(ErrorMessage = "Phone is required")]
        [Phone(ErrorMessage = "Invalid phone number")]
        public string Phone { get; set; } = string.Empty;

        [MaxLength(10, ErrorMessage = "Gender không hợp lệ.")]
        public string? Gender { get; set; }

        public DateOnly? Dob { get; set; }
    }
}
