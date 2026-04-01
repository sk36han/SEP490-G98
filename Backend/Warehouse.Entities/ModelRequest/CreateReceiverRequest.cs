using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreateReceiverRequest
    {
        [Required(ErrorMessage = "Tên người nhận không được để trống")]
        [MaxLength(300)]                        // DB: nvarchar(300)
        public string ReceiverName { get; set; } = null!;

        [MaxLength(30)]                         // DB: nvarchar(30)
        public string? Phone { get; set; }

        [EmailAddress]
        [MaxLength(255)]
        public string? Email { get; set; }

        [MaxLength(500)]                        // DB: nvarchar(500)
        public string? Address { get; set; }

        [MaxLength(100)]
        public string? City { get; set; }

        [MaxLength(100)]
        public string? Ward { get; set; }

        [MaxLength(100)]
        public string? District { get; set; }

        [MaxLength(1000)]                       // DB: nvarchar(1000)
        public string? Notes { get; set; }

        [Required(ErrorMessage = "Vui lòng chọn công ty (CompanyId)")]
        public long CompanyId { get; set; }     // FK Companies
    }
}
