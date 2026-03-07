using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.Api.ApiController
{
    [Authorize]
    [Route("api/packagingspecs")]
    [ApiController]
    public class PackagingSpecController : ControllerBase
    {
        private readonly IPackagingSpecService _packagingSpecService;

        public PackagingSpecController(IPackagingSpecService packagingSpecService)
        {
            _packagingSpecService = packagingSpecService;
        }

        private long GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (long.TryParse(userIdClaim, out var userId))
                return userId;

            throw new UnauthorizedAccessException("Người dùng không hợp lệ.");
        }

        [HttpPost]
        public async Task<IActionResult> CreatePackagingSpec([FromBody] CreatePackagingSpecRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _packagingSpecService.CreatePackagingSpecAsync(request, userId);
                return CreatedAtAction(nameof(GetPackagingSpecById), new { id = result.PackagingSpecId }, new { code = 201, message = "Tạo quy cách đóng gói thành công.", data = result });
            }
            catch (ArgumentException ex) { return BadRequest(new { code = 400, message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { code = 409, message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { code = 500, message = "Lỗi hệ thống.", details = ex.Message }); }
        }

        [HttpGet]
        public async Task<IActionResult> GetAllPackagingSpecs()
        {
            try
            {
                var result = await _packagingSpecService.GetAllPackagingSpecsAsync();
                return Ok(new { code = 200, message = "Lấy danh sách quy cách đóng gói thành công.", data = result });
            }
            catch (Exception ex) { return StatusCode(500, new { code = 500, message = "Lỗi hệ thống.", details = ex.Message }); }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetPackagingSpecById(long id)
        {
            try
            {
                var result = await _packagingSpecService.GetPackagingSpecByIdAsync(id);
                return Ok(new { code = 200, message = "Lấy thông tin quy cách đóng gói thành công.", data = result });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { code = 404, message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { code = 400, message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { code = 500, message = "Lỗi hệ thống.", details = ex.Message }); }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePackagingSpec(long id, [FromBody] UpdatePackagingSpecRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _packagingSpecService.UpdatePackagingSpecAsync(id, request, userId);
                return Ok(new { code = 200, message = "Cập nhật thông tin quy cách đóng gói thành công.", data = result });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { code = 404, message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { code = 400, message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { code = 409, message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { code = 500, message = "Lỗi hệ thống.", details = ex.Message }); }
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> TogglePackagingSpecStatus(long id, [FromBody] bool isActive)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _packagingSpecService.TogglePackagingSpecStatusAsync(id, isActive, userId);
                return Ok(new { code = 200, message = "Cập nhật trạng thái quy cách đóng gói thành công.", data = result });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { code = 404, message = ex.Message }); }
            catch (ArgumentException ex) { return BadRequest(new { code = 400, message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { code = 409, message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { code = 500, message = "Lỗi hệ thống.", details = ex.Message }); }
        }

       
    }
}
