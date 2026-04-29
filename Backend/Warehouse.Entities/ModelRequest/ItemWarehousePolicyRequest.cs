using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreateItemWarehousePolicyRequest
    {
        [Required]
        public long ItemId { get; set; }

        [Required]
        public long WarehouseId { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "MinQty phải lớn hơn hoặc bằng 0.")]
        public decimal MinQty { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "ReorderQty phải lớn hơn hoặc bằng 0.")]
        public decimal? ReorderQty { get; set; }
    }

    public class UpdateItemWarehousePolicyRequest
    {
        [Range(0, double.MaxValue, ErrorMessage = "MinQty phải lớn hơn hoặc bằng 0.")]
        public decimal MinQty { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "ReorderQty phải lớn hơn hoặc bằng 0.")]
        public decimal? ReorderQty { get; set; }
    }
}
