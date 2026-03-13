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
    }
}
