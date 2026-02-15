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
    }
}
