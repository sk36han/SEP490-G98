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

namespace Warehouse.Api.Tests.Admin
{
	public class AdminControllerTests
	{
		private readonly Mock<IAdminService> _adminServiceMock = new();

		/// <summary>
		/// Helper: Tạo AdminController với ClaimsPrincipal có NameIdentifier claim
		/// Dùng để giả lập user đã đăng nhập với userId cụ thể
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
		/// Helper: Tạo AdminController KHÔNG có claim (user chưa xác thực)
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
		// 1️ CreateUser — 11 test cases
		//    TC1:  Thành công → 201 Created + ApiResponse chứa CreateUserResponse
		//    TC2:  Verify response trả về đầy đủ fields (UserId, Email, FullName, Username, GeneratedPassword, RoleName, CreatedAt)
		//    TC3:  ModelState invalid (thiếu Email) → 400 BadRequest
		//    TC4:  ModelState invalid (nhiều lỗi: thiếu Email + FullName + RoleId) → 400 BadRequest
		//    TC5:  Không có claim (user chưa đăng nhập) → 401 Unauthorized
		//    TC6:  Claim có giá trị không phải số (ví dụ: "abc") → 401 Unauthorized
		//    TC7:  Email đã tồn tại → InvalidOperationException → 400 BadRequest
		//    TC8:  Role không tồn tại → InvalidOperationException → 400 BadRequest
		//    TC9:  Họ tên không hợp lệ → InvalidOperationException → 400 BadRequest
		//    TC10: Exception không mong đợi (DB error) → 500 InternalServerError
		//    TC11: Verify service nhận đúng arguments (request + assignedBy)
		// =========================================================

		#region TC1: CreateUser — Thành công → 201 Created
		[Fact]
		public async Task CreateUser_ReturnsCreated_WhenSuccessful()
		{
			// Arrange
			var controller = CreateControllerWithUser(userId: 10);
			var request = new CreateUserRequest
			{
				Email = "newuser@company.com",
				FullName = "Nguyễn Văn Long",
				RoleId = 2
			};
			var expected = new CreateUserResponse
			{
				UserId = 100,
				Email = "newuser@company.com",
				FullName = "Nguyễn Văn Long",
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

			// Assert — Controller trả về Created("", ApiResponse<CreateUserResponse>)
			var created = result.Should().BeOfType<CreatedResult>().Subject;
			var apiResponse = created.Value.Should().BeOfType<ApiResponse<CreateUserResponse>>().Subject;

			apiResponse.Success.Should().BeTrue();
			apiResponse.Message.Should().Be("Tạo tài khoản thành công.");
			apiResponse.Data.Should().NotBeNull();
			apiResponse.Data!.Email.Should().Be("newuser@company.com");
		}
		#endregion

		#region TC2: CreateUser — Verify tất cả fields trong response
		[Fact]
		public async Task CreateUser_ReturnsAllFields_WhenSuccessful()
		{
			// Arrange — Kiểm tra tất cả fields trong CreateUserResponse được trả về đầy đủ
			var controller = CreateControllerWithUser(userId: 5);
			var createdAt = new DateTime(2026, 2, 26, 10, 0, 0, DateTimeKind.Utc);
			var request = new CreateUserRequest
			{
				Email = "fullcheck@test.com",
				FullName = "Trần Thị B",
				RoleId = 3
			};
			var expected = new CreateUserResponse
			{
				UserId = 200,
				Email = "fullcheck@test.com",
				FullName = "Trần Thị B",
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

			// Assert — Verify từng field một
			var created = result.Should().BeOfType<CreatedResult>().Subject;
			var apiResponse = created.Value.Should().BeOfType<ApiResponse<CreateUserResponse>>().Subject;
			var data = apiResponse.Data!;

			data.UserId.Should().Be(200);
			data.Email.Should().Be("fullcheck@test.com");
			data.FullName.Should().Be("Trần Thị B");
			data.Username.Should().Be("btrant1");
			data.GeneratedPassword.Should().Be("Xyz@98765432");
			data.RoleName.Should().Be("SALE_SUPPORT");
			data.CreatedAt.Should().Be(createdAt);
		}
		#endregion

		#region TC3: CreateUser — ModelState invalid (thiếu Email)
		[Fact]
		public async Task CreateUser_ReturnsBadRequest_WhenEmailMissing()
		{
			// Arrange — Thiếu Email → ModelState invalid
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("Email", "Email là bắt buộc.");

			// Act
			var result = await controller.CreateUser(new CreateUserRequest());

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var apiResponse = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Dữ liệu không hợp lệ.");

			// Verify: Service KHÔNG được gọi khi ModelState invalid
			_adminServiceMock.Verify(
				x => x.CreateUserAccountAsync(It.IsAny<CreateUserRequest>(), It.IsAny<long>()),
				Times.Never);
		}
		#endregion

		#region TC4: CreateUser — ModelState invalid (nhiều lỗi cùng lúc)
		[Fact]
		public async Task CreateUser_ReturnsBadRequest_WhenMultipleFieldsInvalid()
		{
			// Arrange — Nhiều fields bị lỗi cùng lúc (Email + FullName + RoleId)
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("Email", "Email là bắt buộc.");
			controller.ModelState.AddModelError("FullName", "Họ tên là bắt buộc.");
			controller.ModelState.AddModelError("RoleId", "Role là bắt buộc.");

			// Act
			var result = await controller.CreateUser(new CreateUserRequest());

			// Assert — Vẫn trả về chung 1 message "Dữ liệu không hợp lệ."
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var apiResponse = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Dữ liệu không hợp lệ.");

			// Verify: Service KHÔNG được gọi
			_adminServiceMock.Verify(
				x => x.CreateUserAccountAsync(It.IsAny<CreateUserRequest>(), It.IsAny<long>()),
				Times.Never);
		}
		#endregion

		#region TC5: CreateUser — Không có claim → 401 Unauthorized
		[Fact]
		public async Task CreateUser_ReturnsUnauthorized_WhenClaimMissing()
		{
			// Arrange — Controller không có NameIdentifier claim (user chưa đăng nhập)
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
			apiResponse.Message.Should().Be("Không xác định được danh tính người dùng.");

			// Verify: Service KHÔNG được gọi khi chưa xác thực
			_adminServiceMock.Verify(
				x => x.CreateUserAccountAsync(It.IsAny<CreateUserRequest>(), It.IsAny<long>()),
				Times.Never);
		}
		#endregion

		#region TC6: CreateUser — Claim có giá trị không phải số → 401 Unauthorized
		[Fact]
		public async Task CreateUser_ReturnsUnauthorized_WhenClaimValueNotNumeric()
		{
			// Arrange — Claim NameIdentifier có giá trị "abc" (không parse được thành long)
			var controller = new AdminController(_adminServiceMock.Object);
			var claims = new List<Claim>
			{
				new Claim(ClaimTypes.NameIdentifier, "not-a-number"), // giá trị không hợp lệ
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

			// Assert — long.TryParse fail → Unauthorized
			var unauthorized = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
			var apiResponse = unauthorized.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Không xác định được danh tính người dùng.");
		}
		#endregion

		#region TC7: CreateUser — Email đã tồn tại → 400 BadRequest
		[Fact]
		public async Task CreateUser_ReturnsBadRequest_WhenEmailAlreadyExists()
		{
			// Arrange — Service ném InvalidOperationException: email đã được sử dụng
			var controller = CreateControllerWithUser();
			var request = new CreateUserRequest
			{
				Email = "existing@company.com",
				FullName = "Existing User",
				RoleId = 1
			};

			_adminServiceMock
				.Setup(x => x.CreateUserAccountAsync(request, It.IsAny<long>()))
				.ThrowsAsync(new InvalidOperationException("Email này đã được sử dụng."));

			// Act
			var result = await controller.CreateUser(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var apiResponse = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Email này đã được sử dụng.");
		}
		#endregion

		#region TC8: CreateUser — Role không tồn tại → 400 BadRequest
		[Fact]
		public async Task CreateUser_ReturnsBadRequest_WhenRoleNotFound()
		{
			// Arrange — Service ném InvalidOperationException: role không tồn tại
			var controller = CreateControllerWithUser();
			var request = new CreateUserRequest
			{
				Email = "new@company.com",
				FullName = "New User",
				RoleId = 9999  // Role ID không tồn tại
			};

			_adminServiceMock
				.Setup(x => x.CreateUserAccountAsync(request, It.IsAny<long>()))
				.ThrowsAsync(new InvalidOperationException("Role không tồn tại."));

			// Act
			var result = await controller.CreateUser(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var apiResponse = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Role không tồn tại.");
		}
		#endregion

		#region TC9: CreateUser — Họ tên không hợp lệ → 400 BadRequest
		[Fact]
		public async Task CreateUser_ReturnsBadRequest_WhenFullNameInvalid()
		{
			// Arrange — Service ném InvalidOperationException: họ tên không hợp lệ
			//           (xảy ra khi GenerateUsernameAsync nhận tên rỗng hoặc toàn khoảng trắng)
			var controller = CreateControllerWithUser();
			var request = new CreateUserRequest
			{
				Email = "new@company.com",
				FullName = "   ",  // toàn khoảng trắng
				RoleId = 1
			};

			_adminServiceMock
				.Setup(x => x.CreateUserAccountAsync(request, It.IsAny<long>()))
				.ThrowsAsync(new InvalidOperationException("Họ tên không hợp lệ."));

			// Act
			var result = await controller.CreateUser(request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var apiResponse = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Họ tên không hợp lệ.");
		}
		#endregion

		#region TC10: CreateUser — Exception không mong đợi → 500 InternalServerError
		[Fact]
		public async Task CreateUser_Returns500_WhenUnexpectedException()
		{
			// Arrange — Service ném Exception không mong đợi (DB connection, timeout, etc.)
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

			// Assert — Controller catch Exception → StatusCode(500) + message hệ thống
			var statusCode = result.Should().BeOfType<ObjectResult>().Subject;
			statusCode.StatusCode.Should().Be(500);

			var apiResponse = statusCode.Value.Should().BeOfType<ApiResponse<object>>().Subject;
			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Đã xảy ra lỗi hệ thống.");
		}
		#endregion

		#region TC11: CreateUser — Verify service nhận đúng arguments
		[Fact]
		public async Task CreateUser_PassesCorrectArguments_ToService()
		{
			// Arrange — userId = 99 trong claim, request có đầy đủ thông tin
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
			// 1. Service được gọi đúng 1 lần
			// 2. Request truyền vào khớp Email, FullName, RoleId
			// 3. assignedBy = 99 (lấy từ claim)
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
		// 2️⃣ GetUsers — 6 test cases
		//    TC1: Lấy danh sách thành công (có data) → 200 OK
		//    TC2: Danh sách rỗng → 200 OK + empty Items
		//    TC3: Verify response data chứa đúng thông tin user
		//    TC4: Verify filter truyền đúng vào service
		//    TC5: Verify service chỉ được gọi đúng 1 lần
		//    TC6: Exception → 500 InternalServerError
		// =========================================================

		#region TC1: GetUsers — Lấy danh sách thành công (có data)
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
					FullName = "Nguyễn Văn A",
					Email = "a@company.com",
					IsActive = true,
					RoleName = "ADMIN",
					Gender = null,
					DOB = null
				},
				new AdminUserResponse
				{
					UserId = 2,
					FullName = "Trần Thị B",
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

			// Assert — Trả về 200 OK + ApiResponse success + message đúng
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var apiResponse = ok.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeTrue();
			apiResponse.Message.Should().Be("Lấy danh sách người dùng thành công.");
		}
		#endregion

		#region TC2: GetUsers — Danh sách rỗng → 200 OK + empty
		[Fact]
		public async Task GetUsers_ReturnsOk_WhenEmptyList()
		{
			// Arrange — Không có user nào trong hệ thống
			var controller = CreateControllerWithUser();
			var expected = new PagedResult<AdminUserResponse>(
				new List<AdminUserResponse>(), 0, 1, 10);

			_adminServiceMock
				.Setup(x => x.GetUserListAsync(It.IsAny<FilterRequest>()))
				.ReturnsAsync(expected);

			// Act
			var result = await controller.GetUsers(new FilterRequest());

			// Assert — Vẫn trả về 200 OK, không phải 404
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var apiResponse = ok.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeTrue();
			apiResponse.Message.Should().Be("Lấy danh sách người dùng thành công.");
		}
		#endregion

		#region TC3: GetUsers — Verify response data chứa đúng thông tin user
		[Fact]
		public async Task GetUsers_ReturnsCorrectData_InResponse()
		{
			// Arrange — Tạo danh sách user với đầy đủ thông tin để verify
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

			// Assert — Verify ApiResponse.Data chứa đúng PagedResult
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var apiResponse = ok.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeTrue();
			apiResponse.Data.Should().NotBeNull();
			// Data bên trong là PagedResult, verify nó không null
			apiResponse.Data.Should().BeEquivalentTo(expected);
		}
		#endregion

		#region TC4: GetUsers — Verify filter truyền đúng vào service
		[Fact]
		public async Task GetUsers_PassesFilterCorrectly_ToService()
		{
			// Arrange — Truyền filter PageNumber=3, PageSize=15
			var controller = CreateControllerWithUser();
			var filter = new FilterRequest { PageNumber = 3, PageSize = 15 };

			_adminServiceMock
				.Setup(x => x.GetUserListAsync(filter))
				.ReturnsAsync(new PagedResult<AdminUserResponse>(
					new List<AdminUserResponse>(), 0, 3, 15))
				.Verifiable();

			// Act
			await controller.GetUsers(filter);

			// Assert — Verify service nhận đúng filter object (cùng reference)
			_adminServiceMock.Verify(
				x => x.GetUserListAsync(filter),
				Times.Once);
		}
		#endregion

		#region TC5: GetUsers — Verify service chỉ được gọi đúng 1 lần
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

			// Assert — Service GetUserListAsync chỉ được gọi đúng 1 lần, không gọi lại
			_adminServiceMock.Verify(
				x => x.GetUserListAsync(It.IsAny<FilterRequest>()),
				Times.Once);

			// Không có method nào khác của service được gọi
			_adminServiceMock.VerifyNoOtherCalls();
		}
		#endregion

		#region TC6: GetUsers — Exception → 500 InternalServerError
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

			// Assert — Controller catch tất cả Exception → StatusCode(500)
			var statusCode = result.Should().BeOfType<ObjectResult>().Subject;
			statusCode.StatusCode.Should().Be(500);

			var apiResponse = statusCode.Value.Should().BeOfType<ApiResponse<object>>().Subject;
			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Đã xảy ra lỗi hệ thống.");
		}
		#endregion

		#region UTCID 01: UpdateUser — Normal — Cập nhật thành công (Enable)
		[Fact]
		public async Task UpdateUser_UTCID01_ReturnsOk_WhenSuccessful()
		{
			// Arrange
			var controller = CreateControllerWithUser(userId: 5);
			// Request vẫn dùng RoleId để gửi lên
			var request = new UpdateUserRequest { FullName = "vu duc thang", RoleId = 1, IsActive = true };

			// Response trả về RoleName (VD: "ADMIN") thay vì RoleId
			var expected = new AdminUserResponse
			{
				FullName = "vu duc thang",
				RoleName = "ADMIN", // Đã sửa từ RoleId thành RoleName
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
			response.Message.Should().Be("Cập nhật thông tin người dùng thành công.");
		}
		#endregion

		#region UTCID 02: UpdateUser — Normal — Cập nhật trạng thái Disable thành công
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

		

		#region UTCID 03: UpdateUser — Abnormal — Tên trống
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
			response.Message.Should().Be("Dữ liệu không hợp lệ."); //
		}
		#endregion

		#region UTCID 04: UpdateUser — Boundary — Tên chứa ký tự đặc biệt
		[Fact]
		public async Task UpdateUser_UTCID04_ReturnsBadRequest_WhenSpecialChars()
		{
			// Arrange — FullName: "tthang80%$"
			var controller = CreateControllerWithUser();
			var request = new UpdateUserRequest { FullName = "tthang80%$" };

			// Giả lập Validation chặn ký tự đặc biệt
			controller.ModelState.AddModelError("FullName", "Invalid format");

			// Act
			var result = await controller.UpdateUser(1, request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ."); //
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
			((ApiResponse<object>)unauth.Value!).Message.Should().Be("Không xác định được danh tính người dùng."); //
		}
		#endregion

		#region UTCID 06: UpdateUser — Abnormal — Người dùng không tồn tại
		[Fact]
		public async Task UpdateUser_UTCID06_ReturnsNotFound_WhenUserNotExist()
		{
			// Arrange
			var controller = CreateControllerWithUser();
			_adminServiceMock.Setup(x => x.UpdateUserAsync(999, It.IsAny<UpdateUserRequest>(), It.IsAny<long>()))
							 .ThrowsAsync(new KeyNotFoundException("Người dùng không tồn tại."));

			// Act
			var result = await controller.UpdateUser(999, new UpdateUserRequest());

			// Assert
			var nf = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			((ApiResponse<object>)nf.Value!).Message.Should().Be("Người dùng không tồn tại."); //
		}
		#endregion

		#region UTCID 07: UpdateUser — Abnormal — Admin tự đổi trạng thái chính mình
		[Fact]
		public async Task UpdateUser_UTCID07_ReturnsBadRequest_WhenSelfUpdateStatus()
		{
			// Arrange — Admin ID 5 tự sửa chính mình
			var controller = CreateControllerWithUser(userId: 5);
			_adminServiceMock.Setup(x => x.UpdateUserAsync(5, It.IsAny<UpdateUserRequest>(), 5))
							 .ThrowsAsync(new InvalidOperationException("Bạn không được phép thay đổi trạng thái tài khoản của chính mình."));

			// Act
			var result = await controller.UpdateUser(5, new UpdateUserRequest { IsActive = false });

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Bạn không được phép thay đổi trạng thái"); //
		}
		#endregion

		#region UTCID 08: UpdateUser — Abnormal — Username đã tồn tại
		[Fact]
		public async Task UpdateUser_UTCID08_ReturnsBadRequest_WhenUsernameExists()
		{
			// Arrange
			var controller = CreateControllerWithUser();
			_adminServiceMock.Setup(x => x.UpdateUserAsync(It.IsAny<long>(), It.IsAny<UpdateUserRequest>(), It.IsAny<long>()))
							 .ThrowsAsync(new InvalidOperationException("Username 'newUsername' đã tồn tại."));

			// Act
			var result = await controller.UpdateUser(1, new UpdateUserRequest());

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("đã tồn tại"); //
		}
		#endregion

		#region UTCID 09: UpdateUser — Abnormal — Role không tồn tại
		[Fact]
		public async Task UpdateUser_UTCID09_ReturnsBadRequest_WhenRoleInvalid()
		{
			// Arrange — Role: 9999999
			var controller = CreateControllerWithUser();
			_adminServiceMock.Setup(x => x.UpdateUserAsync(1, It.IsAny<UpdateUserRequest>(), It.IsAny<long>()))
							 .ThrowsAsync(new InvalidOperationException("Role không tồn tại."));

			// Act
			var result = await controller.UpdateUser(1, new UpdateUserRequest { RoleId = 9999999 });

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Role không tồn tại."); //
		}
		#endregion

		#region UTCID 10: UpdateUser — Abnormal — Lỗi hệ thống 500
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
			((ApiResponse<object>)error.Value!).Message.Should().Be("Đã xảy ra lỗi hệ thống."); //
		}
		#endregion
		// =========================================================
		// 4️ ToggleUserStatus — 6 test cases 
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
			apiResponse.Message.Should().Be("Không xác định được danh tính người dùng.");
		}
		#endregion

		#region UTCID 04: User không tồn tại -> 404 NotFound
		[Fact]
		public async Task ToggleUserStatus_UTCID04_ReturnsNotFound_WhenUserNotExist()
		{
			// Arrange — TargetUserId: 99999
			var controller = CreateControllerWithUser();

			_adminServiceMock
				.Setup(x => x.ToggleUserStatusAsync(99999, It.IsAny<long>()))
				.ThrowsAsync(new KeyNotFoundException("Người dùng không tồn tại."));

			// Act
			var result = await controller.ToggleUserStatus(99999);

			// Assert
			var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			var apiResponse = notFound.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Người dùng không tồn tại.");
		}
		#endregion

		#region UTCID 05: Admin tự toggle chính mình -> 400 BadRequest
		[Fact]
		public async Task ToggleUserStatus_UTCID05_ReturnsBadRequest_WhenSelfToggle()
		{
			// Arrange — TargetUserId trùng với Admin ID
			var controller = CreateControllerWithUser(userId: 1);

			_adminServiceMock
				.Setup(x => x.ToggleUserStatusAsync(1, 1))
				.ThrowsAsync(new InvalidOperationException("Bạn không được phép thay đổi trạng thái tài khoản của chính mình."));

			// Act
			var result = await controller.ToggleUserStatus(1);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var apiResponse = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			apiResponse.Success.Should().BeFalse();
			apiResponse.Message.Should().Be("Bạn không được phép thay đổi trạng thái tài khoản của chính mình.");
		}
		#endregion

		#region UTCID 06: Exception không mong đợi -> 500 InternalServerError
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
			apiResponse.Message.Should().Be("Đã xảy ra lỗi hệ thống.");
		}
		#endregion

		// =========================================================
		// 5️ ExportUsersExcel — 3 test cases
		//    TC1: Export thành công → FileContentResult
		//    TC2: Exception → 500 InternalServerError
		//    TC3: Verify đúng content-type và filename
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

			// Assert — Controller trả về File(content, contentType, fileName)
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

			// Assert — Content-Type phải là xlsx MIME type
			var fileResult = result.Should().BeOfType<FileContentResult>().Subject;
			fileResult.ContentType.Should().Be(
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
		}
	}
}