using System;
using System.Collections.Generic;

namespace Warehouse.Entities.ModelResponse
{
    // ─────────────────────────────────────────────────────────────────────────
    // Báo cáo doanh số — Response DTOs (dùng chung cho màn List + Detail).
    // Mọi giá trị tiền (totalValue, grnValue, prevValue, change) là VND.
    // growth (%) = change / prevValue * 100; prevValue <= 0 → growth = null.
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Một dòng kỳ báo cáo (Year / Quarter / Month) — dùng cho List và Detail.
    /// </summary>
    public class SalesReportPeriodRow
    {
        /// <summary>Id dạng "y{YYYY}" | "q{Q}-{YYYY}" | "m{M}-{YYYY}".</summary>
        public string Id { get; set; } = string.Empty;
        public string? ParentId { get; set; }

        /// <summary>YEAR | QUARTER | MONTH.</summary>
        public string Level { get; set; } = "YEAR";

        /// <summary>Nhãn kỳ: "2026" | "Quý 1 / 2026" | "Tháng 03 / 2026".</summary>
        public string PeriodLabel { get; set; } = string.Empty;

        public int Year { get; set; }
        public int? Quarter { get; set; }
        public int? Month { get; set; }

        // ── Outbound (Xuất – GoodsDeliveryNote) ──────────────────────────────
        public int DeliveryNotes { get; set; }
        public decimal TotalQty { get; set; }
        public decimal TotalValue { get; set; }

        /// <summary>Giá trị cùng kỳ năm trước (YoY); null nếu không có dữ liệu.</summary>
        public decimal? PrevValue { get; set; }
        public decimal? Change { get; set; }
        public decimal? Growth { get; set; }

        // ── Inbound (Nhập – GoodsReceiptNote) ────────────────────────────────
        public int GrnNotes { get; set; }
        public decimal GrnQty { get; set; }
        public decimal GrnValue { get; set; }
        public decimal? GrnPrev { get; set; }
        public decimal? GrnChange { get; set; }
        public decimal? GrnGrowth { get; set; }

        /// <summary>Số dòng vật tư liên quan trong kỳ (tuỳ chọn, cho List xem nhanh).</summary>
        public int? LineItems { get; set; }
    }

    /// <summary>
    /// Response cho /api/SalesReport/list — cây Year → Quarter → Month phẳng (giữ parentId).
    /// FE sẽ tự expand theo expandedIds (localStorage).
    /// </summary>
    public class SalesReportListResponse
    {
        public List<SalesReportPeriodRow> Rows { get; set; } = new();
    }

    /// <summary>
    /// Response cho /api/SalesReport/summary — tổng hợp nhanh các YEAR rows.
    /// </summary>
    public class SalesReportSummaryResponse
    {
        public decimal TotalSales { get; set; }        // tổng giá trị Xuất cả các năm
        public int TotalNotes { get; set; }            // tổng số phiếu Xuất
        public decimal TotalQty { get; set; }          // tổng SL Xuất
        public int TotalGrnNotes { get; set; }         // tổng số phiếu Nhập
        public decimal TotalGrnQty { get; set; }       // tổng SL Nhập
        public decimal TotalGrnValue { get; set; }     // tổng giá trị Nhập (bonus)
    }

    /// <summary>
    /// Một điểm chart (theo chartLevel + chartYear).
    /// </summary>
    public class SalesReportChartPointResponse
    {
        public string Label { get; set; } = string.Empty;       // "Quý 1 / 2026"
        public string ShortLabel { get; set; } = string.Empty;  // "Q1/2026"
        public decimal Value { get; set; }                       // giá trị theo Mode hiện tại
        public decimal? Growth { get; set; }                     // YoY growth (%)

        public int NotesOutbound { get; set; }
        public int NotesInbound { get; set; }
        public decimal QtyOutbound { get; set; }
        public decimal QtyInbound { get; set; }
    }

    /// <summary>
    /// Response cho /api/SalesReport/detail/{...}. Bao gồm hàng kỳ hiện tại, kỳ so sánh và chênh lệch 2 chiều.
    /// </summary>
    public class SalesReportDetailResponse
    {
        public SalesReportPeriodRow CurrentRow { get; set; } = new();
        public SalesReportPeriodRow? CompareRow { get; set; }
        public string? SelectedComparePeriodLabel { get; set; }

        public decimal? DiffOutbound { get; set; }
        public decimal? PctOutbound { get; set; }
        public decimal? DiffInbound { get; set; }
        public decimal? PctInbound { get; set; }
    }

    /// <summary>
    /// Response cho /api/SalesReport/breakdown.
    /// - level=YEAR      → quarters (4) + months (12)
    /// - level=QUARTER   → months (3)
    /// - level=MONTH     → weeks (week-in-month)
    /// </summary>
    public class SalesReportBreakdownResponse
    {
        public List<SalesReportPeriodRow>? Quarters { get; set; }
        public List<SalesReportPeriodRow>? Months { get; set; }
        public List<SalesReportWeekRow>? Weeks { get; set; }
    }

    /// <summary>
    /// Một tuần trong tháng (week-in-month). Week 1 = ngày 1 → CN đầu tiên.
    /// </summary>
    public class SalesReportWeekRow
    {
        public int Index { get; set; }              // 1..6
        public string PeriodLabel { get; set; } = string.Empty; // "Tuần 1 (01/03–05/03)"
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }

        public int DeliveryNotes { get; set; }
        public decimal TotalQty { get; set; }
        public decimal TotalValue { get; set; }
        public int GrnNotes { get; set; }
        public decimal GrnQty { get; set; }
        public decimal GrnValue { get; set; }
    }

    /// <summary>
    /// Một dòng Vật tư trong bảng Top Items của Detail (tab Vật tư).
    /// Share = value / totalOfPeriod * 100 (theo 2 chiều độc lập).
    /// </summary>
    public class SalesReportTopItemRow
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Uom { get; set; } = string.Empty;

        // Outbound
        public int DeliveryNotes { get; set; }
        public decimal TotalQty { get; set; }
        public decimal TotalValue { get; set; }
        public decimal? PrevValue { get; set; }
        public decimal? Growth { get; set; }
        public decimal Share { get; set; }

        // Inbound
        public int GrnNotes { get; set; }
        public decimal GrnQty { get; set; }
        public decimal GrnValue { get; set; }
        public decimal? GrnPrev { get; set; }
        public decimal? GrnGrowth { get; set; }
        public decimal GrnShare { get; set; }
    }

    /// <summary>
    /// Một dòng Đối tác trong bảng Top Partners của Detail (tab NCC/Người nhận).
    /// Dùng chung cho cả Supplier (inbound) và Receiver (outbound).
    /// </summary>
    public class SalesReportTopPartnerRow
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;

        public int Notes { get; set; }
        public decimal Qty { get; set; }
        public decimal Value { get; set; }
        public decimal? PrevValue { get; set; }
        public decimal? Growth { get; set; }
        public decimal Share { get; set; }
    }
}
