using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    /// <summary>
    /// Query params cho các endpoint tổng hợp của báo cáo doanh số:
    /// /api/SalesReport/list, /chart, /summary, /export
    /// Chỉ lấy GoodsDeliveryNote / GoodsReceiptNote có Status = 'POSTED'.
    /// </summary>
    public class SalesReportQueryRequest
    {
        /// <summary>Chiều báo cáo: "outbound" (Xuất – GDN) hoặc "inbound" (Nhập – GRN). Mặc định outbound.</summary>
        [RegularExpression("^(outbound|inbound)$", ErrorMessage = "Mode phải là 'outbound' hoặc 'inbound'.")]
        public string Mode { get; set; } = "outbound";

        /// <summary>Lọc một năm cụ thể (null = tất cả năm có dữ liệu).</summary>
        public int? Year { get; set; }

        /// <summary>all | positive | negative (lọc theo growth).</summary>
        [RegularExpression("^(all|positive|negative)$")]
        public string QuickFilter { get; set; } = "all";

        /// <summary>Search theo periodLabel (ví dụ: "2026", "Quý 1", "Tháng 03").</summary>
        public string? Keyword { get; set; }

        /// <summary>Cấp chart: YEAR | QUARTER | MONTH. Mặc định QUARTER.</summary>
        [RegularExpression("^(YEAR|QUARTER|MONTH)$")]
        public string ChartLevel { get; set; } = "QUARTER";

        /// <summary>Năm dùng cho chart (default = năm hiện tại).</summary>
        public int? ChartYear { get; set; }

        /// <summary>Lọc 1 kho; null = tổng hợp tất cả kho.</summary>
        public long? WarehouseId { get; set; }
    }
}
