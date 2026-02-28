using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreateReceiverRequest
    {
        [Required]
        [MaxLength(50)]
        public string ReceiverCode { get; set; } = null!;

        [Required]
        [MaxLength(255)]
        public string ReceiverName { get; set; } = null!;

        [MaxLength(20)]
        public string? Phone { get; set; }

        [EmailAddress]
        public string? Email { get; set; }

        [MaxLength(255)]
        public string? Address { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }
    }
}
