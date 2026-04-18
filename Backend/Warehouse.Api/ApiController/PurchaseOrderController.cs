using System;
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
    public class PurchaseOrderController : ControllerBase
    {
        private readonly IPurchaseOrderService _purchaseOrderService;
        private readonly IDocumentAttachmentService _documentAttachmentService;

        public PurchaseOrderController(
            IPurchaseOrderService purchaseOrderService,
            IDocumentAttachmentService documentAttachmentService)
        {
            _purchaseOrderService = purchaseOrderService;
            _documentAttachmentService = documentAttachmentService;
        }

        [HttpGet("list")]
        [Authorize]
        public async Task<IActionResult> GetPurchaseOrders(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var result = await _purchaseOrderService.GetPurchaseOrdersAsync(page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }

        [HttpGet("detail/{id:long}")]
        [Authorize]
        public async Task<IActionResult> GetPurchaseOrderDetail(long id)
        {
            try
            {
                var result = await _purchaseOrderService.GetPurchaseOrderByIdAsync(id);
                if (result == null)
                {
                    return NotFound(new { message = "Không tìm thấy đơn mua hàng." });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }

        [HttpPost("create")]
        [Authorize(Roles = "SP,KT,GD")]
        public async Task<IActionResult> CreatePurchaseOrder([FromBody] CreatePurchaseOrderRequest request)
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
                var result = await _purchaseOrderService.CreatePurchaseOrderAsync(currentUserId, request);
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
        }

        [HttpPut("update/{id:long}")]
        [Authorize(Roles = "SP,KT,GD")]
        public async Task<IActionResult> UpdatePurchaseOrder(long id, [FromBody] UpdatePurchaseOrderRequest request)
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
                var result = await _purchaseOrderService.UpdatePurchaseOrderAsync(id, currentUserId, request);
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

        [HttpPost("{id:long}/attachments")]
        [Authorize(Roles = "SP,KT,GD")]
        public async Task<IActionResult> UploadPurchaseOrderAttachments(
            long id,
            IFormFile? quotationFile,
            IFormFile? contractAppendixFile)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
            {
                return Unauthorized(new { message = "Không xác định được người dùng." });
            }

            var po = await _purchaseOrderService.GetPurchaseOrderByIdAsync(id);
            if (po == null)
            {
                return NotFound(new { message = "Không tìm thấy đơn mua hàng." });
            }

            if (quotationFile == null && contractAppendixFile == null)
            {
                return BadRequest(new { message = "Vui lòng chọn ít nhất 1 tệp để tải lên." });
            }

            // Nếu PO đã được gửi duyệt thì bắt buộc phải có đủ cả file báo giá và phụ lục hợp đồng.
            if (string.Equals(po.Status, "PENDING_ACC", StringComparison.OrdinalIgnoreCase)
                && (quotationFile == null || contractAppendixFile == null))
            {
                return BadRequest(new { message = "Đơn gửi duyệt bắt buộc phải có đủ File báo giá và Hợp đồng nguyên tắc." });
            }

            try
            {
                string? quotationFileUrl = null;
                string? contractAppendixFileUrl = null;

                if (quotationFile != null)
                {
                    quotationFileUrl = await _documentAttachmentService.UploadAttachmentAsync(
                        "PR",
                        id,
                        quotationFile,
                        currentUserId,
                        "QUOTATION");
                }

                if (contractAppendixFile != null)
                {
                    contractAppendixFileUrl = await _documentAttachmentService.UploadAttachmentAsync(
                        "PR",
                        id,
                        contractAppendixFile,
                        currentUserId,
                        "CONTRACT_APPENDIX");
                }

                return Ok(new
                {
                    message = "Tải tệp đính kèm thành công.",
                    quotationFileUrl,
                    contractAppendixFileUrl
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Không thể tải tệp đính kèm cho đơn mua hàng." });
            }
        }
    }
}
