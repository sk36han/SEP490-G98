using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class ChangeTransportInfoStatusRequest
    {
        [Required(ErrorMessage = "Trạng thái không được để trống.")]
        [MaxLength(30, ErrorMessage = "Trạng thái không được vượt quá 30 ký tự.")]
        public string Status { get; set; } = null!;
    }
}
