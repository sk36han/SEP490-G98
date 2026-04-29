using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdateStorageLocationRequest
    {
        [Required(ErrorMessage = "Mã vị trí không được để trống.")]
        [MaxLength(50, ErrorMessage = "Mã vị trí tối đa 50 ký tự.")]
        public string LocationCode { get; set; } = null!;

        [MaxLength(200, ErrorMessage = "Tên vị trí tối đa 200 ký tự.")]
        public string? LocationName { get; set; }

        public decimal? MaxCapacityQty { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
