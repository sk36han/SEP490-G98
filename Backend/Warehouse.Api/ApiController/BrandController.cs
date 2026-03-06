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
    public class BrandController : ControllerBase
    {
        private readonly IBrandService _brandService;

        public BrandController(IBrandService brandService)
        {
            _brandService = brandService;
        }

        /// <summary>
        /// Tạo thương hiệu mới
        /// </summary>
        [HttpPost("create-brand")]
        public async Task<IActionResult> CreateBrand([FromBody] CreateBrandRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                    return Unauthorized(new { message = "Không xác định được người dùng." });

                var result = await _brandService.CreateBrandAsync(request, currentUserId);
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
        /// Lấy danh sách thương hiệu có phân trang + filter
        /// </summary>
        [HttpGet("list-all-brand")]
        
        public async Task<IActionResult> GetBrands(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? brandName = null,
            [FromQuery] bool? isActive = null)
        {
            try
            {
                var result = await _brandService.GetBrandsAsync(page, pageSize, brandName, isActive);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy thông tin chi tiết thương hiệu theo ID
        /// </summary>
        [HttpGet("get-brand-by-id/{id}")]
        
        public async Task<IActionResult> GetBrandById(long id)
        {
            try
            {
                var result = await _brandService.GetBrandByIdAsync(id);
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
        /// Cập nhật thông tin thương hiệu
        /// </summary>
        [HttpPut("update-brand/{id}")]
        public async Task<IActionResult> UpdateBrand(long id, [FromBody] UpdateBrandRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                    return Unauthorized(new { message = "Không xác định được người dùng." });

                var result = await _brandService.UpdateBrandAsync(id, request, currentUserId);
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
        /// Bật / Tắt trạng thái thương hiệu
        /// </summary>
        [HttpPatch("change-status-brand/{id}")]
        public async Task<IActionResult> ToggleBrandStatus(long id, [FromQuery] bool isActive)
        {
            try
            {
                var result = await _brandService.ToggleBrandStatusAsync(id, isActive);
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
