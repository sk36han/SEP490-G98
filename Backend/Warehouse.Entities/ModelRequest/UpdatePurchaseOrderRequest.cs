using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdatePurchaseOrderRequest
    {
        [Required(ErrorMessage = "Mã đơn hàng (Pocode) là bắt buộc.")]
        [MaxLength(50)]
        public string Pocode { get; set; } = null!;

        public long? SupplierId { get; set; }

        public DateOnly? RequestedDate { get; set; }

        public string? Justification { get; set; }

        [Required(ErrorMessage = "Trạng thái là bắt buộc.")]
        public string Status { get; set; } = null!;

        public int CurrentStageNo { get; set; }

        [MinLength(1, ErrorMessage = "Đơn hàng phải có ít nhất một mặt hàng.")]
        public List<UpdatePurchaseOrderLineRequest> OrderLines { get; set; } = new();
    }

    public class UpdatePurchaseOrderLineRequest
    {
        public long? PurchaseOrderLineId { get; set; } // Nếu có ID thì update, không có thì tạo mới

        [Required]
        public long ItemId { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "Số lượng phải lớn hơn 0.")]
        public decimal OrderedQty { get; set; }

        [Required]
        public long UomId { get; set; }

        public string? Note { get; set; }
    }
}
