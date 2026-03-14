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

namespace Warehouse.Api.Tests.Warehouse
{
	public class WarehouseControllerTests
	{
		private readonly Mock<IWarehouseService> _warehouseServiceMock = new();

		/// <summary>
		/// Tạo WarehouseController KHÔNG có claim (dùng cho GetWarehouseList, ToggleWarehouseStatus)
		/// </summary>
		private WarehouseController CreateController()
		{
			var controller = new WarehouseController(_warehouseServiceMock.Object);
			controller.ControllerContext = new ControllerContext
			{
				HttpContext = new DefaultHttpContext()
			};
			return controller;
		}

		/// <summary>
		/// Tạo WarehouseController CÓ claim userId (dùng cho CreateWarehouse, UpdateWarehouse)
		/// </summary>
		private WarehouseController CreateControllerWithUser(long userId = 1)
		{
			var controller = new WarehouseController(_warehouseServiceMock.Object);
			var claims = new List<Claim>
			{
				new Claim(ClaimTypes.NameIdentifier, userId.ToString())
			};
			var identity = new ClaimsIdentity(claims, "TestAuth");
			controller.ControllerContext = new ControllerContext
			{
				HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
			};
			return controller;
		}

		// =========================================================
		// 1️⃣ GetWarehouseList — 8 test cases
		// =========================================================

		#region UTCID 01: GetWarehouseList — Normal — Thành công (Có dữ liệu)
		[Fact]
		public async Task GetWarehouseList_UTCID01_ReturnsOk_WhenSuccessful()
		{
			// Arrange — Page: 1, Size: 20, Database có dữ liệu
			var controller = CreateController();
			var filter = new FilterRequest { PageNumber = 1, PageSize = 20 };
			var warehouses = new List<WarehouseResponse>
			{
				new WarehouseResponse { WarehouseId = 1, WarehouseCode = "WH001", WarehouseName = "Kho Hà Nội" }
			};
			var expected = new PagedResult<WarehouseResponse>(warehouses, 1, 1, 20);

			_warehouseServiceMock.Setup(x => x.GetWarehouseListAsync(filter)).ReturnsAsync(expected);

			// Act
			var result = await controller.GetWarehouseList(filter);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<PagedResult<WarehouseResponse>>>().Subject;

			response.Success.Should().BeTrue();
			response.Message.Should().Be("Lấy danh sách kho thành công.");
			response.Data!.Items.Should().NotBeEmpty();
		}
		#endregion

		#region UTCID 02: GetWarehouseList — Normal — Thành công (Danh sách rỗng)
		[Fact]
		public async Task GetWarehouseList_UTCID02_ReturnsOk_WhenDatabaseEmpty()
		{
			// Arrange — Database trống
			var controller = CreateController();
			var filter = new FilterRequest { PageNumber = 1, PageSize = 20 };
			var expected = new PagedResult<WarehouseResponse>(new List<WarehouseResponse>(), 0, 1, 20);

			_warehouseServiceMock.Setup(x => x.GetWarehouseListAsync(filter)).ReturnsAsync(expected);

			// Act
			var result = await controller.GetWarehouseList(filter);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<PagedResult<WarehouseResponse>>>().Subject;

			response.Message.Should().Be("Lấy danh sách kho thành công.");
			response.Data!.Items.Should().BeEmpty();
		}
		#endregion

		#region UTCID 03: GetWarehouseList — Boundary — PageNumber không hợp lệ (<= 0)
		[Fact]
		public async Task GetWarehouseList_UTCID03_ReturnsBadRequest_WhenPageNumberInvalid()
		{
			// Arrange — PageNumber: -10
			var controller = CreateController();
			controller.ModelState.AddModelError("PageNumber", "Invalid");
			var filter = new FilterRequest { PageNumber = -10, PageSize = 20 };

			// Act
			var result = await controller.GetWarehouseList(filter);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var response = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			response.Message.Should().Be("Dữ liệu không hợp lệ.");
			_warehouseServiceMock.Verify(x => x.GetWarehouseListAsync(It.IsAny<FilterRequest>()), Times.Never);
		}
		#endregion

		#region UTCID 04: GetWarehouseList — Boundary — PageSize không hợp lệ (<= 0)
		[Fact]
		public async Task GetWarehouseList_UTCID04_ReturnsBadRequest_WhenPageSizeInvalid()
		{
			// Arrange — PageSize: -10
			var controller = CreateController();
			controller.ModelState.AddModelError("PageSize", "Invalid");
			var filter = new FilterRequest { PageNumber = 1, PageSize = -10 };

			// Act
			var result = await controller.GetWarehouseList(filter);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");
		}
		#endregion

		#region UTCID 05: GetWarehouseList — Boundary — Trang không tồn tại (Vượt range)
		[Fact]
		public async Task GetWarehouseList_UTCID05_ReturnsOkWithEmpty_WhenPageExceedsRange()
		{
			// Arrange — Yêu cầu trang 100 khi chỉ có ít dữ liệu
			var controller = CreateController();
			var filter = new FilterRequest { PageNumber = 100, PageSize = 20 };
			var expected = new PagedResult<WarehouseResponse>(new List<WarehouseResponse>(), 5, 100, 20);

			_warehouseServiceMock.Setup(x => x.GetWarehouseListAsync(filter)).ReturnsAsync(expected);

			// Act
			var result = await controller.GetWarehouseList(filter);

			// Assert — Kết quả vẫn là 200 OK kèm list rỗng
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			((ApiResponse<PagedResult<WarehouseResponse>>)ok.Value!).Message.Should().Be("Lấy danh sách kho thành công.");
		}
		#endregion

		#region UTCID 06: GetWarehouseList — Abnormal — Lỗi SQL (500)
		[Fact]
		public async Task GetWarehouseList_UTCID06_Returns500_WhenSqlException()
		{
			// Arrange — Giả lập SqlException
			var controller = CreateController();
			_warehouseServiceMock.Setup(x => x.GetWarehouseListAsync(It.IsAny<FilterRequest>()))
								  .ThrowsAsync(new Exception("SQL Error"));

			// Act
			var result = await controller.GetWarehouseList(new FilterRequest());

			// Assert
			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Be("Đã xảy ra lỗi hệ thống.");
		}
		#endregion

		#region UTCID 07: GetWarehouseList — Abnormal — Lỗi tham chiếu Null (500)
		[Fact]
		public async Task GetWarehouseList_UTCID07_Returns500_WhenNullReference()
		{
			// Arrange
			var controller = CreateController();
			_warehouseServiceMock.Setup(x => x.GetWarehouseListAsync(It.IsAny<FilterRequest>()))
								  .ThrowsAsync(new NullReferenceException());

			// Act
			var result = await controller.GetWarehouseList(new FilterRequest());

			// Assert
			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Be("Đã xảy ra lỗi hệ thống.");
		}
		#endregion

		#region UTCID 08: GetWarehouseList — Abnormal — Lỗi hệ thống chung (500)
		[Fact]
		public async Task GetWarehouseList_UTCID08_Returns500_WhenGeneralException()
		{
			// Arrange
			var controller = CreateController();
			_warehouseServiceMock.Setup(x => x.GetWarehouseListAsync(It.IsAny<FilterRequest>()))
								  .ThrowsAsync(new Exception("General Error"));

			// Act
			var result = await controller.GetWarehouseList(new FilterRequest());

			// Assert
			var error = result.Should().BeOfType<ObjectResult>().Subject;
			((ApiResponse<object>)error.Value!).Message.Should().Be("Đã xảy ra lỗi hệ thống.");
		}
		#endregion

		// =========================================================
		// 2️⃣ CreateWarehouse — 12 Test Cases
		// =========================================================

		#region UTCID 01: KHVT + khoTang 1 + 12 tố hữu (Thành công)
		[Fact]
		public async Task CreateWarehouse_UTCID01_ReturnsOk_StandardSuccess()
		{
			var controller = CreateControllerWithUser(userId: 1);
			var request = new CreateWarehouseRequest
			{
				WarehouseCode = "KHVT",
				WarehouseName = "khoTang 1",
				Address = "12 tố hữu",
				IsActive = true
			};
			_warehouseServiceMock.Setup(x => x.CreateWarehouseAsync(request, 1)).ReturnsAsync(new WarehouseResponse());

			var result = await controller.CreateWarehouse(request);

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			((ApiResponse<WarehouseResponse>)ok.Value!).Message.Should().Be("Tạo kho thành công.");
		}
		#endregion

		#region UTCID 02: trùng mã kho (MKHH) (400)
		[Fact]
		public async Task CreateWarehouse_UTCID02_ReturnsBadRequest_DuplicateCode()
		{
			var controller = CreateControllerWithUser(userId: 1);
			var request = new CreateWarehouseRequest { WarehouseCode = "MKHH" };
			_warehouseServiceMock.Setup(x => x.CreateWarehouseAsync(request, 1))
								  .ThrowsAsync(new InvalidOperationException("Mã kho đã tồn tại."));

			var result = await controller.CreateWarehouse(request);

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Mã kho đã tồn tại.");
		}
		#endregion

		#region UTCID 03: WarehouseCode là Ký tự lạ (" ' ") (400)
		[Fact]
		public async Task CreateWarehouse_UTCID03_ReturnsBadRequest_InvalidCodeFormat()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("WarehouseCode", "Invalid");
			var request = new CreateWarehouseRequest { WarehouseCode = "'\"" };

			var result = await controller.CreateWarehouse(request);

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");
		}
		#endregion

		#region UTCID 04: WarehouseName là KHo 12@%$% (Thành công)
		[Fact]
		public async Task CreateWarehouse_UTCID04_ReturnsOk_SpecialCharsName()
		{
			var controller = CreateControllerWithUser(userId: 1);
			var request = new CreateWarehouseRequest { WarehouseCode = "KHVT", WarehouseName = "KHo 12@%$%" };
			_warehouseServiceMock.Setup(x => x.CreateWarehouseAsync(request, 1)).ReturnsAsync(new WarehouseResponse());

			var result = await controller.CreateWarehouse(request);

			result.Should().BeOfType<OkObjectResult>();
		}
		#endregion

		#region UTCID 05: Trùng tên kho (Kho1) (Thành công)
		[Fact]
		public async Task CreateWarehouse_UTCID05_ReturnsOk_DuplicateName()
		{
			var controller = CreateControllerWithUser(userId: 1);
			var request = new CreateWarehouseRequest { WarehouseCode = "KHVT2", WarehouseName = "Kho1" };
			_warehouseServiceMock.Setup(x => x.CreateWarehouseAsync(request, 1)).ReturnsAsync(new WarehouseResponse());

			var result = await controller.CreateWarehouse(request);

			result.Should().BeOfType<OkObjectResult>();
		}
		#endregion

		#region UTCID 06: WarehouseName là Empty/Null / " " (400)
		[Fact]
		public async Task CreateWarehouse_UTCID06_ReturnsBadRequest_NameEmpty()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("WarehouseName", "Required");
			var request = new CreateWarehouseRequest { WarehouseName = " " };

			var result = await controller.CreateWarehouse(request);

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");
		}
		#endregion

		#region UTCID 07: Address là 124@ tố tấm (Thành công)
		[Fact]
		public async Task CreateWarehouse_UTCID07_ReturnsOk_SpecialCharsAddress()
		{
			var controller = CreateControllerWithUser(userId: 1);
			var request = new CreateWarehouseRequest { WarehouseCode = "KHVT", Address = "124@ tố tấm" };
			_warehouseServiceMock.Setup(x => x.CreateWarehouseAsync(request, 1)).ReturnsAsync(new WarehouseResponse());

			var result = await controller.CreateWarehouse(request);

			result.Should().BeOfType<OkObjectResult>();
		}
		#endregion

		#region UTCID 08: trùng địa chỉ (Lê quang đao) (Thành công)
		[Fact]
		public async Task CreateWarehouse_UTCID08_ReturnsOk_DuplicateAddress()
		{
			var controller = CreateControllerWithUser(userId: 1);
			var request = new CreateWarehouseRequest { WarehouseCode = "KHVT3", Address = "Lê quang đao" };
			_warehouseServiceMock.Setup(x => x.CreateWarehouseAsync(request, 1)).ReturnsAsync(new WarehouseResponse());

			var result = await controller.CreateWarehouse(request);

			result.Should().BeOfType<OkObjectResult>();
		}
		#endregion

		#region UTCID 09: Address là Empty/Null / " " (400)
		[Fact]
		public async Task CreateWarehouse_UTCID09_ReturnsBadRequest_AddressEmpty()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("Address", "Required");

			var result = await controller.CreateWarehouse(new CreateWarehouseRequest { Address = "" });

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");
		}
		#endregion

		#region UTCID 10: isActive = False (Thành công)
		[Fact]
		public async Task CreateWarehouse_UTCID10_ReturnsOk_StatusFalse()
		{
			var controller = CreateControllerWithUser(userId: 1);
			var request = new CreateWarehouseRequest { WarehouseCode = "KHVT", IsActive = false };
			_warehouseServiceMock.Setup(x => x.CreateWarehouseAsync(request, 1)).ReturnsAsync(new WarehouseResponse());

			var result = await controller.CreateWarehouse(request);

			result.Should().BeOfType<OkObjectResult>();
		}
		#endregion

		#region UTCID 11: Dữ liệu chuẩn + Lỗi hệ thống (500)
		[Fact]
		public async Task CreateWarehouse_UTCID11_Returns500_SystemError()
		{
			var controller = CreateControllerWithUser(userId: 1);
			var request = new CreateWarehouseRequest { WarehouseCode = "KHVT", WarehouseName = "khoTang 1", Address = "12 tố hữu" };
			_warehouseServiceMock.Setup(x => x.CreateWarehouseAsync(request, 1)).ThrowsAsync(new Exception());

			var result = await controller.CreateWarehouse(request);

			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Be("Đã xảy ra lỗi hệ thống.");
		}
		#endregion

		#region UTCID 12: WarehouseCode là Empty/Null (400)
		[Fact]
		public async Task CreateWarehouse_UTCID12_ReturnsBadRequest_CodeNull()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("WarehouseCode", "Required");

			var result = await controller.CreateWarehouse(new CreateWarehouseRequest { WarehouseCode = null });

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");
		}
		#endregion

		// =========================================================
		// 3️⃣ UpdateWarehouse — 8 Test Cases
		// =========================================================

		#region UTCID 01: UpdateWarehouse — Normal — Thành công (Dữ liệu chuẩn)
		[Fact]
		public async Task UpdateWarehouse_UTCID01_ReturnsOk_StandardSuccess()
		{
			// Arrange — ID tồn tại (10), Name/Address hợp lệ
			var controller = CreateControllerWithUser(userId: 1);
			var request = new UpdateWarehouseRequest
			{
				WarehouseName = "Kho Hà Nội (Cập nhật)",
				Address = "456 Đường Mới",
				IsActive = true
			};
			var expected = new WarehouseResponse { WarehouseId = 10, WarehouseName = "Kho Hà Nội (Cập nhật)" };

			_warehouseServiceMock.Setup(x => x.UpdateWarehouseAsync(10, request, 1)).ReturnsAsync(expected);

			// Act
			var result = await controller.UpdateWarehouse(10, request);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<WarehouseResponse>>().Subject;

			response.Success.Should().BeTrue();
			response.Message.Should().Be("Cập nhật kho thành công.");
			response.Data!.WarehouseName.Should().Be("Kho Hà Nội (Cập nhật)");
		}
		#endregion

		#region UTCID 02: UpdateWarehouse — Abnormal — ID không tồn tại (404)
		[Fact]
		public async Task UpdateWarehouse_UTCID02_ReturnsNotFound_WhenIdNotExist()
		{
			// Arrange — ID 9999 không có trong DB
			var controller = CreateControllerWithUser(userId: 1);
			var request = new UpdateWarehouseRequest { WarehouseName = "Test" };

			_warehouseServiceMock.Setup(x => x.UpdateWarehouseAsync(9999, request, 1))
								  .ThrowsAsync(new KeyNotFoundException("Không tìm thấy kho."));

			// Act
			var result = await controller.UpdateWarehouse(9999, request);

			// Assert — Phải trả về 404 NotFound
			var nf = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			var response = nf.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			response.Message.Should().Be("Không tìm thấy kho.");
			response.Success.Should().BeFalse();
		}
		#endregion

		#region UTCID 04: UpdateWarehouse — Boundary — ID biên (ID <= 0) (404)
		[Fact]
		public async Task UpdateWarehouse_UTCID04_ReturnsNotFound_WhenIdIsInvalid()
		{
			// Arrange — ID = -10 hoặc 0
			var controller = CreateControllerWithUser(userId: 1);
			var request = new UpdateWarehouseRequest { WarehouseName = "KHo 12@%$%" };

			_warehouseServiceMock.Setup(x => x.UpdateWarehouseAsync(It.IsInRange(long.MinValue, 0, Moq.Range.Inclusive), It.IsAny<UpdateWarehouseRequest>(), It.IsAny<long>()))
								  .ThrowsAsync(new KeyNotFoundException("Không tìm thấy kho."));

			// Act
			var result = await controller.UpdateWarehouse(-10, request);

			// Assert
			result.Should().BeOfType<NotFoundObjectResult>();
		}
		#endregion

		#region UTCID 05: UpdateWarehouse — Boundary — Name trống (400)
		[Fact]
		public async Task UpdateWarehouse_UTCID05_ReturnsBadRequest_WhenNameEmpty()
		{
			// Arrange — Name trống/Null
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("WarehouseName", "Required");
			var request = new UpdateWarehouseRequest { WarehouseName = " " };

			// Act
			var result = await controller.UpdateWarehouse(10, request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dữ liệu không hợp lệ.");

			_warehouseServiceMock.Verify(x => x.UpdateWarehouseAsync(It.IsAny<long>(), It.IsAny<UpdateWarehouseRequest>(), It.IsAny<long>()), Times.Never);
		}
		#endregion

		#region UTCID 07: UpdateWarehouse — Boundary — Address ký tự lạ (200)
		[Fact]
		public async Task UpdateWarehouse_UTCID07_ReturnsOk_WhenAddressHasSpecialChars()
		{
			// Arrange — Địa chỉ 124@ tố tấm
			var controller = CreateControllerWithUser(userId: 1);
			var request = new UpdateWarehouseRequest { WarehouseName = "Kho chuẩn", Address = "124@ tố tấm", IsActive = true };
			_warehouseServiceMock.Setup(x => x.UpdateWarehouseAsync(10, request, 1)).ReturnsAsync(new WarehouseResponse());

			// Act
			var result = await controller.UpdateWarehouse(10, request);

			// Assert — Hệ thống cho phép ký tự lạ trong địa chỉ
			result.Should().BeOfType<OkObjectResult>();
		}
		#endregion

		#region UTCID 03, 06, 08: UpdateWarehouse — Abnormal — Lỗi hệ thống (500)
		[Fact]
		public async Task UpdateWarehouse_SystemError_Returns500()
		{
			// Arrange — Dữ liệu chuẩn nhưng DB crash
			var controller = CreateControllerWithUser(userId: 1);
			_warehouseServiceMock.Setup(x => x.UpdateWarehouseAsync(It.IsAny<long>(), It.IsAny<UpdateWarehouseRequest>(), It.IsAny<long>()))
								  .ThrowsAsync(new Exception("DB Crash"));

			// Act
			var result = await controller.UpdateWarehouse(10, new UpdateWarehouseRequest { WarehouseName = "Test" });

			// Assert
			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Be("Đã xảy ra lỗi hệ thống.");
		}
		#endregion

		// =========================================================
		// 4️⃣ ToggleWarehouseStatus — 6 Test Cases
		// =========================================================

		#region UTCID 01: Toggle sang Enable (Normal - Thành công)
		[Fact]
		public async Task ToggleWarehouseStatus_UTCID01_ReturnsEnableMessage_WhenSuccess()
		{
			// Arrange: Giả lập kho đang tắt (False), toggle xong sẽ thành True (Enable)
			var controller = CreateController();
			var id = 10L;
			var expected = new WarehouseResponse { WarehouseId = id, IsActive = true };

			_warehouseServiceMock.Setup(x => x.ToggleWarehouseStatusAsync(id)).ReturnsAsync(expected);

			// Act
			var result = await controller.ToggleWarehouseStatus(id);

			// Assert: Kiểm tra status code và message động
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<WarehouseResponse>>().Subject;

			response.Success.Should().BeTrue();
			response.Message.Should().Be("Đã chuyển trạng thái kho thành Enable.");
			response.Data!.IsActive.Should().BeTrue();
		}
		#endregion

		#region UTCID 02: Toggle sang Disable (Normal - Thành công)
		[Fact]
		public async Task ToggleWarehouseStatus_UTCID02_ReturnsDisableMessage_WhenSuccess()
		{
			// Arrange: Giả lập kho đang bật (True), toggle xong sẽ thành False (Disable)
			var controller = CreateController();
			var id = 10L;
			var expected = new WarehouseResponse { WarehouseId = id, IsActive = false };

			_warehouseServiceMock.Setup(x => x.ToggleWarehouseStatusAsync(id)).ReturnsAsync(expected);

			// Act
			var result = await controller.ToggleWarehouseStatus(id);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<WarehouseResponse>>().Subject;

			response.Message.Should().Be("Đã chuyển trạng thái kho thành Disable.");
			response.Data!.IsActive.Should().BeFalse();
		}
		#endregion

		#region UTCID 03: ID không tồn tại (Abnormal - 404)
		[Fact]
		public async Task ToggleWarehouseStatus_UTCID03_ReturnsNotFound_WhenIdNotExist()
		{
			// Arrange: ID 9999 không có trong hệ thống
			var controller = CreateController();
			_warehouseServiceMock.Setup(x => x.ToggleWarehouseStatusAsync(9999))
								  .ThrowsAsync(new KeyNotFoundException("Không tìm thấy kho."));

			// Act
			var result = await controller.ToggleWarehouseStatus(9999);

			// Assert
			var nf = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			var response = nf.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			response.Success.Should().BeFalse();
			response.Message.Should().Be("Không tìm thấy kho.");
		}
		#endregion

		#region UTCID 04: ID biên (ID <= 0) (Boundary - 404)
		[Fact]
		public async Task ToggleWarehouseStatus_UTCID04_ReturnsNotFound_WhenIdIsZeroOrNegative()
		{
			// Arrange: ID = 0
			var controller = CreateController();
			_warehouseServiceMock.Setup(x => x.ToggleWarehouseStatusAsync(0))
								  .ThrowsAsync(new KeyNotFoundException("Không tìm thấy kho."));

			// Act
			var result = await controller.ToggleWarehouseStatus(0);

			// Assert
			result.Should().BeOfType<NotFoundObjectResult>();
		}
		#endregion

		#region UTCID 05 & 06: Lỗi hệ thống (Abnormal - 500)
		[Fact]
		public async Task ToggleWarehouseStatus_UTCID05_06_Returns500_WhenSystemError()
		{
			// Arrange: Giả lập lỗi kết nối Database
			var controller = CreateController();
			_warehouseServiceMock.Setup(x => x.ToggleWarehouseStatusAsync(It.IsAny<long>()))
								  .ThrowsAsync(new Exception("Database connection failed"));

			// Act
			var result = await controller.ToggleWarehouseStatus(10);

			// Assert: Controller catch Exception chung -> 500
			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Be("Đã xảy ra lỗi hệ thống.");
		}
		#endregion

		#region UTCID Bonus: Verify Service Execution
		[Fact]
		public async Task ToggleWarehouseStatus_Verify_CallsServiceExactlyOnce()
		{
			// Arrange
			var controller = CreateController();
			_warehouseServiceMock.Setup(x => x.ToggleWarehouseStatusAsync(It.IsAny<long>()))
								  .ReturnsAsync(new WarehouseResponse());

			// Act
			await controller.ToggleWarehouseStatus(1);

			// Assert: Đảm bảo service chỉ được gọi đúng 1 lần với đúng ID
			_warehouseServiceMock.Verify(x => x.ToggleWarehouseStatusAsync(1), Times.Once);
		}
		#endregion
	}
}