using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;

namespace Warehouse.Api.ApiController;

/// <summary>
/// Phiếu điều chỉnh tồn kho (Inventory Adjustment Request).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventoryAdjustmentController : ControllerBase
{
    private readonly IInventoryAdjustmentService _inventoryAdjustmentService;

    public InventoryAdjustmentController(IInventoryAdjustmentService inventoryAdjustmentService)
    {
        _inventoryAdjustmentService = inventoryAdjustmentService;
    }

    /// <summary>
    /// Danh sách tất cả phiếu điều chỉnh (không phân trang). Tìm theo mã phiếu, tên kho, người đề xuất.
    /// </summary>
    [HttpGet("list-all")]
    public async Task<IActionResult> GetListAll([FromQuery] string? search = null)
    {
        var result = await _inventoryAdjustmentService.GetAllAsync(search);
        return Ok(result);
    }
}
