using System;
using System.Collections.Generic;

namespace Warehouse.Entities.ModelResponse
{
    public class GoodsReceiptNoteDetailResponse
    {
        // Header
        public long GrnId { get; set; }
        public string GrnCode { get; set; } = string.Empty;
        public DateOnly ReceiptDate { get; set; }
        public string Status { get; set; } = string.Empty;
        
        // Payment
        public bool IsPaid { get; set; }
        public string? PaymentMethod { get; set; }
        
        // Related
        public long? PurchaseOrderId { get; set; }
        public string? PurchaseOrderCode { get; set; }
        public long SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public long WarehouseId { get; set; }
        public string? WarehouseName { get; set; }
        public long CreatedBy { get; set; }
        public string? CreatedByName { get; set; }
        
        // Totals
        public decimal TotalReceivedQty { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal ShippingFee { get; set; }
        public decimal NetAmount { get; set; }
        
        // Dates
        public DateTime? SubmittedAt { get; set; }
        public DateTime? PostedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? Note { get; set; }
        
        // Lines
        public List<GoodsReceiptNoteLineResponse> Lines { get; set; } = new();
    }

    public class GoodsReceiptNoteLineResponse
    {
        public long GrnlineId { get; set; }
        public long ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? ItemCode { get; set; }
        
        public decimal ExpectedQty { get; set; }
        public decimal ActualQty { get; set; }
        public string? UomName { get; set; }
        
        public decimal? UnitPrice { get; set; }
        public decimal? LineTotal { get; set; }
        
        public bool HasCO { get; set; }
        public bool HasCQ { get; set; }
        
        public long? PurchaseOrderLineId { get; set; }
    }
}