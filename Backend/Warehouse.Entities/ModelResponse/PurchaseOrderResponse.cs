namespace Warehouse.Entities.ModelResponse
{
    public class PurchaseOrderResponse
    {
        public long PurchaseOrderId { get; set; }
        public string POCode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string LifecycleStatus { get; set; } = string.Empty;
        public DateOnly? RequestedDate { get; set; }
        public DateOnly? ExpectedDeliveryDate { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NetAmount { get; set; }
        public decimal TotalReceivedQty { get; set; } // Tổng số lượng đã nhận từ các PO lines

        public long? SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public long? WarehouseId { get; set; }
        public string? WarehouseName { get; set; }
        public long RequestedBy { get; set; }
        public string? RequestedByName { get; set; }
        public long? ResponsibleUserId { get; set; }
        public string? ResponsibleUserName { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
