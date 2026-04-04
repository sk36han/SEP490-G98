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
		/// Helper: Táº¡o RoleController vá»›i ClaimsPrincipal cÃ³ NameIdentifier claim
		/// DÃ¹ng Ä‘á»ƒ giáº£ láº­p user Ä‘Ã£ Ä‘Äƒng nháº­p vá»›i userId cá»¥ thá»ƒ
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
		/// Helper: Táº¡o RoleController KHÃ”NG cÃ³ claim (user chÆ°a xÃ¡c thá»±c)
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
		// 1ï¸âƒ£ GetAllRoles â€” 6 test cases
		// =========================================================

		#region UTCID 01: GetAllRoles â€” Normal â€” ThÃ nh cÃ´ng (cÃ³ data)
		[Fact]
		public async Task GetAllRoles_UTCID01_ReturnsOk_WhenSuccessful()
		{
			// Arrange â€” Precondition: Database has user roles
			var controller = CreateControllerWithUser();
			var roles = new List<RoleResponse>
	{
		new RoleResponse { RoleId = 1, RoleCode = "ADMIN", RoleName = "Quáº£n trá»‹ viÃªn" },
		new RoleResponse { RoleId = 2, RoleCode = "STAFF", RoleName = "NhÃ¢n viÃªn" }
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
			apiResponse.Message.Should().Be("Láº¥y danh sÃ¡ch role thÃ nh cÃ´ng.");
			apiResponse.Data.Should().HaveCount(2);
		}
		#endregion

		#region UTCID 02: GetAllRoles â€” Normal â€” Danh sÃ¡ch rá»—ng
		[Fact]
		public async Task GetAllRoles_UTCID02_ReturnsOk_WhenEmptyList()
		{
			// Arrange â€” Precondition: Database is empty
			var controller = CreateControllerWithUser();
			var roles = new List<RoleResponse>();

			_roleServiceMock
				.Setup(x => x.GetAllRolesAsync())
				.ReturnsAsync(roles);

			// Act
			var result = await controller.GetAllRoles();

			// Assert â€” Váº«n tráº£ vá» 200 OK kÃ¨m danh sÃ¡ch []
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var apiResponse = ok.Value.Should().BeOfType<ApiResponse<List<RoleResponse>>>().Subject;

			apiResponse.Success.Should().BeTrue();
			apiResponse.Data.Should().BeEmpty();
		}
		#endregion

		#region UTCID 03: GetAllRoles â€” Abnormal â€” Lá»—i SqlException (Database error)
		[Fact]
		public async Task GetAllRoles_UTCID03_Returns500_WhenSqlException()
		{
			// Arrange â€” Precondition: Database error occurs
			var controller = CreateControllerWithUser();
			_roleServiceMock.Setup(x => x.GetAllRolesAsync()).ThrowsAsync(new MockDbException("Lá»—i káº¿t ná»‘i SQL"));

			// Act
			var result = await controller.GetAllRoles();

			// Assert â€” Tráº£ vá» 500 vÃ  log message há»‡ thá»‘ng
			var statusCode = result.Should().BeOfType<ObjectResult>().Subject;
			statusCode.StatusCode.Should().Be(500);
			((ApiResponse<object>)statusCode.Value!).Message.Should().Be("ÄÃ£ xáº£y ra lá»—i há»‡ thá»‘ng.");
		}
		#endregion

		#region UTCID 04: GetAllRoles â€” Abnormal â€” NullReferenceException (DbContext is null)
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

		#region UTCID 05: GetAllRoles â€” Abnormal â€” InvalidOperationException
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

		#region UTCID 06: GetAllRoles â€” Abnormal â€” Exception (General error)
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
		// 2ï¸âƒ£ CreateRole â€” 8 test cases 
		// =========================================================

		#region UTCID 01: CreateRole â€” Normal â€” ThÃ nh cÃ´ng
		[Fact]
		public async Task CreateRole_UTCID01_ReturnsOk_WhenSuccessful()
		{
			// Arrange â€” RoleCode: "NVVS", RoleName: "NhÃ¢n viÃªn vá»‡ sinh"
			var controller = CreateControllerWithUser();
			var request = new CreateRoleRequest { RoleCode = "NVVS", RoleName = "NhÃ¢n viÃªn vá»‡ sinh" };
			var expected = new RoleResponse { RoleId = 1, RoleCode = "NVVS", RoleName = "NhÃ¢n viÃªn vá»‡ sinh" };

			_roleServiceMock.Setup(x => x.CreateRoleAsync(request, It.IsAny<long>())).ReturnsAsync(expected);

			// Act
			var result = await controller.CreateRole(request);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<RoleResponse>>().Subject;

			response.Success.Should().BeTrue();
			response.Message.Should().Be("Táº¡o role thÃ nh cÃ´ng.");
			response.Data!.RoleCode.Should().Be("NVVS");
		}
		#endregion

		#region UTCID 02: CreateRole â€” Abnormal â€” MÃ£ role Ä‘Ã£ tá»“n táº¡i
		[Fact]
		public async Task CreateRole_UTCID02_ReturnsBadRequest_WhenRoleCodeExists()
		{
			// Arrange â€” RoleCode trÃ¹ng mÃ£ SALE
			var controller = CreateControllerWithUser();
			var request = new CreateRoleRequest { RoleCode = "SALE", RoleName = "Admin" };

			_roleServiceMock.Setup(x => x.CreateRoleAsync(request, It.IsAny<long>()))
							.ThrowsAsync(new InvalidOperationException("MÃ£ role Ä‘Ã£ tá»“n táº¡i."));

			// Act
			var result = await controller.CreateRole(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var response = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			response.Message.Should().Be("MÃ£ role Ä‘Ã£ tá»“n táº¡i.");
		}
		#endregion

		#region UTCID 03: CreateRole â€” Abnormal â€” RoleCode trá»‘ng
		[Fact]
		public async Task CreateRole_UTCID03_ReturnsBadRequest_WhenRoleCodeEmpty()
		{
			// Arrange â€” RoleCode: Null/Empty
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleCode", "Required");
			var request = new CreateRoleRequest { RoleCode = "", RoleName = "Admin" };

			// Act
			var result = await controller.CreateRole(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");
		}
		#endregion

		#region UTCID 04: CreateRole â€” Boundary â€” RoleCode quÃ¡ dÃ i (>50 kÃ½ tá»±)
		[Fact]
		public async Task CreateRole_UTCID04_ReturnsBadRequest_WhenRoleCodeTooLong()
		{
			// Arrange â€” RoleCode dÃ i hÆ¡n 50 kÃ½ tá»±
			var controller = CreateControllerWithUser();
			string longCode = new string('A', 51);
			controller.ModelState.AddModelError("RoleCode", "Too long");
			var request = new CreateRoleRequest { RoleCode = longCode, RoleName = "Admin" };

			// Act
			var result = await controller.CreateRole(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");
		}
		#endregion

		#region UTCID 05: CreateRole â€” Boundary â€” RoleCode chá»©a kÃ½ tá»± Ä‘áº·c biá»‡t
		[Fact]
		public async Task CreateRole_UTCID05_ReturnsBadRequest_WhenSpecialChars()
		{
			// Arrange â€” RoleCode: "SALE@#$"
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleCode", "Invalid format");
			var request = new CreateRoleRequest { RoleCode = "SALE@#$", RoleName = "Admin" };

			// Act
			var result = await controller.CreateRole(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");
		}
		#endregion

		#region UTCID 06: CreateRole â€” Abnormal â€” RoleName trá»‘ng
		[Fact]
		public async Task CreateRole_UTCID06_ReturnsBadRequest_WhenRoleNameEmpty()
		{
			// Arrange â€” RoleName: Null/Empty
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleName", "Required");
			var request = new CreateRoleRequest { RoleCode = "NVVS", RoleName = "" };

			// Act
			var result = await controller.CreateRole(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");
		}
		#endregion

		#region UTCID 07: CreateRole â€” Boundary â€” RoleName chá»‰ toÃ n khoáº£ng tráº¯ng
		[Fact]
		public async Task CreateRole_UTCID07_ReturnsBadRequest_WhenRoleNameWhitespace()
		{
			// Arrange â€” RoleName: "   "
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("RoleName", "Cannot be whitespace");
			var request = new CreateRoleRequest { RoleCode = "NVVS", RoleName = "   " };

			// Act
			var result = await controller.CreateRole(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");
		}
		#endregion

		#region UTCID 08: CreateRole â€” Abnormal â€” Lá»—i há»‡ thá»‘ng 500
		[Fact]
		public async Task CreateRole_UTCID08_Returns500_WhenSystemError()
		{
			// Arrange â€” Lá»—i há»‡ thá»‘ng báº¥t ngá»
			var controller = CreateControllerWithUser();
			_roleServiceMock.Setup(x => x.CreateRoleAsync(It.IsAny<CreateRoleRequest>(), It.IsAny<long>()))
							.ThrowsAsync(new Exception());

			// Act
			var result = await controller.CreateRole(new CreateRoleRequest { RoleCode = "NVVS", RoleName = "Admin" });

			// Assert
			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Be("ÄÃ£ xáº£y ra lá»—i há»‡ thá»‘ng.");
		}
		#endregion

		// =========================================================
		// 3ï¸ UpdateRole â€” 9 test cases 
		// =========================================================

		#region UTCID 01: UpdateRole â€” Normal â€” ThÃ nh cÃ´ng
		[Fact]
		public async Task UpdateRole_UTCID01_ReturnsOk_WhenSuccessful()
		{
			// Arrange â€” TargetId: 1, RoleCode: "NVVS", RoleName: "NhÃ¢n viÃªn vá»‡ sinh"
			var controller = CreateControllerWithUser();
			var request = new UpdateRoleRequest { RoleCode = "NVVS", RoleName = "NhÃ¢n viÃªn vá»‡ sinh" };
			var expected = new RoleResponse { RoleId = 1, RoleCode = "NVVS", RoleName = "NhÃ¢n viÃªn vá»‡ sinh" };

			_roleServiceMock.Setup(x => x.UpdateRoleAsync(1, request, It.IsAny<long>())).ReturnsAsync(expected);

			// Act
			var result = await controller.UpdateRole(1, request);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<RoleResponse>>().Subject;

			response.Message.Should().Be("Cáº­p nháº­t role thÃ nh cÃ´ng.");
			response.Data!.RoleCode.Should().Be("NVVS");
		}
		#endregion

		#region UTCID 02: UpdateRole â€” Abnormal â€” Role khÃ´ng tá»“n táº¡i (ID 999)
		[Fact]
		public async Task UpdateRole_UTCID02_ReturnsNotFound_WhenIdNotExist()
		{
			// Arrange
			var controller = CreateControllerWithUser();
			var request = new UpdateRoleRequest { RoleCode = "NVVS", RoleName = "NhÃ¢n viÃªn vá»‡ sinh" };

			_roleServiceMock.Setup(x => x.UpdateRoleAsync(999, request, It.IsAny<long>()))
							.ThrowsAsync(new KeyNotFoundException("Role khÃ´ng tá»“n táº¡i."));

			// Act
			var result = await controller.UpdateRole(999, request);

			// Assert
			var nf = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			((ApiResponse<object>)nf.Value!).Message.Should().Be("Role khÃ´ng tá»“n táº¡i.");
		}
		#endregion

		#region UTCID 03: UpdateRole â€” Abnormal â€” MÃ£ role Ä‘Ã£ bá»‹ sá»­ dá»¥ng bá»Ÿi ID khÃ¡c
		[Fact]
		public async Task UpdateRole_UTCID03_ReturnsBadRequest_WhenCodeDuplicate()
		{
			// Arrange â€” Cá»‘ tÃ¬nh update RoleCode trÃ¹ng vá»›i ID khÃ¡c
			var controller = CreateControllerWithUser();
			var request = new UpdateRoleRequest { RoleCode = "SALE", RoleName = "Admin" };

			_roleServiceMock.Setup(x => x.UpdateRoleAsync(1, request, It.IsAny<long>()))
							.ThrowsAsync(new InvalidOperationException("MÃ£ role Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng bá»Ÿi role khÃ¡c."));

			// Act
			var result = await controller.UpdateRole(1, request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("MÃ£ role Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng bá»Ÿi role khÃ¡c.");
		}
		#endregion

		#region UTCID 04: UpdateRole â€” Abnormal â€” Dá»¯ liá»‡u khÃ´ng há»£p lá»‡ (Null/Empty)
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
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");

			_roleServiceMock.Verify(x => x.UpdateRoleAsync(It.IsAny<long>(), It.IsAny<UpdateRoleRequest>(), It.IsAny<long>()), Times.Never);
		}
		#endregion

		#region UTCID 05: UpdateRole â€” Boundary â€” RoleCode quÃ¡ dÃ i (>50)
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
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");
		}
		#endregion

		#region UTCID 06: UpdateRole â€” Normal â€” Giá»¯ nguyÃªn RoleCode, chá»‰ Ä‘á»•i Name
		[Fact]
		public async Task UpdateRole_UTCID06_ReturnsOk_WhenCodeUnchanged()
		{
			// Arrange â€” Test logic: codeExists = false khi trÃ¹ng vá»›i chÃ­nh mÃ¬nh
			var controller = CreateControllerWithUser();
			var request = new UpdateRoleRequest { RoleCode = "NVVS", RoleName = "TÃªn má»›i" };
			var expected = new RoleResponse { RoleId = 1, RoleCode = "NVVS", RoleName = "TÃªn má»›i" };

			_roleServiceMock.Setup(x => x.UpdateRoleAsync(1, request, It.IsAny<long>())).ReturnsAsync(expected);

			// Act
			var result = await controller.UpdateRole(1, request);

			// Assert
			result.Should().BeOfType<OkObjectResult>();
		}
		#endregion

		#region UTCID 07: UpdateRole â€” Boundary â€” RoleCode chá»©a kÃ½ tá»± Ä‘áº·c biá»‡t
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
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");
		}
		#endregion

		#region UTCID 08: UpdateRole â€” Boundary â€” RoleName chá»‰ toÃ n khoáº£ng tráº¯ng
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
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");
		}
		#endregion

		#region UTCID 09: UpdateRole â€” Abnormal â€” Lá»—i há»‡ thá»‘ng 500
		[Fact]
		public async Task UpdateRole_UTCID09_Returns500_WhenSystemError()
		{
			// Arrange â€” General Exception
			var controller = CreateControllerWithUser();
			_roleServiceMock.Setup(x => x.UpdateRoleAsync(It.IsAny<long>(), It.IsAny<UpdateRoleRequest>(), It.IsAny<long>()))
							.ThrowsAsync(new Exception());

			// Act
			var result = await controller.UpdateRole(1, new UpdateRoleRequest { RoleCode = "NVVS", RoleName = "Test" });

			// Assert
			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Be("ÄÃ£ xáº£y ra lá»—i há»‡ thá»‘ng.");
		}
		#endregion

		// =========================================================
		// 4ï¸ AssignRoleToUser â€” 7 test cases 
		// =========================================================

		#region UTCID 01: AssignRoleToUser â€” Normal â€” GÃ¡n má»›i thÃ nh cÃ´ng
		[Fact]
		public async Task AssignRoleToUser_UTCID01_ReturnsOk_WhenAssignNewSuccessful()
		{
			// Arrange â€” User chÆ°a cÃ³ role, gÃ¡n role STAFF
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
			response.Message.Should().Be("GÃ¡n role cho ngÆ°á»i dÃ¹ng thÃ nh cÃ´ng.");
			response.Data!.RoleName.Should().Be("STAFF");
		}
		#endregion

		#region UTCID 02: AssignRoleToUser â€” Normal â€” Cáº­p nháº­t role thÃ nh cÃ´ng
		[Fact]
		public async Task AssignRoleToUser_UTCID02_ReturnsOk_WhenUpdateSuccessful()
		{
			// Arrange â€” User Ä‘Ã£ cÃ³ role, cáº­p nháº­t sang ADMIN
			var controller = CreateControllerWithUser(userId: 10);
			var request = new AssignRoleRequest { UserId = 5, RoleId = 1 };
			var expected = new AdminUserResponse { UserId = 5, RoleName = "ADMIN" };

			_roleServiceMock.Setup(x => x.AssignRoleToUserAsync(request, 10)).ReturnsAsync(expected);

			// Act
			var result = await controller.AssignRoleToUser(request);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			((ApiResponse<AdminUserResponse>)ok.Value!).Message.Should().Be("GÃ¡n role cho ngÆ°á»i dÃ¹ng thÃ nh cÃ´ng.");
		}
		#endregion

		#region UTCID 03: AssignRoleToUser â€” Abnormal â€” Dá»¯ liá»‡u khÃ´ng há»£p lá»‡ (ModelState)
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
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");

			_roleServiceMock.Verify(x => x.AssignRoleToUserAsync(It.IsAny<AssignRoleRequest>(), It.IsAny<long>()), Times.Never);
		}
		#endregion

		#region UTCID 04: AssignRoleToUser â€” Abnormal â€” KhÃ´ng xÃ¡c Ä‘á»‹nh danh tÃ­nh (401)
		[Fact]
		public async Task AssignRoleToUser_UTCID04_ReturnsUnauthorized_WhenClaimMissing()
		{
			// Arrange â€” KhÃ´ng cÃ³ claim NameIdentifier trong Token
			var controller = CreateControllerWithoutUser();

			// Act
			var result = await controller.AssignRoleToUser(new AssignRoleRequest { UserId = 5, RoleId = 2 });

			// Assert
			var unauthorized = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
			((ApiResponse<object>)unauthorized.Value!).Message.Should().Be("KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c danh tÃ­nh ngÆ°á»i dÃ¹ng.");
		}
		#endregion

		#region UTCID 05: AssignRoleToUser â€” Abnormal â€” NgÆ°á»i dÃ¹ng khÃ´ng tá»“n táº¡i (404)
		[Fact]
		public async Task AssignRoleToUser_UTCID05_ReturnsNotFound_WhenUserNotExist()
		{
			// Arrange â€” UserId: 9999
			var controller = CreateControllerWithUser();
			var request = new AssignRoleRequest { UserId = 9999, RoleId = 1 };

			_roleServiceMock.Setup(x => x.AssignRoleToUserAsync(request, It.IsAny<long>()))
							.ThrowsAsync(new KeyNotFoundException("NgÆ°á»i dÃ¹ng khÃ´ng tá»“n táº¡i."));

			// Act
			var result = await controller.AssignRoleToUser(request);

			// Assert
			var nf = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			((ApiResponse<object>)nf.Value!).Message.Should().Be("NgÆ°á»i dÃ¹ng khÃ´ng tá»“n táº¡i.");
		}
		#endregion

		#region UTCID 06: AssignRoleToUser â€” Abnormal â€” Role khÃ´ng tá»“n táº¡i (400)
		[Fact]
		public async Task AssignRoleToUser_UTCID06_ReturnsBadRequest_WhenRoleNotExist()
		{
			// Arrange â€” RoleId: 999
			var controller = CreateControllerWithUser();
			var request = new AssignRoleRequest { UserId = 1, RoleId = 999 };

			_roleServiceMock.Setup(x => x.AssignRoleToUserAsync(request, It.IsAny<long>()))
							.ThrowsAsync(new InvalidOperationException("Role khÃ´ng tá»“n táº¡i."));

			// Act
			var result = await controller.AssignRoleToUser(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Role khÃ´ng tá»“n táº¡i.");
		}
		#endregion

		#region UTCID 07: AssignRoleToUser â€” Abnormal â€” Lá»—i há»‡ thá»‘ng 500
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
			((ApiResponse<object>)error.Value!).Message.Should().Be("ÄÃ£ xáº£y ra lá»—i há»‡ thá»‘ng.");
		}
		#endregion
	}
}
