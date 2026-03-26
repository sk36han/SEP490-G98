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
        public async Task<IActionResult> CreateReleaseRequest([FromBody] CreateReleaseRequestRequest request)
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
        public async Task<IActionResult> UpdateReleaseRequest(long id, [FromBody] UpdateReleaseRequestRequest request)
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
    }
}
