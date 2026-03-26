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
    public class PurchaseReturnNoteController : ControllerBase
    {
        private readonly IPurchaseReturnNoteService _purchaseReturnNoteService;

        public PurchaseReturnNoteController(IPurchaseReturnNoteService purchaseReturnNoteService)
        {
            _purchaseReturnNoteService = purchaseReturnNoteService;
        }

        [HttpGet("list")]
        public async Task<IActionResult> GetPurchaseReturnNotes(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var result = await _purchaseReturnNoteService.GetPRNsAsync(page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Da xay ra loi he thong.", detail = ex.Message });
            }
        }

        [HttpGet("detail/{id:long}")]
        public async Task<IActionResult> GetPRNDetail(long id)
        {
            try
            {
                var result = await _purchaseReturnNoteService.GetPRNDetailAsync(id);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Da xay ra loi he thong.", detail = ex.Message });
            }
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreatePRN([FromBody] CreatePRNRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
            {
                return Unauthorized(new { message = "Khong xac dinh duoc nguoi dung." });
            }

            try
            {
                var result = await _purchaseReturnNoteService.CreatePRNAsync(currentUserId, request);
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
                var detail = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "Da xay ra loi he thong.", detail });
            }
        }

        [HttpPost("approve/{id:long}")]
        public async Task<IActionResult> ApprovePRN(long id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
            {
                return Unauthorized(new { message = "Khong xac dinh duoc nguoi dung." });
            }

            try
            {
                var result = await _purchaseReturnNoteService.ApprovePRNAsync(id, currentUserId);
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
                var detail = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "Da xay ra loi he thong.", detail });
            }
        }

        [HttpPost("refund/{id:long}")]
        public async Task<IActionResult> RefundPRN(long id, [FromBody] RefundPRNRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
            {
                return Unauthorized(new { message = "Khong xac dinh duoc nguoi dung." });
            }

            try
            {
                var result = await _purchaseReturnNoteService.RefundPRNAsync(id, currentUserId, request);
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
                var detail = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "Da xay ra loi he thong.", detail });
            }
        }

        [HttpPost("cancel/{id:long}")]
        public async Task<IActionResult> CancelPRN(long id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
            {
                return Unauthorized(new { message = "Khong xac dinh duoc nguoi dung." });
            }

            try
            {
                var result = await _purchaseReturnNoteService.CancelPRNAsync(id, currentUserId);
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
                var detail = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "Da xay ra loi he thong.", detail });
            }
        }
    }
}
