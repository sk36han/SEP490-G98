using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.Api.ApiController
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class GoodsReceiptNoteController : ControllerBase
    {
        private readonly IGoodsReceiptNoteService _goodsReceiptNoteService;

        public GoodsReceiptNoteController(IGoodsReceiptNoteService goodsReceiptNoteService)
        {
            _goodsReceiptNoteService = goodsReceiptNoteService;
        }

        [HttpGet("list")]
        public async Task<IActionResult> GetGoodsReceiptNotes(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var result = await _goodsReceiptNoteService.GetGoodsReceiptNotesAsync(page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateGRN([FromBody] CreateGRNRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
            {
                return Unauthorized(new { message = "Không xác định được người dùng." });
            }

            try
            {
                var result = await _goodsReceiptNoteService.CreateGRNAsync(currentUserId, request);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }

        [HttpPost("approve/{id:long}")]
        public async Task<IActionResult> ApproveGRN(long id, [FromBody] ApproveGRNRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
            {
                return Unauthorized(new { message = "Không xác định được người dùng." });
            }

            try
            {
                var result = await _goodsReceiptNoteService.ApproveGRNAsync(id, currentUserId, request);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }

        [HttpGet("detail/{id:long}")]
        public async Task<IActionResult> GetGRNDetail(long id)
        {
            try
            {
                var result = await _goodsReceiptNoteService.GetGRNDetailAsync(id);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }

        [HttpPost("ai-match-items")]
        public async Task<IActionResult> MatchItemsFromExcel(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Vui lòng upload file Excel." });
            }

            var extension = System.IO.Path.GetExtension(file.FileName).ToLower();
            if (extension != ".xlsx" && extension != ".xls")
            {
                return BadRequest(new { message = "Chỉ chấp nhận file định dạng Excel (.xlsx, .xls)." });
            }

            try
            {
                using var stream = file.OpenReadStream();
                var result = await _goodsReceiptNoteService.ImportAndMatchItemsAsync(stream);
                return Ok(new
                {
                    success = true,
                    message = "So khớp sản phẩm bằng AI hoàn tất.",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi khi xử lý file bằng AI.", detail = ex.Message });
            }
        }
    }
}
