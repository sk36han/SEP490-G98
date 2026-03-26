using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreateGDNRequest
    {
        [Required(ErrorMessage = "Yêu cầu xuất kho không được để trống.")]
        public long ReleaseRequestId { get; set; }

        [Required(ErrorMessage = "Kho xuất không được để trống.")]
        public long WarehouseId { get; set; }

        [Required(ErrorMessage = "Ngày xuất kho không được để trống.")]
        public DateOnly IssueDate { get; set; }

        // Shipping
        public decimal? ShippingFee { get; set; }

        // Payment
        public bool IsPaid { get; set; }
        public string? PaymentMethod { get; set; }

        // Note
        public string? Note { get; set; }

        // Status (optional: default DRAFT, can be set to PENDING_ACCOUNTANT to submit immediately)
        public string? Status { get; set; }

        // Transport Info (optional)
        public CreateGDNTransportInfoRequest? TransportInfo { get; set; }

        // Lines
        [Required(ErrorMessage = "Phải có ít nhất 1 dòng sản phẩm.")]
        [MinLength(1, ErrorMessage = "Phải có ít nhất 1 dòng sản phẩm.")]
        public List<CreateGDNLineRequest> Lines { get; set; } = new();
    }

    public class CreateGDNLineRequest
    {
        [Required]
        public long ItemId { get; set; }

        public decimal? RequestedQty { get; set; }

        [Required]
        [Range(0.001, double.MaxValue, ErrorMessage = "Số lượng thực xuất phải lớn hơn 0.")]
        public decimal ActualQty { get; set; }

        [Required]
        public long UomId { get; set; }

        public long? ReleaseRequestLineId { get; set; }

        public decimal? UnitPrice { get; set; }

        public bool RequiresCertificateCopy { get; set; }

        public string? Note { get; set; }
    }

    public class CreateGDNTransportInfoRequest
    {
        [MaxLength(200, ErrorMessage = "Tên đơn vị vận chuyển không được vượt quá 200 ký tự.")]
        public string? CarrierName { get; set; }

        [MaxLength(200, ErrorMessage = "Tên tài xế không được vượt quá 200 ký tự.")]
        public string? DriverName { get; set; }

        [MaxLength(20, ErrorMessage = "Số điện thoại tài xế không được vượt quá 20 ký tự.")]
        public string? DriverPhone { get; set; }

        [MaxLength(50, ErrorMessage = "Biển số xe không được vượt quá 50 ký tự.")]
        public string? LicensePlate { get; set; }

        [MaxLength(500, ErrorMessage = "Ghi chú vận chuyển không được vượt quá 500 ký tự.")]
        public string? Note { get; set; }
    }
}
