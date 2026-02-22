using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdateWarehouseRequest
    {
        [Required(ErrorMessage = "Tên kho không được để trống")]
        [MaxLength(255, ErrorMessage = "Tên kho tối đa 255 ký tự")]
        public string WarehouseName { get; set; } = null!;

        [MaxLength(500, ErrorMessage = "Địa chỉ tối đa 500 ký tự")]
        public string? Address { get; set; }

        public bool IsActive { get; set; }
    }
}
