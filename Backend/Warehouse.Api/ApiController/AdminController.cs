using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.ApiController
{
	[Route("api/admin/users")]
	[ApiController]
	[Authorize(Roles = "ADMIN")]
	public class AdminController : ControllerBase
	{
		private readonly IAdminService _adminService;

		public AdminController(IAdminService adminservice)
		{
            _adminService = adminservice;
		}

		/// <summary>
		/// Lấy danh sách user (có filter, paging, search)
		/// GET: /api/admin/users
		/// </summary>
		[HttpGet("get-users")]
		public async Task<IActionResult> GetUsers([FromQuery] UserFilterRequest filter)
		{
			try
			{
				var result = await _adminService.GetUserListAsync(filter);
				return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách người dùng thành công."));
			}
			catch (Exception ex)
			{
				return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
			}
		}

		/// <summary>
		/// Tạo tài khoản user
		/// POST: /api/admin/users
		/// </summary>
		[HttpPost("create-user")]
		public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
		{
			try
			{
				if (!ModelState.IsValid)
					return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu không hợp lệ."));

                // Lấy ID người tạo từ token (claim "id" hoặc ClaimTypes.NameIdentifier)
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
				if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out long assignedBy))
				{
					return Unauthorized(ApiResponse<object>.ErrorResponse("Không xác định được danh tính người dùng."));
				}

				var result = await _adminService.CreateUserAccountAsync(request, assignedBy);

				return Created("", ApiResponse<CreateUserResponse>.SuccessResponse(result, "Tạo tài khoản thành công."));
			}
			catch (InvalidOperationException ex)
			{
				return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
			}
			catch (Exception)
			{
				return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
			}
		}

		/// <summary>
		/// Update thông tin user
		/// PUT: /api/admin/users/{id}
		/// </summary>
		[HttpPut("update-user/{id}")]
		public async Task<IActionResult> UpdateUser(long id, [FromBody] UpdateUserRequest request)
		{
			try
			{
				if (!ModelState.IsValid)
					return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu không hợp lệ."));

                // Lấy ID người tạo từ token (claim "id" hoặc ClaimTypes.NameIdentifier)
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
				if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out long assignedBy))
				{
					return Unauthorized(ApiResponse<object>.ErrorResponse("Không xác định được danh tính người dùng."));
				}

				var result = await _adminService.UpdateUserAsync(id, request, assignedBy);

				return Ok(ApiResponse<AdminUserResponse>.SuccessResponse(result, "Cập nhật thông tin người dùng thành công."));
			}
			catch (KeyNotFoundException ex)
			{
				return NotFound(ApiResponse<object>.ErrorResponse(ex.Message));
			}
			catch (InvalidOperationException ex)
			{
				return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
			}
			catch (Exception ex)
			{
				return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
			}
		}

		/// <summary>
		/// Enable/Disable user
		/// PATCH: /api/admin/users/{id}/status
		/// </summary>
		[HttpPatch("toggle-status/{id}")]
		public async Task<IActionResult> ToggleUserStatus(long id)
		{
			try
			{
				var result = await _adminService.ToggleUserStatusAsync(id);

				return Ok(ApiResponse<AdminUserResponse>.SuccessResponse(result,
					$"Đã chuyển trạng thái tài khoản thành {(result.IsActive ? "Enable" : "Disable")}."));
			}
			catch (KeyNotFoundException ex)
			{
				return NotFound(ApiResponse<object>.ErrorResponse(ex.Message));
			}
			catch (Exception ex)
			{
				return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
			}
		}

		[HttpGet("export-excel")]
		public async Task<IActionResult> ExportUsersExcel()
		{
			try
			{
				var (content, fileName) = await _adminService.ExportUserListExcelAsync();
				return File(
					content,
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					fileName
				);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
			}
		}
	}
}
