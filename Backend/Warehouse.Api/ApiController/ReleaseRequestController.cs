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
    public class ReleaseRequestController : ControllerBase
    {
        private readonly IReleaseRequestService _releaseRequestService;
        private readonly IDocumentAttachmentService _documentAttachmentService;
        private readonly IAuditLogService _auditLogService;

        public ReleaseRequestController(
            IReleaseRequestService releaseRequestService,
            IDocumentAttachmentService documentAttachmentService,
            IAuditLogService auditLogService)
        {
            _releaseRequestService = releaseRequestService;
            _documentAttachmentService = documentAttachmentService;
            _auditLogService = auditLogService;
        }

        /// <summary>
        /// Tạo yêu cầu xuất kho
        /// </summary>
        [HttpPost("create")]
        [Authorize(Roles = "SP,GD,KT,SE,TK")]
        public async Task<IActionResult> CreateReleaseRequest([FromBody] CreateReleaseRequestRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _releaseRequestService.CreateReleaseRequestAsync(currentUserId, request);
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
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message, innerDetail = ex.InnerException?.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách yêu cầu xuất kho
        /// </summary>
        [HttpGet("list")]
        public async Task<IActionResult> GetReleaseRequests(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var result = await _releaseRequestService.GetReleaseRequestsAsync(page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }

        /// <summary>
        /// Lấy chi tiết yêu cầu xuất kho theo ID
        /// </summary>
        [HttpGet("detail/{id:long}")]
        public async Task<IActionResult> GetReleaseRequestDetail(long id)
        {
            try
            {
                var result = await _releaseRequestService.GetReleaseRequestByIdAsync(id);
                if (result == null)
                    return NotFound(new { message = "Không tìm thấy yêu cầu xuất kho." });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }
        /// <summary>
        /// Cập nhật yêu cầu xuất kho
        /// </summary>
        [HttpPut("update/{id:long}")]
        [Authorize(Roles = "SP,KT,TK,SE")]
        public async Task<IActionResult> UpdateReleaseRequest(long id, [FromBody] UpdateReleaseRequestRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _releaseRequestService.UpdateReleaseRequestAsync(id, currentUserId, request);
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

        /// <summary>
        /// Đóng yêu cầu xuất kho (giải phóng tồn kho đã giữ)
        /// </summary>
        [HttpPut("close/{id:long}")]
        [Authorize(Roles = "KT,SP,SE")]
        public async Task<IActionResult> CloseReleaseRequest(long id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var success = await _releaseRequestService.CloseReleaseRequestAsync(id, currentUserId);
                if (!success)
                    return NotFound(new { message = "Không tìm thấy yêu cầu xuất kho." });

                return Ok(new { message = "Đóng yêu cầu xuất kho thành công." });
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

        /// <summary>
        /// Duyệt/Từ chối yêu cầu xuất kho (giai đoạn: Kế toán )
        /// </summary>
        [HttpPut("approve/{id:long}")]
        [Authorize(Roles = "KT")]
        public async Task<IActionResult> ApproveReleaseRequest(long id, [FromBody] ApproveReleaseRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var result = await _releaseRequestService.ApproveReleaseRequestAsync(id, currentUserId, request);
                var msg = request.IsApproved ? "Duyệt yêu cầu xuất kho thành công." : "Đã từ chối yêu cầu xuất kho.";
                return Ok(new { message = msg, data = result });
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

        /// <summary>
        /// Hủy yêu cầu xuất kho (giải phóng tồn kho đã giữ)
        /// </summary>
        [HttpPut("cancel/{id:long}")]
        [Authorize(Roles = "SP,KT,SE")]
        public async Task<IActionResult> CancelReleaseRequest(long id)
        {
            try
            {
                var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                long currentUserId = (currentUserIdClaim != null && long.TryParse(currentUserIdClaim.Value, out var idVal)) ? idVal : 0;

                var success = await _releaseRequestService.CancelReleaseRequestAsync(id, currentUserId);
                if (!success)
                    return NotFound(new { message = "Không tìm thấy yêu cầu xuất kho." });

                return Ok(new { message = "Hủy yêu cầu xuất kho thành công." });
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
        [Authorize(Roles = "SP,KT,TK,SE")]
        public async Task<IActionResult> UploadReleaseRequestAttachments(
            long id,
            IFormFile? quotationFile,
            IFormFile? contractFile,
            IFormFile? appendixFile)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            try
            {
                var rr = await _releaseRequestService.GetReleaseRequestByIdAsync(id);
                if (rr == null) return NotFound(new { message = "Không tìm thấy yêu cầu xuất kho." });

                // Kiểm tra nếu đơn ở trạng thái không cho phép upload
                var allowedStatuses = new[] { "DRAFT", "PENDING_ACC" };
                if (!allowedStatuses.Contains(rr.Status))
                    return BadRequest(new { message = "Chỉ có thể đính kèm tài liệu cho yêu cầu xuất kho đang ở trạng thái nháp hoặc chờ duyệt." });

                // Kiểm tra nếu trạng thái là PENDING_ACC thì bắt buộc phải có đủ file (trừ khi đã có từ trước)
                if (rr.Status == "PENDING_ACC")
                {
                    var existingAttachments = rr.Attachments?.Select(a => a.AttachmentType).ToList() ?? new List<string>();
                    
                    bool hasQuotation = existingAttachments.Contains("QUOTATION") || quotationFile != null;
                    // DB CK_DAtt_AttType: không có 'CONTRACT'; GIR/RR dùng 'CO' cho hợp đồng chính (tương thích bản ghi cũ 'CONTRACT' nếu có).
                    bool hasContract =
                        existingAttachments.Contains("CO")
                        || existingAttachments.Contains("CONTRACT")
                        || contractFile != null;

                    if (!hasQuotation || !hasContract)
                    {
                        return BadRequest(new { message = "Vui lòng cung cấp đầy đủ Báo giá và Hợp đồng khi gửi duyệt." });
                    }
                }

                if (quotationFile != null)
                {
                    await _documentAttachmentService.UploadAttachmentAsync("GIR", id, quotationFile, currentUserId, "QUOTATION");
                }

                if (contractFile != null)
                {
                    await _documentAttachmentService.UploadAttachmentAsync("GIR", id, contractFile, currentUserId, "CO");
                }

                if (appendixFile != null)
                {
                    await _documentAttachmentService.UploadAttachmentAsync("GIR", id, appendixFile, currentUserId, "CONTRACT_APPENDIX");
                }

                return Ok(new { message = "Tải lên tài liệu thành công." });
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
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống khi tải tệp.", detail });
            }
        }

        [HttpGet("{id:long}/quotation/export-excel")]
        [Authorize(Roles = "SP,KT,TK,SE")]
        public async Task<IActionResult> ExportQuotationExcel(long id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            var bytes = await _releaseRequestService.ExportQuotationExcelAsync(id, currentUserId);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"RR-{id}-quotation.xlsx");
        }

        [HttpPost("{id:long}/quotation/send-email")]
        [Authorize(Roles = "SP,KT,TK,SE")]
        public async Task<IActionResult> SendQuotationEmail(long id, [FromBody] SendRrQuotationEmailRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            await _releaseRequestService.SendQuotationEmailAsync(id, currentUserId, request);
            return Ok(new { message = "Gửi email báo giá thành công." });
        }

        [HttpPost("{id:long}/quotation/import-excel")]
        [Authorize(Roles = "SP,KT,TK,SE")]
        public async Task<IActionResult> ImportQuotationExcel(long id, IFormFile file)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            var data = await _releaseRequestService.ImportQuotationExcelAsync(id, currentUserId, file);
            return Ok(data);
        }

        [HttpPost("{id:long}/quotation/confirm")]
        [Authorize(Roles = "SP,KT,TK,SE")]
        public async Task<IActionResult> ConfirmQuotation(long id, [FromBody] ConfirmRrQuotationRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            var data = await _releaseRequestService.ConfirmQuotationAsync(id, currentUserId, request);
            return Ok(data);
        }


    }
}
