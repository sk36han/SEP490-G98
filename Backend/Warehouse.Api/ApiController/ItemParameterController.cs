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
    public class ItemParameterController : ControllerBase
    {
        private readonly IItemParameterService _itemParameterService;

        public ItemParameterController(IItemParameterService itemParameterService)
        {
            _itemParameterService = itemParameterService;
        }

        /// <summary>
        /// Tạo thông số kỹ thuật mới
        /// </summary>
        [HttpPost("create-item-parameter")]
        public async Task<IActionResult> CreateItemParameter([FromBody] CreateItemParameterRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                    return Unauthorized(new { message = "Không xác định được người dùng." });

                var result = await _itemParameterService.CreateItemParameterAsync(request, currentUserId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách thông số kỹ thuật có phân trang + filter
        /// </summary>
        [HttpGet("list-all-item-parameter")]
        public async Task<IActionResult> GetItemParameters(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? paramName = null,
            [FromQuery] bool? isActive = null)
        {
            try
            {
                var result = await _itemParameterService.GetItemParametersAsync(page, pageSize, paramName, isActive);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy thông tin chi tiết thông số kỹ thuật theo ID
        /// </summary>
        [HttpGet("get-item-parameter-by-id/{id}")]
        public async Task<IActionResult> GetItemParameterById(long id)
        {
            try
            {
                var result = await _itemParameterService.GetItemParameterByIdAsync(id);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Cập nhật thông tin thông số kỹ thuật
        /// </summary>
        [HttpPut("update-item-parameter/{id}")]
        public async Task<IActionResult> UpdateItemParameter(long id, [FromBody] UpdateItemParameterRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                    return Unauthorized(new { message = "Không xác định được người dùng." });

                var result = await _itemParameterService.UpdateItemParameterAsync(id, request, currentUserId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Bật / Tắt trạng thái thông số kỹ thuật
        /// </summary>
        [HttpPatch("change-status-item-parameter/{id}")]
        public async Task<IActionResult> ToggleItemParameterStatus(long id, [FromQuery] bool isActive)
        {
            try
            {
                var result = await _itemParameterService.ToggleItemParameterStatusAsync(id, isActive);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
