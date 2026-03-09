using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;

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

        [HttpPost("create-item")]
        public async Task<IActionResult> CreateItem([FromBody] CreateItemRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return ValidationProblem(ModelState);
                }

                var item = await _itemService.CreateItemAsync(request);

                return Ok(new
                {
                    success = true,
                    message = "Tạo sản phẩm thành công",
                    data = new
                    {
                        item.ItemId,
                        item.ItemCode,
                        item.ItemName,
                        item.IsActive
                    }
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }

        [HttpGet("display-all")]
        public async Task<IActionResult> GetAllItemsForDisplay()
        {
            var items = await _itemService.GetAllItemsDisplayAsync();

            return Ok(new
            {
                success = true,
                message = "Lấy danh sách sản phẩm thành công",
                data = items
            });
        }

        [HttpGet("display/{id:long}")]
        public async Task<IActionResult> GetItemForDisplayById(long id)
        {
            var item = await _itemService.GetItemDisplayByIdAsync(id);
            if (item == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy sản phẩm." });
            }

            return Ok(new
            {
                success = true,
                message = "Lấy thông tin sản phẩm thành công",
                data = item
            });
        }

        [HttpGet("detail/{id:long}")]
        public async Task<IActionResult> GetItemDetailById(long id, [FromQuery] int historyPage = 1, [FromQuery] int historyPageSize = 20)
        {
            var item = await _itemService.GetItemDetailByIdAsync(id, historyPage, historyPageSize);
            if (item == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy sản phẩm." });
            }

            return Ok(new
            {
                success = true,
                message = "Lấy chi tiết sản phẩm thành công",
                data = item
            });
        }

        [HttpPut("{id:long}")]
        public async Task<IActionResult> UpdateItem(long id, [FromBody] UpdateItemRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return ValidationProblem(ModelState);
                }

                var item = await _itemService.UpdateItemAsync(id, request);

                return Ok(new
                {
                    success = true,
                    message = "Cập nhật sản phẩm thành công",
                    data = new
                    {
                        item.ItemId,
                        item.ItemCode,
                        item.ItemName,
                        item.IsActive
                    }
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }

        [HttpPatch("{id:long}/status")]
        public async Task<IActionResult> UpdateItemStatus(long id, [FromQuery] bool isActive)
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
