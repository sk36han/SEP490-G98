using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.Api.ApiController
{
	[Route("api/admin/users")]
	[ApiController]
	public class AdminController : ControllerBase
	{
		private readonly IAdminService _adminService;

		public AdminController(IAdminService adminservice)
		{
            _adminService = adminservice;
		}

		/// <summary>
		/// Lấy danh sách user (có filter, paging, search)
		/// GET: /api/users
		/// </summary>
		[HttpGet]
		public async Task<IActionResult> GetUsers([FromQuery] UserFilterRequest filter)
		{
			try
			{
				var result = await _adminService.GetUserListAsync(filter);
				return Ok(result);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
			}
		}

		/// <summary>
		/// Tạo tài khoản user
		/// POST: /api/users
		/// </summary>
		[HttpPost]
		public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
		{
			try
			{
				if (!ModelState.IsValid)
					return BadRequest(ModelState);

				var result = await _adminService.CreateUserAccountAsync(request);

				return Created("", new
				{
					message = "Tạo tài khoản thành công.",
					data = result
				});
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
		/// Update thông tin user
		/// PUT: /api/users/{id}
		/// </summary>
		[HttpPut("{id}")]
		public async Task<IActionResult> UpdateUser(long id, [FromBody] UpdateUserRequest request)
		{
			try
			{
				if (!ModelState.IsValid)
					return BadRequest(ModelState);

				var result = await _adminService.UpdateUserAsync(id, request);

				return Ok(new
				{
					message = "Cập nhật thông tin người dùng thành công.",
					data = result
				});
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
		/// Enable/Disable user
		/// PATCH: /api/users/{id}/status
		/// </summary>
		[HttpPatch("{id}/status")]
		public async Task<IActionResult> ToggleUserStatus(long id)
		{
			try
			{
				var result = await _adminService.ToggleUserStatusAsync(id);

				return Ok(new
				{
					message = $"Đã chuyển trạng thái tài khoản thành {(result.IsActive ? "Enable" : "Disable")}.",
					data = result
				});
			}
			catch (KeyNotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
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
