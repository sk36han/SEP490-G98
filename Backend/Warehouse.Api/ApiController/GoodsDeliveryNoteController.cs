using Microsoft.AspNetCore.Authorization;
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
        /// Lấy danh sách phiếu xuất kho (phân trang)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var result = await _gdnService.GetGoodsDeliveryNotesAsync(page, pageSize);
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
        public async Task<IActionResult> Create([FromBody] CreateGDNRequest request)
        {
            var userId = GetCurrentUserId();
            var result = await _gdnService.CreateGDNAsync(userId, request);
            return Ok(ApiResponse<GoodsDeliveryNoteResponse>.SuccessResponse(result, "Tạo phiếu xuất kho thành công."));
        }

        /// <summary>
        /// Duyệt/Từ chối phiếu xuất kho (2 giai đoạn: Kế toán → Giám đốc)
        /// </summary>
        [HttpPut("{id}/approve")]
        public async Task<IActionResult> Approve(long id, [FromBody] ApproveGDNRequest request)
        {
            var userId = GetCurrentUserId();
            var result = await _gdnService.ApproveGDNAsync(id, userId, request);
            var msg = request.IsApproved ? "Duyệt phiếu xuất kho thành công." : "Đã từ chối phiếu xuất kho.";
            return Ok(ApiResponse<GoodsDeliveryNoteResponse>.SuccessResponse(result, msg));
        }
    }
}
