using System;

namespace Warehouse.Entities.ModelResponse
{
    public class PurchaseOrderResponse
    {
        public long PurchaseOrderId { get; set; }
        public string Pocode { get; set; } = null!;
        public long RequestedBy { get; set; }
        public long? SupplierId { get; set; }
        public DateOnly? RequestedDate { get; set; }
        public DateOnly? ExpectedDeliveryDate { get; set; }
        public string? Justification { get; set; }
        public string Status { get; set; } = null!;
        public string LifecycleStatus { get; set; } = null!;
        public int CurrentStageNo { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal? NetAmount { get; set; }
        public long? ResponsibleUserId { get; set; }
        public long? WarehouseId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public string? SupplierName { get; set; }
        public string? RequestedByName { get; set; }
        public string? ResponsibleUserName { get; set; }
        public string? WarehouseName { get; set; }
    }
}
