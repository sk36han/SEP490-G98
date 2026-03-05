using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Warehouse.Api.ApiController;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Xunit;

namespace Warehouse.Api.Tests
{
    public class RoleControllerTests
    {
        private readonly Mock<IRoleService> _roleServiceMock = new();

        /// <summary>
        /// Helper: Tạo RoleController với ClaimsPrincipal có NameIdentifier claim
        /// Dùng để giả lập user đã đăng nhập với userId cụ thể
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
        /// Helper: Tạo RoleController KHÔNG có claim (user chưa xác thực)
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
		// 1️⃣ GetAllRoles — 6 test cases
		// =========================================================

		#region UTCID 01: GetAllRoles — Normal — Thành công (có data)
		[Fact]
		public async Task GetAllRoles_UTCID01_ReturnsOk_WhenSuccessful()
		{
			// Arrange — Precondition: Database has user roles
			var controller = CreateControllerWithUser();
			var roles = new List<RoleResponse>
	{
		new RoleResponse { RoleId = 1, RoleCode = "ADMIN", RoleName = "Quản trị viên" },
		new RoleResponse { RoleId = 2, RoleCode = "STAFF", RoleName = "Nhân viên" }
	};

			_roleServiceMock
				.Setup(x => x.GetAllRolesAsync())
				.ReturnsAsync(roles);

			// Act
			var result = await controller.GetAllRoles();

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var apiResponse = ok.Value.Should().BeOfType<ApiResponse<List<RoleResponse>>>().Subject;

			apiResponse.Success.Should().BeTrue();
			apiResponse.Message.Should().Be("Lấy danh sách role thành công.");
			apiResponse.Data.Should().HaveCount(2);
		}
		#endregion

		#region UTCID 02: GetAllRoles — Normal — Danh sách rỗng
		[Fact]
		public async Task GetAllRoles_UTCID02_ReturnsOk_WhenEmptyList()
		{
			// Arrange — Precondition: Database is empty
			var controller = CreateControllerWithUser();
			var roles = new List<RoleResponse>();

			_roleServiceMock
				.Setup(x => x.GetAllRolesAsync())
				.ReturnsAsync(roles);

			// Act
			var result = await controller.GetAllRoles();

			// Assert — Vẫn trả về 200 OK kèm danh sách []
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var apiResponse = ok.Value.Should().BeOfType<ApiResponse<List<RoleResponse>>>().Subject;

			apiResponse.Success.Should().BeTrue();
			apiResponse.Data.Should().BeEmpty();
		}
		#endregion

		#region UTCID 03: GetAllRoles — Abnormal — Lỗi SqlException (Database error)
		[Fact]
		public async Task GetAllRoles_UTCID03_Returns500_WhenSqlException()
		{
			// Arrange — Precondition: Database error occurs
			var controller = CreateControllerWithUser();
			_roleServiceMock.Setup(x => x.GetAllRolesAsync()).ThrowsAsync(new MockDbException("Lỗi kết nối SQL"));

			// Act
			var result = await controller.GetAllRoles();

			// Assert — Trả về 500 và log message hệ thống
			var statusCode = result.Should().BeOfType<ObjectResult>().Subject;
			statusCode.StatusCode.Should().Be(500);
			((ApiResponse<object>)statusCode.Value!).Message.Should().Be("Đã xảy ra lỗi hệ thống.");
		}
		#endregion

		#region UTCID 04: GetAllRoles — Abnormal — NullReferenceException (DbContext is null)
		[Fact]
		public async Task GetAllRoles_UTCID04_Returns500_WhenNullReference()
		{
			// Arrange
			var controller = CreateControllerWithUser();

			_roleServiceMock
				.Setup(x => x.GetAllRolesAsync())
				.ThrowsAsync(new NullReferenceException());

			// Act
			var result = await controller.GetAllRoles();

			// Assert
			var statusCode = result.Should().BeOfType<ObjectResult>().Subject;
			statusCode.StatusCode.Should().Be(500);
		}
		#endregion

		#region UTCID 05: GetAllRoles — Abnormal — InvalidOperationException
		[Fact]
		public async Task GetAllRoles_UTCID05_Returns500_WhenInvalidOperation()
		{
			// Arrange
			var controller = CreateControllerWithUser();

			_roleServiceMock
				.Setup(x => x.GetAllRolesAsync())
				.ThrowsAsync(new InvalidOperationException());
                
			// Act
			var result = await controller.GetAllRoles();

			// Assert
			var statusCode = result.Should().BeOfType<ObjectResult>().Subject;
			statusCode.StatusCode.Should().Be(500);
		}
		#endregion

		#region UTCID 06: GetAllRoles — Abnormal — Exception (General error)
		[Fact]
		public async Task GetAllRoles_UTCID06_Returns500_WhenGeneralException()
		{
			// Arrange
			var controller = CreateControllerWithUser();

			_roleServiceMock
				.Setup(x => x.GetAllRolesAsync())
				.ThrowsAsync(new Exception("Unknown error"));

			// Act
			var result = await controller.GetAllRoles();

			// Assert
			var statusCode = result.Should().BeOfType<ObjectResult>().Subject;
			statusCode.StatusCode.Should().Be(500);
		}
		#endregion

		// =========================================================
		// 2️⃣ CreateRole — 8 test cases 
		// =========================================================

		#region UTCID 01: CreateRole — Normal — Thành công
		[Fact]
		public async Task CreateRole_UTCID01_ReturnsOk_WhenSuccessful()
		{
			// Arrange — RoleCode: "NVVS", RoleName: "Nhân viên vệ sinh"
			var controller = CreateControllerWithUser();
			var request = new CreateRoleRequest { RoleCode = "NVVS", RoleName = "Nhân viên vệ sinh" };
			var expected = new RoleResponse { RoleId = 1, RoleCode = "NVVS", RoleName = "Nhân viên vệ sinh" };

			_roleServiceMock.Setup(x => x.CreateRoleAsync(request)).ReturnsAsync(expected);

			// Act
			var result = await controller.CreateRole(request);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<RoleResponse>>().Subject;

			response.Success.Should().BeTrue();
			response.Message.Should().Be("Tạo role thành công.");
			response.Data!.RoleCode.Should().Be("NVVS");
		}
		#endregion

		#region UTCID 02: CreateRole — Abnormal — Mã role đã tồn tại
		[Fact]
		public async Task CreateRole_UTCID02_ReturnsBadRequest_WhenRoleCodeExists()
		{
			// Arrange — RoleCode trùng mã SALE
			var controller = CreateControllerWithUser();
			var request = new CreateRoleRequest { RoleCode = "SALE", RoleName = "Admin" };

			_roleServiceMock.Setup(x => x.CreateRoleAsync(request))
							.ThrowsAsync(new InvalidOperationException("Mã role đã tồn tại."));

			// Act
			var result = await controller.CreateRole(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var response = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			response.Message.Should().Be("Mã role đã tồn tại.");
		}
		#endregion

		#region UTCID 03: CreateRole — Abnormal — RoleCode trống
		[Fact]
		public async Task CreateRole_UTCID03_ReturnsBadRequest_WhenRoleCodeEmpty()
		{
			// Arrange — RoleCode: Null/Empty
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleCode", "Required");
			var request = new CreateRoleRequest { RoleCode = "", RoleName = "Admin" };

			// Act
			var result = await controller.CreateRole(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");
		}
		#endregion

		#region UTCID 04: CreateRole — Boundary — RoleCode quá dài (>50 ký tự)
		[Fact]
		public async Task CreateRole_UTCID04_ReturnsBadRequest_WhenRoleCodeTooLong()
		{
			// Arrange — RoleCode dài hơn 50 ký tự
			var controller = CreateControllerWithUser();
			string longCode = new string('A', 51);
			controller.ModelState.AddModelError("RoleCode", "Too long");
			var request = new CreateRoleRequest { RoleCode = longCode, RoleName = "Admin" };

			// Act
			var result = await controller.CreateRole(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");
		}
		#endregion

		#region UTCID 05: CreateRole — Boundary — RoleCode chứa ký tự đặc biệt
		[Fact]
		public async Task CreateRole_UTCID05_ReturnsBadRequest_WhenSpecialChars()
		{
			// Arrange — RoleCode: "SALE@#$"
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleCode", "Invalid format");
			var request = new CreateRoleRequest { RoleCode = "SALE@#$", RoleName = "Admin" };

			// Act
			var result = await controller.CreateRole(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");
		}
		#endregion

		#region UTCID 06: CreateRole — Abnormal — RoleName trống
		[Fact]
		public async Task CreateRole_UTCID06_ReturnsBadRequest_WhenRoleNameEmpty()
		{
			// Arrange — RoleName: Null/Empty
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleName", "Required");
			var request = new CreateRoleRequest { RoleCode = "NVVS", RoleName = "" };

			// Act
			var result = await controller.CreateRole(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");
		}
		#endregion

		#region UTCID 07: CreateRole — Boundary — RoleName chỉ toàn khoảng trắng
		[Fact]
		public async Task CreateRole_UTCID07_ReturnsBadRequest_WhenRoleNameWhitespace()
		{
			// Arrange — RoleName: "   "
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleName", "Cannot be whitespace");
			var request = new CreateRoleRequest { RoleCode = "NVVS", RoleName = "   " };

			// Act
			var result = await controller.CreateRole(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");
		}
		#endregion

		#region UTCID 08: CreateRole — Abnormal — Lỗi hệ thống 500
		[Fact]
		public async Task CreateRole_UTCID08_Returns500_WhenSystemError()
		{
			// Arrange — Lỗi hệ thống bất ngờ
			var controller = CreateControllerWithUser();
			_roleServiceMock.Setup(x => x.CreateRoleAsync(It.IsAny<CreateRoleRequest>()))
							.ThrowsAsync(new Exception());

			// Act
			var result = await controller.CreateRole(new CreateRoleRequest { RoleCode = "NVVS", RoleName = "Admin" });

			// Assert
			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Be("Đã xảy ra lỗi hệ thống.");
		}
		#endregion

		// =========================================================
		// 3️ UpdateRole — 9 test cases 
		// =========================================================

		#region UTCID 01: UpdateRole — Normal — Thành công
		[Fact]
		public async Task UpdateRole_UTCID01_ReturnsOk_WhenSuccessful()
		{
			// Arrange — TargetId: 1, RoleCode: "NVVS", RoleName: "Nhân viên vệ sinh"
			var controller = CreateControllerWithUser();
			var request = new UpdateRoleRequest { RoleCode = "NVVS", RoleName = "Nhân viên vệ sinh" };
			var expected = new RoleResponse { RoleId = 1, RoleCode = "NVVS", RoleName = "Nhân viên vệ sinh" };

			_roleServiceMock.Setup(x => x.UpdateRoleAsync(1, request)).ReturnsAsync(expected);

			// Act
			var result = await controller.UpdateRole(1, request);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<RoleResponse>>().Subject;

			response.Message.Should().Be("Cập nhật role thành công.");
			response.Data!.RoleCode.Should().Be("NVVS");
		}
		#endregion

		#region UTCID 02: UpdateRole — Abnormal — Role không tồn tại (ID 999)
		[Fact]
		public async Task UpdateRole_UTCID02_ReturnsNotFound_WhenIdNotExist()
		{
			// Arrange
			var controller = CreateControllerWithUser();
			var request = new UpdateRoleRequest { RoleCode = "NVVS", RoleName = "Nhân viên vệ sinh" };

			_roleServiceMock.Setup(x => x.UpdateRoleAsync(999, request))
							.ThrowsAsync(new KeyNotFoundException("Role không tồn tại."));

			// Act
			var result = await controller.UpdateRole(999, request);

			// Assert
			var nf = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			((ApiResponse<object>)nf.Value!).Message.Should().Be("Role không tồn tại.");
		}
		#endregion

		#region UTCID 03: UpdateRole — Abnormal — Mã role đã bị sử dụng bởi ID khác
		[Fact]
		public async Task UpdateRole_UTCID03_ReturnsBadRequest_WhenCodeDuplicate()
		{
			// Arrange — Cố tình update RoleCode trùng với ID khác
			var controller = CreateControllerWithUser();
			var request = new UpdateRoleRequest { RoleCode = "SALE", RoleName = "Admin" };

			_roleServiceMock.Setup(x => x.UpdateRoleAsync(1, request))
							.ThrowsAsync(new InvalidOperationException("Mã role đã được sử dụng bởi role khác."));

			// Act
			var result = await controller.UpdateRole(1, request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Mã role đã được sử dụng bởi role khác.");
		}
		#endregion

		#region UTCID 04: UpdateRole — Abnormal — Dữ liệu không hợp lệ (Null/Empty)
		[Fact]
		public async Task UpdateRole_UTCID04_ReturnsBadRequest_WhenDataEmpty()
		{
			// Arrange
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleCode", "Required");

			// Act
			var result = await controller.UpdateRole(1, new UpdateRoleRequest { RoleCode = "" });

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");

			_roleServiceMock.Verify(x => x.UpdateRoleAsync(It.IsAny<long>(), It.IsAny<UpdateRoleRequest>()), Times.Never);
		}
		#endregion

		#region UTCID 05: UpdateRole — Boundary — RoleCode quá dài (>50)
		[Fact]
		public async Task UpdateRole_UTCID05_ReturnsBadRequest_WhenCodeTooLong()
		{
			// Arrange
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleCode", "Too long");

			// Act
			var result = await controller.UpdateRole(1, new UpdateRoleRequest { RoleCode = new string('A', 51) });

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");
		}
		#endregion

		#region UTCID 06: UpdateRole — Normal — Giữ nguyên RoleCode, chỉ đổi Name
		[Fact]
		public async Task UpdateRole_UTCID06_ReturnsOk_WhenCodeUnchanged()
		{
			// Arrange — Test logic: codeExists = false khi trùng với chính mình
			var controller = CreateControllerWithUser();
			var request = new UpdateRoleRequest { RoleCode = "NVVS", RoleName = "Tên mới" };
			var expected = new RoleResponse { RoleId = 1, RoleCode = "NVVS", RoleName = "Tên mới" };

			_roleServiceMock.Setup(x => x.UpdateRoleAsync(1, request)).ReturnsAsync(expected);

			// Act
			var result = await controller.UpdateRole(1, request);

			// Assert
			result.Should().BeOfType<OkObjectResult>();
		}
		#endregion

		#region UTCID 07: UpdateRole — Boundary — RoleCode chứa ký tự đặc biệt
		[Fact]
		public async Task UpdateRole_UTCID07_ReturnsBadRequest_WhenSpecialChars()
		{
			// Arrange
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleCode", "Invalid");

			// Act
			var result = await controller.UpdateRole(1, new UpdateRoleRequest { RoleCode = "SALE@#$" });

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");
		}
		#endregion

		#region UTCID 08: UpdateRole — Boundary — RoleName chỉ toàn khoảng trắng
		[Fact]
		public async Task UpdateRole_UTCID08_ReturnsBadRequest_WhenNameWhitespace()
		{
			// Arrange
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleName", "Whitespace");

			// Act
			var result = await controller.UpdateRole(1, new UpdateRoleRequest { RoleCode = "NVVS", RoleName = "   " });

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");
		}
		#endregion

		#region UTCID 09: UpdateRole — Abnormal — Lỗi hệ thống 500
		[Fact]
		public async Task UpdateRole_UTCID09_Returns500_WhenSystemError()
		{
			// Arrange — General Exception
			var controller = CreateControllerWithUser();
			_roleServiceMock.Setup(x => x.UpdateRoleAsync(It.IsAny<long>(), It.IsAny<UpdateRoleRequest>()))
							.ThrowsAsync(new Exception());

			// Act
			var result = await controller.UpdateRole(1, new UpdateRoleRequest { RoleCode = "NVVS", RoleName = "Test" });

			// Assert
			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Be("Đã xảy ra lỗi hệ thống.");
		}
		#endregion

		// =========================================================
		// 4️ AssignRoleToUser — 7 test cases 
		// =========================================================

		#region UTCID 01: AssignRoleToUser — Normal — Gán mới thành công
		[Fact]
		public async Task AssignRoleToUser_UTCID01_ReturnsOk_WhenAssignNewSuccessful()
		{
			// Arrange — User chưa có role, gán role STAFF
			var controller = CreateControllerWithUser(userId: 10);
			var request = new AssignRoleRequest { UserId = 5, RoleId = 2 };
			var expected = new AdminUserResponse { UserId = 5, RoleName = "STAFF" };

			_roleServiceMock
				.Setup(x => x.AssignRoleToUserAsync(request, 10))
				.ReturnsAsync(expected);

			// Act
			var result = await controller.AssignRoleToUser(request);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<AdminUserResponse>>().Subject;

			response.Success.Should().BeTrue();
			response.Message.Should().Be("Gán role cho người dùng thành công.");
			response.Data!.RoleName.Should().Be("STAFF");
		}
		#endregion

		#region UTCID 02: AssignRoleToUser — Normal — Cập nhật role thành công
		[Fact]
		public async Task AssignRoleToUser_UTCID02_ReturnsOk_WhenUpdateSuccessful()
		{
			// Arrange — User đã có role, cập nhật sang ADMIN
			var controller = CreateControllerWithUser(userId: 10);
			var request = new AssignRoleRequest { UserId = 5, RoleId = 1 };
			var expected = new AdminUserResponse { UserId = 5, RoleName = "ADMIN" };

			_roleServiceMock.Setup(x => x.AssignRoleToUserAsync(request, 10)).ReturnsAsync(expected);

			// Act
			var result = await controller.AssignRoleToUser(request);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			((ApiResponse<AdminUserResponse>)ok.Value!).Message.Should().Be("Gán role cho người dùng thành công.");
		}
		#endregion

		#region UTCID 03: AssignRoleToUser — Abnormal — Dữ liệu không hợp lệ (ModelState)
		[Fact]
		public async Task AssignRoleToUser_UTCID03_ReturnsBadRequest_WhenModelStateInvalid()
		{
			// Arrange
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("UserId", "Required");

			// Act
			var result = await controller.AssignRoleToUser(new AssignRoleRequest());

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");

			_roleServiceMock.Verify(x => x.AssignRoleToUserAsync(It.IsAny<AssignRoleRequest>(), It.IsAny<long>()), Times.Never);
		}
		#endregion

		#region UTCID 04: AssignRoleToUser — Abnormal — Không xác định danh tính (401)
		[Fact]
		public async Task AssignRoleToUser_UTCID04_ReturnsUnauthorized_WhenClaimMissing()
		{
			// Arrange — Không có claim NameIdentifier trong Token
			var controller = CreateControllerWithoutUser();

			// Act
			var result = await controller.AssignRoleToUser(new AssignRoleRequest { UserId = 5, RoleId = 2 });

			// Assert
			var unauthorized = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
			((ApiResponse<object>)unauthorized.Value!).Message.Should().Be("Không xác định được danh tính người dùng.");
		}
		#endregion

		#region UTCID 05: AssignRoleToUser — Abnormal — Người dùng không tồn tại (404)
		[Fact]
		public async Task AssignRoleToUser_UTCID05_ReturnsNotFound_WhenUserNotExist()
		{
			// Arrange — UserId: 9999
			var controller = CreateControllerWithUser();
			var request = new AssignRoleRequest { UserId = 9999, RoleId = 1 };

			_roleServiceMock.Setup(x => x.AssignRoleToUserAsync(request, It.IsAny<long>()))
							.ThrowsAsync(new KeyNotFoundException("Người dùng không tồn tại."));

			// Act
			var result = await controller.AssignRoleToUser(request);

			// Assert
			var nf = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			((ApiResponse<object>)nf.Value!).Message.Should().Be("Người dùng không tồn tại.");
		}
		#endregion

		#region UTCID 06: AssignRoleToUser — Abnormal — Role không tồn tại (400)
		[Fact]
		public async Task AssignRoleToUser_UTCID06_ReturnsBadRequest_WhenRoleNotExist()
		{
			// Arrange — RoleId: 999
			var controller = CreateControllerWithUser();
			var request = new AssignRoleRequest { UserId = 1, RoleId = 999 };

			_roleServiceMock.Setup(x => x.AssignRoleToUserAsync(request, It.IsAny<long>()))
							.ThrowsAsync(new InvalidOperationException("Role không tồn tại."));

			// Act
			var result = await controller.AssignRoleToUser(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Role không tồn tại.");
		}
		#endregion

		#region UTCID 07: AssignRoleToUser — Abnormal — Lỗi hệ thống 500
		[Fact]
		public async Task AssignRoleToUser_UTCID07_Returns500_WhenSystemError()
		{
			// Arrange
			var controller = CreateControllerWithUser();
			_roleServiceMock.Setup(x => x.AssignRoleToUserAsync(It.IsAny<AssignRoleRequest>(), It.IsAny<long>()))
							.ThrowsAsync(new Exception());

			// Act
			var result = await controller.AssignRoleToUser(new AssignRoleRequest { UserId = 1, RoleId = 1 });

			// Assert
			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Be("Đã xảy ra lỗi hệ thống.");
		}
		#endregion
	}
}
