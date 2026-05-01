using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.ApiController;

/// <summary>
/// Báo cáo doanh số / Nhập xuất cho màn <c>/reports/sales</c> trên FE.
/// Chỉ role <c>DIRECTOR</c> có quyền truy cập (khớp với ProtectedRoute ở FE).
/// </summary>
[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "GD")]
public class SalesReportController : ControllerBase
{
    private readonly ISalesReportService _service;
    private readonly ILogger<SalesReportController> _logger;

    public SalesReportController(ISalesReportService service, ILogger<SalesReportController> logger)
    {
        _service = service;
        _logger = logger;
    }

    // ── List + Chart + Summary: dùng chung SalesReportQueryRequest ──────────

    [HttpGet("list")]
    public async Task<ActionResult<ApiResponse<SalesReportListResponse>>> GetList([FromQuery] SalesReportQueryRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ApiResponse<SalesReportListResponse>.ErrorResponse("Tham số không hợp lệ."));
        try
        {
            var data = await _service.GetListAsync(request);
            return Ok(ApiResponse<SalesReportListResponse>.SuccessResponse(data));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetList failed");
            return StatusCode(500, ApiResponse<SalesReportListResponse>.ErrorResponse("Lỗi server khi lấy báo cáo."));
        }
    }

    [HttpGet("chart")]
    public async Task<ActionResult<ApiResponse<System.Collections.Generic.List<SalesReportChartPointResponse>>>> GetChart([FromQuery] SalesReportQueryRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ApiResponse<System.Collections.Generic.List<SalesReportChartPointResponse>>.ErrorResponse("Tham số không hợp lệ."));
        try
        {
            var data = await _service.GetChartAsync(request);
            return Ok(ApiResponse<System.Collections.Generic.List<SalesReportChartPointResponse>>.SuccessResponse(data));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetChart failed");
            return StatusCode(500, ApiResponse<System.Collections.Generic.List<SalesReportChartPointResponse>>.ErrorResponse("Lỗi server khi lấy chart."));
        }
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<SalesReportSummaryResponse>>> GetSummary([FromQuery] SalesReportQueryRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ApiResponse<SalesReportSummaryResponse>.ErrorResponse("Tham số không hợp lệ."));
        try
        {
            var data = await _service.GetSummaryAsync(request);
            return Ok(ApiResponse<SalesReportSummaryResponse>.SuccessResponse(data));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetSummary failed");
            return StatusCode(500, ApiResponse<SalesReportSummaryResponse>.ErrorResponse("Lỗi server khi lấy summary."));
        }
    }

    // ── Detail 3 cấp — path params cho thân thiện với URL FE hiện tại ──────

    [HttpGet("detail/year/{year:int}")]
    public Task<ActionResult<ApiResponse<SalesReportDetailResponse>>> GetDetailYear(
        int year,
        [FromQuery] int? compareYear,
        [FromQuery] long? warehouseId)
        => GetDetailCore("YEAR", year, null, null, compareYear, null, null, warehouseId);

    [HttpGet("detail/quarter/{quarter:int}/{year:int}")]
    public Task<ActionResult<ApiResponse<SalesReportDetailResponse>>> GetDetailQuarter(
        int quarter, int year,
        [FromQuery] int? compareQuarter, [FromQuery] int? compareYear,
        [FromQuery] long? warehouseId)
        => GetDetailCore("QUARTER", year, quarter, null, compareYear, compareQuarter, null, warehouseId);

    [HttpGet("detail/month/{month:int}/{year:int}")]
    public Task<ActionResult<ApiResponse<SalesReportDetailResponse>>> GetDetailMonth(
        int month, int year,
        [FromQuery] int? compareMonth, [FromQuery] int? compareYear,
        [FromQuery] long? warehouseId)
        => GetDetailCore("MONTH", year, null, month, compareYear, null, compareMonth, warehouseId);

    private async Task<ActionResult<ApiResponse<SalesReportDetailResponse>>> GetDetailCore(
        string level, int year, int? quarter, int? month,
        int? compareYear, int? compareQuarter, int? compareMonth, long? warehouseId)
    {
        if (year < 2000 || year > 2100) return BadRequest(ApiResponse<SalesReportDetailResponse>.ErrorResponse("Năm không hợp lệ."));
        if (level == "QUARTER" && (quarter < 1 || quarter > 4)) return BadRequest(ApiResponse<SalesReportDetailResponse>.ErrorResponse("Quý phải từ 1 đến 4."));
        if (level == "MONTH" && (month < 1 || month > 12)) return BadRequest(ApiResponse<SalesReportDetailResponse>.ErrorResponse("Tháng phải từ 1 đến 12."));
        try
        {
            var data = await _service.GetDetailAsync(level, year, quarter, month, compareYear, compareQuarter, compareMonth, warehouseId);
            if (data == null)
                return NotFound(ApiResponse<SalesReportDetailResponse>.ErrorResponse("Không tìm thấy dữ liệu cho kỳ đã chọn."));
            return Ok(ApiResponse<SalesReportDetailResponse>.SuccessResponse(data));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetDetail failed");
            return StatusCode(500, ApiResponse<SalesReportDetailResponse>.ErrorResponse("Lỗi server khi lấy detail."));
        }
    }

    // ── Breakdown ──────────────────────────────────────────────────────────

    [HttpGet("breakdown")]
    public async Task<ActionResult<ApiResponse<SalesReportBreakdownResponse>>> GetBreakdown(
        [FromQuery] string level,
        [FromQuery] int year,
        [FromQuery] int? quarter,
        [FromQuery] int? month,
        [FromQuery] long? warehouseId)
    {
        if (level != "YEAR" && level != "QUARTER" && level != "MONTH")
            return BadRequest(ApiResponse<SalesReportBreakdownResponse>.ErrorResponse("Level phải là YEAR | QUARTER | MONTH."));
        if (year < 2000 || year > 2100)
            return BadRequest(ApiResponse<SalesReportBreakdownResponse>.ErrorResponse("Năm không hợp lệ."));
        try
        {
            var data = await _service.GetBreakdownAsync(level, year, quarter, month, warehouseId);
            return Ok(ApiResponse<SalesReportBreakdownResponse>.SuccessResponse(data));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetBreakdown failed");
            return StatusCode(500, ApiResponse<SalesReportBreakdownResponse>.ErrorResponse("Lỗi server khi lấy breakdown."));
        }
    }

    // ── Top Items / Top Partners ───────────────────────────────────────────

    [HttpGet("top-items")]
    public async Task<ActionResult<ApiResponse<PagedResult<SalesReportTopItemRow>>>> GetTopItems([FromQuery] SalesReportTopQueryRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ApiResponse<PagedResult<SalesReportTopItemRow>>.ErrorResponse("Tham số không hợp lệ."));
        try
        {
            var data = await _service.GetTopItemsAsync(request);
            return Ok(ApiResponse<PagedResult<SalesReportTopItemRow>>.SuccessResponse(data));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetTopItems failed");
            return StatusCode(500, ApiResponse<PagedResult<SalesReportTopItemRow>>.ErrorResponse("Lỗi server khi lấy top items."));
        }
    }

    [HttpGet("top-partners")]
    public async Task<ActionResult<ApiResponse<PagedResult<SalesReportTopPartnerRow>>>> GetTopPartners([FromQuery] SalesReportTopQueryRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ApiResponse<PagedResult<SalesReportTopPartnerRow>>.ErrorResponse("Tham số không hợp lệ."));
        try
        {
            var data = await _service.GetTopPartnersAsync(request);
            return Ok(ApiResponse<PagedResult<SalesReportTopPartnerRow>>.SuccessResponse(data));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetTopPartners failed");
            return StatusCode(500, ApiResponse<PagedResult<SalesReportTopPartnerRow>>.ErrorResponse("Lỗi server khi lấy top partners."));
        }
    }

    // ── Export Excel ───────────────────────────────────────────────────────

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] SalesReportQueryRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(new { success = false, message = "Tham số không hợp lệ." });
        try
        {
            var (content, fileName) = await _service.ExportAsync(request);
            return File(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Export failed");
            return StatusCode(500, new { success = false, message = "Lỗi server khi xuất file." });
        }
    }
}
