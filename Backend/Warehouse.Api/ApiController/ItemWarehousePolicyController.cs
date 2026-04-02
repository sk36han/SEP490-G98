using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.ApiController;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ItemWarehousePolicyController : ControllerBase
{
    private readonly IItemWarehousePolicyService _service;

    public ItemWarehousePolicyController(IItemWarehousePolicyService service)
    {
        _service = service;
    }

    /// <summary>
    /// Lấy danh sách ItemWarehousePolicy có phân trang + filter.
    /// GET: /api/ItemWarehousePolicy/list-all?page=1&pageSize=20&keyword=...&warehouseId=...&statusFilter=...
    /// </summary>
    [HttpGet("list-all")]
    public async Task<IActionResult> GetList([FromQuery] ItemWarehousePolicyFilterRequest filter)
    {
        try
        {
            var result = await _service.GetListAsync(filter);
            return Ok(ApiResponse<ItemWarehousePolicyListResponse>.SuccessResponse(result, "Lấy danh sách cảnh báo tồn kho thành công."));
        }
        catch (Exception)
        {
            return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
        }
    }

    /// <summary>
    /// Lấy chi tiết một ItemWarehousePolicy.
    /// GET: /api/itemwarehousepolicy/detail/{id}
    /// </summary>
    [HttpGet("detail/{id}")]
    public async Task<IActionResult> GetDetail(long id)
    {
        try
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null)
                return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy cảnh báo tồn kho."));
            return Ok(ApiResponse<ItemWarehousePolicyResponse>.SuccessResponse(result, "Lấy chi tiết thành công."));
        }
        catch (Exception)
        {
            return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
        }
    }

    /// <summary>
    /// Tạo mới ItemWarehousePolicy.
    /// POST: /api/itemwarehousepolicy/create
    /// </summary>
    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] CreateItemWarehousePolicyRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu không hợp lệ."));

        try
        {
            var result = await _service.CreateAsync(request);
            return Ok(ApiResponse<ItemWarehousePolicyResponse>.SuccessResponse(result, "Tạo cảnh báo tồn kho thành công."));
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
    /// Cập nhật ItemWarehousePolicy.
    /// PUT: /api/itemwarehousepolicy/update/{id}
    /// </summary>
    [HttpPut("update/{id}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateItemWarehousePolicyRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu không hợp lệ."));

        try
        {
            var result = await _service.UpdateAsync(id, request);
            return Ok(ApiResponse<ItemWarehousePolicyResponse>.SuccessResponse(result, "Cập nhật cảnh báo tồn kho thành công."));
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
    /// Xóa ItemWarehousePolicy.
    /// DELETE: /api/itemwarehousepolicy/delete/{id}
    /// </summary>
    [HttpDelete("delete/{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        try
        {
            await _service.DeleteAsync(id);
            return Ok(ApiResponse<object>.SuccessResponse(null, "Xóa cảnh báo tồn kho thành công."));
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
