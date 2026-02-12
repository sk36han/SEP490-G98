using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;

namespace Warehouse.Api.ApiController
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PurchaseOrderController : ControllerBase
    {
        private readonly IPurchaseOrderService _purchaseOrderService;

        public PurchaseOrderController(IPurchaseOrderService purchaseOrderService)
        {
            _purchaseOrderService = purchaseOrderService;
        }

        [HttpGet]
        public async Task<IActionResult> GetPurchaseOrders(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? poCode = null,
            [FromQuery] string? supplierName = null,
            [FromQuery] string? status = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string? requestedByName = null)
        {
            var result = await _purchaseOrderService.GetPurchaseOrdersAsync(
                page,
                pageSize,
                poCode,
                supplierName,
                status,
                fromDate,
                toDate,
                requestedByName
            );

            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetPurchaseOrder(long id)
        {
            var result = await _purchaseOrderService.GetPurchaseOrderByIdAsync(id);

            if (result == null)
            {
                return NotFound(new { message = $"Không tìm thấy đơn hàng với ID = {id}" });
            }

            return Ok(result);
        }
    }
}
