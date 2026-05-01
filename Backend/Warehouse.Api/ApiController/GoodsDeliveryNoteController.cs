using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.ApiController
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class GoodsDeliveryNoteController : ControllerBase
    {
        private readonly IGoodsDeliveryNoteService _gdnService;

        public GoodsDeliveryNoteController(IGoodsDeliveryNoteService gdnService)
        {
            _gdnService = gdnService;
        }

        private long GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (claim != null && long.TryParse(claim.Value, out var userId))
            {
                return userId;
            }
            throw new UnauthorizedAccessException("Không tìm thấy thông tin người dùng trong token.");
        }

        /// <summary>
        /// Lấy danh sách phiếu xuất kho (phân trang + lọc + tìm kiếm)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] GDNListRequest request)
        {
            var result = await _gdnService.GetGoodsDeliveryNotesAsync(request);
            return Ok(ApiResponse<PagedResponse<GoodsDeliveryNoteResponse>>.SuccessResponse(result));
        }

        /// <summary>
        /// Lấy chi tiết phiếu xuất kho (bao gồm lines + thông tin vận chuyển + lịch sử duyệt)
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetDetail(long id)
        {
            var result = await _gdnService.GetGDNDetailAsync(id);
            return Ok(ApiResponse<GDNDetailResponse>.SuccessResponse(result));
        }

        /// <summary>
        /// Tạo phiếu xuất kho mới (kèm thông tin vận chuyển nếu có)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "SP,SE,KT,TK")]
        public async Task<IActionResult> Create([FromBody] CreateGDNRequest request)
        {
            var userId = GetCurrentUserId();
            var result = await _gdnService.CreateGDNAsync(userId, request);
            return Ok(ApiResponse<GoodsDeliveryNoteResponse>.SuccessResponse(result, "Tạo phiếu xuất kho thành công."));
        }

        /// <summary>
        /// Cập nhật phiếu xuất kho (chỉ khi đang ở trạng thái chờ duyệt)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "SP,SE,KT,TK")]
        public async Task<IActionResult> Update(long id, [FromBody] CreateGDNRequest request)
        {
            var userId = GetCurrentUserId();
            var result = await _gdnService.UpdateGDNAsync(id, userId, request);
            return Ok(ApiResponse<GoodsDeliveryNoteResponse>.SuccessResponse(result, "Cập nhật phiếu xuất kho thành công."));
        }

        /// <summary>
        /// Hủy phiếu xuất kho
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "SP,GD,KT,TK,SE")]
        public async Task<IActionResult> Cancel(long id, [FromQuery] string reason)
        {
            var userId = GetCurrentUserId();
            await _gdnService.CancelGDNAsync(id, userId, reason);
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Đã hủy phiếu xuất kho."));
        }

        /// <summary>
        /// Thủ kho xác nhận xuất hàng thực tế (Trừ tồn kho)
        /// </summary>
        [HttpPut("{id}/issue")]
        [Authorize(Roles = "TK,SE")]
        public async Task<IActionResult> Issue(long id, [FromBody] WarehouseIssueRequest request)
        {
            var userId = GetCurrentUserId();
            var result = await _gdnService.IssueGDNAsync(id, userId, request);
            return Ok(ApiResponse<GoodsDeliveryNoteResponse>.SuccessResponse(result, "Xác nhận xuất hàng thành công."));
        }

        /// <summary>
        /// Kế toán hoặc Thủ kho tải lên bằng chứng và xác nhận hoàn tất giao hàng
        /// </summary>
        [HttpPost("{id}/confirm-delivery")]
        [Authorize(Roles = "KT,TK,SE")]
        public async Task<IActionResult> ConfirmDelivery(long id, IFormFile evidenceFile, [FromForm] string? note)
        {
            var userId = GetCurrentUserId();
            var result = await _gdnService.ConfirmDeliveryAsync(id, userId, evidenceFile, note ?? "");
            return Ok(ApiResponse<GoodsDeliveryNoteResponse>.SuccessResponse(result, "Xác nhận hoàn tất xuất kho thành công."));
        }

        /// <summary>
        /// Xuất PDF phiếu xuất kho (GDN) để in.
        /// </summary>
        [HttpGet("{id}/export-pdf")]
        [Authorize(Roles = "SP,SE,KT,TK,GD")]
        public async Task<IActionResult> ExportPdf(long id)
        {
            var userId = GetCurrentUserId();
            var bytes = await _gdnService.ExportGdnPdfAsync(id, userId);
            return File(bytes, "application/pdf", $"GDN-{id}.pdf");
        }
    }
}
