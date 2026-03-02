using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.ApiController
{
	[Route("api/audit-log")]
	[ApiController]
	//[Authorize(Roles = "ADMIN")]
	public class AuditLogController : ControllerBase
	{
		private readonly IAuditLogService _auditLogService;

		public AuditLogController(IAuditLogService auditLogService)
		{
			_auditLogService = auditLogService;
		}

		/// <summary>
		/// Lấy danh sách audit log (có filter + phân trang)
		/// GET: /api/audit-log?action=...&entityType=...&actorUserId=...&fromDate=...&toDate=...&keyword=...&pageNumber=1&pageSize=20
		/// </summary>
		[HttpGet]
		public async Task<IActionResult> GetAuditLogs([FromQuery] AuditLogFilterRequest filter)
		{
			try
			{
				var result = await _auditLogService.GetAuditLogsAsync(filter);
				return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách audit log thành công."));
			}
			catch (Exception)
			{
				return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
			}
		}

		/// <summary>
		/// Lấy chi tiết 1 audit log
		/// GET: /api/audit-log/{id}
		/// </summary>
		[HttpGet("{id}")]
		public async Task<IActionResult> GetAuditLogById(long id)
		{
			try
			{
				var result = await _auditLogService.GetByIdAsync(id);
				if (result == null)
				{
					return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy audit log."));
				}

				return Ok(ApiResponse<AuditLogResponse>.SuccessResponse(result, "Lấy chi tiết audit log thành công."));
			}
			catch (Exception)
			{
				return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
			}
		}
	}
}
