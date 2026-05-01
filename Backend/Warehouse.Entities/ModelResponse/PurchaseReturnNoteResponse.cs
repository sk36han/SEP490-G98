using System;
using System.Collections.Generic;

namespace Warehouse.Entities.ModelResponse
{
    public class PurchaseReturnNoteResponse
    {
        public long PurchaseReturnId { get; set; }
        public string ReturnCode { get; set; } = string.Empty;
        public long? RelatedGrnId { get; set; }
        public string? RelatedGrnCode { get; set; }
        public DateTime ReturnDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public string? Note { get; set; }
        public decimal FeeAmount { get; set; }
        public string RefundStatus { get; set; } = string.Empty;
        public decimal RefundedAmount { get; set; }
        public string? RefundMethod { get; set; }
        public long? SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public string? SupplierCode { get; set; }
        public string? SupplierPhone { get; set; }
        public string? SupplierEmail { get; set; }
        public string? SupplierTaxCode { get; set; }
        public string? SupplierAddressProvince { get; set; }
        public string? SupplierAddressDistrict { get; set; }
        public string? SupplierAddressWard { get; set; }
        public string? SupplierAddressStreet { get; set; }
        public long? WarehouseId { get; set; }
        public string? WarehouseName { get; set; }
        public decimal TotalReturnedQty { get; set; }
        public decimal TotalReturnedAmount { get; set; }
        public long CreatedBy { get; set; }
        public string? CreatedByName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class PurchaseReturnNoteDetailResponse : PurchaseReturnNoteResponse
    {
        public DateTime? ApprovedAt { get; set; }
        public DateTime? PostedAt { get; set; }
        public string? RefundReference { get; set; }
        public DateTime? RefundedAt { get; set; }
        public List<PRNLineDetailResponse> Lines { get; set; } = new();
        public List<PRNAttachmentResponse> Attachments { get; set; } = new();
    }

    public class PRNLineDetailResponse
    {
        public long PurchaseReturnLineId { get; set; }
        public long ItemId { get; set; }
        public string? ItemCode { get; set; }
        public string? ItemName { get; set; }
        public long UomId { get; set; }
        public string? UomName { get; set; }
        public decimal ReturnQty { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal? LineTotal { get; set; }
        public string? Reason { get; set; }
        public string? Note { get; set; }
        public long? RelatedGrnlineId { get; set; }
    }

    public class PRNAttachmentResponse
    {
        public long AttachmentId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public string AttachmentType { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
    }
}