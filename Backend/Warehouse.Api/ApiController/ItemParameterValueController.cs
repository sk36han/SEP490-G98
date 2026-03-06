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
    public class ItemParameterValueController : ControllerBase
    {
        private readonly IItemParameterValueService _itemParameterValueService;

        public ItemParameterValueController(IItemParameterValueService itemParameterValueService)
        {
            _itemParameterValueService = itemParameterValueService;
        }

        /// <summary>
        /// Thêm giá trị thông số kỹ thuật cho mặt hàng
        /// </summary>
        [HttpPost("create-item-parameter-value")]
        public async Task<IActionResult> CreateItemParameterValue([FromBody] CreateItemParameterValueRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                    return Unauthorized(new { message = "Không xác định được người dùng." });

                var result = await _itemParameterValueService.CreateItemParameterValueAsync(request, currentUserId);
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
        /// Lấy tất cả giá trị thông số kỹ thuật của một mặt hàng
        /// </summary>
        [HttpGet("get-by-item/{itemId}")]
        public async Task<IActionResult> GetItemParameterValuesByItemId(long itemId)
        {
            try
            {
                var result = await _itemParameterValueService.GetItemParameterValuesByItemIdAsync(itemId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy chi tiết một giá trị thông số kỹ thuật
        /// </summary>
        [HttpGet("get-item-parameter-value-by-id/{id}")]
        public async Task<IActionResult> GetItemParameterValueById(long id)
        {
            try
            {
                var result = await _itemParameterValueService.GetItemParameterValueByIdAsync(id);
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
        /// Cập nhật giá trị thông số kỹ thuật
        /// </summary>
        [HttpPut("update-item-parameter-value/{id}")]
        public async Task<IActionResult> UpdateItemParameterValue(long id, [FromBody] UpdateItemParameterValueRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                    return Unauthorized(new { message = "Không xác định được người dùng." });

                var result = await _itemParameterValueService.UpdateItemParameterValueAsync(id, request, currentUserId);
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
        /// Xóa giá trị thông số kỹ thuật
        /// </summary>
        [HttpDelete("delete-item-parameter-value/{id}")]
        public async Task<IActionResult> DeleteItemParameterValue(long id)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                    return Unauthorized(new { message = "Không xác định được người dùng." });

                var result = await _itemParameterValueService.DeleteItemParameterValueAsync(id, currentUserId);
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
    }
}
