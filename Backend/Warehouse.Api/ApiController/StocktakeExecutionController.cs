using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.Api.ApiController
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StocktakeExecutionController : ControllerBase
    {
        private readonly IStocktakeExecutionService _stocktakeExecutionService;

        public StocktakeExecutionController(IStocktakeExecutionService stocktakeExecutionService)
        {
            _stocktakeExecutionService = stocktakeExecutionService;
        }

        [HttpPost("{id}/StartStocktakeExecution")]
        public async Task<IActionResult> StartStocktakeExecution(long id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _stocktakeExecutionService.StartStocktakeExecutionAsync(id, currentUserId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                var errorDetail = ex.InnerException != null ? $"{ex.Message} | DEBUG: {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, new { message = "Lỗi hệ thống khi bắt đầu thực thi kiểm kê.", detail = errorDetail });
            }
        }

        [HttpGet("{id}/Lines")]
        public async Task<IActionResult> GetStocktakeLines(long id, [FromQuery] StocktakeLineFilterRequest request)
        {
            try
            {
                var result = await _stocktakeExecutionService.GetStocktakeLinesAsync(id, request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy danh sách dòng hàng kiểm đếm.", detail = ex.Message });
            }
        }

        [HttpPatch("UpdateActualCountedQty/{lineId}")]
        public async Task<IActionResult> UpdateActualCountedQty(long lineId, [FromBody] UpdateCountedQtyRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _stocktakeExecutionService.UpdateActualCountedQtyAsync(lineId, request);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi cập nhật số đếm thực tế.", detail = ex.Message });
            }
        }

        [HttpPost("{id}/BulkMatchSystemQty")]
        public async Task<IActionResult> BulkMatchSystemQty(long id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _stocktakeExecutionService.BulkMatchSystemQtyAsync(id, currentUserId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi xử lý khớp số lượng hàng loạt.", detail = ex.Message });
            }
        }

        [HttpPost("{id}/SubmitStocktakeResults")]
        public async Task<IActionResult> SubmitStocktakeResults(long id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _stocktakeExecutionService.SubmitStocktakeResultsAsync(id, currentUserId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi gửi xác nhận kết quả đếm.", detail = ex.Message });
            }
        }

        [HttpGet("{id}/GetAdjustmentPreview")]
        public async Task<IActionResult> GetAdjustmentPreview(long id)
        {
             try
            {
                var result = await _stocktakeExecutionService.GetAdjustmentPreviewAsync(id);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy dữ liệu xem trước điều chỉnh.", detail = ex.Message });
            }
        }

        [HttpPost("{id}/ApproveAndFinalizeResults")]
        public async Task<IActionResult> ApproveAndFinalizeResults(long id, [FromBody] StocktakeApprovalRequest request)
        {
             var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _stocktakeExecutionService.ApproveAndFinalizeResultsAsync(id, request, currentUserId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi chốt kết quả kiểm đếm.", detail = ex.Message });
            }
        }

        [HttpPost("{id}/CancelStocktake")]
        public async Task<IActionResult> CancelStocktake(long id, [FromBody] CancelStocktakeRequest request)
        {
             var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _stocktakeExecutionService.CancelStocktakeAsync(id, request.Reason ?? "Không có lý do", currentUserId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi hủy thực thi kiểm kê.", detail = ex.Message });
            }
        }

        [HttpGet("{id}/GetApprovalHistory")]
        public async Task<IActionResult> GetApprovalHistory(long id)
        {
            try
            {
                var result = await _stocktakeExecutionService.GetApprovalHistoryAsync(id);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy lịch sử thao tác.", detail = ex.Message });
            }
        }

        [HttpGet("ListAllCompletedStocktakes")]
        public async Task<IActionResult> ListAllCompletedStocktakes(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? stocktakeCode = null,
            [FromQuery] string? warehouseName = null,
            [FromQuery] string? status = null,
            [FromQuery] string? mode = null,
            [FromQuery] string? createdByName = null,
            [FromQuery] DateTime? startedFrom = null,
            [FromQuery] DateTime? startedTo = null,
            [FromQuery] DateTime? endedFrom = null,
            [FromQuery] DateTime? endedTo = null)
        {
            var request = new StocktakeListRequest
            {
                Page = page,
                PageSize = pageSize,
                StocktakeCode = stocktakeCode?.Trim(),
                WarehouseName = warehouseName?.Trim(),
                Status = status?.Trim().ToUpper(),
                Mode = mode?.Trim().ToUpper(),
                CreatedByName = createdByName?.Trim(),
                StartedFrom = startedFrom,
                StartedTo = startedTo,
                EndedFrom = endedFrom,
                EndedTo = endedTo
            };

            if (!TryValidateModel(request))
            {
                return BadRequest(ModelState);
            }

            try
            {
                var result = await _stocktakeExecutionService.ListAllCompletedStocktakesAsync(request);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống.", detail = ex.Message });
            }
        }

        [HttpGet("{id}/ExportStocktakeSheetPdf")]
        public async Task<IActionResult> ExportStocktakeSheetPdf(long id)
        {
            try
            {
                var result = await _stocktakeExecutionService.GetStocktakeSheetDataAsync(id);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy dữ liệu in phiếu kiểm kê.", detail = ex.Message });
            }
        }
    }
}
