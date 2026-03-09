using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;
using Warehouse.DataAcces.Service;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.Api.ApiController
{
    [Route("api/[controller]")]
    [ApiController]
    public class ApprovalsController : ControllerBase
    {
        private readonly IApprovalService _approvalService;

        public ApprovalsController(IApprovalService approvalService)
        {
            _approvalService = approvalService;
        }

        [HttpGet("list-approval")]
        public async Task<IActionResult> GetPendingApprovals([FromQuery] ApprovalQueueFilterRequest filter)
        {
            // Optional: Authorize only Admin/Manager
            var result = await _approvalService.GetPendingApprovalsAsync(filter);
            return Ok(new
            {
                Success = true,
                Message = "Pending approvals retrieved successfully",
                Data = result
            });
        }

        [HttpPost("{requestType}/{id}/approve")]
        public async Task<IActionResult> ApproveRequest(string requestType, long id, [FromBody] ApprovalDecisionRequest request)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!long.TryParse(userIdStr, out long currentUserId))
            {
                return Unauthorized();
            }

            var success = await _approvalService.ApproveRequestAsync(requestType, id, currentUserId, request.Reason);
            if (!success)
            {
                return NotFound(new { Success = false, Message = "Request not found or not in PENDING status." });
            }

            return Ok(new { Success = true, Message = "Request approved successfully." });
        }

        [HttpPost("{requestType}/{id}/reject")]
        public async Task<IActionResult> RejectRequest(string requestType, long id, [FromBody] ApprovalDecisionRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Reason))
            {
                return BadRequest(new { Success = false, Message = "Reason is required when rejecting a request." });
            }

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!long.TryParse(userIdStr, out long currentUserId))
            {
                return Unauthorized();
            }

            var success = await _approvalService.RejectRequestAsync(requestType, id, currentUserId, request.Reason);
            if (!success)
            {
                return NotFound(new { Success = false, Message = "Request not found or not in PENDING status." });
            }

            return Ok(new { Success = true, Message = "Request rejected successfully." });
        }

        [HttpGet("{requestType}/{id}")]
        public async Task<IActionResult> GetRequestDetail(string requestType, long id)
        {
            var result = await _approvalService.GetRequestDetailAsync(requestType, id);
            if (result == null)
            {
                return NotFound(new { Success = false, Message = "Request not found." });
            }

            return Ok(new
            {
                Success = true,
                Message = "Request detail retrieved successfully",
                Data = result
            });
        }
    }
}
