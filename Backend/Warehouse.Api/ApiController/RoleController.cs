using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.Api.ApiController
{
	[Route("api/[controller]")]
	[ApiController]
	public class RoleController : ControllerBase
	{
		private readonly IRoleService _roleService;

		public RoleController(IRoleService roleService)
		{
			_roleService = roleService;
		}

		/// <summary>
		/// Lấy danh sách tất cả các role.
		/// </summary>
		[HttpGet("list")]
		public async Task<IActionResult> GetAllRoles()
		{
			try
			{
				var result = await _roleService.GetAllRolesAsync();
				return Ok(result);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
			}
		}

		/// <summary>
		/// Tạo role mới.
		/// </summary>
		[HttpPost("create")]
		public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request)
		{
			try
			{
				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var result = await _roleService.CreateRoleAsync(request);
				return Ok(new
				{
					message = "Tạo role thành công.",
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
		/// Cập nhật thông tin role.
		/// </summary>
		[HttpPut("update/{id}")]
		public async Task<IActionResult> UpdateRole(long id, [FromBody] UpdateRoleRequest request)
		{
			try
			{
				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var result = await _roleService.UpdateRoleAsync(id, request);
				return Ok(new
				{
					message = "Cập nhật role thành công.",
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
		/// Gán role cho user.
		/// </summary>
		[HttpPost("assign")]
		public async Task<IActionResult> AssignRoleToUser([FromBody] AssignRoleRequest request)
		{
			try
			{
				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var result = await _roleService.AssignRoleToUserAsync(request);
				return Ok(new
				{
					message = "Gán role cho người dùng thành công.",
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
	}
}
