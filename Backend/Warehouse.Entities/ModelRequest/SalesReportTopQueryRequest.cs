using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    /// <summary>
    /// Query params dùng chung cho /api/SalesReport/top-items và /api/SalesReport/top-partners.
    /// Xác định kỳ báo cáo (Y/Q/M) + chiều (inbound/outbound) + kho + search + paging.
    /// </summary>
    public class SalesReportTopQueryRequest
    {
        /// <summary>YEAR | QUARTER | MONTH.</summary>
        [Required]
        [RegularExpression("^(YEAR|QUARTER|MONTH)$")]
        public string Level { get; set; } = "YEAR";

        [Required]
        [Range(2000, 2100)]
        public int Year { get; set; }

        [Range(1, 4)]
        public int? Quarter { get; set; }

        [Range(1, 12)]
        public int? Month { get; set; }

        /// <summary>outbound | inbound.</summary>
        [RegularExpression("^(outbound|inbound)$")]
        public string Mode { get; set; } = "outbound";

        public string? Keyword { get; set; }

        public long? WarehouseId { get; set; }

        [Range(1, int.MaxValue)]
        public int PageNumber { get; set; } = 1;

        [Range(1, 200)]
        public int PageSize { get; set; } = 10;
    }
}
