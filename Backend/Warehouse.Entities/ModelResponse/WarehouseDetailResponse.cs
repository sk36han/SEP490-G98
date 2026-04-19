using System;
using System.Collections.Generic;

namespace Warehouse.Entities.ModelResponse
{
    public class WarehouseDetailResponse
    {
        public long WarehouseId { get; set; }
        public string? WarehouseCode { get; set; }
        public string? WarehouseName { get; set; }
        public string? Address { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int ItemCount { get; set; }

        public List<WarehouseItemDto> Items { get; set; } = new List<WarehouseItemDto>();
        public List<WarehousePaperDto> ImportPapers { get; set; } = new List<WarehousePaperDto>();
        public List<WarehousePaperDto> ExportPapers { get; set; } = new List<WarehousePaperDto>();
        public List<WarehousePaperDto> ReturnPapers { get; set; } = new List<WarehousePaperDto>();
        public List<WarehousePaperDto> AdjustmentPapers { get; set; } = new List<WarehousePaperDto>();
    }

    public class WarehouseItemDto
    {
        public long ItemId { get; set; }
        public string? ItemCode { get; set; }
        public string? ItemName { get; set; }
        public string? CategoryName { get; set; }
        public string? BrandName { get; set; }
        public string? UnitName { get; set; }
        public decimal? OnHandQty { get; set; }   // null = chưa bao giờ nhập kho này; 0 = đã nhập nhưng hết hàng
        public decimal? ReservedQty { get; set; }
        public bool HasInventoryRecord { get; set; } // false = chưa có row trong InventoryOnHand → cảnh báo trên UI
    }

    public class WarehousePaperDto
    {
        public long PaperId { get; set; }
        public string PaperType { get; set; } = null!; // "GRN", "GDN", "PRN", "ADJ"
        public string PaperCode { get; set; } = null!;
        public string? RelatedDocumentCode { get; set; }
        public DateTime? Date { get; set; }
        public string Status { get; set; } = null!;
        public string? Note { get; set; }
    }
}
