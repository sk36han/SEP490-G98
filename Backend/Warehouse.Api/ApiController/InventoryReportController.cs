using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Warehouse.DataAcces.Service.Interface;

namespace Warehouse.Api.ApiController;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class InventoryReportController : ControllerBase
{
    private readonly IInventoryReportService _inventoryReportService;

    public InventoryReportController(IInventoryReportService inventoryReportService)
    {
        _inventoryReportService = inventoryReportService;
    }

    [HttpGet("weighted-average")]
    public async Task<IActionResult> GetWeightedAverageReport(
        [FromQuery] string? keyword,
        [FromQuery] long? warehouseId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 10;

        var result = await _inventoryReportService.GetWeightedAverageReportAsync(keyword, warehouseId, page, pageSize);
        return Ok(new { success = true, data = result });
    }
}
