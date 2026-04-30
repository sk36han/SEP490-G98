using System;
using System.Collections.Generic;

namespace Warehouse.Entities.ModelResponse
{

    /// Response cho danh sách yêu cầu xuất kho
    public class ReleaseRequestResponse
    {
        public long ReleaseRequestId { get; set; }
        public string ReleaseRequestCode { get; set; } = null!;
        public string Status { get; set; } = null!;
        public string LifecycleStatus { get; set; } = null!;
        public DateOnly? RequestedDate { get; set; }
        public DateOnly? ExpectedDate { get; set; }
        public string? Purpose { get; set; }
        public bool IsPartialDeliveryAllowed { get; set; }

        // Kho xuất
        public long WarehouseId { get; set; }
        public string? WarehouseName { get; set; }

        // Người nhận
        public long ReceiverId { get; set; }
        public string? ReceiverName { get; set; }
        public long? CompanyId { get; set; }
        public string? CompanyName { get; set; }
        public string? ReceiverAddress { get; set; }

        // Người tạo
        public long RequestedBy { get; set; }
        public string? RequestedByName { get; set; }

        // Tổng quan
        public int TotalItems { get; set; }
        public decimal TotalRequestedQty { get; set; }

        public DateTime CreatedAt { get; set; }

        public bool IsQuotationFlow { get; set; }
        public string? QuotationStatus { get; set; }
        public DateTime? QuotationSentAt { get; set; }
        public DateTime? QuotationConfirmedAt { get; set; }
        public int QuotationVersion { get; set; }
    }


    /// Response chi tiết yêu cầu xuất kho (bao gồm danh sách vật tư + thông tin người nhận)
    public class ReleaseRequestDetailResponse
    {
        public long ReleaseRequestId { get; set; }
        public string ReleaseRequestCode { get; set; } = null!;
        public string Status { get; set; } = null!;
        public string LifecycleStatus { get; set; } = null!;
        public DateOnly? RequestedDate { get; set; }
        public DateOnly? ExpectedDate { get; set; }
        public string? Purpose { get; set; }
        public bool IsPartialDeliveryAllowed { get; set; }

        // Kho xuất
        public long WarehouseId { get; set; }
        public string? WarehouseName { get; set; }

        // Người tạo
        public long RequestedBy { get; set; }
        public string? RequestedByName { get; set; }

        // Người nhận
        public ReleaseRequestReceiverInfo? Receiver { get; set; }

        // Tổng quan
        public int TotalItems { get; set; }
        public decimal TotalRequestedQty { get; set; }

        public decimal TotalAmount { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public bool IsQuotationFlow { get; set; }
        public string? QuotationStatus { get; set; }
        public DateTime? QuotationSentAt { get; set; }
        public DateTime? QuotationConfirmedAt { get; set; }
        public int QuotationVersion { get; set; }

        // Danh sách vật tư
        public List<ReleaseRequestLineResponse> Lines { get; set; } = new();

        // Danh sách tệp đính kèm (Báo giá, Hợp đồng)
        public List<ReleaseRequestAttachmentResponse> Attachments { get; set; } = new();

        // Lịch sử duyệt
        public List<RRApprovalResponse> Approvals { get; set; } = new();

        // Lịch sử xử lý outbound
        public List<OutboundHistoryEventResponse> HistoryEvents { get; set; } = new();
    }

    public class OutboundHistoryEventResponse
    {
        public string EventType { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime OccurredAt { get; set; }
        public string Source { get; set; } = string.Empty;
        public long? SourceId { get; set; }
        public long? ActorUserId { get; set; }
        public string? ActorName { get; set; }
    }

    /// Lịch sử duyệt yêu cầu xuất kho
    public class RRApprovalResponse
    {
        public long ApprovalId { get; set; }
        public int StageNo { get; set; }
        public string Decision { get; set; } = null!;
        public string? Reason { get; set; }
        public long ActionBy { get; set; }
        public string? ActionByName { get; set; }
        public DateTime ActionAt { get; set; }
    }

    /// Thông tin người nhận embed trong response
    public class ReleaseRequestReceiverInfo
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

    /// Chi tiết 1 dòng vật tư trong response
    public class ReleaseRequestLineResponse
    {
        public long ReleaseRequestLineId { get; set; }
        public long ItemId { get; set; }
        public string? ItemCode { get; set; }
        public string? ItemName { get; set; }
        public decimal RequestedQty { get; set; }
        public long UomId { get; set; }
        public string? UomName { get; set; }
        public string? Note { get; set; }
        public decimal ApprovedQty { get; set; }
        public decimal AllocatedQty { get; set; }
        public decimal IssuedQty { get; set; }
        public string LineStatus { get; set; } = null!;

        /// Tồn khả dụng tại kho RR: OnHandQty − ReservedQty (≥ 0)
        public decimal StockQty { get; set; }

        /// Giá vốn bình quân gia quyền từ InventoryOnHand (chỉ hiển thị, không cho sửa)
        public decimal CostPrice { get; set; }

        /// Giá bán do Sale nhập (từ hợp đồng / báo giá)
        public decimal? UnitPrice { get; set; }
        public decimal LineTotal => RequestedQty * (UnitPrice ?? 0);
        public long? PackagingSpecId { get; set; }
        public string? PackagingSpecName { get; set; }
    }

    /// Response cho tệp đính kèm trong Release Request
    public class ReleaseRequestAttachmentResponse
    {
        public long AttachmentId { get; set; }
        public string FileName { get; set; } = null!;
        public string FileUrl { get; set; } = null!;
        public string AttachmentType { get; set; } = null!; // QUOTATION, CONTRACT, ...
        public DateTime UploadedAt { get; set; }
    }
}
