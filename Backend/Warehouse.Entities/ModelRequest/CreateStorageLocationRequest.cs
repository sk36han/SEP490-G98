using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreateStorageLocationRequest
    {
        [Required(ErrorMessage = "WarehouseId không được để trống.")]
        [Range(1, long.MaxValue, ErrorMessage = "WarehouseId phải lớn hơn 0.")]
        public long WarehouseId { get; set; }

        [Required(ErrorMessage = "Mã vị trí không được để trống.")]
        [MaxLength(50, ErrorMessage = "Mã vị trí tối đa 50 ký tự.")]
        public string LocationCode { get; set; } = null!;

        [MaxLength(200, ErrorMessage = "Tên vị trí tối đa 200 ký tự.")]
        public string? LocationName { get; set; }

        public decimal? MaxCapacityQty { get; set; }
    }
}
