using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

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
		[HttpGet]
		public async Task<IActionResult> GetAllRoles()
		{
			try
			{
				var result = await _roleService.GetAllRolesAsync();
				return Ok(ApiResponse<List<RoleResponse>>.SuccessResponse(result, "Lấy danh sách role thành công."));
			}
			catch (Exception ex)
			{
				return StatusCode(500, ApiResponse<object>.ErrorResponse("Đã xảy ra lỗi hệ thống."));
			}
		}

		/// <summary>
		/// Tạo role mới.
		/// </summary>
		[HttpPost]
		public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request)
		{
			try
			{
				if (!ModelState.IsValid)
				{
					return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu không hợp lệ."));
				}

				var result = await _roleService.CreateRoleAsync(request);
				return Ok(ApiResponse<RoleResponse>.SuccessResponse(result, "Tạo role thành công."));
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
		/// Cập nhật thông tin role.
		/// </summary>
		[HttpPut("{id}")]
		public async Task<IActionResult> UpdateRole(long id, [FromBody] UpdateRoleRequest request)
		{
			try
			{
				if (!ModelState.IsValid)
				{
					return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu không hợp lệ."));
				}

				var result = await _roleService.UpdateRoleAsync(id, request);
				return Ok(ApiResponse<RoleResponse>.SuccessResponse(result, "Cập nhật role thành công."));
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
		/// Gán role cho user.
		/// </summary>
		[HttpPost("assign")]
		public async Task<IActionResult> AssignRoleToUser([FromBody] AssignRoleRequest request)
		{
			try
			{
				if (!ModelState.IsValid)
				{
					return BadRequest(ApiResponse<object>.ErrorResponse("Dữ liệu không hợp lệ."));
				}

				var result = await _roleService.AssignRoleToUserAsync(request);
				return Ok(ApiResponse<AdminUserResponse>.SuccessResponse(result, "Gán role cho người dùng thành công."));
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
	}
}
