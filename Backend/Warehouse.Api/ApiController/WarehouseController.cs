using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
            try
            {
                var result = await _warehouseService.GetWarehouseListAsync(filter);
                return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách kho thành công."));
            }
            catch (Exception)
            {
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
				var result = await _warehouseService.CreateWarehouseAsync(request);
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
