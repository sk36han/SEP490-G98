using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdatePurchaseOrderRequest
    {
        // Thông tin chung
        public long? SupplierId { get; set; }

        public long? WarehouseId { get; set; }

        public DateOnly? ExpectedDeliveryDate { get; set; }

        [MaxLength(1000)]
        public string? Justification { get; set; }

        public long? ResponsibleUserId { get; set; }

        // Chiết khấu
        [Range(0, double.MaxValue)]
        public decimal? DiscountAmount { get; set; }

        // Chi tiết đơn (Lines)
        public List<UpdatePurchaseOrderLineRequest>? Lines { get; set; }
    }

    public class UpdatePurchaseOrderLineRequest
    {
        [Required(ErrorMessage = "LineId là bắt buộc")]
        public long LineId { get; set; }

        [Range(typeof(decimal), "0.001", "999999999999999999", ErrorMessage = "OrderedQty phải lớn hơn 0")]
        public decimal OrderedQty { get; set; }

        [Range(typeof(decimal), "0", "999999999999999999", ErrorMessage = "UnitPrice không được âm")]
        public decimal UnitPrice { get; set; }

        [MaxLength(500)]
        public string? Note { get; set; }
    }
}
