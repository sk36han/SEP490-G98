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

namespace WarehouseTests.WarehouseFolderFolder
{
	public class WarehouseControllerTests
	{
		private readonly Mock<IWarehouseService> _warehouseServiceMock = new();

		private WarehouseController CreateControllerWithUser(long userId = 1)
		{
			var controller = new WarehouseController(_warehouseServiceMock.Object);

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

		private WarehouseController CreateControllerWithoutUser()
		{
			var controller = new WarehouseController(_warehouseServiceMock.Object);

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
		// 1/ GetWarehouseList — 8 test cases
		// =========================================================

		#region UTCID 01: GetWarehouseList — Normal — Thanh cong (co data)
		[Fact]
		public async Task GetWarehouseList_UTCID01_ReturnsOk_WhenSuccessful()
		{
			var controller = CreateControllerWithUser();
			var warehouses = new List<WarehouseResponse>
			{
				new WarehouseResponse { WarehouseId = 1, WarehouseCode = "WH001", WarehouseName = "Kho 1", IsActive = true },
				new WarehouseResponse { WarehouseId = 2, WarehouseCode = "WH002", WarehouseName = "Kho 2", IsActive = true }
			};
			var expected = new PagedResult<WarehouseResponse>(warehouses, 2, 1, 10);

			_warehouseServiceMock
				.Setup(x => x.GetWarehouseListAsync(It.IsAny<FilterRequest>()))
				.ReturnsAsync(expected);

			var result = await controller.GetWarehouseList(new FilterRequest());

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<PagedResult<WarehouseResponse>>>().Subject;

			response.Success.Should().BeTrue();
			response.Message.Should().Contain("Lay danh sach");
			response.Data.Should().NotBeNull();
		}
		#endregion

		#region UTCID 02: GetWarehouseList — Normal — Danh sach rong
		[Fact]
		public async Task GetWarehouseList_UTCID02_ReturnsOk_WhenDatabaseEmpty()
		{
			var controller = CreateControllerWithUser();
			var expected = new PagedResult<WarehouseResponse>(new List<WarehouseResponse>(), 0, 1, 10);

			_warehouseServiceMock
				.Setup(x => x.GetWarehouseListAsync(It.IsAny<FilterRequest>()))
				.ReturnsAsync(expected);

			var result = await controller.GetWarehouseList(new FilterRequest());

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<PagedResult<WarehouseResponse>>>().Subject;

			response.Success.Should().BeTrue();
			response.Message.Should().Contain("Lay danh sach");
		}
		#endregion

		#region UTCID 03: GetWarehouseList — Abnormal — PageNumber khong hop le
		[Fact]
		public async Task GetWarehouseList_UTCID03_ReturnsBadRequest_WhenPageNumberInvalid()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("PageNumber", "PageNumber must be greater than 0");

			var result = await controller.GetWarehouseList(new FilterRequest { PageNumber = 0, PageSize = 10 });

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 04: GetWarehouseList — Abnormal — PageSize khong hop le
		[Fact]
		public async Task GetWarehouseList_UTCID04_ReturnsBadRequest_WhenPageSizeInvalid()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("PageSize", "PageSize must be between 1 and 100");

			var result = await controller.GetWarehouseList(new FilterRequest { PageNumber = 1, PageSize = 0 });

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 05: GetWarehouseList — Normal — Trang vuot qua so luong
		[Fact]
		public async Task GetWarehouseList_UTCID05_ReturnsOkWithEmpty_WhenPageExceedsRange()
		{
			var controller = CreateControllerWithUser();
			var expected = new PagedResult<WarehouseResponse>(new List<WarehouseResponse>(), 0, 999, 10);

			_warehouseServiceMock
				.Setup(x => x.GetWarehouseListAsync(It.IsAny<FilterRequest>()))
				.ReturnsAsync(expected);

			var result = await controller.GetWarehouseList(new FilterRequest { PageNumber = 999, PageSize = 10 });

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<PagedResult<WarehouseResponse>>>().Subject;

			response.Message.Should().Contain("Lay danh sach");
		}
		#endregion

		#region UTCID 06: GetWarehouseList — Abnormal — SqlException
		[Fact]
		public async Task GetWarehouseList_UTCID06_Returns500_WhenSqlException()
		{
			var controller = CreateControllerWithUser();
			_warehouseServiceMock
				.Setup(x => x.GetWarehouseListAsync(It.IsAny<FilterRequest>()))
				.ThrowsAsync(new MockDbException("Loi ket noi SQL"));

			var result = await controller.GetWarehouseList(new FilterRequest());

			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Contain("Da xay ra loi");
		}
		#endregion

		#region UTCID 07: GetWarehouseList — Abnormal — NullReferenceException
		[Fact]
		public async Task GetWarehouseList_UTCID07_Returns500_WhenNullReference()
		{
			var controller = CreateControllerWithUser();
			_warehouseServiceMock
				.Setup(x => x.GetWarehouseListAsync(It.IsAny<FilterRequest>()))
				.ThrowsAsync(new NullReferenceException());

			var result = await controller.GetWarehouseList(new FilterRequest());

			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Contain("Da xay ra loi");
		}
		#endregion

		#region UTCID 08: GetWarehouseList — Abnormal — Exception
		[Fact]
		public async Task GetWarehouseList_UTCID08_Returns500_WhenGeneralException()
		{
			var controller = CreateControllerWithUser();
			_warehouseServiceMock
				.Setup(x => x.GetWarehouseListAsync(It.IsAny<FilterRequest>()))
				.ThrowsAsync(new Exception("Unknown error"));

			var result = await controller.GetWarehouseList(new FilterRequest());

			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Contain("Da xay ra loi");
		}
		#endregion

		// =========================================================
		// 2/ CreateWarehouse — 12 test cases
		// =========================================================

		#region UTCID 01: CreateWarehouse — Normal — Thanh cong
		[Fact]
		public async Task CreateWarehouse_UTCID01_ReturnsOk_StandardSuccess()
		{
			var controller = CreateControllerWithUser();
			var request = new CreateWarehouseRequest
			{
				WarehouseCode = "WH001",
				WarehouseName = "Kho 1",
				Address = "123 Duong ABC"
			};
			var expected = new WarehouseResponse
			{
				WarehouseId = 1,
				WarehouseCode = "WH001",
				WarehouseName = "Kho 1",
				Address = "123 Duong ABC",
				IsActive = true
			};

			_warehouseServiceMock
				.Setup(x => x.CreateWarehouseAsync(request, 1))
				.ReturnsAsync(expected);

			var result = await controller.CreateWarehouse(request);

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<WarehouseResponse>>().Subject;

			response.Success.Should().BeTrue();
			response.Message.Should().Contain("Tao kho");
			response.Data!.WarehouseCode.Should().Be("WH001");
		}
		#endregion

		#region UTCID 02: CreateWarehouse — Normal — Khong co Address
		[Fact]
		public async Task CreateWarehouse_UTCID02_ReturnsOk_WithoutAddress()
		{
			var controller = CreateControllerWithUser();
			var request = new CreateWarehouseRequest
			{
				WarehouseCode = "WH002",
				WarehouseName = "Kho 2"
			};
			var expected = new WarehouseResponse
			{
				WarehouseId = 2,
				WarehouseCode = "WH002",
				WarehouseName = "Kho 2",
				IsActive = true
			};

			_warehouseServiceMock
				.Setup(x => x.CreateWarehouseAsync(request, 1))
				.ReturnsAsync(expected);

			var result = await controller.CreateWarehouse(request);

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<WarehouseResponse>>().Subject;

			response.Success.Should().BeTrue();
			response.Data!.WarehouseName.Should().Be("Kho 2");
		}
		#endregion

		#region UTCID 03: CreateWarehouse — Abnormal — Invalid WarehouseCode format
		[Fact]
		public async Task CreateWarehouse_UTCID03_ReturnsBadRequest_InvalidCodeFormat()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("WarehouseCode", "Invalid format");

			var result = await controller.CreateWarehouse(new CreateWarehouseRequest
			{
				WarehouseCode = "WH@#$",
				WarehouseName = "Kho test"
			});

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 04: CreateWarehouse — Abnormal — WarehouseCode da ton tai
		[Fact]
		public async Task CreateWarehouse_UTCID04_ReturnsBadRequest_WhenCodeExists()
		{
			var controller = CreateControllerWithUser();
			var request = new CreateWarehouseRequest
			{
				WarehouseCode = "WH001",
				WarehouseName = "Kho 1"
			};

			_warehouseServiceMock
				.Setup(x => x.CreateWarehouseAsync(request, It.IsAny<long>()))
				.ThrowsAsync(new InvalidOperationException("Ma kho da ton tai."));

			var result = await controller.CreateWarehouse(request);

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("da ton tai");
		}
		#endregion

		#region UTCID 05: CreateWarehouse — Abnormal — WarehouseName trong
		[Fact]
		public async Task CreateWarehouse_UTCID05_ReturnsBadRequest_WhenNameEmpty()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("WarehouseName", "Required");

			var result = await controller.CreateWarehouse(new CreateWarehouseRequest
			{
				WarehouseCode = "WH001",
				WarehouseName = ""
			});

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 06: CreateWarehouse — Abnormal — WarehouseName chi khoang trang
		[Fact]
		public async Task CreateWarehouse_UTCID06_ReturnsBadRequest_NameEmpty()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("WarehouseName", "Cannot be whitespace");

			var result = await controller.CreateWarehouse(new CreateWarehouseRequest
			{
				WarehouseCode = "WH001",
				WarehouseName = "   "
			});

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 07: CreateWarehouse — Abnormal — Unauthorized
		[Fact]
		public async Task CreateWarehouse_UTCID07_ReturnsUnauthorized_WhenNoClaim()
		{
			var controller = CreateControllerWithoutUser();

			var result = await controller.CreateWarehouse(new CreateWarehouseRequest
			{
				WarehouseCode = "WH001",
				WarehouseName = "Kho 1"
			});

			var unauth = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
			((ApiResponse<object>)unauth.Value!).Message.Should().Contain("Khong xac dinh");
		}
		#endregion

		#region UTCID 08: CreateWarehouse — Abnormal — SqlException
		[Fact]
		public async Task CreateWarehouse_UTCID08_Returns500_WhenSqlException()
		{
			var controller = CreateControllerWithUser();
			_warehouseServiceMock
				.Setup(x => x.CreateWarehouseAsync(It.IsAny<CreateWarehouseRequest>(), It.IsAny<long>()))
				.ThrowsAsync(new MockDbException("Loi ket noi SQL"));

			var result = await controller.CreateWarehouse(new CreateWarehouseRequest
			{
				WarehouseCode = "WH001",
				WarehouseName = "Kho 1"
			});

			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
		}
		#endregion

		#region UTCID 09: CreateWarehouse — Abnormal — Address trong
		[Fact]
		public async Task CreateWarehouse_UTCID09_ReturnsBadRequest_AddressEmpty()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("Address", "Required");

			var result = await controller.CreateWarehouse(new CreateWarehouseRequest
			{
				WarehouseCode = "WH001",
				WarehouseName = "Kho 1",
				Address = ""
			});

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 10: CreateWarehouse — Abnormal — WarehouseCode qua dai
		[Fact]
		public async Task CreateWarehouse_UTCID10_ReturnsBadRequest_CodeTooLong()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("WarehouseCode", "Too long");

			var result = await controller.CreateWarehouse(new CreateWarehouseRequest
			{
				WarehouseCode = new string('A', 51),
				WarehouseName = "Kho 1"
			});

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 11: CreateWarehouse — Abnormal — System Error
		[Fact]
		public async Task CreateWarehouse_UTCID11_Returns500_SystemError()
		{
			var controller = CreateControllerWithUser();
			_warehouseServiceMock
				.Setup(x => x.CreateWarehouseAsync(It.IsAny<CreateWarehouseRequest>(), It.IsAny<long>()))
				.ThrowsAsync(new Exception());

			var result = await controller.CreateWarehouse(new CreateWarehouseRequest
			{
				WarehouseCode = "WH001",
				WarehouseName = "Kho 1"
			});

			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Contain("Da xay ra loi");
		}
		#endregion

		#region UTCID 12: CreateWarehouse — Abnormal — WarehouseCode null
		[Fact]
		public async Task CreateWarehouse_UTCID12_ReturnsBadRequest_CodeNull()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("WarehouseCode", "Required");

			var result = await controller.CreateWarehouse(new CreateWarehouseRequest
			{
				WarehouseCode = null!,
				WarehouseName = "Kho 1"
			});

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		// =========================================================
		// 3/ UpdateWarehouse — 6 test cases
		// =========================================================

		#region UTCID 01: UpdateWarehouse — Normal — Thanh cong
		[Fact]
		public async Task UpdateWarehouse_UTCID01_ReturnsOk_StandardSuccess()
		{
			var controller = CreateControllerWithUser();
			var request = new UpdateWarehouseRequest
			{
				WarehouseCode = "WH001",
				WarehouseName = "Kho 1 Cap nhat",
				Address = "456 Duong XYZ"
			};
			var expected = new WarehouseResponse
			{
				WarehouseId = 1,
				WarehouseCode = "WH001",
				WarehouseName = "Kho 1 Cap nhat",
				Address = "456 Duong XYZ"
			};

			_warehouseServiceMock
				.Setup(x => x.UpdateWarehouseAsync(1, request, 1))
				.ReturnsAsync(expected);

			var result = await controller.UpdateWarehouse(1, request);

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<WarehouseResponse>>().Subject;

			response.Message.Should().Contain("Cap nhat kho");
			response.Data!.WarehouseName.Should().Be("Kho 1 Cap nhat");
		}
		#endregion

		#region UTCID 02: UpdateWarehouse — Abnormal — Warehouse khong ton tai
		[Fact]
		public async Task UpdateWarehouse_UTCID02_ReturnsNotFound_WhenWarehouseNotExist()
		{
			var controller = CreateControllerWithUser();
			_warehouseServiceMock
				.Setup(x => x.UpdateWarehouseAsync(999, It.IsAny<UpdateWarehouseRequest>(), It.IsAny<long>()))
				.ThrowsAsync(new KeyNotFoundException("Kho khong ton tai."));

			var result = await controller.UpdateWarehouse(999, new UpdateWarehouseRequest { WarehouseCode = "WH999", WarehouseName = "Kho 999" });

			var nf = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			((ApiResponse<object>)nf.Value!).Message.Should().Contain("Kho khong ton tai");
		}
		#endregion

		#region UTCID 03: UpdateWarehouse — Abnormal — WarehouseCode trung
		[Fact]
		public async Task UpdateWarehouse_UTCID03_ReturnsBadRequest_WhenCodeDuplicate()
		{
			var controller = CreateControllerWithUser();
			_warehouseServiceMock
				.Setup(x => x.UpdateWarehouseAsync(1, It.IsAny<UpdateWarehouseRequest>(), It.IsAny<long>()))
				.ThrowsAsync(new InvalidOperationException("Ma kho da duoc su dung boi kho khac."));

			var result = await controller.UpdateWarehouse(1, new UpdateWarehouseRequest { WarehouseCode = "WH002", WarehouseName = "Kho 1" });

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("da duoc su dung");
		}
		#endregion

		#region UTCID 04: UpdateWarehouse — Abnormal — Unauthorized
		[Fact]
		public async Task UpdateWarehouse_UTCID04_ReturnsUnauthorized_WhenNoClaim()
		{
			var controller = CreateControllerWithoutUser();

			var result = await controller.UpdateWarehouse(1, new UpdateWarehouseRequest { WarehouseCode = "WH001", WarehouseName = "Kho 1" });

			result.Should().BeOfType<UnauthorizedObjectResult>();
		}
		#endregion

		#region UTCID 05: UpdateWarehouse — Abnormal — WarehouseName trong
		[Fact]
		public async Task UpdateWarehouse_UTCID05_ReturnsBadRequest_WhenNameEmpty()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("WarehouseName", "Required");

			var result = await controller.UpdateWarehouse(1, new UpdateWarehouseRequest { WarehouseCode = "WH001", WarehouseName = "" });

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Contain("Du lieu khong hop le");
		}
		#endregion

		#region UTCID 06: UpdateWarehouse — Abnormal — System Error
		[Fact]
		public async Task UpdateWarehouse_SystemError_Returns500()
		{
			var controller = CreateControllerWithUser();
			_warehouseServiceMock
				.Setup(x => x.UpdateWarehouseAsync(It.IsAny<long>(), It.IsAny<UpdateWarehouseRequest>(), It.IsAny<long>()))
				.ThrowsAsync(new Exception());

			var result = await controller.UpdateWarehouse(1, new UpdateWarehouseRequest { WarehouseCode = "WH001", WarehouseName = "Kho 1" });

			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Contain("Da xay ra loi");
		}
		#endregion

		// =========================================================
		// 4/ ToggleWarehouseStatus — 6 test cases
		// =========================================================

		#region UTCID 01: ToggleWarehouseStatus — Normal — Enable
		[Fact]
		public async Task ToggleWarehouseStatus_UTCID01_ReturnsEnableMessage_WhenSuccess()
		{
			var controller = CreateControllerWithUser();
			var expected = new WarehouseResponse { WarehouseId = 1, IsActive = true };

			_warehouseServiceMock
				.Setup(x => x.ToggleWarehouseStatusAsync(1, 1))
				.ReturnsAsync(expected);

			var result = await controller.ToggleWarehouseStatus(1);

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<WarehouseResponse>>().Subject;

			response.Data!.IsActive.Should().BeTrue();
			response.Message.Should().Contain("Enable");
		}
		#endregion

		#region UTCID 02: ToggleWarehouseStatus — Normal — Disable
		[Fact]
		public async Task ToggleWarehouseStatus_UTCID02_ReturnsDisableMessage_WhenSuccess()
		{
			var controller = CreateControllerWithUser();
			var expected = new WarehouseResponse { WarehouseId = 1, IsActive = false };

			_warehouseServiceMock
				.Setup(x => x.ToggleWarehouseStatusAsync(1, 1))
				.ReturnsAsync(expected);

			var result = await controller.ToggleWarehouseStatus(1);

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<WarehouseResponse>>().Subject;

			response.Data!.IsActive.Should().BeFalse();
			response.Message.Should().Contain("Disable");
		}
		#endregion

		#region UTCID 03: ToggleWarehouseStatus — Abnormal — Unauthorized
		[Fact]
		public async Task ToggleWarehouseStatus_UTCID03_ReturnsUnauthorized_WhenNoClaim()
		{
			var controller = CreateControllerWithoutUser();

			var result = await controller.ToggleWarehouseStatus(1);

			result.Should().BeOfType<UnauthorizedObjectResult>();
		}
		#endregion

		#region UTCID 04: ToggleWarehouseStatus — Abnormal — Warehouse not found
		[Fact]
		public async Task ToggleWarehouseStatus_UTCID04_ReturnsNotFound_WhenWarehouseNotExist()
		{
			var controller = CreateControllerWithUser();
			_warehouseServiceMock
				.Setup(x => x.ToggleWarehouseStatusAsync(999, It.IsAny<long>()))
				.ThrowsAsync(new KeyNotFoundException("Kho khong ton tai."));

			var result = await controller.ToggleWarehouseStatus(999);

			var nf = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			((ApiResponse<object>)nf.Value!).Message.Should().Contain("Kho khong ton tai");
		}
		#endregion

		#region UTCID 05-06: ToggleWarehouseStatus — Abnormal — System Error
		[Fact]
		public async Task ToggleWarehouseStatus_UTCID05_06_Returns500_WhenSystemError()
		{
			var controller = CreateControllerWithUser();
			_warehouseServiceMock
				.Setup(x => x.ToggleWarehouseStatusAsync(It.IsAny<long>(), It.IsAny<long>()))
				.ThrowsAsync(new Exception());

			var result = await controller.ToggleWarehouseStatus(1);

			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Contain("Da xay ra loi");
		}
		#endregion
	}
}