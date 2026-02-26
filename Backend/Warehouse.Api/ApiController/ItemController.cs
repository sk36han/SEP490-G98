using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.ApiController
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ItemController : ControllerBase
    {
        private readonly IItemService _itemService;

        public ItemController(IItemService itemService)
        {
            _itemService = itemService;
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(long id, [FromQuery] bool isActive)
        {
            try
            {
                var item = await _itemService.UpdateItemStatusAsync(id, isActive);
                return Ok(new
                {
                    success = true,
                    message = $"Đã {(isActive ? "kích hoạt" : "vô hiệu hóa")} sản phẩm thành công",
                    data = new { item.ItemId, item.ItemCode, item.ItemName, item.IsActive }
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }
    }
}
