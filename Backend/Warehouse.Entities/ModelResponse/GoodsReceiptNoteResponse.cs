using System;
using System.Collections.Generic;

namespace Warehouse.Entities.ModelResponse
{
    public class GoodsReceiptNoteResponse
    {
        public long GrnId { get; set; }
        public string GrnCode { get; set; } = string.Empty;
        public DateOnly ReceiptDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsPaid { get; set; }

        public long? PurchaseOrderId { get; set; }
        public string? PurchaseOrderCode { get; set; }
        public long SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public long WarehouseId { get; set; }
        public string? WarehouseName { get; set; }
        public long CreatedBy { get; set; }
        public string? CreatedByName { get; set; }

        public decimal TotalReceivedQty { get; set; } // Tổng số lượng nhập
        public decimal TotalAmount { get; set; } // Giá trị đơn (chưa tính ShippingFee)
        public decimal ShippingFee { get; set; }
        public decimal NetAmount { get; set; } // Tổng cộng

        public DateTime CreatedAt { get; set; }
        public string? Note { get; set; }
    }
}
