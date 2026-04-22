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
    public class StocktakePlanController : ControllerBase
    {
        private readonly IStocktakePlanService _stocktakePlanService;

        public StocktakePlanController(IStocktakePlanService stocktakePlanService)
        {
            _stocktakePlanService = stocktakePlanService;
        }

        [HttpPost("CreateStocktakePlan")]
        public async Task<IActionResult> CreateStocktakePlan([FromBody] CreateStocktakeDraftRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _stocktakePlanService.CreateStocktakePlanAsync(request, currentUserId);
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
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                var errorDetail = ex.InnerException != null ? $"{ex.Message} | INNER: {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, new { message = "Lỗi hệ thống khi tạo kế hoạch kiểm kê.", detail = errorDetail });
            }
        }

        [HttpPost("{id}/SubmitStocktakePlan")]
        public async Task<IActionResult> SubmitStocktakePlan(long id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _stocktakePlanService.SubmitStocktakePlanAsync(id, currentUserId);
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
                return StatusCode(500, new { message = "Lỗi khi gửi duyệt kế hoạch.", detail = ex.Message });
            }
        }

        [HttpPost("{id}/ApproveStocktakePlan")]
        public async Task<IActionResult> ApproveStocktakePlan(long id, [FromBody] StocktakeApprovalRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                request.NormalizeDecisionAlias();
                var result = await _stocktakePlanService.ApproveStocktakePlanAsync(id, request, currentUserId);
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
                var errorDetail = ex.InnerException != null ? $"{ex.Message} | INNER: {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, new { message = "Lỗi khi phê duyệt kế hoạch.", detail = errorDetail });
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
                var result = await _stocktakePlanService.CancelStocktakeAsync(id, request.Reason ?? "Không có lý do", currentUserId);
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
                return StatusCode(500, new { message = "Lỗi khi hủy kế hoạch kiểm kê.", detail = ex.Message });
            }
        }

        [HttpGet("ListAllStocktakePlans")]
        public async Task<IActionResult> ListAllStocktakePlans(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? stocktakeCode = null,
            [FromQuery] string? warehouseName = null,
            [FromQuery] string? status = null,
            [FromQuery] string? mode = null,
            [FromQuery] string? createdByName = null,
            [FromQuery] DateTime? plannedFrom = null,
            [FromQuery] DateTime? plannedTo = null)
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
                PlannedFrom = plannedFrom,
                PlannedTo = plannedTo
            };

            if (!TryValidateModel(request))
            {
                return BadRequest(ModelState);
            }

            try
            {
                var result = await _stocktakePlanService.ListAllStocktakePlansAsync(request);
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
    }
}
