using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.Api.ApiController
{
    /// <summary>
    /// API quản lý phiên kiểm kê kho (Stocktake)
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StocktakeController : ControllerBase
    {
        private readonly IStocktakeService _stocktakeService;

        public StocktakeController(IStocktakeService stocktakeService)
        {
            _stocktakeService = stocktakeService;
        }

        /// <summary>
        /// Lấy danh sách / tìm kiếm phiên kiểm kê (có phân trang, filter riêng biệt).
        /// </summary>
        /// <param name="page">Số trang (mặc định: 1)</param>
        /// <param name="pageSize">Số bản ghi mỗi trang, tối đa 100 (mặc định: 20)</param>
        /// <param name="stocktakeCode">Mã phiếu kiểm kê (tìm kiếm chứa chuỗi)</param>
        /// <param name="warehouseName">Lọc theo tên kho (tìm kiếm chứa chuỗi)</param>
        /// <param name="status">Trạng thái: DRAFT | IN_PROGRESS | COMPLETED | CANCELLED</param>
        /// <param name="mode">Chế độ kiểm kê: FULL | PARTIAL</param>
        /// <param name="createdByName">Lọc theo tên người tạo (tìm kiếm chứa chuỗi)</param>
        /// <param name="plannedFrom">PlannedAt từ ngày</param>
        /// <param name="plannedTo">PlannedAt đến ngày</param>
        /// <param name="startedFrom">StartedAt từ ngày</param>
        /// <param name="startedTo">StartedAt đến ngày</param>
        /// <param name="endedFrom">EndedAt từ ngày</param>
        /// <param name="endedTo">EndedAt đến ngày</param>
        [HttpGet("list-all")]
        public async Task<IActionResult> GetStocktakes(
            [FromQuery] int page              = 1,
            [FromQuery] int pageSize          = 20,
            [FromQuery] string? stocktakeCode = null,
            [FromQuery] string? warehouseName  = null,
            [FromQuery] string? status         = null,
            [FromQuery] string? mode           = null,
            [FromQuery] string? createdByName  = null,
            [FromQuery] DateTime? plannedFrom  = null,
            [FromQuery] DateTime? plannedTo    = null,
            [FromQuery] DateTime? startedFrom  = null,
            [FromQuery] DateTime? startedTo    = null,
            [FromQuery] DateTime? endedFrom    = null,
            [FromQuery] DateTime? endedTo      = null)
        {
            var request = new StocktakeListRequest
            {
                Page          = page,
                PageSize      = pageSize,
                StocktakeCode = stocktakeCode?.Trim(),
                WarehouseName = warehouseName?.Trim(),
                Status        = status?.Trim().ToUpper(),
                Mode          = mode?.Trim().ToUpper(),
                CreatedByName = createdByName?.Trim(),
                PlannedFrom   = plannedFrom,
                PlannedTo     = plannedTo,
                StartedFrom   = startedFrom,
                StartedTo     = startedTo,
                EndedFrom     = endedFrom,
                EndedTo       = endedTo
            };

            // Model-level validation (DataAnnotations on StocktakeListRequest)
            if (!TryValidateModel(request))
            {
                return BadRequest(ModelState);
            }

            try
            {
                var result = await _stocktakeService.GetStocktakesAsync(request);
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

        /// <summary>
        /// Lấy thông tin chi tiết header của một phiên kiểm kê theo ID.
        /// </summary>
        /// <param name="id">ID của phiên kiểm kê (StocktakeId)</param>
        [HttpGet("get-by-id/{id:long}")]
        public async Task<IActionResult> GetStocktakeById(long id)
        {
            if (id <= 0)
                return BadRequest(new { message = "ID phải là số nguyên dương." });

            try
            {
                var result = await _stocktakeService.GetStocktakeDetailAsync(id);
                if (result == null)
                    return NotFound(new { message = $"Không tìm thấy phiên kiểm kê với ID = {id}." });

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
        /// <summary>
        /// Tạo phiếu kiểm kê nghịch (Draft) cho toàn bộ kho.
        /// Mô tả: Phải không có phiên DRAFT/IN_PROGRESS nào trên cùng kho.
        /// </summary>
        [HttpPost("create-draft")]
        public async Task<IActionResult> CreateDraft([FromBody] CreateStocktakeDraftRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Lấy userId từ JWT
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _stocktakeService.CreateDraftAsync(request, currentUserId);
                return CreatedAtAction(
                    nameof(GetStocktakeById),
                    new { id = result.StocktakeId },
                    result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                // 409 Conflict – kho đang bận hoặc vô hiệu hóa
                return Conflict(new { message = ex.Message });
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

        /// <summary>
        /// Bắt đầu kiểm kê (Snapshot tồn kho + Chuyển trạng thái sang PROCESSING + Khóa kho).
        /// </summary>
        [HttpPost("start/{id}")]
        public async Task<IActionResult> StartStocktake(long id)
        {
            // Lấy userId từ JWT
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _stocktakeService.StartStocktakeAsync(id, currentUserId);
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
                return StatusCode(500, new { message = "Lỗi hệ thống.", detail = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách các dòng hàng trong phiếu kiểm kê (Phân trang + Tìm kiếm + Filter).
        /// </summary>
        [HttpGet("{id}/lines")]
        public async Task<IActionResult> GetStocktakeLines(long id, [FromQuery] StocktakeLineFilterRequest request)
        {
            try
            {
                var result = await _stocktakeService.GetStocktakeLinesAsync(id, request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy danh sách dòng hàng.", detail = ex.Message });
            }
        }

        /// <summary>
        /// Cập nhật số lượng đếm thực tế cho một dòng hàng.
        /// </summary>
        [HttpPatch("line/{lineId}")]
        public async Task<IActionResult> UpdateCountedQty(long lineId, [FromBody] UpdateCountedQtyRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _stocktakeService.UpdateCountedQtyAsync(lineId, request);
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
                return StatusCode(500, new { message = "Lỗi khi cập nhật số đếm.", detail = ex.Message });
            }
        }

        /// <summary>
        /// Macro: Tự động gán SL thực tế = Tồn hệ thống cho tất cả các dòng CHƯA đếm.
        /// </summary>
        [HttpPost("{id}/bulk-match-system")]
        public async Task<IActionResult> BulkMatchSystem(long id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _stocktakeService.BulkMatchSystemQtyAsync(id, currentUserId);
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
                return StatusCode(500, new { message = "Lỗi khi xử lý hàng loạt.", detail = ex.Message });
            }
        }

        /// <summary>
        /// Gửi xác nhận hoàn tất kiểm kê (Chuyển trạng thái sang PENDING_APPROVAL).
        /// Yêu cầu: Tất cả các dòng hàng đã được nhập số đếm.
        /// </summary>
        [HttpPost("{id}/submit")]
        public async Task<IActionResult> SubmitStocktake(long id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _stocktakeService.SubmitStocktakeAsync(id, currentUserId);
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
                return StatusCode(500, new { message = "Lỗi khi gửi xác nhận.", detail = ex.Message });
            }
        }

        /// <summary>
        /// Phê duyệt Bước 1 (Warehouse Manager).
        /// </summary>
        [HttpPost("{id}/approve-step1")]
        public async Task<IActionResult> ApproveStep1(long id, [FromBody] StocktakeApprovalRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _stocktakeService.ApproveStep1Async(id, request, currentUserId);
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
                return StatusCode(500, new { message = "Lỗi khi phê duyệt bước 1.", detail = ex.Message });
            }
        }

        /// <summary>
        /// Phê duyệt Bước 2 (Accountant).
        /// </summary>
        [HttpPost("{id}/approve-step2")]
        public async Task<IActionResult> ApproveStep2(long id, [FromBody] StocktakeApprovalRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _stocktakeService.ApproveStep2Async(id, request, currentUserId);
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
                return StatusCode(500, new { message = "Lỗi khi phê duyệt bước 2.", detail = ex.Message });
            }
        }

        /// <summary>
        /// Xem trước danh sách các mặt hàng chênh lệch trước khi ghi sổ.
        /// </summary>
        [HttpGet("{id}/preview-adjustment")]
        public async Task<IActionResult> GetAdjustmentPreview(long id)
        {
            try
            {
                var result = await _stocktakeService.GetAdjustmentPreviewAsync(id);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy dữ liệu xem trước.", detail = ex.Message });
            }
        }

        /// <summary>
        /// Lấy lịch sử phê duyệt của phiếu kiểm kê.
        /// </summary>
        [HttpGet("{id}/approval-history")]
        public async Task<IActionResult> GetApprovalHistory(long id)
        {
            try
            {
                var result = await _stocktakeService.GetApprovalHistoryAsync(id);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy lịch sử phê duyệt.", detail = ex.Message });
            }
        }
    }
}
