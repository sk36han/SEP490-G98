using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;

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

        [HttpPost]
        public async Task<IActionResult> CreatePurchaseOrder([FromBody] CreatePurchaseOrderRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Lấy UserId từ JWT Claims
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null)
                {
                    return Unauthorized(new { message = "Không tìm thấy thông tin người dùng trong token." });
                }

                if (!long.TryParse(userIdClaim.Value, out long userId))
                {
                    return BadRequest(new { message = "ID người dùng không hợp lệ." });
                }

                var result = await _purchaseOrderService.CreatePurchaseOrderAsync(userId, request);
                return CreatedAtAction(nameof(GetPurchaseOrder), new { id = result.PurchaseOrderId }, result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi khi tạo đơn hàng.", error = ex.Message });
            }
        }
    }
}
