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
    public class ReleaseRequestController : ControllerBase
    {
        private readonly IReleaseRequestService _releaseRequestService;

        public ReleaseRequestController(IReleaseRequestService releaseRequestService)
        {
            _releaseRequestService = releaseRequestService;
        }

        /// <summary>
        /// Tạo yêu cầu xuất kho
        /// </summary>
        [HttpPost("create")]
        [Authorize(Roles = "SP,GD,KT,SE,TK")]
        public async Task<IActionResult> CreateReleaseRequest([FromForm] CreateReleaseRequestRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _releaseRequestService.CreateReleaseRequestAsync(currentUserId, request);
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
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message, innerDetail = ex.InnerException?.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách yêu cầu xuất kho
        /// </summary>
        [HttpGet("list")]
        public async Task<IActionResult> GetReleaseRequests(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var result = await _releaseRequestService.GetReleaseRequestsAsync(page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }

        /// <summary>
        /// Lấy chi tiết yêu cầu xuất kho theo ID
        /// </summary>
        [HttpGet("detail/{id:long}")]
        public async Task<IActionResult> GetReleaseRequestDetail(long id)
        {
            try
            {
                var result = await _releaseRequestService.GetReleaseRequestByIdAsync(id);
                if (result == null)
                    return NotFound(new { message = "Không tìm thấy yêu cầu xuất kho." });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }
        /// <summary>
        /// Cập nhật yêu cầu xuất kho
        /// </summary>
        [HttpPut("update/{id:long}")]
        [Authorize(Roles = "SP,KT,TK,SE")]
        public async Task<IActionResult> UpdateReleaseRequest(long id, [FromForm] UpdateReleaseRequestRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _releaseRequestService.UpdateReleaseRequestAsync(id, currentUserId, request);
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
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }

        /// <summary>
        /// Đóng yêu cầu xuất kho (giải phóng tồn kho đã giữ)
        /// </summary>
        [HttpPut("close/{id:long}")]
        [Authorize(Roles = "KT,SP,SE")]
        public async Task<IActionResult> CloseReleaseRequest(long id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var success = await _releaseRequestService.CloseReleaseRequestAsync(id, currentUserId);
                if (!success)
                    return NotFound(new { message = "Không tìm thấy yêu cầu xuất kho." });

                return Ok(new { message = "Đóng yêu cầu xuất kho thành công." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }

        /// <summary>
        /// Duyệt/Từ chối yêu cầu xuất kho (giai đoạn: Kế toán )
        /// </summary>
        [HttpPut("approve/{id:long}")]
        [Authorize(Roles = "KT")]
        public async Task<IActionResult> ApproveReleaseRequest(long id, [FromBody] ApproveReleaseRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _releaseRequestService.ApproveReleaseRequestAsync(id, currentUserId, request);
                var msg = request.IsApproved ? "Duyệt yêu cầu xuất kho thành công." : "Đã từ chối yêu cầu xuất kho.";
                return Ok(new { message = msg, data = result });
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
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }

        /// <summary>
        /// Hủy yêu cầu xuất kho (giải phóng tồn kho đã giữ)
        /// </summary>
        [HttpPut("cancel/{id:long}")]
        [Authorize(Roles = "SP,KT,SE")]
        public async Task<IActionResult> CancelReleaseRequest(long id)
        {
            try
            {
                var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                long currentUserId = (currentUserIdClaim != null && long.TryParse(currentUserIdClaim.Value, out var idVal)) ? idVal : 0;

                var success = await _releaseRequestService.CancelReleaseRequestAsync(id, currentUserId);
                if (!success)
                    return NotFound(new { message = "Không tìm thấy yêu cầu xuất kho." });

                return Ok(new { message = "Hủy yêu cầu xuất kho thành công." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }
    }
}
