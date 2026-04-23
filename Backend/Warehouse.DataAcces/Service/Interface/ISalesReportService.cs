using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    /// <summary>
    /// Báo cáo doanh số / nhập xuất (theo Year / Quarter / Month / Week).
    /// Chỉ thống kê GoodsDeliveryNote / GoodsReceiptNote có Status = "POSTED".
    /// Dữ liệu lấy theo ngày <c>GDN.IssueDate</c> (outbound) và <c>GRN.ReceiptDate</c> (inbound).
    /// </summary>
    public interface ISalesReportService
    {
        Task<SalesReportListResponse> GetListAsync(SalesReportQueryRequest request);

        Task<System.Collections.Generic.List<SalesReportChartPointResponse>> GetChartAsync(SalesReportQueryRequest request);

        Task<SalesReportSummaryResponse> GetSummaryAsync(SalesReportQueryRequest request);

        /// <summary>
        /// Chi tiết theo cấp kỳ. level = YEAR | QUARTER | MONTH.
        /// compareYear / compareQuarter / compareMonth là kỳ so sánh tuỳ chọn (mặc định = năm trước).
        /// </summary>
        Task<SalesReportDetailResponse?> GetDetailAsync(
            string level,
            int year,
            int? quarter,
            int? month,
            int? compareYear,
            int? compareQuarter,
            int? compareMonth,
            long? warehouseId);

        /// <summary>
        /// Breakdown: YEAR → 4 quý + 12 tháng; QUARTER → 3 tháng; MONTH → list tuần (week-in-month).
        /// </summary>
        Task<SalesReportBreakdownResponse> GetBreakdownAsync(
            string level,
            int year,
            int? quarter,
            int? month,
            long? warehouseId);

        Task<PagedResult<SalesReportTopItemRow>> GetTopItemsAsync(SalesReportTopQueryRequest request);

        Task<PagedResult<SalesReportTopPartnerRow>> GetTopPartnersAsync(SalesReportTopQueryRequest request);

        /// <summary>Xuất Excel (3 sheet: List, Top Items, Top Partners).</summary>
        Task<(byte[] Content, string FileName)> ExportAsync(SalesReportQueryRequest request);
    }
}
