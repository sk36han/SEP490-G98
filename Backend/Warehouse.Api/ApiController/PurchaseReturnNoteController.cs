using System;
using System.Collections.Generic;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
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
        private readonly IDocumentAttachmentService _documentAttachmentService;

        public PurchaseReturnNoteController(
            IPurchaseReturnNoteService purchaseReturnNoteService,
            IDocumentAttachmentService documentAttachmentService)
        {
            _purchaseReturnNoteService = purchaseReturnNoteService;
            _documentAttachmentService = documentAttachmentService;
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

        [HttpPut("update/{id:long}")]
        public async Task<IActionResult> UpdatePRN(long id, [FromBody] UpdatePRNRequest request)
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
                var result = await _purchaseReturnNoteService.UpdatePRNAsync(id, currentUserId, request);
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

        [HttpPost("{id:long}/attachments")]
        [Authorize(Roles = "KT,TK,SE")]
        public async Task<IActionResult> UploadPRNAttachments(long id, List<IFormFile> evidenceFiles)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
            {
                return Unauthorized(new { message = "Khong xac dinh duoc nguoi dung." });
            }

            if (evidenceFiles == null || evidenceFiles.Count == 0)
            {
                return BadRequest(new { message = "Vui long chon it nhat 1 tep dinh kem." });
            }

            try
            {
                // Ensure PRN exists before uploading files
                _ = await _purchaseReturnNoteService.GetPRNDetailAsync(id);

                var uploaded = new List<object>();
                foreach (var file in evidenceFiles)
                {
                    var fileUrl = await _documentAttachmentService.UploadAttachmentAsync(
                        docType: "PRN",
                        docId: id,
                        file: file,
                        userId: currentUserId,
                        attachmentType: "EVIDENCE");

                    uploaded.Add(new
                    {
                        fileName = file.FileName,
                        fileUrl
                    });
                }

                return Ok(new { message = "Tai tep dinh kem PRN thanh cong.", files = uploaded });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                var detail = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "Da xay ra loi he thong khi tai tep dinh kem.", detail });
            }
        }
    }
}
