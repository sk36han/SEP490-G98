using System;
using System.Collections.Generic;

namespace Warehouse.Entities.ModelResponse
{
    public class PurchaseOrderDetailResponse
    {
        public long PurchaseOrderId { get; set; }
        public string POCode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string LifecycleStatus { get; set; } = string.Empty;
        public int CurrentStageNo { get; set; }

        public long RequestedBy { get; set; }
        public string? RequestedByName { get; set; }
        public long? ResponsibleUserId { get; set; }
        public string? ResponsibleUserName { get; set; }

        public long? SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public long? WarehouseId { get; set; }
        public string? WarehouseName { get; set; }

        public DateOnly? RequestedDate { get; set; }
        public DateOnly? ExpectedDeliveryDate { get; set; }
        public string? Justification { get; set; }

        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NetAmount { get; set; }
        public decimal TotalOrderedQty { get; set; } // Tổng số lượng đặt

        public DateTime CreatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        public List<PurchaseOrderLineResponse> Lines { get; set; } = new();
    }

    public class PurchaseOrderLineResponse
    {
        public long PurchaseOrderLineId { get; set; }
        public long ItemId { get; set; }
        public string? ItemCode { get; set; }
        public string? ItemName { get; set; }
        public long UomId { get; set; }
        public decimal OrderedQty { get; set; }
        public decimal ReceivedQty { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }
        public string Currency { get; set; } = "VND";
        public string LineStatus { get; set; } = string.Empty;
        public string? Note { get; set; }
        public bool RequiresCo { get; set; } // Yêu cầu CO
        public bool RequiresCq { get; set; } // Yêu cầu CQ
    }
}
