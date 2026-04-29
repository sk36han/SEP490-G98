using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service
{
    /// <summary>
    /// Báo cáo doanh số — implement đọc SQL qua <see cref="Mkiwms5Context"/>.
    /// Quy ước nghiệp vụ (chốt với PO):
    ///   • Chỉ lấy GDN/GRN có <c>Status = "POSTED"</c>.
    ///   • Cột ngày: <c>GDN.IssueDate</c>, <c>GRN.ReceiptDate</c> (<see cref="DateOnly"/>).
    ///   • Value (VND) = <c>GDN.TotalDeliveredAmount</c> / <c>GRN.TotalGoodsAmount</c>.
    ///   • Qty = <c>GDN.TotalDeliveredQty</c> / <c>GRN.TotalReceivedQty</c>.
    ///   • YoY = cùng kỳ (Y/Q/M) của năm-1. prevValue &lt;= 0 ⇒ growth = null (tránh chia 0).
    ///   • Week = week-in-month (tuần 1 = ngày 1 → CN đầu tiên của tháng).
    /// </summary>
    public class SalesReportService : ISalesReportService
    {
        private const string POSTED = "POSTED";

        private readonly Mkiwms5Context _context;
        private readonly IDateTimeProvider _dateTimeProvider;

        public SalesReportService(Mkiwms5Context context, IDateTimeProvider dateTimeProvider)
        {
            _context = context;
            _dateTimeProvider = dateTimeProvider;
        }

        // ═════════════════════════════════════════════════════════════════════
        // Base queries
        // ═════════════════════════════════════════════════════════════════════

        private IQueryable<GoodsDeliveryNote> BaseGdnQuery(long? warehouseId)
        {
            var q = _context.GoodsDeliveryNotes
                .AsNoTracking()
                .Where(g => g.Status == POSTED);

            if (warehouseId.HasValue && warehouseId.Value > 0)
                q = q.Where(g => g.WarehouseId == warehouseId.Value);

            return q;
        }

        private IQueryable<GoodsReceiptNote> BaseGrnQuery(long? warehouseId)
        {
            var q = _context.GoodsReceiptNotes
                .AsNoTracking()
                .Where(g => g.Status == POSTED);

            if (warehouseId.HasValue && warehouseId.Value > 0)
                q = q.Where(g => g.WarehouseId == warehouseId.Value);

            return q;
        }

        // ═════════════════════════════════════════════════════════════════════
        // Aggregation helpers
        // ═════════════════════════════════════════════════════════════════════

        /// <summary>Tổng hợp GDN theo Y/Q/M (raw aggregation, chưa tính YoY).</summary>
        private async Task<List<PeriodAgg>> AggregateGdnAsync(long? warehouseId, int? yearFilter)
        {
            var q = BaseGdnQuery(warehouseId);
            if (yearFilter.HasValue)
                q = q.Where(g => g.IssueDate.Year == yearFilter.Value);

            var rows = await q
                .GroupBy(g => new { g.IssueDate.Year, g.IssueDate.Month })
                .Select(g => new PeriodAgg
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Notes = g.Count(),
                    Qty = g.Sum(x => x.TotalDeliveredQty),
                    Value = g.Sum(x => x.TotalDeliveredAmount)
                })
                .ToListAsync();

            return rows;
        }

        /// <summary>Tổng hợp GRN theo Y/Q/M.</summary>
        private async Task<List<PeriodAgg>> AggregateGrnAsync(long? warehouseId, int? yearFilter)
        {
            var q = BaseGrnQuery(warehouseId);
            if (yearFilter.HasValue)
                q = q.Where(g => g.ReceiptDate.Year == yearFilter.Value);

            var rows = await q
                .GroupBy(g => new { g.ReceiptDate.Year, g.ReceiptDate.Month })
                .Select(g => new PeriodAgg
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Notes = g.Count(),
                    Qty = g.Sum(x => x.TotalReceivedQty),
                    Value = g.Sum(x => x.TotalGoodsAmount)
                })
                .ToListAsync();

            return rows;
        }

        /// <summary>Lookup nhanh (year, month) từ list agg theo tháng.</summary>
        private static PeriodAgg? Find(List<PeriodAgg> src, int year, int month)
            => src.FirstOrDefault(r => r.Year == year && r.Month == month);

        /// <summary>Sum theo quý.</summary>
        private static (int Notes, decimal Qty, decimal Value) SumQuarter(List<PeriodAgg> src, int year, int quarter)
        {
            var months = Enumerable.Range((quarter - 1) * 3 + 1, 3);
            var rows = src.Where(r => r.Year == year && months.Contains(r.Month)).ToList();
            return (rows.Sum(r => r.Notes), rows.Sum(r => r.Qty), rows.Sum(r => r.Value));
        }

        /// <summary>Sum theo năm.</summary>
        private static (int Notes, decimal Qty, decimal Value) SumYear(List<PeriodAgg> src, int year)
        {
            var rows = src.Where(r => r.Year == year).ToList();
            return (rows.Sum(r => r.Notes), rows.Sum(r => r.Qty), rows.Sum(r => r.Value));
        }

        private static decimal? Growth(decimal value, decimal? prev)
        {
            if (!prev.HasValue || prev.Value <= 0) return null;
            return Math.Round((value - prev.Value) / prev.Value * 100m, 2);
        }

        // ═════════════════════════════════════════════════════════════════════
        // GetListAsync — tree Year → Quarter → Month (phẳng + parentId)
        // ═════════════════════════════════════════════════════════════════════

        public async Task<SalesReportListResponse> GetListAsync(SalesReportQueryRequest request)
        {
            var gdn = await AggregateGdnAsync(request.WarehouseId, request.Year);
            var grn = await AggregateGrnAsync(request.WarehouseId, request.Year);

            // Lấy thêm dữ liệu năm-1 cho YoY (nếu Year đã filter) — cần 1 query riêng cho year-1 nếu đã filter year.
            List<PeriodAgg> gdnPrev, grnPrev;
            if (request.Year.HasValue)
            {
                gdnPrev = await AggregateGdnAsync(request.WarehouseId, request.Year.Value - 1);
                grnPrev = await AggregateGrnAsync(request.WarehouseId, request.Year.Value - 1);
            }
            else
            {
                gdnPrev = gdn;
                grnPrev = grn;
            }

            var years = gdn.Concat(grn).Select(r => r.Year).Distinct().OrderByDescending(y => y).ToList();

            var rows = new List<SalesReportPeriodRow>();

            foreach (var year in years)
            {
                var (gNotes, gQty, gVal) = SumYear(gdn, year);
                var (rNotes, rQty, rVal) = SumYear(grn, year);
                var (_, _, gPrev) = SumYear(gdnPrev, year - 1);
                var (_, _, rPrev) = SumYear(grnPrev, year - 1);

                rows.Add(BuildRow(
                    id: $"y{year}", parentId: null, level: "YEAR",
                    label: year.ToString(), year: year, quarter: null, month: null,
                    gNotes, gQty, gVal, gPrev,
                    rNotes, rQty, rVal, rPrev));

                for (var quarter = 1; quarter <= 4; quarter++)
                {
                    var (qgN, qgQ, qgV) = SumQuarter(gdn, year, quarter);
                    var (qrN, qrQ, qrV) = SumQuarter(grn, year, quarter);
                    if (qgN + qrN == 0) continue;

                    var (_, _, qgPrev) = SumQuarter(gdnPrev, year - 1, quarter);
                    var (_, _, qrPrev) = SumQuarter(grnPrev, year - 1, quarter);

                    rows.Add(BuildRow(
                        id: $"q{quarter}-{year}", parentId: $"y{year}", level: "QUARTER",
                        label: $"Quý {quarter} / {year}", year: year, quarter: quarter, month: null,
                        qgN, qgQ, qgV, qgPrev,
                        qrN, qrQ, qrV, qrPrev));

                    for (var m = (quarter - 1) * 3 + 1; m <= quarter * 3; m++)
                    {
                        var gm = Find(gdn, year, m);
                        var rm = Find(grn, year, m);
                        if (gm == null && rm == null) continue;

                        var gmPrev = Find(gdnPrev, year - 1, m);
                        var rmPrev = Find(grnPrev, year - 1, m);

                        rows.Add(BuildRow(
                            id: $"m{m}-{year}", parentId: $"q{quarter}-{year}", level: "MONTH",
                            label: $"Tháng {m:D2} / {year}", year: year, quarter: quarter, month: m,
                            gm?.Notes ?? 0, gm?.Qty ?? 0, gm?.Value ?? 0, gmPrev?.Value ?? 0,
                            rm?.Notes ?? 0, rm?.Qty ?? 0, rm?.Value ?? 0, rmPrev?.Value ?? 0));
                    }
                }
            }

            // QuickFilter & keyword — áp sau khi có growth
            var modeOutbound = request.Mode == "outbound";
            rows = (request.QuickFilter switch
            {
                "positive" => rows.Where(r => (modeOutbound ? r.Growth : r.GrnGrowth) > 0),
                "negative" => rows.Where(r => (modeOutbound ? r.Growth : r.GrnGrowth) < 0),
                _ => rows
            }).ToList();

            if (!string.IsNullOrWhiteSpace(request.Keyword))
            {
                var kw = request.Keyword.Trim().ToLower();
                rows = rows.Where(r => r.PeriodLabel.ToLower().Contains(kw)).ToList();
            }

            return new SalesReportListResponse { Rows = rows };
        }

        private static SalesReportPeriodRow BuildRow(
            string id, string? parentId, string level, string label,
            int year, int? quarter, int? month,
            int gNotes, decimal gQty, decimal gVal, decimal gPrev,
            int rNotes, decimal rQty, decimal rVal, decimal rPrev)
        {
            var gPrevN = gPrev > 0 ? (decimal?)gPrev : null;
            var rPrevN = rPrev > 0 ? (decimal?)rPrev : null;
            return new SalesReportPeriodRow
            {
                Id = id,
                ParentId = parentId,
                Level = level,
                PeriodLabel = label,
                Year = year,
                Quarter = quarter,
                Month = month,

                DeliveryNotes = gNotes,
                TotalQty = gQty,
                TotalValue = gVal,
                PrevValue = gPrevN,
                Change = gPrevN.HasValue ? gVal - gPrevN : null,
                Growth = Growth(gVal, gPrevN),

                GrnNotes = rNotes,
                GrnQty = rQty,
                GrnValue = rVal,
                GrnPrev = rPrevN,
                GrnChange = rPrevN.HasValue ? rVal - rPrevN : null,
                GrnGrowth = Growth(rVal, rPrevN),
            };
        }

        // ═════════════════════════════════════════════════════════════════════
        // GetChartAsync
        // ═════════════════════════════════════════════════════════════════════

        public async Task<List<SalesReportChartPointResponse>> GetChartAsync(SalesReportQueryRequest request)
        {
            var chartYear = request.ChartYear ?? _dateTimeProvider.BusinessNow().Year;
            var gdn = await AggregateGdnAsync(request.WarehouseId, chartYear);
            var grn = await AggregateGrnAsync(request.WarehouseId, chartYear);
            var gdnPrev = await AggregateGdnAsync(request.WarehouseId, chartYear - 1);
            var grnPrev = await AggregateGrnAsync(request.WarehouseId, chartYear - 1);

            var modeOutbound = request.Mode == "outbound";
            var points = new List<SalesReportChartPointResponse>();

            switch (request.ChartLevel)
            {
                case "YEAR":
                    // Trả 5 năm gần nhất (không phụ thuộc chartYear).
                    var allGdn = await AggregateGdnAsync(request.WarehouseId, null);
                    var allGrn = await AggregateGrnAsync(request.WarehouseId, null);
                    var years = allGdn.Concat(allGrn).Select(r => r.Year).Distinct().OrderBy(y => y).TakeLast(5).ToList();
                    foreach (var y in years)
                    {
                        var (gN, gQ, gV) = SumYear(allGdn, y);
                        var (rN, rQ, rV) = SumYear(allGrn, y);
                        var (_, _, gPv) = SumYear(allGdn, y - 1);
                        var (_, _, rPv) = SumYear(allGrn, y - 1);
                        var value = modeOutbound ? gV : rV;
                        var prev = modeOutbound ? (gPv > 0 ? (decimal?)gPv : null) : (rPv > 0 ? (decimal?)rPv : null);
                        points.Add(new SalesReportChartPointResponse
                        {
                            Label = $"Năm {y}", ShortLabel = y.ToString(),
                            Value = value, Growth = Growth(value, prev),
                            NotesOutbound = gN, NotesInbound = rN,
                            QtyOutbound = gQ, QtyInbound = rQ
                        });
                    }
                    break;

                case "MONTH":
                    for (var m = 1; m <= 12; m++)
                    {
                        var gm = Find(gdn, chartYear, m);
                        var rm = Find(grn, chartYear, m);
                        var gmp = Find(gdnPrev, chartYear - 1, m);
                        var rmp = Find(grnPrev, chartYear - 1, m);
                        var value = modeOutbound ? (gm?.Value ?? 0) : (rm?.Value ?? 0);
                        decimal? prev = modeOutbound
                            ? (gmp != null && gmp.Value > 0 ? gmp.Value : (decimal?)null)
                            : (rmp != null && rmp.Value > 0 ? rmp.Value : (decimal?)null);
                        points.Add(new SalesReportChartPointResponse
                        {
                            Label = $"Tháng {m:D2} / {chartYear}",
                            ShortLabel = $"T{m:D2}/{chartYear}",
                            Value = value, Growth = Growth(value, prev),
                            NotesOutbound = gm?.Notes ?? 0, NotesInbound = rm?.Notes ?? 0,
                            QtyOutbound = gm?.Qty ?? 0, QtyInbound = rm?.Qty ?? 0
                        });
                    }
                    break;

                default: // QUARTER
                    for (var qy = 1; qy <= 4; qy++)
                    {
                        var (gN, gQ, gV) = SumQuarter(gdn, chartYear, qy);
                        var (rN, rQ, rV) = SumQuarter(grn, chartYear, qy);
                        var (_, _, gPv) = SumQuarter(gdnPrev, chartYear - 1, qy);
                        var (_, _, rPv) = SumQuarter(grnPrev, chartYear - 1, qy);
                        var value = modeOutbound ? gV : rV;
                        var prev = modeOutbound ? (gPv > 0 ? (decimal?)gPv : null) : (rPv > 0 ? (decimal?)rPv : null);
                        points.Add(new SalesReportChartPointResponse
                        {
                            Label = $"Quý {qy} / {chartYear}",
                            ShortLabel = $"Q{qy}/{chartYear}",
                            Value = value, Growth = Growth(value, prev),
                            NotesOutbound = gN, NotesInbound = rN,
                            QtyOutbound = gQ, QtyInbound = rQ
                        });
                    }
                    break;
            }

            return points;
        }

        // ═════════════════════════════════════════════════════════════════════
        // GetSummaryAsync — tổng các YEAR rows theo filter
        // ═════════════════════════════════════════════════════════════════════

        public async Task<SalesReportSummaryResponse> GetSummaryAsync(SalesReportQueryRequest request)
        {
            var gdn = await AggregateGdnAsync(request.WarehouseId, request.Year);
            var grn = await AggregateGrnAsync(request.WarehouseId, request.Year);
            return new SalesReportSummaryResponse
            {
                TotalNotes = gdn.Sum(r => r.Notes),
                TotalQty = gdn.Sum(r => r.Qty),
                TotalSales = gdn.Sum(r => r.Value),
                TotalGrnNotes = grn.Sum(r => r.Notes),
                TotalGrnQty = grn.Sum(r => r.Qty),
                TotalGrnValue = grn.Sum(r => r.Value),
            };
        }

        // ═════════════════════════════════════════════════════════════════════
        // GetDetailAsync — current + compare + diff/pct (2 chiều)
        // ═════════════════════════════════════════════════════════════════════

        public async Task<SalesReportDetailResponse?> GetDetailAsync(
            string level, int year, int? quarter, int? month,
            int? compareYear, int? compareQuarter, int? compareMonth, long? warehouseId)
        {
            // Tính current row
            var current = await BuildDetailRowAsync(level, year, quarter, month, warehouseId);
            if (current == null) return null;

            // compareYear mặc định = year - 1 (theo tinh thần YoY); các cấp còn lại mặc định theo level hiện tại
            var cmpYear = compareYear ?? year - 1;
            int? cmpQuarter = compareQuarter ?? quarter;
            int? cmpMonth = compareMonth ?? month;

            var compare = await BuildDetailRowAsync(level, cmpYear, cmpQuarter, cmpMonth, warehouseId);
            string? comparePeriodLabel = compare?.PeriodLabel;

            decimal? diffOut = null, pctOut = null, diffIn = null, pctIn = null;
            if (compare != null)
            {
                diffOut = current.TotalValue - compare.TotalValue;
                pctOut = Growth(current.TotalValue, compare.TotalValue > 0 ? compare.TotalValue : (decimal?)null);
                diffIn = current.GrnValue - compare.GrnValue;
                pctIn = Growth(current.GrnValue, compare.GrnValue > 0 ? compare.GrnValue : (decimal?)null);
            }

            return new SalesReportDetailResponse
            {
                CurrentRow = current,
                CompareRow = compare,
                SelectedComparePeriodLabel = comparePeriodLabel,
                DiffOutbound = diffOut,
                PctOutbound = pctOut,
                DiffInbound = diffIn,
                PctInbound = pctIn,
            };
        }

        /// <summary>Build 1 dòng detail (Y/Q/M) + YoY cùng kỳ năm-1.</summary>
        private async Task<SalesReportPeriodRow?> BuildDetailRowAsync(
            string level, int year, int? quarter, int? month, long? warehouseId)
        {
            var gdn = await AggregateGdnAsync(warehouseId, year);
            var grn = await AggregateGrnAsync(warehouseId, year);
            var gdnPrev = await AggregateGdnAsync(warehouseId, year - 1);
            var grnPrev = await AggregateGrnAsync(warehouseId, year - 1);

            switch (level)
            {
                case "YEAR":
                    {
                        var (gN, gQ, gV) = SumYear(gdn, year);
                        var (rN, rQ, rV) = SumYear(grn, year);
                        if (gN + rN == 0) return null;
                        var (_, _, gPv) = SumYear(gdnPrev, year - 1);
                        var (_, _, rPv) = SumYear(grnPrev, year - 1);
                        return BuildRow($"y{year}", null, "YEAR", year.ToString(), year, null, null,
                            gN, gQ, gV, gPv, rN, rQ, rV, rPv);
                    }
                case "QUARTER":
                    {
                        if (!quarter.HasValue) return null;
                        var (gN, gQ, gV) = SumQuarter(gdn, year, quarter.Value);
                        var (rN, rQ, rV) = SumQuarter(grn, year, quarter.Value);
                        if (gN + rN == 0) return null;
                        var (_, _, gPv) = SumQuarter(gdnPrev, year - 1, quarter.Value);
                        var (_, _, rPv) = SumQuarter(grnPrev, year - 1, quarter.Value);
                        return BuildRow($"q{quarter}-{year}", $"y{year}", "QUARTER",
                            $"Quý {quarter} / {year}", year, quarter, null,
                            gN, gQ, gV, gPv, rN, rQ, rV, rPv);
                    }
                case "MONTH":
                    {
                        if (!month.HasValue) return null;
                        var gm = Find(gdn, year, month.Value);
                        var rm = Find(grn, year, month.Value);
                        if (gm == null && rm == null) return null;
                        var gmP = Find(gdnPrev, year - 1, month.Value);
                        var rmP = Find(grnPrev, year - 1, month.Value);
                        var q = (month.Value - 1) / 3 + 1;
                        return BuildRow($"m{month}-{year}", $"q{q}-{year}", "MONTH",
                            $"Tháng {month:D2} / {year}", year, q, month,
                            gm?.Notes ?? 0, gm?.Qty ?? 0, gm?.Value ?? 0, gmP?.Value ?? 0,
                            rm?.Notes ?? 0, rm?.Qty ?? 0, rm?.Value ?? 0, rmP?.Value ?? 0);
                    }
                default: return null;
            }
        }

        // ═════════════════════════════════════════════════════════════════════
        // GetBreakdownAsync
        // ═════════════════════════════════════════════════════════════════════

        public async Task<SalesReportBreakdownResponse> GetBreakdownAsync(
            string level, int year, int? quarter, int? month, long? warehouseId)
        {
            var gdn = await AggregateGdnAsync(warehouseId, year);
            var grn = await AggregateGrnAsync(warehouseId, year);
            var gdnPrev = await AggregateGdnAsync(warehouseId, year - 1);
            var grnPrev = await AggregateGrnAsync(warehouseId, year - 1);

            var res = new SalesReportBreakdownResponse();

            switch (level)
            {
                case "YEAR":
                    {
                        res.Quarters = new List<SalesReportPeriodRow>();
                        res.Months = new List<SalesReportPeriodRow>();
                        for (var qy = 1; qy <= 4; qy++)
                        {
                            var (gN, gQ, gV) = SumQuarter(gdn, year, qy);
                            var (rN, rQ, rV) = SumQuarter(grn, year, qy);
                            var (_, _, gPv) = SumQuarter(gdnPrev, year - 1, qy);
                            var (_, _, rPv) = SumQuarter(grnPrev, year - 1, qy);
                            res.Quarters.Add(BuildRow($"q{qy}-{year}", $"y{year}", "QUARTER",
                                $"Quý {qy} / {year}", year, qy, null,
                                gN, gQ, gV, gPv, rN, rQ, rV, rPv));
                        }
                        for (var m = 1; m <= 12; m++)
                        {
                            var gm = Find(gdn, year, m);
                            var rm = Find(grn, year, m);
                            var gmP = Find(gdnPrev, year - 1, m);
                            var rmP = Find(grnPrev, year - 1, m);
                            var q2 = (m - 1) / 3 + 1;
                            res.Months.Add(BuildRow($"m{m}-{year}", $"q{q2}-{year}", "MONTH",
                                $"Tháng {m:D2} / {year}", year, q2, m,
                                gm?.Notes ?? 0, gm?.Qty ?? 0, gm?.Value ?? 0, gmP?.Value ?? 0,
                                rm?.Notes ?? 0, rm?.Qty ?? 0, rm?.Value ?? 0, rmP?.Value ?? 0));
                        }
                        break;
                    }
                case "QUARTER":
                    {
                        if (!quarter.HasValue) break;
                        res.Months = new List<SalesReportPeriodRow>();
                        for (var m = (quarter.Value - 1) * 3 + 1; m <= quarter.Value * 3; m++)
                        {
                            var gm = Find(gdn, year, m);
                            var rm = Find(grn, year, m);
                            var gmP = Find(gdnPrev, year - 1, m);
                            var rmP = Find(grnPrev, year - 1, m);
                            res.Months.Add(BuildRow($"m{m}-{year}", $"q{quarter}-{year}", "MONTH",
                                $"Tháng {m:D2} / {year}", year, quarter, m,
                                gm?.Notes ?? 0, gm?.Qty ?? 0, gm?.Value ?? 0, gmP?.Value ?? 0,
                                rm?.Notes ?? 0, rm?.Qty ?? 0, rm?.Value ?? 0, rmP?.Value ?? 0));
                        }
                        break;
                    }
                case "MONTH":
                    {
                        if (!month.HasValue) break;
                        res.Weeks = await BuildMonthWeeksAsync(year, month.Value, warehouseId);
                        break;
                    }
            }

            return res;
        }

        /// <summary>Sinh danh sách tuần trong tháng (week-in-month: tuần 1 = ngày 1 → CN đầu tiên).</summary>
        private async Task<List<SalesReportWeekRow>> BuildMonthWeeksAsync(int year, int month, long? warehouseId)
        {
            var firstDay = new DateOnly(year, month, 1);
            var daysInMonth = DateTime.DaysInMonth(year, month);
            var lastDay = new DateOnly(year, month, daysInMonth);

            // Query GDN/GRN raw của tháng này (một lần)
            var gdnDaily = await BaseGdnQuery(warehouseId)
                .Where(g => g.IssueDate >= firstDay && g.IssueDate <= lastDay)
                .GroupBy(g => g.IssueDate)
                .Select(g => new { Date = g.Key, Notes = g.Count(), Qty = g.Sum(x => x.TotalDeliveredQty), Value = g.Sum(x => x.TotalDeliveredAmount) })
                .ToListAsync();

            var grnDaily = await BaseGrnQuery(warehouseId)
                .Where(g => g.ReceiptDate >= firstDay && g.ReceiptDate <= lastDay)
                .GroupBy(g => g.ReceiptDate)
                .Select(g => new { Date = g.Key, Notes = g.Count(), Qty = g.Sum(x => x.TotalReceivedQty), Value = g.Sum(x => x.TotalGoodsAmount) })
                .ToListAsync();

            var weeks = new List<SalesReportWeekRow>();
            var cursor = firstDay;
            var idx = 1;
            while (cursor <= lastDay)
            {
                // Tuần kết thúc ở CN (DayOfWeek.Sunday) hoặc ngày cuối tháng — tuỳ cái nào đến trước
                var end = cursor;
                while (end < lastDay && end.DayOfWeek != DayOfWeek.Sunday)
                    end = end.AddDays(1);
                if (end > lastDay) end = lastDay;

                var gSum = gdnDaily.Where(r => r.Date >= cursor && r.Date <= end).ToList();
                var rSum = grnDaily.Where(r => r.Date >= cursor && r.Date <= end).ToList();

                weeks.Add(new SalesReportWeekRow
                {
                    Index = idx,
                    StartDate = cursor,
                    EndDate = end,
                    PeriodLabel = $"Tuần {idx} ({cursor:dd/MM}–{end:dd/MM})",
                    DeliveryNotes = gSum.Sum(x => x.Notes),
                    TotalQty = gSum.Sum(x => x.Qty),
                    TotalValue = gSum.Sum(x => x.Value),
                    GrnNotes = rSum.Sum(x => x.Notes),
                    GrnQty = rSum.Sum(x => x.Qty),
                    GrnValue = rSum.Sum(x => x.Value),
                });

                cursor = end.AddDays(1);
                idx++;
            }

            return weeks;
        }

        // ═════════════════════════════════════════════════════════════════════
        // GetTopItemsAsync
        // ═════════════════════════════════════════════════════════════════════

        public async Task<PagedResult<SalesReportTopItemRow>> GetTopItemsAsync(SalesReportTopQueryRequest request)
        {
            var (dFrom, dTo) = ResolvePeriod(request.Year, request.Level, request.Quarter, request.Month);
            var (dFromPrev, dToPrev) = ResolvePeriod(request.Year - 1, request.Level, request.Quarter, request.Month);

            var modeOutbound = request.Mode == "outbound";

            // Group current period
            List<ItemAgg> currentAggs;
            List<ItemAgg> prevAggs;

            if (modeOutbound)
            {
                currentAggs = await _context.GoodsDeliveryNoteLines
                    .AsNoTracking()
                    .Where(l => l.Gdn.Status == POSTED
                                && l.Gdn.IssueDate >= dFrom && l.Gdn.IssueDate <= dTo
                                && (!request.WarehouseId.HasValue || l.Gdn.WarehouseId == request.WarehouseId.Value))
                    .GroupBy(l => new { l.ItemId, l.Item.ItemCode, l.Item.ItemName, UomName = l.Uom.UomName })
                    .Select(g => new ItemAgg
                    {
                        ItemId = g.Key.ItemId,
                        Code = g.Key.ItemCode,
                        Name = g.Key.ItemName,
                        Uom = g.Key.UomName,
                        Notes = g.Select(x => x.Gdnid).Distinct().Count(),
                        Qty = g.Sum(x => x.ActualQty),
                        Value = g.Sum(x => (x.LineTotal ?? 0))
                    })
                    .ToListAsync();

                prevAggs = await _context.GoodsDeliveryNoteLines
                    .AsNoTracking()
                    .Where(l => l.Gdn.Status == POSTED
                                && l.Gdn.IssueDate >= dFromPrev && l.Gdn.IssueDate <= dToPrev
                                && (!request.WarehouseId.HasValue || l.Gdn.WarehouseId == request.WarehouseId.Value))
                    .GroupBy(l => l.ItemId)
                    .Select(g => new ItemAgg
                    {
                        ItemId = g.Key,
                        Value = g.Sum(x => (x.LineTotal ?? 0))
                    })
                    .ToListAsync();
            }
            else
            {
                currentAggs = await _context.GoodsReceiptNoteLines
                    .AsNoTracking()
                    .Where(l => l.Grn.Status == POSTED
                                && l.Grn.ReceiptDate >= dFrom && l.Grn.ReceiptDate <= dTo
                                && (!request.WarehouseId.HasValue || l.Grn.WarehouseId == request.WarehouseId.Value))
                    .GroupBy(l => new { l.ItemId, l.Item.ItemCode, l.Item.ItemName, UomName = l.Uom.UomName })
                    .Select(g => new ItemAgg
                    {
                        ItemId = g.Key.ItemId,
                        Code = g.Key.ItemCode,
                        Name = g.Key.ItemName,
                        Uom = g.Key.UomName,
                        Notes = g.Select(x => x.Grnid).Distinct().Count(),
                        Qty = g.Sum(x => x.ActualQty),
                        Value = g.Sum(x => (x.LineTotal ?? 0))
                    })
                    .ToListAsync();

                prevAggs = await _context.GoodsReceiptNoteLines
                    .AsNoTracking()
                    .Where(l => l.Grn.Status == POSTED
                                && l.Grn.ReceiptDate >= dFromPrev && l.Grn.ReceiptDate <= dToPrev
                                && (!request.WarehouseId.HasValue || l.Grn.WarehouseId == request.WarehouseId.Value))
                    .GroupBy(l => l.ItemId)
                    .Select(g => new ItemAgg
                    {
                        ItemId = g.Key,
                        Value = g.Sum(x => (x.LineTotal ?? 0))
                    })
                    .ToListAsync();
            }

            if (!string.IsNullOrWhiteSpace(request.Keyword))
            {
                var kw = request.Keyword.Trim().ToLower();
                currentAggs = currentAggs
                    .Where(r => (r.Code ?? "").ToLower().Contains(kw) || (r.Name ?? "").ToLower().Contains(kw))
                    .ToList();
            }

            var totalValue = currentAggs.Sum(r => r.Value);
            var rows = currentAggs
                .OrderByDescending(r => r.Value)
                .Select(r =>
                {
                    var prev = prevAggs.FirstOrDefault(p => p.ItemId == r.ItemId);
                    var prevN = prev != null && prev.Value > 0 ? (decimal?)prev.Value : null;
                    var row = new SalesReportTopItemRow
                    {
                        Code = r.Code ?? "", Name = r.Name ?? "", Uom = r.Uom ?? "",
                        Share = totalValue > 0 ? Math.Round(r.Value / totalValue * 100m, 2) : 0m,
                    };
                    if (modeOutbound)
                    {
                        row.DeliveryNotes = r.Notes; row.TotalQty = r.Qty; row.TotalValue = r.Value;
                        row.PrevValue = prevN; row.Growth = Growth(r.Value, prevN);
                    }
                    else
                    {
                        row.GrnNotes = r.Notes; row.GrnQty = r.Qty; row.GrnValue = r.Value;
                        row.GrnPrev = prevN; row.GrnGrowth = Growth(r.Value, prevN);
                        row.GrnShare = row.Share; row.Share = 0m;
                    }
                    return row;
                })
                .ToList();

            var total = rows.Count;
            var paged = rows.Skip((request.PageNumber - 1) * request.PageSize).Take(request.PageSize).ToList();
            return new PagedResult<SalesReportTopItemRow>(paged, total, request.PageNumber, request.PageSize);
        }

        // ═════════════════════════════════════════════════════════════════════
        // GetTopPartnersAsync
        // ═════════════════════════════════════════════════════════════════════

        public async Task<PagedResult<SalesReportTopPartnerRow>> GetTopPartnersAsync(SalesReportTopQueryRequest request)
        {
            var (dFrom, dTo) = ResolvePeriod(request.Year, request.Level, request.Quarter, request.Month);
            var (dFromPrev, dToPrev) = ResolvePeriod(request.Year - 1, request.Level, request.Quarter, request.Month);

            List<PartnerAgg> current, prev;

            if (request.Mode == "outbound")
            {
                // Outbound → Receiver qua ReleaseRequest
                current = await _context.GoodsDeliveryNotes.AsNoTracking()
                    .Where(g => g.Status == POSTED
                                && g.IssueDate >= dFrom && g.IssueDate <= dTo
                                && (!request.WarehouseId.HasValue || g.WarehouseId == request.WarehouseId.Value))
                    .Join(_context.ReleaseRequests.AsNoTracking(),
                          g => g.ReleaseRequestId,
                          rr => rr.ReleaseRequestId,
                          (g, rr) => new { g, rr })
                    .Join(_context.Receivers.AsNoTracking(),
                          x => x.rr.ReceiverId,
                          rc => rc.ReceiverId,
                          (x, rc) => new { x.g, rc })
                    .GroupBy(x => new { x.rc.ReceiverId, x.rc.ReceiverCode, x.rc.ReceiverName })
                    .Select(gr => new PartnerAgg
                    {
                        Id = gr.Key.ReceiverId,
                        Code = gr.Key.ReceiverCode,
                        Name = gr.Key.ReceiverName,
                        Notes = gr.Count(),
                        Qty = gr.Sum(x => x.g.TotalDeliveredQty),
                        Value = gr.Sum(x => x.g.TotalDeliveredAmount)
                    })
                    .ToListAsync();

                prev = await _context.GoodsDeliveryNotes.AsNoTracking()
                    .Where(g => g.Status == POSTED
                                && g.IssueDate >= dFromPrev && g.IssueDate <= dToPrev
                                && (!request.WarehouseId.HasValue || g.WarehouseId == request.WarehouseId.Value))
                    .Join(_context.ReleaseRequests.AsNoTracking(),
                          g => g.ReleaseRequestId,
                          rr => rr.ReleaseRequestId,
                          (g, rr) => new { g, rr.ReceiverId })
                    .GroupBy(x => x.ReceiverId)
                    .Select(gr => new PartnerAgg { Id = gr.Key, Value = gr.Sum(x => x.g.TotalDeliveredAmount) })
                    .ToListAsync();
            }
            else
            {
                // Inbound → Supplier trên GRN
                current = await _context.GoodsReceiptNotes.AsNoTracking()
                    .Where(g => g.Status == POSTED
                                && g.ReceiptDate >= dFrom && g.ReceiptDate <= dTo
                                && (!request.WarehouseId.HasValue || g.WarehouseId == request.WarehouseId.Value))
                    .GroupBy(g => new { g.SupplierId, g.Supplier.SupplierCode, g.Supplier.SupplierName })
                    .Select(gr => new PartnerAgg
                    {
                        Id = gr.Key.SupplierId,
                        Code = gr.Key.SupplierCode,
                        Name = gr.Key.SupplierName,
                        Notes = gr.Count(),
                        Qty = gr.Sum(x => x.TotalReceivedQty),
                        Value = gr.Sum(x => x.TotalGoodsAmount)
                    })
                    .ToListAsync();

                prev = await _context.GoodsReceiptNotes.AsNoTracking()
                    .Where(g => g.Status == POSTED
                                && g.ReceiptDate >= dFromPrev && g.ReceiptDate <= dToPrev
                                && (!request.WarehouseId.HasValue || g.WarehouseId == request.WarehouseId.Value))
                    .GroupBy(g => g.SupplierId)
                    .Select(gr => new PartnerAgg { Id = gr.Key, Value = gr.Sum(x => x.TotalGoodsAmount) })
                    .ToListAsync();
            }

            if (!string.IsNullOrWhiteSpace(request.Keyword))
            {
                var kw = request.Keyword.Trim().ToLower();
                current = current
                    .Where(r => (r.Code ?? "").ToLower().Contains(kw) || (r.Name ?? "").ToLower().Contains(kw))
                    .ToList();
            }

            var totalValue = current.Sum(r => r.Value);
            var rows = current
                .OrderByDescending(r => r.Value)
                .Select(r =>
                {
                    var pv = prev.FirstOrDefault(p => p.Id == r.Id);
                    var prevN = pv != null && pv.Value > 0 ? (decimal?)pv.Value : null;
                    return new SalesReportTopPartnerRow
                    {
                        Code = r.Code ?? "", Name = r.Name ?? "",
                        Notes = r.Notes, Qty = r.Qty, Value = r.Value,
                        PrevValue = prevN, Growth = Growth(r.Value, prevN),
                        Share = totalValue > 0 ? Math.Round(r.Value / totalValue * 100m, 2) : 0m
                    };
                })
                .ToList();

            var total = rows.Count;
            var paged = rows.Skip((request.PageNumber - 1) * request.PageSize).Take(request.PageSize).ToList();
            return new PagedResult<SalesReportTopPartnerRow>(paged, total, request.PageNumber, request.PageSize);
        }

        /// <summary>Tính [from, to] DateOnly theo (year, level, quarter, month).</summary>
        private static (DateOnly From, DateOnly To) ResolvePeriod(int year, string level, int? quarter, int? month)
        {
            switch (level)
            {
                case "QUARTER" when quarter.HasValue:
                    var qStart = (quarter.Value - 1) * 3 + 1;
                    var qEnd = qStart + 2;
                    return (new DateOnly(year, qStart, 1),
                            new DateOnly(year, qEnd, DateTime.DaysInMonth(year, qEnd)));
                case "MONTH" when month.HasValue:
                    return (new DateOnly(year, month.Value, 1),
                            new DateOnly(year, month.Value, DateTime.DaysInMonth(year, month.Value)));
                default: // YEAR
                    return (new DateOnly(year, 1, 1), new DateOnly(year, 12, 31));
            }
        }

        // ═════════════════════════════════════════════════════════════════════
        // ExportAsync — Excel 3 sheet
        // ═════════════════════════════════════════════════════════════════════

        public async Task<(byte[] Content, string FileName)> ExportAsync(SalesReportQueryRequest request)
        {
            var listData = await GetListAsync(request);
            var summary = await GetSummaryAsync(request);

            // Top Items / Partners: nếu người dùng filter Year thì lấy top cả năm đó, không thì top năm hiện tại.
            var topYear = request.Year ?? _dateTimeProvider.BusinessNow().Year;
            var topReq = new SalesReportTopQueryRequest
            {
                Level = "YEAR", Year = topYear, Mode = request.Mode,
                WarehouseId = request.WarehouseId, PageNumber = 1, PageSize = 50
            };
            var topItems = await GetTopItemsAsync(topReq);
            var topPartners = await GetTopPartnersAsync(topReq);

            using var wb = new XLWorkbook();

            // Sheet 1: List
            var ws1 = wb.Worksheets.Add("Danh sách");
            ws1.Cell(1, 1).Value = "BÁO CÁO DOANH SỐ (POSTED)";
            ws1.Range(1, 1, 1, 9).Merge().Style.Font.Bold = true;
            ws1.Cell(2, 1).Value = $"Mode: {request.Mode} | Year: {(request.Year.HasValue ? request.Year.Value.ToString() : "Tất cả")} | WarehouseId: {(request.WarehouseId?.ToString() ?? "Tất cả")}";
            var headersList = new[] { "Kỳ", "Cấp", "Số phiếu Xuất", "SL Xuất", "Giá trị Xuất", "Growth% Xuất", "Số phiếu Nhập", "SL Nhập", "Giá trị Nhập" };
            for (var i = 0; i < headersList.Length; i++) ws1.Cell(4, i + 1).Value = headersList[i];
            ws1.Range(4, 1, 4, headersList.Length).Style.Font.Bold = true;
            var row1 = 5;
            foreach (var r in listData.Rows)
            {
                ws1.Cell(row1, 1).Value = r.PeriodLabel;
                ws1.Cell(row1, 2).Value = r.Level;
                ws1.Cell(row1, 3).Value = r.DeliveryNotes;
                ws1.Cell(row1, 4).Value = (double)r.TotalQty;
                ws1.Cell(row1, 5).Value = (double)r.TotalValue;
                ws1.Cell(row1, 5).Style.NumberFormat.Format = "#,##0";
                if (r.Growth.HasValue)
                {
                    ws1.Cell(row1, 6).Value = (double)r.Growth.Value / 100;
                    ws1.Cell(row1, 6).Style.NumberFormat.Format = "0.00%";
                }
                ws1.Cell(row1, 7).Value = r.GrnNotes;
                ws1.Cell(row1, 8).Value = (double)r.GrnQty;
                ws1.Cell(row1, 9).Value = (double)r.GrnValue;
                ws1.Cell(row1, 9).Style.NumberFormat.Format = "#,##0";
                row1++;
            }
            ws1.Cell(row1 + 1, 1).Value = "Tổng doanh số Xuất:"; ws1.Cell(row1 + 1, 5).Value = (double)summary.TotalSales;
            ws1.Cell(row1 + 2, 1).Value = "Tổng doanh số Nhập:"; ws1.Cell(row1 + 2, 5).Value = (double)summary.TotalGrnValue;
            ws1.Columns().AdjustToContents();

            // Sheet 2: Top Items
            var ws2 = wb.Worksheets.Add("Top vật tư");
            var headersItems = new[] { "Mã", "Tên", "ĐVT", "Số phiếu", "SL", "Giá trị", "Năm trước", "Growth%", "Share%" };
            for (var i = 0; i < headersItems.Length; i++) ws2.Cell(1, i + 1).Value = headersItems[i];
            ws2.Range(1, 1, 1, headersItems.Length).Style.Font.Bold = true;
            var row2 = 2;
            foreach (var r in topItems.Items)
            {
                var outbound = request.Mode == "outbound";
                ws2.Cell(row2, 1).Value = r.Code;
                ws2.Cell(row2, 2).Value = r.Name;
                ws2.Cell(row2, 3).Value = r.Uom;
                ws2.Cell(row2, 4).Value = outbound ? r.DeliveryNotes : r.GrnNotes;
                ws2.Cell(row2, 5).Value = (double)(outbound ? r.TotalQty : r.GrnQty);
                ws2.Cell(row2, 6).Value = (double)(outbound ? r.TotalValue : r.GrnValue);
                ws2.Cell(row2, 6).Style.NumberFormat.Format = "#,##0";
                var prevV = outbound ? r.PrevValue : r.GrnPrev;
                if (prevV.HasValue) { ws2.Cell(row2, 7).Value = (double)prevV.Value; ws2.Cell(row2, 7).Style.NumberFormat.Format = "#,##0"; }
                var grV = outbound ? r.Growth : r.GrnGrowth;
                if (grV.HasValue) { ws2.Cell(row2, 8).Value = (double)grV.Value / 100; ws2.Cell(row2, 8).Style.NumberFormat.Format = "0.00%"; }
                ws2.Cell(row2, 9).Value = (double)(outbound ? r.Share : r.GrnShare) / 100;
                ws2.Cell(row2, 9).Style.NumberFormat.Format = "0.00%";
                row2++;
            }
            ws2.Columns().AdjustToContents();

            // Sheet 3: Top Partners
            var ws3 = wb.Worksheets.Add(request.Mode == "outbound" ? "Top người nhận" : "Top nhà cung cấp");
            var headersPt = new[] { "Mã", "Tên", "Số phiếu", "SL", "Giá trị", "Năm trước", "Growth%", "Share%" };
            for (var i = 0; i < headersPt.Length; i++) ws3.Cell(1, i + 1).Value = headersPt[i];
            ws3.Range(1, 1, 1, headersPt.Length).Style.Font.Bold = true;
            var row3 = 2;
            foreach (var r in topPartners.Items)
            {
                ws3.Cell(row3, 1).Value = r.Code;
                ws3.Cell(row3, 2).Value = r.Name;
                ws3.Cell(row3, 3).Value = r.Notes;
                ws3.Cell(row3, 4).Value = (double)r.Qty;
                ws3.Cell(row3, 5).Value = (double)r.Value;
                ws3.Cell(row3, 5).Style.NumberFormat.Format = "#,##0";
                if (r.PrevValue.HasValue) { ws3.Cell(row3, 6).Value = (double)r.PrevValue.Value; ws3.Cell(row3, 6).Style.NumberFormat.Format = "#,##0"; }
                if (r.Growth.HasValue) { ws3.Cell(row3, 7).Value = (double)r.Growth.Value / 100; ws3.Cell(row3, 7).Style.NumberFormat.Format = "0.00%"; }
                ws3.Cell(row3, 8).Value = (double)r.Share / 100;
                ws3.Cell(row3, 8).Style.NumberFormat.Format = "0.00%";
                row3++;
            }
            ws3.Columns().AdjustToContents();

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            var fileName = $"SalesReport_{request.Mode}_{(request.Year?.ToString() ?? "all")}_{_dateTimeProvider.BusinessNow():yyyyMMdd_HHmmss}.xlsx";
            return (ms.ToArray(), fileName);
        }

        // ═════════════════════════════════════════════════════════════════════
        // Internal aggregate models
        // ═════════════════════════════════════════════════════════════════════

        private class PeriodAgg
        {
            public int Year { get; set; }
            public int Month { get; set; }
            public int Notes { get; set; }
            public decimal Qty { get; set; }
            public decimal Value { get; set; }
        }

        private class ItemAgg
        {
            public long ItemId { get; set; }
            public string? Code { get; set; }
            public string? Name { get; set; }
            public string? Uom { get; set; }
            public int Notes { get; set; }
            public decimal Qty { get; set; }
            public decimal Value { get; set; }
        }

        private class PartnerAgg
        {
            public long Id { get; set; }
            public string? Code { get; set; }
            public string? Name { get; set; }
            public int Notes { get; set; }
            public decimal Qty { get; set; }
            public decimal Value { get; set; }
        }
    }
}
