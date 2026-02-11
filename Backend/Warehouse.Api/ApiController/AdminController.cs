using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.Api.ApiController
{
	[Route("api/[controller]")]
	[ApiController]
	public class AdminController : ControllerBase
	{
		private readonly IUserService _userService;

		public AdminController(IUserService userService)
		{
			_userService = userService;
		}

		[HttpGet("UserAccountlist")]
		public async Task<IActionResult> GetList([FromQuery] UserFilterRequest filter)
		{
			try
			{
				var result = await _userService.GetUserListAsync(filter);
				return Ok(result);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
			}
		}

		/// <summary>
		/// Tạo tài khoản người dùng mới bằng email và mật khẩu ngẫu nhiên.
		/// </summary>
		[HttpPost("createUserAccount")]
		public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
		{
			try
			{
				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var result = await _userService.CreateUserAccountAsync(request);
				return Ok(new
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
		/// Cập nhật thông tin người dùng.
		/// </summary>
		[HttpPut("updateAccount/{id}")]
		public async Task<IActionResult> UpdateUser(long id, [FromBody] UpdateUserRequest request)
		{
			try
			{
				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var result = await _userService.UpdateUserAsync(id, request);
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
		/// Enable hoặc Disable tài khoản người dùng.
		/// </summary>
		[HttpPut("toggle-status/{id}")]
		public async Task<IActionResult> ToggleUserStatus(long id)
		{
			try
			{
				var result = await _userService.ToggleUserStatusAsync(id);
				string status = result.IsActive ? "Enable" : "Disable";
				return Ok(new
				{
					message = $"Đã chuyển trạng thái tài khoản thành {status}.",
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
	}
}
