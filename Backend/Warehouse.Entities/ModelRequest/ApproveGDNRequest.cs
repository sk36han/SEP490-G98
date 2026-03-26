using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class ApproveGDNRequest
    {
        [Required(ErrorMessage = "Phải chọn duyệt hoặc từ chối.")]
        public bool IsApproved { get; set; }

        [MaxLength(1000, ErrorMessage = "Lý do không được vượt quá 1000 ký tự.")]
        public string? Reason { get; set; }
    }
}
