using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreateGRNRequest
    {
        [Required]
        public long PurchaseOrderId { get; set; }

        [Required]
        public DateOnly ReceiptDate { get; set; }

        [Required]
        public long WarehouseId { get; set; }

        [Required]
        public long SupplierId { get; set; }

        // Discount
        public string? DiscountType { get; set; }  // "Amount" hoặc "Percentage"
        public decimal? DiscountValue { get; set; }

        // Shipping
        public decimal? ShippingFee { get; set; }

        // Payment
        public bool IsPaid { get; set; }
        public string? PaymentMethod { get; set; }

        // Note
        public string? Note { get; set; }

        // Lines
        [Required]
        [MinLength(1, ErrorMessage = "Phải có ít nhất 1 sản phẩm")]
        public List<CreateGRNLineRequest> Lines { get; set; } = new();
    }

    public class CreateGRNLineRequest
    {
        [Required]
        public long ItemId { get; set; }

        [Required(ErrorMessage = "Vị trí lưu trữ là bắt buộc.")]
        [Range(1, long.MaxValue, ErrorMessage = "LocationId phải lớn hơn 0.")]
        public long LocationId { get; set; }

        [Required]
        public decimal ExpectedQty { get; set; }

        [Required]
        public decimal ActualQty { get; set; }

        [Required]
        public long UomId { get; set; }

        public bool HasCO { get; set; }  // Certificate of Origin
        public bool HasCQ { get; set; }  // Certificate of Quality

        public string? Note { get; set; }

        public long? PurchaseOrderLineId { get; set; }
        public decimal? UnitPrice { get; set; }
    }
}
