using System;
using System.Collections.Generic;

namespace Warehouse.Entities.ModelResponse
{
    /// <summary>
    /// Response cho danh sách phiếu xuất kho (list view)
    /// </summary>
    public class GoodsDeliveryNoteResponse
    {
        public long GdnId { get; set; }
        public string GdnCode { get; set; } = string.Empty;
        public DateOnly IssueDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsPaid { get; set; }

        // Release Request
        public long ReleaseRequestId { get; set; }
        public string? ReleaseRequestCode { get; set; }

        // Warehouse
        public long WarehouseId { get; set; }
        public string? WarehouseName { get; set; }

        // Người tạo
        public long CreatedBy { get; set; }
        public string? CreatedByName { get; set; }

        // Tổng
        public decimal TotalDeliveredQty { get; set; }
        public decimal TotalDeliveredAmount { get; set; }
        public decimal ShippingFee { get; set; }
        public decimal NetAmount { get; set; }

        // Thời gian
        public DateTime? SubmittedAt { get; set; }

        public string? Note { get; set; }

        // Receiver Info (Basic for list)
        public long? ReceiverId { get; set; }
        public string? ReceiverName { get; set; }
        public long? CompanyId { get; set; }
        public string? CompanyName { get; set; }
        public string? ReceiverAddress { get; set; }
    }

    /// <summary>
    /// Response chi tiết phiếu xuất kho (bao gồm lines + transport info)
    /// </summary>
    public class GDNDetailResponse
    {
        // Header
        public long GdnId { get; set; }
        public string GdnCode { get; set; } = string.Empty;
        public DateOnly IssueDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsPaid { get; set; }
        public string? PaymentMethod { get; set; }

        // Release Request
        public long ReleaseRequestId { get; set; }
        public string? ReleaseRequestCode { get; set; }

        // Warehouse
        public long WarehouseId { get; set; }
        public string? WarehouseName { get; set; }

        // Người tạo
        public long CreatedBy { get; set; }
        public string? CreatedByName { get; set; }

        // Tổng
        public decimal TotalDeliveredQty { get; set; }
        public decimal TotalDeliveredAmount { get; set; }
        public decimal ShippingFee { get; set; }
        public decimal NetAmount { get; set; }

        // Thời gian
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? PostedAt { get; set; }

        public string? Note { get; set; }

        // Transport Info
        public GDNTransportInfoResponse? TransportInfo { get; set; }

        // Receiver Info (Detailed for detail)
        public GDNReceiverInfo? Receiver { get; set; }

        // Lines
        public List<GDNLineDetailResponse> Lines { get; set; } = new();

        // Lịch sử duyệt
        public List<GDNApprovalResponse> Approvals { get; set; } = new();
    }

    public class GDNLineDetailResponse
    {
        public long GdnLineId { get; set; }
        public long ItemId { get; set; }
        public string? ItemCode { get; set; }
        public string? ItemName { get; set; }

        public decimal? RequestedQty { get; set; }
        public decimal ActualQty { get; set; }

        public long UomId { get; set; }
        public string? UomName { get; set; }

        public decimal? UnitPrice { get; set; }
        public decimal? LineTotal { get; set; }

        public bool RequiresCertificateCopy { get; set; }

        public long? ReleaseRequestLineId { get; set; }
        public long? LotId { get; set; }
        public string? Note { get; set; }
    }

    public class GDNTransportInfoResponse
    {
        public long TransportId { get; set; }
        public string? CarrierName { get; set; }
        public string? DriverName { get; set; }
        public string? DriverPhone { get; set; }
        public string? LicensePlate { get; set; }
        public string? Note { get; set; }
    }

    /// <summary>
    /// Lịch sử duyệt phiếu xuất kho
    /// </summary>
    public class GDNApprovalResponse
    {
        public long ApprovalId { get; set; }
        public int StageNo { get; set; }
        public string Decision { get; set; } = null!;
        public string? Reason { get; set; }
        public long ActionBy { get; set; }
        public string? ActionByName { get; set; }
        public DateTime ActionAt { get; set; }
    }

    /// <summary>
    /// Thông tin người nhận trong GDN
    /// </summary>
    public class GDNReceiverInfo
    {
        public long ReceiverId { get; set; }
        public string ReceiverName { get; set; } = null!;
        public string? Phone { get; set; }
        public string? Email { get; set; }
        // Company Info
        public long? CompanyId { get; set; }
        public string? CompanyName { get; set; }

        public string? Notes { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? Ward { get; set; }
    }
}
