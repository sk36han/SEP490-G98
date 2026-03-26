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
    [Authorize] // Bảo mật route này, có thể điều chỉnh theo role nếu cần
    public class TransportInfoController : ControllerBase
    {
        private readonly ITransportInfoService _transportInfoService;

        public TransportInfoController(ITransportInfoService transportInfoService)
        {
            _transportInfoService = transportInfoService;
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

        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] FilterTransportInfoRequest request)
        {
            var result = await _transportInfoService.GetTransportInfosAsync(request);
            return Ok(ApiResponse<PagedResponse<TransportInfoResponse>>.SuccessResponse(result));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(long id)
        {
            var result = await _transportInfoService.GetTransportInfoByIdAsync(id);
            return Ok(ApiResponse<TransportInfoResponse>.SuccessResponse(result));
        }

        [HttpGet("gdn/{gdnId}")]
        public async Task<IActionResult> GetByGdnId(long gdnId)
        {
            var result = await _transportInfoService.GetTransportInfoByGdnIdAsync(gdnId);
            return Ok(ApiResponse<TransportInfoResponse>.SuccessResponse(result));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTransportInfoRequest request)
        {
            var userId = GetCurrentUserId();
            var result = await _transportInfoService.CreateTransportInfoAsync(request, userId);
            return Ok(ApiResponse<TransportInfoResponse>.SuccessResponse(result, "Tạo thông tin vận chuyển thành công."));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateTransportInfoRequest request)
        {
            var userId = GetCurrentUserId();
            var result = await _transportInfoService.UpdateTransportInfoAsync(id, request, userId);
            return Ok(ApiResponse<TransportInfoResponse>.SuccessResponse(result, "Cập nhật thông vị trí/vận chuyển thành công."));
        }

        [HttpPatch("{id}/active")]
        public async Task<IActionResult> ChangeActive(long id, [FromBody] ChangeTransportActiveRequest request)
        {
            var userId = GetCurrentUserId();
            var result = await _transportInfoService.UpdateTransportActiveStatusAsync(id, request.IsActive, userId);
            return Ok(ApiResponse<TransportInfoResponse>.SuccessResponse(result, "Thay đổi trạng thái hoạt động thành công."));
        }
    }
}
