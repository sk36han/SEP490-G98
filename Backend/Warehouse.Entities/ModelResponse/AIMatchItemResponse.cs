using System;
using System.Collections.Generic;

namespace Warehouse.Entities.ModelResponse
{
    public class AIMatchItemResponse
    {
        // --- Thông tin GỐC từ file Excel ---
        public int ExcelRowIndex { get; set; }
        public string NameInExcel { get; set; } = null!;
        public string? UomInExcel { get; set; }       // ĐVT trong Excel (Đôi, Cái, Kg...)
        public decimal? QtyInExcel { get; set; }       // Số lượng trong Excel
        public decimal? UnitPriceInExcel { get; set; } // Đơn giá trong Excel
        public decimal? LineTotalInExcel { get; set; } // Thành tiền trong Excel

        // --- Thông tin KHỚP từ Database (do AI tìm ra) ---
        public long? MatchedItemId { get; set; }
        public string? MatchedItemCode { get; set; }
        public string? MatchedItemName { get; set; }
        public string? Description { get; set; }
        public string? UomNameInDb { get; set; }       // ĐVT chuẩn trong DB
        public string? CategoryName { get; set; }
        public string? BrandName { get; set; }

        // --- Trạng thái so khớp ---
        public bool IsMatched { get; set; }
        public bool IsPerfectMatch { get; set; }
    }

    public class ExcelImportResult
    {
        public List<AIMatchItemResponse> MatchedItems { get; set; } = new();
        public List<AIMatchItemResponse> UnmatchedItems { get; set; } = new();
        public int TotalRowsProcessed { get; set; }
        public int TotalMatched { get; set; }
        public int TotalUnmatched { get; set; }
    }
}
