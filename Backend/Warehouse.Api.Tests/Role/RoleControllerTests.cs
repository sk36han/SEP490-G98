extern alias api;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using api::Warehouse.Api.ApiController;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Xunit;

namespace WarehouseTests.Role
{
	public class RoleControllerTests
	{
		private readonly Mock<IRoleService> _roleServiceMock = new();

		/// <summary>
		/// Helper: Tao RoleController voi ClaimsPrincipal co NameIdentifier claim
		/// Dung de gia lap user da dang nhap voi userId cu the
		/// </summary>
		private RoleController CreateControllerWithUser(long userId = 1)
		{
			var controller = new RoleController(_roleServiceMock.Object);

			var claims = new List<Claim>
			{
				new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
				new Claim(ClaimTypes.Role, "ADMIN")
			};
			var identity = new ClaimsIdentity(claims, "TestAuth");
			var claimsPrincipal = new ClaimsPrincipal(identity);

			controller.ControllerContext = new ControllerContext
			{
				HttpContext = new DefaultHttpContext { User = claimsPrincipal }
			};

			return controller;
		}

		/// <summary>
		/// Helper: Tao RoleController KHONG co claim (user chua xac thuc)
		/// </summary>
		private RoleController CreateControllerWithoutUser()
		{
			var controller = new RoleController(_roleServiceMock.Object);

			controller.ControllerContext = new ControllerContext
			{
				HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal() }
			};

			return controller;

		}
		public class MockDbException : System.Data.Common.DbException
		{
			public MockDbException(string message) : base(message) { }
		}
		// =========================================================
		// 1/ GetAllRoles — 6 test cases
		// =========================================================

		#region UTCID 01: GetAllRoles — Normal — Thanh cong (co data)
		[Fact]
		public async Task GetAllRoles_UTCID01_ReturnsOk_WhenSuccessful()
		{
			var controller = CreateControllerWithUser();
			var roles = new List<RoleResponse>
	{
		new RoleResponse { RoleId = 1, RoleCode = "ADMIN", RoleName = "Quan tri vien" },
		new RoleResponse { RoleId = 2, RoleCode = "STAFF", RoleName = "Nhan vien" }
	};

			_roleServiceMock
				.Setup(x => x.GetAllRolesAsync())
				.ReturnsAsync(roles);

			var result = await controller.GetAllRoles();

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var apiResponse = ok.Value.Should().BeOfType<ApiResponse<List<RoleResponse>>>().Subject;

			apiResponse.Success.Should().BeTrue();
			apiResponse.Message.Should().Contain("Lay danh sach");
			apiResponse.Data.Should().HaveCount(2);
		}
		#endregion

		#region UTCID 02: GetAllRoles — Normal — Danh sach rong
		[Fact]
		public async Task GetAllRoles_UTCID02_ReturnsOk_WhenEmptyList()
		{
			var controller = CreateControllerWithUser();
			var roles = new List<RoleResponse>();

			_roleServiceMock
				.Setup(x => x.GetAllRolesAsync())
				.ReturnsAsync(roles);

			var result = await controller.GetAllRoles();

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var apiResponse = ok.Value.Should().BeOfType<ApiResponse<List<RoleResponse>>>().Subject;

			apiResponse.Success.Should().BeTrue();
			apiResponse.Data.Should().BeEmpty();
		}
		#endregion

		#region UTCID 03: GetAllRoles — Abnormal — Loi SqlException (Database error)
		[Fact]
		public async Task GetAllRoles_UTCID03_Returns500_WhenSqlException()
		{
			var controller = CreateControllerWithUser();
			_roleServiceMock.Setup(x => x.GetAllRolesAsync()).ThrowsAsync(new MockDbException("Loi ket noi SQL"));

			var result = await controller.GetAllRoles();

			var statusCode = result.Should().BeOfType<ObjectResult>().Subject;
			statusCode.StatusCode.Should().Be(500);
			((ApiResponse<object>)statusCode.Value!).Message.Should().Contain("Da xay ra loi");
		}
		#endregion

		#region UTCID 04: GetAllRoles — Abnormal — NullReferenceException (DbContext is null)
		[Fact]
		public async Task GetAllRoles_UTCID04_Returns500_WhenNullReference()
		{
			var controller = CreateControllerWithUser();

			_roleServiceMock
				.Setup(x => x.GetAllRolesAsync())
				.ThrowsAsync(new NullReferenceException());

			var result = await controller.GetAllRoles();

			var statusCode = result.Should().BeOfType<ObjectResult>().Subject;
			statusCode.StatusCode.Should().Be(500);
		}
		#endregion

		#region UTCID 05: GetAllRoles — Abnormal — InvalidOperationException
		[Fact]
		public async Task GetAllRoles_UTCID05_Returns500_WhenInvalidOperation()
		{
			var controller = CreateControllerWithUser();

			_roleServiceMock
				.Setup(x => x.GetAllRolesAsync())
				.ThrowsAsync(new InvalidOperationException());

			var result = await controller.GetAllRoles();

			var statusCode = result.Should().BeOfType<ObjectResult>().Subject;
			statusCode.StatusCode.Should().Be(500);
		}
		#endregion

		#region UTCID 06: GetAllRoles — Abnormal — Exception (General error)
		[Fact]
		public async Task GetAllRoles_UTCID06_Returns500_WhenGeneralException()
		{
			var controller = CreateControllerWithUser();

			_roleServiceMock
				.Setup(x => x.GetAllRolesAsync())
				.ThrowsAsync(new Exception("Unknown error"));

			var result = await controller.GetAllRoles();

			var statusCode = result.Should().BeOfType<ObjectResult>().Subject;
			statusCode.StatusCode.Should().Be(500);
		}
		#endregion

		// =========================================================
		// 2/ CreateRole — 8 test cases
		// =========================================================

		#region UTCID 01: CreateRole — Normal — Thanh cong
		[Fact]
		public async Task CreateRole_UTCID01_ReturnsOk_WhenSuccessful()
		{
			var controller = CreateControllerWithUser();
			var request = new CreateRoleRequest { RoleCode = "NVVS", RoleName = "Nhan vien ve sinh" };
			var expected = new RoleResponse { RoleId = 1, RoleCode = "NVVS", RoleName = "Nhan vien ve sinh" };

			_roleServiceMock.Setup(x => x.CreateRoleAsync(request, It.IsAny<long>())).ReturnsAsync(expected);

			var result = await controller.CreateRole(request);

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<RoleResponse>>().Subject;

			response.Success.Should().BeTrue();
			response.Message.Should().Contain("Tao role");
			response.Data!.RoleCode.Should().Be("NVVS");
		}
		#endregion

		#region UTCID 02: CreateRole — Abnormal — Ma role da ton tai
		[Fact]
		public async Task CreateRole_UTCID02_ReturnsBadRequest_WhenRoleCodeExists()
		{
			var controller = CreateControllerWithUser();
			var request = new CreateRoleRequest { RoleCode = "SALE", RoleName = "Admin" };

			_roleServiceMock.Setup(x => x.CreateRoleAsync(request))
							.ThrowsAsync(new InvalidOperationException("Ma role da ton tai."));

			var result = await controller.CreateRole(request);

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var response = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			response.Message.Should().Contain("Ma role da ton tai");
		}
		#endregion

		#region UTCID 03: CreateRole — Abnormal — RoleCode trong
		[Fact]
		public async Task CreateRole_UTCID03_ReturnsBadRequest_WhenRoleCodeEmpty()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleCode", "Required");
			var request = new CreateRoleRequest { RoleCode = "", RoleName = "Admin" };

			var result = await controller.CreateRole(request);

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 04: CreateRole — Boundary — RoleCode qua dai (>50 ky tu)
		[Fact]
		public async Task CreateRole_UTCID04_ReturnsBadRequest_WhenRoleCodeTooLong()
		{
			var controller = CreateControllerWithUser();
			string longCode = new string('A', 51);
			controller.ModelState.AddModelError("RoleCode", "Too long");
			var request = new CreateRoleRequest { RoleCode = longCode, RoleName = "Admin" };

			var result = await controller.CreateRole(request);

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 05: CreateRole — Boundary — RoleCode chua ky tu dac biet
		[Fact]
		public async Task CreateRole_UTCID05_ReturnsBadRequest_WhenSpecialChars()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleCode", "Invalid format");
			var request = new CreateRoleRequest { RoleCode = "SALE@#$", RoleName = "Admin" };

			var result = await controller.CreateRole(request);

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 06: CreateRole — Abnormal — RoleName trong
		[Fact]
		public async Task CreateRole_UTCID06_ReturnsBadRequest_WhenRoleNameEmpty()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleName", "Required");
			var request = new CreateRoleRequest { RoleCode = "NVVS", RoleName = "" };

			var result = await controller.CreateRole(request);

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 07: CreateRole — Boundary — RoleName chi toan khoang trang
		[Fact]
		public async Task CreateRole_UTCID07_ReturnsBadRequest_WhenRoleNameWhitespace()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleName", "Cannot be whitespace");
			var request = new CreateRoleRequest { RoleCode = "NVVS", RoleName = "   " };

			var result = await controller.CreateRole(request);

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 08: CreateRole — Abnormal — loi he thong 500
		[Fact]
		public async Task CreateRole_UTCID08_Returns500_WhenSystemError()
		{
			var controller = CreateControllerWithUser();
			_roleServiceMock.Setup(x => x.CreateRoleAsync(It.IsAny<CreateRoleRequest>(), It.IsAny<long>()))
							.ThrowsAsync(new Exception());

			var result = await controller.CreateRole(new CreateRoleRequest { RoleCode = "NVVS", RoleName = "Admin" });

			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Contain("Da xay ra loi");
		}
		#endregion

		// =========================================================
		// 3/ UpdateRole — 9 test cases
		// =========================================================

		#region UTCID 01: UpdateRole — Normal — Thanh cong
		[Fact]
		public async Task UpdateRole_UTCID01_ReturnsOk_WhenSuccessful()
		{
			var controller = CreateControllerWithUser();
			var request = new UpdateRoleRequest { RoleCode = "NVVS", RoleName = "Nhan vien ve sinh" };
			var expected = new RoleResponse { RoleId = 1, RoleCode = "NVVS", RoleName = "Nhan vien ve sinh" };

			_roleServiceMock.Setup(x => x.UpdateRoleAsync(1, request, It.IsAny<long>())).ReturnsAsync(expected);

			var result = await controller.UpdateRole(1, request);

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<RoleResponse>>().Subject;

			response.Message.Should().Contain("Cap nhat role");
			response.Data!.RoleCode.Should().Be("NVVS");
		}
		#endregion

		#region UTCID 02: UpdateRole — Abnormal — Role khong ton tai (ID 999)
		[Fact]
		public async Task UpdateRole_UTCID02_ReturnsNotFound_WhenIdNotExist()
		{
			var controller = CreateControllerWithUser();
			var request = new UpdateRoleRequest { RoleCode = "NVVS", RoleName = "Nhan vien ve sinh" };

			_roleServiceMock.Setup(x => x.UpdateRoleAsync(999, request))
							.ThrowsAsync(new KeyNotFoundException("Role khong ton tai."));

			var result = await controller.UpdateRole(999, request);

			var nf = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			((ApiResponse<object>)nf.Value!).Message.Should().Contain("Role khong ton tai");
		}
		#endregion

		#region UTCID 03: UpdateRole — Abnormal — Ma role da bi su dung boi ID khac
		[Fact]
		public async Task UpdateRole_UTCID03_ReturnsBadRequest_WhenCodeDuplicate()
		{
			var controller = CreateControllerWithUser();
			var request = new UpdateRoleRequest { RoleCode = "SALE", RoleName = "Admin" };

			_roleServiceMock.Setup(x => x.UpdateRoleAsync(1, request))
							.ThrowsAsync(new InvalidOperationException("Ma role da duoc su dung boi role khac."));

			var result = await controller.UpdateRole(1, request);

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("da duoc su dung boi role khac");
		}
		#endregion

		#region UTCID 04: UpdateRole — Abnormal — Du lieu khong hop le (Null/Empty)
		[Fact]
		public async Task UpdateRole_UTCID04_ReturnsBadRequest_WhenDataEmpty()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleCode", "Required");

			var result = await controller.UpdateRole(1, new UpdateRoleRequest { RoleCode = "" });

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");

			_roleServiceMock.Verify(x => x.UpdateRoleAsync(It.IsAny<long>(), It.IsAny<UpdateRoleRequest>(), It.IsAny<long>()), Times.Never);
		}
		#endregion

		#region UTCID 05: UpdateRole — Boundary — RoleCode qua dai (>50)
		[Fact]
		public async Task UpdateRole_UTCID05_ReturnsBadRequest_WhenCodeTooLong()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleCode", "Too long");

			var result = await controller.UpdateRole(1, new UpdateRoleRequest { RoleCode = new string('A', 51) });

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 06: UpdateRole — Normal — Giu nguyen RoleCode, chi doi Name
		[Fact]
		public async Task UpdateRole_UTCID06_ReturnsOk_WhenCodeUnchanged()
		{
			var controller = CreateControllerWithUser();
			var request = new UpdateRoleRequest { RoleCode = "NVVS", RoleName = "Ten moi" };
			var expected = new RoleResponse { RoleId = 1, RoleCode = "NVVS", RoleName = "Ten moi" };

			_roleServiceMock.Setup(x => x.UpdateRoleAsync(1, request, It.IsAny<long>())).ReturnsAsync(expected);

			var result = await controller.UpdateRole(1, request);

			result.Should().BeOfType<OkObjectResult>();
		}
		#endregion

		#region UTCID 07: UpdateRole — Boundary — RoleCode chua ky tu dac biet
		[Fact]
		public async Task UpdateRole_UTCID07_ReturnsBadRequest_WhenSpecialChars()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleCode", "Invalid");

			var result = await controller.UpdateRole(1, new UpdateRoleRequest { RoleCode = "SALE@#$" });

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 08: UpdateRole — Boundary — RoleName chi toan khoang trang
		[Fact]
		public async Task UpdateRole_UTCID08_ReturnsBadRequest_WhenNameWhitespace()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleName", "Whitespace");

			var result = await controller.UpdateRole(1, new UpdateRoleRequest { RoleCode = "NVVS", RoleName = "   " });

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 09: UpdateRole — Abnormal — loi he thong 500
		[Fact]
		public async Task UpdateRole_UTCID09_Returns500_WhenSystemError()
		{
			var controller = CreateControllerWithUser();
			_roleServiceMock.Setup(x => x.UpdateRoleAsync(It.IsAny<long>(), It.IsAny<UpdateRoleRequest>(), It.IsAny<long>()))
							.ThrowsAsync(new Exception());

			var result = await controller.UpdateRole(1, new UpdateRoleRequest { RoleCode = "NVVS", RoleName = "Test" });

			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Contain("Da xay ra loi");
		}
		#endregion

		// =========================================================
		// 4/ AssignRoleToUser — 7 test cases
		// =========================================================

		#region UTCID 01: AssignRoleToUser — Normal — Gan moi thanh cong
		[Fact]
		public async Task AssignRoleToUser_UTCID01_ReturnsOk_WhenAssignNewSuccessful()
		{
			var controller = CreateControllerWithUser(userId: 10);
			var request = new AssignRoleRequest { UserId = 5, RoleId = 2 };
			var expected = new AdminUserResponse { UserId = 5, RoleName = "STAFF" };

			_roleServiceMock
				.Setup(x => x.AssignRoleToUserAsync(request, 10))
				.ReturnsAsync(expected);

			var result = await controller.AssignRoleToUser(request);

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<AdminUserResponse>>().Subject;

			response.Success.Should().BeTrue();
			response.Message.Should().Contain("Gan role cho nguoi dung");
			response.Data!.RoleName.Should().Be("STAFF");
		}
		#endregion

		#region UTCID 02: AssignRoleToUser — Normal — Cap nhat role thanh cong
		[Fact]
		public async Task AssignRoleToUser_UTCID02_ReturnsOk_WhenUpdateSuccessful()
		{
			var controller = CreateControllerWithUser(userId: 10);
			var request = new AssignRoleRequest { UserId = 5, RoleId = 1 };
			var expected = new AdminUserResponse { UserId = 5, RoleName = "ADMIN" };

			_roleServiceMock.Setup(x => x.AssignRoleToUserAsync(request, 10)).ReturnsAsync(expected);

			var result = await controller.AssignRoleToUser(request);

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			((ApiResponse<AdminUserResponse>)ok.Value!).Message.Should().Contain("Gan role cho nguoi dung");
		}
		#endregion

		#region UTCID 03: AssignRoleToUser — Abnormal — Du lieu khong hop le (ModelState)
		[Fact]
		public async Task AssignRoleToUser_UTCID03_ReturnsBadRequest_WhenModelStateInvalid()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("UserId", "Required");

			var result = await controller.AssignRoleToUser(new AssignRoleRequest());

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");

			_roleServiceMock.Verify(x => x.AssignRoleToUserAsync(It.IsAny<AssignRoleRequest>(), It.IsAny<long>()), Times.Never);
		}
		#endregion

		#region UTCID 04: AssignRoleToUser — Abnormal — Khong xac dinh danh tinh (401)
		[Fact]
		public async Task AssignRoleToUser_UTCID04_ReturnsUnauthorized_WhenClaimMissing()
		{
			var controller = CreateControllerWithoutUser();

			var result = await controller.AssignRoleToUser(new AssignRoleRequest { UserId = 5, RoleId = 2 });

			var unauthorized = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
			((ApiResponse<object>)unauthorized.Value!).Message.Should().Contain("Khong xac dinh duoc danh tinh");
		}
		#endregion

		#region UTCID 05: AssignRoleToUser — Abnormal — Nguoi dung khong ton tai (404)
		[Fact]
		public async Task AssignRoleToUser_UTCID05_ReturnsNotFound_WhenUserNotExist()
		{
			var controller = CreateControllerWithUser();
			var request = new AssignRoleRequest { UserId = 9999, RoleId = 1 };

			_roleServiceMock.Setup(x => x.AssignRoleToUserAsync(request, It.IsAny<long>()))
							.ThrowsAsync(new KeyNotFoundException("Nguoi dung khong ton tai."));

			var result = await controller.AssignRoleToUser(request);

			var nf = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			((ApiResponse<object>)nf.Value!).Message.Should().Contain("Nguoi dung khong ton tai");
		}
		#endregion

		#region UTCID 06: AssignRoleToUser — Abnormal — Role khong ton tai (400)
		[Fact]
		public async Task AssignRoleToUser_UTCID06_ReturnsBadRequest_WhenRoleNotExist()
		{
			var controller = CreateControllerWithUser();
			var request = new AssignRoleRequest { UserId = 1, RoleId = 999 };

			_roleServiceMock.Setup(x => x.AssignRoleToUserAsync(request, It.IsAny<long>()))
							.ThrowsAsync(new InvalidOperationException("Role khong ton tai."));

			var result = await controller.AssignRoleToUser(request);

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Role khong ton tai");
		}
		#endregion

		#region UTCID 07: AssignRoleToUser — Abnormal — loi he thong 500
		[Fact]
		public async Task AssignRoleToUser_UTCID07_Returns500_WhenSystemError()
		{
			var controller = CreateControllerWithUser();
			_roleServiceMock.Setup(x => x.AssignRoleToUserAsync(It.IsAny<AssignRoleRequest>(), It.IsAny<long>()))
							.ThrowsAsync(new Exception());

			var result = await controller.AssignRoleToUser(new AssignRoleRequest { UserId = 1, RoleId = 1 });

			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Contain("Da xay ra loi");
		}
		#endregion
	}
}