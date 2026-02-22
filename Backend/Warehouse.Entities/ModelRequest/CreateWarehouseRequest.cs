using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreateWarehouseRequest
    {
        [Required(ErrorMessage = "Mã kho không được để trống")]
        [MaxLength(50)]
        public string WarehouseCode { get; set; } = null!;

        [Required(ErrorMessage = "Tên kho không được để trống")]
        [MaxLength(255)]
        public string WarehouseName { get; set; } = null!;

        [MaxLength(500)]
        public string? Address { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
