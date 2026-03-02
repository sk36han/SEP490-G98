using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.ApiController
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WarehouseController : ControllerBase
    {
        private readonly IWarehouseService _warehouseService;

        public WarehouseController(IWarehouseService warehouseService)
        {
            _warehouseService = warehouseService;
        }

		/// <summary>
		/// Lấy danh sách kho có phân trang
		/// GET: /api/warehouse?pageNumber=1&pageSize=10
		/// </summary>
		[HttpGet("get-Warehouse")]
		public async Task<IActionResult> GetWarehouseList([FromQuery] FilterRequest filter)
        {
			// 1. CHỐT CHẶN LOGIC: Bắt buộc phải có để trả về lỗi 400 
			if (!ModelState.IsValid)
			{
				return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu không hợp lệ."));
			}

			try
			{
				var result = await _warehouseService.GetWarehouseListAsync(filter);

				// 2. CHUẨN HÓA KIỂU: Trả về kiểu cụ thể 
				return Ok(ApiResponse<PagedResult<WarehouseResponse>>.SuccessResponse(result, "Lấy danh sách kho thành công."));
			}
			catch (Exception)
			{
				// Trả về lỗi 500 cho các trường hợp UTCID 06, 07, 08
				return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
			}
		}

		/// <summary>
		/// Tạo kho mới
		/// POST: /api/warehouse/create
		/// </summary>
		[HttpPost("create-warehouse")]
		public async Task<IActionResult> CreateWarehouse([FromBody] CreateWarehouseRequest request)
		{
			if (!ModelState.IsValid)
				return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu không hợp lệ."));

			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
				if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out long currentUserId))
				{
					return Unauthorized(ApiResponse<object>.ErrorResponse("Không xác định được danh tính người dùng."));
				}

				var result = await _warehouseService.CreateWarehouseAsync(request, currentUserId);
				return Ok(ApiResponse<WarehouseResponse>.SuccessResponse(result, "Tạo kho thành công."));
			}
			catch (InvalidOperationException ex)
			{
				return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
			}
			catch (Exception)
			{
				return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
			}
		}

		/// <summary>
		/// Cập nhật thông tin kho
		/// PUT: /api/warehouse/{id}
		/// </summary>
		[HttpPut("update-warehouse/{id}")]
		public async Task<IActionResult> UpdateWarehouse(long id, [FromBody] UpdateWarehouseRequest request)
		{
			if (!ModelState.IsValid)
				return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu không hợp lệ."));

			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
				if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out long currentUserId))
				{
					return Unauthorized(ApiResponse<object>.ErrorResponse("Không xác định được danh tính người dùng."));
				}

				var result = await _warehouseService.UpdateWarehouseAsync(id, request, currentUserId);
				return Ok(ApiResponse<WarehouseResponse>.SuccessResponse(result, "Cập nhật kho thành công."));
			}
			catch (KeyNotFoundException ex)
			{
				return NotFound(ApiResponse<object>.ErrorResponse(ex.Message));
			}
			catch (Exception)
			{
				return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
			}
		}

		/// <summary>
		/// Bật/Tắt trạng thái kho (Enable/Disable)
		/// PATCH: /api/warehouse/toggle-status/{id}
		/// </summary>
		[HttpPatch("toggle-status/{id}")]
		public async Task<IActionResult> ToggleWarehouseStatus(long id)
		{
			try
			{
				var result = await _warehouseService.ToggleWarehouseStatusAsync(id);
				return Ok(ApiResponse<WarehouseResponse>.SuccessResponse(result,
					$"Đã chuyển trạng thái kho thành {(result.IsActive ? "Enable" : "Disable")}."));
			}
			catch (KeyNotFoundException ex)
			{
				return NotFound(ApiResponse<object>.ErrorResponse(ex.Message));
			}
			catch (Exception)
			{
				return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
			}
		}
    }
}
