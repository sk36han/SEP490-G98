using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreatePurchaseOrderRequest
    {
        public long? SupplierId { get; set; }
        public DateOnly? RequestedDate { get; set; }
        public DateOnly? ExpectedDeliveryDate { get; set; }
        public string? Justification { get; set; }
        public long? ResponsibleUserId { get; set; }
        public long? WarehouseId { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Triết khấu phải >= 0.")]
        public decimal? DiscountAmount { get; set; }

        [MinLength(1, ErrorMessage = "Đơn hàng phải có ít nhất một mặt hàng.")]
        public List<CreatePurchaseOrderLineRequest> OrderLines { get; set; } = new();
    }

    public class CreatePurchaseOrderLineRequest
    {
        [Required]
        public long ItemId { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "Số lượng phải lớn hơn 0.")]
        public decimal OrderedQty { get; set; }

        [Required]
        public long UomId { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Đơn giá phải >= 0.")]
        public decimal? UnitPrice { get; set; }

        [MaxLength(10)]
        public string? Currency { get; set; }

        public string? Note { get; set; }
    }
}
