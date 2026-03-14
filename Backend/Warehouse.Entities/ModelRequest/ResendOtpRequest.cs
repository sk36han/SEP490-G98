using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class ResendOtpRequest
    {
        [Required(ErrorMessage = "UserId là bắt buộc")]
        public long UserId { get; set; }
    }
}
