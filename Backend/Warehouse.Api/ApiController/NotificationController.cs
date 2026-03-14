using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.ApiController
{
	[Route("api/[controller]")]
	[ApiController]
	[Authorize]
	public class NotificationController : ControllerBase
	{
		private readonly INotificationService _notificationService;

		public NotificationController(INotificationService notificationService)
		{
			_notificationService = notificationService;
		}

		/// <summary>
		/// Lấy danh sách thông báo của user hiện tại (có filter + phân trang)
		/// GET: /api/notification/my-notification?type=...&severity=...&isRead=...&fromDate=...&toDate=...&pageNumber=1&pageSize=20
		/// </summary>
		[HttpGet("my-notification")]
		public async Task<IActionResult> GetMyNotifications([FromQuery] NotificationFilterRequest filter)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
				if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out long userId))
				{
					return Unauthorized(ApiResponse<object>.ErrorResponse("Không xác định được danh tính người dùng."));
				}

				var result = await _notificationService.GetByUserAsync(userId, filter);
				return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách thông báo thành công."));
			}
			catch (Exception)
			{
				return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
			}
		}

		/// <summary>
		/// Lấy số thông báo chưa đọc
		/// GET: /api/notification/unread-count
		/// </summary>
		[HttpGet("unread-count")]
		public async Task<IActionResult> GetUnreadCount()
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
				if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out long userId))
				{
					return Unauthorized(ApiResponse<object>.ErrorResponse("Không xác định được danh tính người dùng."));
				}

				var count = await _notificationService.GetUnreadCountAsync(userId);
				return Ok(ApiResponse<object>.SuccessResponse(count, "Lấy số thông báo chưa đọc thành công."));
			}
			catch (Exception)
			{
				return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
			}
		}

		/// <summary>
		/// Đánh dấu 1 thông báo đã đọc
		/// PUT: /api/notification/{id}/read
		/// </summary>
		[HttpPut("{id}/read")]
		public async Task<IActionResult> MarkAsRead(long id)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
				if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out long userId))
				{
					return Unauthorized(ApiResponse<object>.ErrorResponse("Không xác định được danh tính người dùng."));
				}

				await _notificationService.MarkAsReadAsync(id, userId);
				return Ok(ApiResponse<object>.SuccessResponse(true, "Đánh dấu đã đọc thành công."));
			}
			catch (KeyNotFoundException ex)
			{
				return NotFound(ApiResponse<object>.ErrorResponse(ex.Message));
			}
			catch (Exception)
			{
				return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
			}
		}

		/// <summary>
		/// Đánh dấu tất cả thông báo đã đọc
		/// PUT: /api/notification/read-all
		/// </summary>
		[HttpPut("read-all")]
		public async Task<IActionResult> MarkAllAsRead()
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
				if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out long userId))
				{
					return Unauthorized(ApiResponse<object>.ErrorResponse("Không xác định được danh tính người dùng."));
				}

				await _notificationService.MarkAllAsReadAsync(userId);
				return Ok(ApiResponse<object>.SuccessResponse(true, "Đánh dấu tất cả đã đọc thành công."));
			}
			catch (Exception)
			{
				return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
			}
		}

	}
}
