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

namespace WarehouseTests.Admin
{
	public class AdminControllerTests
	{
		private readonly Mock<IAdminService> _adminServiceMock = new();

		/// <summary>
		/// Helper: T?o AdminController v?i ClaimsPrincipal có NameIdentifier claim
		/// Dùng d? gi? l?p user dã dang nh?p v?i userId c? th?
		/// </summary>
		private AdminController CreateControllerWithUser(long userId = 1)
		{
			var controller = new AdminController(_adminServiceMock.Object);

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
		/// Helper: T?o AdminController KHÔNG có claim (user chua xác th?c)
		/// </summary>
		private AdminController CreateControllerWithoutUser()
		{
			var controller = new AdminController(_adminServiceMock.Object);

			controller.ControllerContext = new ControllerContext
			{
				HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal() }
			};

			return controller;
		}

		// =========================================================
		// 1? CreateUser — 11 test cases
		//    TC1:  Thành công ? 201 Created + ApiResponse ch?a CreateUserResponse
		//    TC2:  Verify response tr? v? d?y d? fields (UserId, Email, FullName, Username, GeneratedPassword, RoleName, CreatedAt)
		//    TC3:  ModelState invalid (thi?u Email) ? 400 BadRequest
		//    TC4:  ModelState invalid (nhi?u l?i: thi?u Email + FullName + RoleId) ? 400 BadRequest
		//    TC5:  Không có claim (user chua dang nh?p) ? 401 Unauthorized
		//    TC6:  Claim có giá tr? không ph?i s? (ví d?: "abc") ? 401 Unauthorized
		//    TC7:  Email dã t?n t?i ? InvalidOperationException ? 400 BadRequest
		//    TC8:  Role không t?n t?i ? InvalidOperationException ? 400 BadRequest
		//    TC9:  H? tên không h?p l? ? InvalidOperationException ? 400 BadRequest
		//    TC10: Exception không mong d?i (DB error) ? 500 InternalServerError
		//    TC11: Verify service nh?n dúng arguments (request + assignedBy)
		// =========================================================

		#region TC1: CreateUser — Thành công ? 201 Created
		[Fact]
		public async Task CreateUser_ReturnsCreated_WhenSuccessful()
		{
			// Arrange
			var controller = CreateControllerWithUser(userId: 10);
			var request = new CreateUserRequest
			{
				Email = "newuser@company.com",
				FullName = "Nguy?n Van Long",
				RoleId = 2
			};
			var expected = new CreateUserResponse
			{
				UserId = 100,
				Email = "newuser@company.com",
				FullName = "Nguy?n Van Long",
				Username = "anguyenv1",
				GeneratedPassword = "Abc@12345678",
				RoleName = "STAFF",
				CreatedAt = DateTime.UtcNow
			};

			_adminServiceMock
				.Setup(x => x.CreateUserAccountAsync(request, 10))
				.ReturnsAsync(expected);

			// Act
			var result = await controller.CreateUser(request);

			// Assert — Controller tr? v? Created("", ApiResponse<CreateUserResponse>)
			var created = result.Should().BeOfType<CreatedResult>().Subject;
			var apiResponse = created.Value.Should().BeOfType<ApiResponse<CreateUserResponse>>().Subject;

			apiResponse.Success.Should().BeTrue();
			apiResponse.Message.Should().Be("T?o tài kho?n thành công.");
			apiResponse.Data.Should().NotBeNull();
			apiResponse.Data!.Email.Should().Be("newuser@company.com");
		}
		#endregion

		#region TC2: CreateUser — Verify t?t c? fields trong response
		[Fact]
		public async Task CreateUser_ReturnsAllFields_WhenSuccessful()
		{
			// Arrange — Ki?m tra t?t c? fields trong CreateUserResponse du?c tr? v? d?y d?
			var controller = CreateControllerWithUser(userId: 5);
			var createdAt = new DateTime(2026, 2, 26, 10, 0, 0, DateTimeKind.Utc);
			var request = new CreateUserRequest
			{
				Email = "fullcheck@test.com",
				FullName = "Tr?n Th? B",
				RoleId = 3
			};
			var expected = new CreateUserResponse
			{
				UserId = 200,
				Email = "fullcheck@test.com",
				FullName = "Tr?n Th? B",
				Username = "btrant1",
				GeneratedPassword = "Xyz@98765432",
				RoleName = "SALE_SUPPORT",
				CreatedAt = createdAt
			};

			_adminServiceMock
				.Setup(x => x.CreateUserAccountAsync(request, 5))
				.ReturnsAsync(expected);

			// Act
			var result = await controller.CreateUser(request);

			// Assert — Verify t?ng field m?t
			var created = result.Should().BeOfType<CreatedResult>().Subject;
			var apiResponse = created.Value.Should().BeOfType<ApiResponse<CreateUserResponse>>().Subject;
			var data = apiResponse.Data!;

			data.UserId.Should().Be(200);
			data.Email.Should().Be("fullcheck@test.com");
			data.FullName.Should().Be("Tr?n Th? B");
			data.Username.Should().Be("btrant1");
			data.GeneratedPassword.Should().Be("Xyz@98765432");
			data.RoleName.Should().Be("SALE_SUPPORT");
			data.CreatedAt.Should().Be(createdAt);
		}
		#endregion

		#region TC3: CreateUser — ModelState invalid (thi?u Email)
		[Fact]
		public async Task CreateUser_ReturnsBadRequest_WhenEmailMissing()
		{
			// Arrange — Thi?u Email ? ModelState invalid
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("Email", "Email là b?t bu?c.");

			// Act
			var result = await controller.CreateUser(new CreateUserRequest());

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var apiResponse = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("D? li?u không h?p l?.");

			// Verify: Service KHÔNG du?c g?i khi ModelState invalid
			_adminServiceMock.Verify(
				x => x.CreateUserAccountAsync(It.IsAny<CreateUserRequest>(), It.IsAny<long>()),
				Times.Never);
		}
		#endregion

		#region TC4: CreateUser — ModelState invalid (nhi?u l?i cùng lúc)
		[Fact]
		public async Task CreateUser_ReturnsBadRequest_WhenMultipleFieldsInvalid()
		{
			// Arrange — Nhi?u fields b? l?i cùng lúc (Email + FullName + RoleId)
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("Email", "Email là b?t bu?c.");
			controller.ModelState.AddModelError("FullName", "H? tên là b?t bu?c.");
			controller.ModelState.AddModelError("RoleId", "Role là b?t bu?c.");

			// Act
			var result = await controller.CreateUser(new CreateUserRequest());

			// Assert — V?n tr? v? chung 1 message "D? li?u không h?p l?."
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var apiResponse = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("D? li?u không h?p l?.");

			// Verify: Service KHÔNG du?c g?i
			_adminServiceMock.Verify(
				x => x.CreateUserAccountAsync(It.IsAny<CreateUserRequest>(), It.IsAny<long>()),
				Times.Never);
		}
		#endregion

		#region TC5: CreateUser — Không có claim ? 401 Unauthorized
		[Fact]
		public async Task CreateUser_ReturnsUnauthorized_WhenClaimMissing()
		{
			// Arrange — Controller không có NameIdentifier claim (user chua dang nh?p)
			var controller = CreateControllerWithoutUser();

			// Act
			var result = await controller.CreateUser(new CreateUserRequest
			{
				Email = "test@test.com",
				FullName = "Test User",
				RoleId = 1
			});

			// Assert
			var unauthorized = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
			var apiResponse = unauthorized.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Không xác d?nh du?c danh tính ngu?i dùng.");

			// Verify: Service KHÔNG du?c g?i khi chua xác th?c
			_adminServiceMock.Verify(
				x => x.CreateUserAccountAsync(It.IsAny<CreateUserRequest>(), It.IsAny<long>()),
				Times.Never);
		}
		#endregion

		#region TC6: CreateUser — Claim có giá tr? không ph?i s? ? 401 Unauthorized
		[Fact]
		public async Task CreateUser_ReturnsUnauthorized_WhenClaimValueNotNumeric()
		{
			// Arrange — Claim NameIdentifier có giá tr? "abc" (không parse du?c thành long)
			var controller = new AdminController(_adminServiceMock.Object);
			var claims = new List<Claim>
			{
				new Claim(ClaimTypes.NameIdentifier, "not-a-number"), // giá tr? không h?p l?
                new Claim(ClaimTypes.Role, "ADMIN")
			};
			var identity = new ClaimsIdentity(claims, "TestAuth");
			controller.ControllerContext = new ControllerContext
			{
				HttpContext = new DefaultHttpContext
				{
					User = new ClaimsPrincipal(identity)
				}
			};

			// Act
			var result = await controller.CreateUser(new CreateUserRequest
			{
				Email = "test@test.com",
				FullName = "Test",
				RoleId = 1
			});

			// Assert — long.TryParse fail ? Unauthorized
			var unauthorized = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
			var apiResponse = unauthorized.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Không xác d?nh du?c danh tính ngu?i dùng.");
		}
		#endregion

		#region TC7: CreateUser — Email dã t?n t?i ? 400 BadRequest
		[Fact]
		public async Task CreateUser_ReturnsBadRequest_WhenEmailAlreadyExists()
		{
			// Arrange — Service ném InvalidOperationException: email dã du?c s? d?ng
			var controller = CreateControllerWithUser();
			var request = new CreateUserRequest
			{
				Email = "existing@company.com",
				FullName = "Existing User",
				RoleId = 1
			};

			_adminServiceMock
				.Setup(x => x.CreateUserAccountAsync(request, It.IsAny<long>()))
				.ThrowsAsync(new InvalidOperationException("Email này dã du?c s? d?ng."));

			// Act
			var result = await controller.CreateUser(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var apiResponse = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Email này dã du?c s? d?ng.");
		}
		#endregion

		#region TC8: CreateUser — Role không t?n t?i ? 400 BadRequest
		[Fact]
		public async Task CreateUser_ReturnsBadRequest_WhenRoleNotFound()
		{
			// Arrange — Service ném InvalidOperationException: role không t?n t?i
			var controller = CreateControllerWithUser();
			var request = new CreateUserRequest
			{
				Email = "new@company.com",
				FullName = "New User",
				RoleId = 9999  // Role ID không t?n t?i
			};

			_adminServiceMock
				.Setup(x => x.CreateUserAccountAsync(request, It.IsAny<long>()))
				.ThrowsAsync(new InvalidOperationException("Role không t?n t?i."));

			// Act
			var result = await controller.CreateUser(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var apiResponse = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Role không t?n t?i.");
		}
		#endregion

		#region TC9: CreateUser — H? tên không h?p l? ? 400 BadRequest
		[Fact]
		public async Task CreateUser_ReturnsBadRequest_WhenFullNameInvalid()
		{
			// Arrange — Service ném InvalidOperationException: h? tên không h?p l?
			//           (x?y ra khi GenerateUsernameAsync nh?n tên r?ng ho?c toàn kho?ng tr?ng)
			var controller = CreateControllerWithUser();
			var request = new CreateUserRequest
			{
				Email = "new@company.com",
				FullName = "   ",  // toàn kho?ng tr?ng
				RoleId = 1
			};

			_adminServiceMock
				.Setup(x => x.CreateUserAccountAsync(request, It.IsAny<long>()))
				.ThrowsAsync(new InvalidOperationException("H? tên không h?p l?."));

			// Act
			var result = await controller.CreateUser(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var apiResponse = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("H? tên không h?p l?.");
		}
		#endregion

		#region TC10: CreateUser — Exception không mong d?i ? 500 InternalServerError
		[Fact]
		public async Task CreateUser_Returns500_WhenUnexpectedException()
		{
			// Arrange — Service ném Exception không mong d?i (DB connection, timeout, etc.)
			var controller = CreateControllerWithUser();

			_adminServiceMock
				.Setup(x => x.CreateUserAccountAsync(It.IsAny<CreateUserRequest>(), It.IsAny<long>()))
				.ThrowsAsync(new Exception("DB connection failed"));

			// Act
			var result = await controller.CreateUser(new CreateUserRequest
			{
				Email = "test@test.com",
				FullName = "Test User",
				RoleId = 1
			});

			// Assert — Controller catch Exception ? StatusCode(500) + message h? th?ng
			var statusCode = result.Should().BeOfType<ObjectResult>().Subject;
			statusCode.StatusCode.Should().Be(500);

			var apiResponse = statusCode.Value.Should().BeOfType<ApiResponse<object>>().Subject;
			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Ðã x?y ra l?i h? th?ng.");
		}
		#endregion

		#region TC11: CreateUser — Verify service nh?n dúng arguments
		[Fact]
		public async Task CreateUser_PassesCorrectArguments_ToService()
		{
			// Arrange — userId = 99 trong claim, request có d?y d? thông tin
			var controller = CreateControllerWithUser(userId: 99);
			var request = new CreateUserRequest
			{
				Email = "verify@test.com",
				FullName = "Verify User",
				RoleId = 2
			};

			_adminServiceMock
				.Setup(x => x.CreateUserAccountAsync(request, 99))
				.ReturnsAsync(new CreateUserResponse
				{
					UserId = 1,
					Email = "verify@test.com",
					FullName = "Verify User",
					RoleName = "STAFF"
				})
				.Verifiable();

			// Act
			await controller.CreateUser(request);

			// Assert — Verify:
			// 1. Service du?c g?i dúng 1 l?n
			// 2. Request truy?n vào kh?p Email, FullName, RoleId
			// 3. assignedBy = 99 (l?y t? claim)
			_adminServiceMock.Verify(
				x => x.CreateUserAccountAsync(
					It.Is<CreateUserRequest>(r =>
						r.Email == "verify@test.com" &&
						r.FullName == "Verify User" &&
						r.RoleId == 2),
					99),
				Times.Once);
		}
		#endregion

		// =========================================================
		// 2?? GetUsers — 6 test cases
		//    TC1: L?y danh sách thành công (có data) ? 200 OK
		//    TC2: Danh sách r?ng ? 200 OK + empty Items
		//    TC3: Verify response data ch?a dúng thông tin user
		//    TC4: Verify filter truy?n dúng vào service
		//    TC5: Verify service ch? du?c g?i dúng 1 l?n
		//    TC6: Exception ? 500 InternalServerError
		// =========================================================

		#region TC1: GetUsers — L?y danh sách thành công (có data)
		[Fact]
		public async Task GetUsers_ReturnsOk_WhenSuccessful()
		{
			// Arrange
			var controller = CreateControllerWithUser();
			var users = new List<AdminUserResponse>
			{
				new AdminUserResponse
				{
					UserId = 1,
					FullName = "Nguy?n Van A",
					Email = "a@company.com",
					IsActive = true,
					RoleName = "ADMIN",
					Gender = null,
					DOB = null
				},
				new AdminUserResponse
				{
					UserId = 2,
					FullName = "Tr?n Th? B",
					Email = "b@company.com",
					IsActive = true,
					RoleName = "STAFF",
					Gender = "Female",
					DOB = new DateOnly(1995, 5, 20)
				}
			};
			var expected = new PagedResult<AdminUserResponse>(users, 2, 1, 10);

			_adminServiceMock
				.Setup(x => x.GetUserListAsync(It.IsAny<FilterRequest>()))
				.ReturnsAsync(expected);

			// Act
			var result = await controller.GetUsers(new FilterRequest());

			// Assert — Tr? v? 200 OK + ApiResponse success + message dúng
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var apiResponse = ok.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeTrue();
			apiResponse.Message.Should().Be("L?y danh sách ngu?i dùng thành công.");
		}
		#endregion

		#region TC2: GetUsers — Danh sách r?ng ? 200 OK + empty
		[Fact]
		public async Task GetUsers_ReturnsOk_WhenEmptyList()
		{
			// Arrange — Không có user nào trong h? th?ng
			var controller = CreateControllerWithUser();
			var expected = new PagedResult<AdminUserResponse>(
				new List<AdminUserResponse>(), 0, 1, 10);

			_adminServiceMock
				.Setup(x => x.GetUserListAsync(It.IsAny<FilterRequest>()))
				.ReturnsAsync(expected);

			// Act
			var result = await controller.GetUsers(new FilterRequest());

			// Assert — V?n tr? v? 200 OK, không ph?i 404
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var apiResponse = ok.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeTrue();
			apiResponse.Message.Should().Be("L?y danh sách ngu?i dùng thành công.");
		}
		#endregion

		#region TC3: GetUsers — Verify response data ch?a dúng thông tin user
		[Fact]
		public async Task GetUsers_ReturnsCorrectData_InResponse()
		{
			// Arrange — T?o danh sách user v?i d?y d? thông tin d? verify
			var controller = CreateControllerWithUser();
			var createdAt = new DateTime(2026, 1, 15, 8, 0, 0, DateTimeKind.Utc);
			var users = new List<AdminUserResponse>
			{
				new AdminUserResponse
				{
					UserId = 10,
					FullName = "Lê Minh C",
					Username = "clm1",
					Email = "c@company.com",
					Phone = "0901234567",
					IsActive = true,
					RoleName = "DIRECTOR",
					CreatedAt = createdAt,
					LastLoginAt = createdAt.AddDays(5),
					Gender = "Male",
					DOB = new DateOnly(1990, 3, 15)
				}
			};
			var expected = new PagedResult<AdminUserResponse>(users, 1, 1, 10);

			_adminServiceMock
				.Setup(x => x.GetUserListAsync(It.IsAny<FilterRequest>()))
				.ReturnsAsync(expected);

			// Act
			var result = await controller.GetUsers(new FilterRequest());

			// Assert — Verify ApiResponse.Data ch?a dúng PagedResult
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var apiResponse = ok.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeTrue();
			apiResponse.Data.Should().NotBeNull();
			// Data bên trong là PagedResult, verify nó không null
			apiResponse.Data.Should().BeEquivalentTo(expected);
		}
		#endregion

		#region TC4: GetUsers — Verify filter truy?n dúng vào service
		[Fact]
		public async Task GetUsers_PassesFilterCorrectly_ToService()
		{
			// Arrange — Truy?n filter PageNumber=3, PageSize=15
			var controller = CreateControllerWithUser();
			var filter = new FilterRequest { PageNumber = 3, PageSize = 15 };

			_adminServiceMock
				.Setup(x => x.GetUserListAsync(filter))
				.ReturnsAsync(new PagedResult<AdminUserResponse>(
					new List<AdminUserResponse>(), 0, 3, 15))
				.Verifiable();

			// Act
			await controller.GetUsers(filter);

			// Assert — Verify service nh?n dúng filter object (cùng reference)
			_adminServiceMock.Verify(
				x => x.GetUserListAsync(filter),
				Times.Once);
		}
		#endregion

		#region TC5: GetUsers — Verify service ch? du?c g?i dúng 1 l?n
		[Fact]
		public async Task GetUsers_CallsServiceExactlyOnce()
		{
			// Arrange
			var controller = CreateControllerWithUser();

			_adminServiceMock
				.Setup(x => x.GetUserListAsync(It.IsAny<FilterRequest>()))
				.ReturnsAsync(new PagedResult<AdminUserResponse>(
					new List<AdminUserResponse>(), 0, 1, 20));

			// Act
			await controller.GetUsers(new FilterRequest());

			// Assert — Service GetUserListAsync ch? du?c g?i dúng 1 l?n, không g?i l?i
			_adminServiceMock.Verify(
				x => x.GetUserListAsync(It.IsAny<FilterRequest>()),
				Times.Once);

			// Không có method nào khác c?a service du?c g?i
			_adminServiceMock.VerifyNoOtherCalls();
		}
		#endregion

		#region TC6: GetUsers — Exception ? 500 InternalServerError
		[Fact]
		public async Task GetUsers_Returns500_WhenException()
		{
			// Arrange — Service ném exception (DB timeout, connection refused, etc.)
			var controller = CreateControllerWithUser();

			_adminServiceMock
				.Setup(x => x.GetUserListAsync(It.IsAny<FilterRequest>()))
				.ThrowsAsync(new Exception("Database timeout"));

			// Act
			var result = await controller.GetUsers(new FilterRequest());

			// Assert — Controller catch t?t c? Exception ? StatusCode(500)
			var statusCode = result.Should().BeOfType<ObjectResult>().Subject;
			statusCode.StatusCode.Should().Be(500);

			var apiResponse = statusCode.Value.Should().BeOfType<ApiResponse<object>>().Subject;
			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Ðã x?y ra l?i h? th?ng.");
		}
		#endregion

		#region UTCID 01: UpdateUser — Normal — C?p nh?t thành công (Enable)
		[Fact]
		public async Task UpdateUser_UTCID01_ReturnsOk_WhenSuccessful()
		{
			// Arrange
			var controller = CreateControllerWithUser(userId: 5);
			// Request v?n dùng RoleId d? g?i lên
			var request = new UpdateUserRequest { FullName = "vu duc thang", RoleId = 1, IsActive = true };

			// Response tr? v? RoleName (VD: "ADMIN") thay vì RoleId
			var expected = new AdminUserResponse
			{
				FullName = "vu duc thang",
				RoleName = "ADMIN", // Ðã s?a t? RoleId thành RoleName
				IsActive = true,
				Gender = null,
				DOB = null
			};

			_adminServiceMock.Setup(x => x.UpdateUserAsync(1, request, 5)).ReturnsAsync(expected);

			// Act
			var result = await controller.UpdateUser(1, request);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<AdminUserResponse>>().Subject;
			response.Data!.RoleName.Should().Be("ADMIN"); // Verify theo RoleName
			response.Data!.Gender.Should().BeNull();
			response.Data!.DOB.Should().BeNull();
			response.Message.Should().Be("C?p nh?t thông tin ngu?i dùng thành công.");
		}
		#endregion

		#region UTCID 02: UpdateUser — Normal — C?p nh?t tr?ng thái Disable thành công
		[Fact]
		public async Task UpdateUser_UTCID02_ReturnsOk_WhenDisable()
		{
			// Arrange — Role: Empty, Status: Disable
			var controller = CreateControllerWithUser(userId: 5);
			var request = new UpdateUserRequest { RoleId = null, IsActive = false };
			var expected = new AdminUserResponse { IsActive = false, Gender = null, DOB = null };

			_adminServiceMock.Setup(x => x.UpdateUserAsync(1, request, 5)).ReturnsAsync(expected);

			// Act
			var result = await controller.UpdateUser(1, request);

			// Assert
			result.Should().BeOfType<OkObjectResult>(); //
		}
		#endregion

		

		#region UTCID 03: UpdateUser — Abnormal — Tên tr?ng
		[Fact]
		public async Task UpdateUser_UTCID03_ReturnsBadRequest_WhenNameEmpty()
		{
			// Arrange — FullName: Null or Empty
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("FullName", "Required");

			// Act
			var result = await controller.UpdateUser(1, new UpdateUserRequest { FullName = "" });

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var response = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;
			response.Message.Should().Be("D? li?u không h?p l?."); //
		}
		#endregion

		#region UTCID 04: UpdateUser — Boundary — Tên ch?a ký t? d?c bi?t
		[Fact]
		public async Task UpdateUser_UTCID04_ReturnsBadRequest_WhenSpecialChars()
		{
			// Arrange — FullName: "tthang80%$"
			var controller = CreateControllerWithUser();
			var request = new UpdateUserRequest { FullName = "tthang80%$" };

			// Gi? l?p Validation ch?n ký t? d?c bi?t
			controller.ModelState.AddModelError("FullName", "Invalid format");

			// Act
			var result = await controller.UpdateUser(1, request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("D? li?u không h?p l?."); //
		}
		#endregion

		#region UTCID 05: UpdateUser — Abnormal — Không có Token
		[Fact]
		public async Task UpdateUser_UTCID05_ReturnsUnauthorized_WhenNoToken()
		{
			// Arrange — Precondition: No claim/Token
			var controller = CreateControllerWithoutUser();

			// Act
			var result = await controller.UpdateUser(1, new UpdateUserRequest());

			// Assert
			var unauth = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
			((ApiResponse<object>)unauth.Value!).Message.Should().Be("Không xác d?nh du?c danh tính ngu?i dùng."); //
		}
		#endregion

		#region UTCID 06: UpdateUser — Abnormal — Ngu?i dùng không t?n t?i
		[Fact]
		public async Task UpdateUser_UTCID06_ReturnsNotFound_WhenUserNotExist()
		{
			// Arrange
			var controller = CreateControllerWithUser();
			_adminServiceMock.Setup(x => x.UpdateUserAsync(999, It.IsAny<UpdateUserRequest>(), It.IsAny<long>()))
							 .ThrowsAsync(new KeyNotFoundException("Ngu?i dùng không t?n t?i."));

			// Act
			var result = await controller.UpdateUser(999, new UpdateUserRequest());

			// Assert
			var nf = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			((ApiResponse<object>)nf.Value!).Message.Should().Be("Ngu?i dùng không t?n t?i."); //
		}
		#endregion

		#region UTCID 07: UpdateUser — Abnormal — Admin t? d?i tr?ng thái chính mình
		[Fact]
		public async Task UpdateUser_UTCID07_ReturnsBadRequest_WhenSelfUpdateStatus()
		{
			// Arrange — Admin ID 5 t? s?a chính mình
			var controller = CreateControllerWithUser(userId: 5);
			_adminServiceMock.Setup(x => x.UpdateUserAsync(5, It.IsAny<UpdateUserRequest>(), 5))
							 .ThrowsAsync(new InvalidOperationException("B?n không du?c phép thay d?i tr?ng thái tài kho?n c?a chính mình."));

			// Act
			var result = await controller.UpdateUser(5, new UpdateUserRequest { IsActive = false });

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("B?n không du?c phép thay d?i tr?ng thái"); //
		}
		#endregion

		#region UTCID 08: UpdateUser — Abnormal — Username dã t?n t?i
		[Fact]
		public async Task UpdateUser_UTCID08_ReturnsBadRequest_WhenUsernameExists()
		{
			// Arrange
			var controller = CreateControllerWithUser();
			_adminServiceMock.Setup(x => x.UpdateUserAsync(It.IsAny<long>(), It.IsAny<UpdateUserRequest>(), It.IsAny<long>()))
							 .ThrowsAsync(new InvalidOperationException("Username 'newUsername' dã t?n t?i."));

			// Act
			var result = await controller.UpdateUser(1, new UpdateUserRequest());

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("dã t?n t?i"); //
		}
		#endregion

		#region UTCID 09: UpdateUser — Abnormal — Role không t?n t?i
		[Fact]
		public async Task UpdateUser_UTCID09_ReturnsBadRequest_WhenRoleInvalid()
		{
			// Arrange — Role: 9999999
			var controller = CreateControllerWithUser();
			_adminServiceMock.Setup(x => x.UpdateUserAsync(1, It.IsAny<UpdateUserRequest>(), It.IsAny<long>()))
							 .ThrowsAsync(new InvalidOperationException("Role không t?n t?i."));

			// Act
			var result = await controller.UpdateUser(1, new UpdateUserRequest { RoleId = 9999999 });

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Role không t?n t?i."); //
		}
		#endregion

		#region UTCID 10: UpdateUser — Abnormal — L?i h? th?ng 500
		[Fact]
		public async Task UpdateUser_UTCID10_Returns500_WhenSystemError()
		{
			// Arrange — General Exception
			var controller = CreateControllerWithUser();
			_adminServiceMock.Setup(x => x.UpdateUserAsync(It.IsAny<long>(), It.IsAny<UpdateUserRequest>(), It.IsAny<long>()))
							 .ThrowsAsync(new Exception());

			// Act
			var result = await controller.UpdateUser(1, new UpdateUserRequest());

			// Assert
			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Be("Ðã x?y ra l?i h? th?ng."); //
		}
		#endregion
		// =========================================================
		// 4? ToggleUserStatus — 6 test cases 
		// =========================================================

		#region UTCID 01: Toggle Disable thành công
		[Fact]
		public async Task ToggleUserStatus_UTCID01_ReturnsOk_WhenDisableSuccessful()
		{
			// Arrange — TargetUserId: 1, Current: Active -> Result: IsActive = false
			var controller = CreateControllerWithUser(userId: 10);
			var expected = new AdminUserResponse
			{
				UserId = 1,
				IsActive = false,
				Gender = null,
				DOB = null
			};

			_adminServiceMock
				.Setup(x => x.ToggleUserStatusAsync(1, 10))
				.ReturnsAsync(expected);

			// Act
			var result = await controller.ToggleUserStatus(1);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var apiResponse = ok.Value.Should().BeOfType<ApiResponse<AdminUserResponse>>().Subject;

			apiResponse.Success.Should().BeTrue();
			apiResponse.Data!.IsActive.Should().BeFalse();
			apiResponse.Message.Should().Contain("Disable");
		}
		#endregion

		#region UTCID 02: Toggle Enable thành công
		[Fact]
		public async Task ToggleUserStatus_UTCID02_ReturnsOk_WhenEnableSuccessful()
		{
			// Arrange — TargetUserId: 2, Current: Disable -> Result: IsActive = true
			var controller = CreateControllerWithUser(userId: 10);
			var expected = new AdminUserResponse
			{
				UserId = 2,
				IsActive = true,
				Gender = "Male",
				DOB = new DateOnly(1992, 8, 10)
			};

			_adminServiceMock
				.Setup(x => x.ToggleUserStatusAsync(2, 10))
				.ReturnsAsync(expected);

			// Act
			var result = await controller.ToggleUserStatus(2);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var apiResponse = ok.Value.Should().BeOfType<ApiResponse<AdminUserResponse>>().Subject;

			apiResponse.Success.Should().BeTrue();
			apiResponse.Data!.IsActive.Should().BeTrue();
			apiResponse.Message.Should().Contain("Enable");
		}
		#endregion

		#region UTCID 03: Không có claim -> 401 Unauthorized
		[Fact]
		public async Task ToggleUserStatus_UTCID03_ReturnsUnauthorized_WhenClaimMissing()
		{
			// Arrange — Precondition: No claim/Token
			var controller = CreateControllerWithoutUser();

			// Act
			var result = await controller.ToggleUserStatus(1);

			// Assert
			var unauthorized = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
			var apiResponse = unauthorized.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Không xác d?nh du?c danh tính ngu?i dùng.");
		}
		#endregion

		#region UTCID 04: User không t?n t?i -> 404 NotFound
		[Fact]
		public async Task ToggleUserStatus_UTCID04_ReturnsNotFound_WhenUserNotExist()
		{
			// Arrange — TargetUserId: 99999
			var controller = CreateControllerWithUser();

			_adminServiceMock
				.Setup(x => x.ToggleUserStatusAsync(99999, It.IsAny<long>()))
				.ThrowsAsync(new KeyNotFoundException("Ngu?i dùng không t?n t?i."));

			// Act
			var result = await controller.ToggleUserStatus(99999);

			// Assert
			var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			var apiResponse = notFound.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Ngu?i dùng không t?n t?i.");
		}
		#endregion

		#region UTCID 05: Admin t? toggle chính mình -> 400 BadRequest
		[Fact]
		public async Task ToggleUserStatus_UTCID05_ReturnsBadRequest_WhenSelfToggle()
		{
			// Arrange — TargetUserId trùng v?i Admin ID
			var controller = CreateControllerWithUser(userId: 1);

			_adminServiceMock
				.Setup(x => x.ToggleUserStatusAsync(1, 1))
				.ThrowsAsync(new InvalidOperationException("B?n không du?c phép thay d?i tr?ng thái tài kho?n c?a chính mình."));

			// Act
			var result = await controller.ToggleUserStatus(1);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var apiResponse = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("B?n không du?c phép thay d?i tr?ng thái tài kho?n c?a chính mình.");
		}
		#endregion

		#region UTCID 06: Exception không mong d?i -> 500 InternalServerError
		[Fact]
		public async Task ToggleUserStatus_UTCID06_Returns500_WhenUnexpectedException()
		{
			// Arrange — General Exception
			var controller = CreateControllerWithUser();

			_adminServiceMock
				.Setup(x => x.ToggleUserStatusAsync(1, It.IsAny<long>()))
				.ThrowsAsync(new Exception());

			// Act
			var result = await controller.ToggleUserStatus(1);

			// Assert
			var statusCode = result.Should().BeOfType<ObjectResult>().Subject;
			statusCode.StatusCode.Should().Be(500);

			var apiResponse = statusCode.Value.Should().BeOfType<ApiResponse<object>>().Subject;
			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Ðã x?y ra l?i h? th?ng.");
		}
		#endregion

		// =========================================================
		// 5? ExportUsersExcel — 3 test cases
		//    TC1: Export thành công ? FileContentResult
		//    TC2: Exception ? 500 InternalServerError
		//    TC3: Verify dúng content-type và filename
		// =========================================================

		[Fact]
		public async Task ExportUsersExcel_ReturnsFile_WhenSuccessful()
		{
			// Arrange
			var controller = CreateControllerWithUser();
			var fileContent = new byte[] { 0x50, 0x4B, 0x03, 0x04 }; // fake Excel bytes
			var fileName = "Users_20260226.xlsx";

			_adminServiceMock
				.Setup(x => x.ExportUserListExcelAsync())
				.ReturnsAsync((fileContent, fileName));

			// Act
			var result = await controller.ExportUsersExcel();

			// Assert — Controller tr? v? File(content, contentType, fileName)
			var fileResult = result.Should().BeOfType<FileContentResult>().Subject;

			fileResult.FileContents.Should().BeEquivalentTo(fileContent);
			fileResult.FileDownloadName.Should().Be(fileName);
		}

		[Fact]
		public async Task ExportUsersExcel_Returns500_WhenException()
		{
			// Arrange
			var controller = CreateControllerWithUser();

			_adminServiceMock
				.Setup(x => x.ExportUserListExcelAsync())
				.ThrowsAsync(new Exception("Export failed"));

			// Act
			var result = await controller.ExportUsersExcel();

			// Assert
			var statusCode = result.Should().BeOfType<ObjectResult>().Subject;
			statusCode.StatusCode.Should().Be(500);
		}

		[Fact]
		public async Task ExportUsersExcel_ReturnsCorrectContentType()
		{
			// Arrange
			var controller = CreateControllerWithUser();
			var fileContent = new byte[] { 0x01, 0x02 };

			_adminServiceMock
				.Setup(x => x.ExportUserListExcelAsync())
				.ReturnsAsync((fileContent, "test.xlsx"));

			// Act
			var result = await controller.ExportUsersExcel();

			// Assert — Content-Type ph?i là xlsx MIME type
			var fileResult = result.Should().BeOfType<FileContentResult>().Subject;
			fileResult.ContentType.Should().Be(
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
		}
	}
}
