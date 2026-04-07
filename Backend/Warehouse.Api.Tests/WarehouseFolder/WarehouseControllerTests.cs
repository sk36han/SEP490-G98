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

		/// <summary>
		/// Táº¡o WarehouseController KHÃ”NG cÃ³ claim (dÃ¹ng cho GetWarehouseList, ToggleWarehouseStatus)
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
		/// Táº¡o WarehouseController CÃ“ claim userId (dÃ¹ng cho CreateWarehouse, UpdateWarehouse)
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
		// 1ï¸âƒ£ GetWarehouseList â€” 8 test cases
		// =========================================================

		#region UTCID 01: GetWarehouseList â€” Normal â€” ThÃ nh cÃ´ng (CÃ³ dá»¯ liá»‡u)
		[Fact]
		public async Task GetWarehouseList_UTCID01_ReturnsOk_WhenSuccessful()
		{
			// Arrange â€” Page: 1, Size: 20, Database cÃ³ dá»¯ liá»‡u
			var controller = CreateController();
			var filter = new FilterRequest { PageNumber = 1, PageSize = 20 };
			var warehouses = new List<WarehouseResponse>
			{
				new WarehouseResponse { WarehouseId = 1, WarehouseCode = "WH001", WarehouseName = "Kho HÃ  Ná»™i" }
			};
			var expected = new PagedResult<WarehouseResponse>(warehouses, 1, 1, 20);

			_warehouseServiceMock.Setup(x => x.GetWarehouseListAsync(filter)).ReturnsAsync(expected);

			// Act
			var result = await controller.GetWarehouseList(filter);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<PagedResult<WarehouseResponse>>>().Subject;

			response.Success.Should().BeTrue();
			response.Message.Should().Be("Láº¥y danh sÃ¡ch kho thÃ nh cÃ´ng.");
			response.Data!.Items.Should().NotBeEmpty();
		}
		#endregion

		#region UTCID 02: GetWarehouseList â€” Normal â€” ThÃ nh cÃ´ng (Danh sÃ¡ch rá»—ng)
		[Fact]
		public async Task GetWarehouseList_UTCID02_ReturnsOk_WhenDatabaseEmpty()
		{
			// Arrange â€” Database trá»‘ng
			var controller = CreateController();
			var filter = new FilterRequest { PageNumber = 1, PageSize = 20 };
			var expected = new PagedResult<WarehouseResponse>(new List<WarehouseResponse>(), 0, 1, 20);

			_warehouseServiceMock.Setup(x => x.GetWarehouseListAsync(filter)).ReturnsAsync(expected);

			// Act
			var result = await controller.GetWarehouseList(filter);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<PagedResult<WarehouseResponse>>>().Subject;

			response.Message.Should().Be("Láº¥y danh sÃ¡ch kho thÃ nh cÃ´ng.");
			response.Data!.Items.Should().BeEmpty();
		}
		#endregion

		#region UTCID 03: GetWarehouseList â€” Boundary â€” PageNumber khÃ´ng há»£p lá»‡ (<= 0)
		[Fact]
		public async Task GetWarehouseList_UTCID03_ReturnsBadRequest_WhenPageNumberInvalid()
		{
			// Arrange â€” PageNumber: -10
			var controller = CreateController();
			controller.ModelState.AddModelError("PageNumber", "Invalid");
			var filter = new FilterRequest { PageNumber = -10, PageSize = 20 };

			// Act
			var result = await controller.GetWarehouseList(filter);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			var response = bad.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			response.Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");
			_warehouseServiceMock.Verify(x => x.GetWarehouseListAsync(It.IsAny<FilterRequest>()), Times.Never);
		}
		#endregion

		#region UTCID 04: GetWarehouseList â€” Boundary â€” PageSize khÃ´ng há»£p lá»‡ (<= 0)
		[Fact]
		public async Task GetWarehouseList_UTCID04_ReturnsBadRequest_WhenPageSizeInvalid()
		{
			// Arrange â€” PageSize: -10
			var controller = CreateController();
			controller.ModelState.AddModelError("PageSize", "Invalid");
			var filter = new FilterRequest { PageNumber = 1, PageSize = -10 };

			// Act
			var result = await controller.GetWarehouseList(filter);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");
		}
		#endregion

		#region UTCID 05: GetWarehouseList â€” Boundary â€” Trang khÃ´ng tá»“n táº¡i (VÆ°á»£t range)
		[Fact]
		public async Task GetWarehouseList_UTCID05_ReturnsOkWithEmpty_WhenPageExceedsRange()
		{
			// Arrange â€” YÃªu cáº§u trang 100 khi chá»‰ cÃ³ Ã­t dá»¯ liá»‡u
			var controller = CreateController();
			var filter = new FilterRequest { PageNumber = 100, PageSize = 20 };
			var expected = new PagedResult<WarehouseResponse>(new List<WarehouseResponse>(), 5, 100, 20);

			_warehouseServiceMock.Setup(x => x.GetWarehouseListAsync(filter)).ReturnsAsync(expected);

			// Act
			var result = await controller.GetWarehouseList(filter);

			// Assert â€” Káº¿t quáº£ váº«n lÃ  200 OK kÃ¨m list rá»—ng
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			((ApiResponse<PagedResult<WarehouseResponse>>)ok.Value!).Message.Should().Be("Láº¥y danh sÃ¡ch kho thÃ nh cÃ´ng.");
		}
		#endregion

		#region UTCID 06: GetWarehouseList â€” Abnormal â€” Lá»—i SQL (500)
		[Fact]
		public async Task GetWarehouseList_UTCID06_Returns500_WhenSqlException()
		{
			// Arrange â€” Giáº£ láº­p SqlException
			var controller = CreateController();
			_warehouseServiceMock.Setup(x => x.GetWarehouseListAsync(It.IsAny<FilterRequest>()))
								  .ThrowsAsync(new Exception("SQL Error"));

			// Act
			var result = await controller.GetWarehouseList(new FilterRequest());

			// Assert
			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Be("ÄÃ£ xáº£y ra lá»—i há»‡ thá»‘ng.");
		}
		#endregion

		#region UTCID 07: GetWarehouseList â€” Abnormal â€” Lá»—i tham chiáº¿u Null (500)
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
			((ApiResponse<object>)error.Value!).Message.Should().Be("ÄÃ£ xáº£y ra lá»—i há»‡ thá»‘ng.");
		}
		#endregion

		#region UTCID 08: GetWarehouseList â€” Abnormal â€” Lá»—i há»‡ thá»‘ng chung (500)
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
			((ApiResponse<object>)error.Value!).Message.Should().Be("ÄÃ£ xáº£y ra lá»—i há»‡ thá»‘ng.");
		}
		#endregion

		// =========================================================
		// 2ï¸âƒ£ CreateWarehouse â€” 12 Test Cases
		// =========================================================

		#region UTCID 01: KHVT + khoTang 1 + 12 tá»‘ há»¯u (ThÃ nh cÃ´ng)
		[Fact]
		public async Task CreateWarehouse_UTCID01_ReturnsOk_StandardSuccess()
		{
			var controller = CreateControllerWithUser(userId: 1);
			var request = new CreateWarehouseRequest
			{
				WarehouseCode = "KHVT",
				WarehouseName = "khoTang 1",
				Address = "12 tá»‘ há»¯u",
				IsActive = true
			};
			_warehouseServiceMock.Setup(x => x.CreateWarehouseAsync(request, 1)).ReturnsAsync(new WarehouseResponse());

			var result = await controller.CreateWarehouse(request);

			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			((ApiResponse<WarehouseResponse>)ok.Value!).Message.Should().Be("Táº¡o kho thÃ nh cÃ´ng.");
		}
		#endregion

		#region UTCID 02: trÃ¹ng mÃ£ kho (MKHH) (400)
		[Fact]
		public async Task CreateWarehouse_UTCID02_ReturnsBadRequest_DuplicateCode()
		{
			var controller = CreateControllerWithUser(userId: 1);
			var request = new CreateWarehouseRequest { WarehouseCode = "MKHH" };
			_warehouseServiceMock.Setup(x => x.CreateWarehouseAsync(request, 1))
								  .ThrowsAsync(new InvalidOperationException("MÃ£ kho Ä‘Ã£ tá»“n táº¡i."));

			var result = await controller.CreateWarehouse(request);

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("MÃ£ kho Ä‘Ã£ tá»“n táº¡i.");
		}
		#endregion

		#region UTCID 03: WarehouseCode lÃ  KÃ½ tá»± láº¡ (" ' ") (400)
		[Fact]
		public async Task CreateWarehouse_UTCID03_ReturnsBadRequest_InvalidCodeFormat()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("WarehouseCode", "Invalid");
			var request = new CreateWarehouseRequest { WarehouseCode = "'\"" };

			var result = await controller.CreateWarehouse(request);

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");
		}
		#endregion

		#region UTCID 04: WarehouseName lÃ  KHo 12@%$% (ThÃ nh cÃ´ng)
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

		#region UTCID 05: TrÃ¹ng tÃªn kho (Kho1) (ThÃ nh cÃ´ng)
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

		#region UTCID 06: WarehouseName lÃ  Empty/Null / " " (400)
		[Fact]
		public async Task CreateWarehouse_UTCID06_ReturnsBadRequest_NameEmpty()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("WarehouseName", "Required");
			var request = new CreateWarehouseRequest { WarehouseName = " " };

			var result = await controller.CreateWarehouse(request);

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");
		}
		#endregion

		#region UTCID 07: Address lÃ  124@ tá»‘ táº¥m (ThÃ nh cÃ´ng)
		[Fact]
		public async Task CreateWarehouse_UTCID07_ReturnsOk_SpecialCharsAddress()
		{
			var controller = CreateControllerWithUser(userId: 1);
			var request = new CreateWarehouseRequest { WarehouseCode = "KHVT", Address = "124@ tá»‘ táº¥m" };
			_warehouseServiceMock.Setup(x => x.CreateWarehouseAsync(request, 1)).ReturnsAsync(new WarehouseResponse());

			var result = await controller.CreateWarehouse(request);

			result.Should().BeOfType<OkObjectResult>();
		}
		#endregion

		#region UTCID 08: trÃ¹ng Ä‘á»‹a chá»‰ (LÃª quang Ä‘ao) (ThÃ nh cÃ´ng)
		[Fact]
		public async Task CreateWarehouse_UTCID08_ReturnsOk_DuplicateAddress()
		{
			var controller = CreateControllerWithUser(userId: 1);
			var request = new CreateWarehouseRequest { WarehouseCode = "KHVT3", Address = "LÃª quang Ä‘ao" };
			_warehouseServiceMock.Setup(x => x.CreateWarehouseAsync(request, 1)).ReturnsAsync(new WarehouseResponse());

			var result = await controller.CreateWarehouse(request);

			result.Should().BeOfType<OkObjectResult>();
		}
		#endregion

		#region UTCID 09: Address lÃ  Empty/Null / " " (400)
		[Fact]
		public async Task CreateWarehouse_UTCID09_ReturnsBadRequest_AddressEmpty()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("Address", "Required");

			var result = await controller.CreateWarehouse(new CreateWarehouseRequest { Address = "" });

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");
		}
		#endregion

		#region UTCID 10: isActive = False (ThÃ nh cÃ´ng)
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

		#region UTCID 11: Dá»¯ liá»‡u chuáº©n + Lá»—i há»‡ thá»‘ng (500)
		[Fact]
		public async Task CreateWarehouse_UTCID11_Returns500_SystemError()
		{
			var controller = CreateControllerWithUser(userId: 1);
			var request = new CreateWarehouseRequest { WarehouseCode = "KHVT", WarehouseName = "khoTang 1", Address = "12 tá»‘ há»¯u" };
			_warehouseServiceMock.Setup(x => x.CreateWarehouseAsync(request, 1)).ThrowsAsync(new Exception());

			var result = await controller.CreateWarehouse(request);

			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Be("ÄÃ£ xáº£y ra lá»—i há»‡ thá»‘ng.");
		}
		#endregion

		#region UTCID 12: WarehouseCode lÃ  Empty/Null (400)
		[Fact]
		public async Task CreateWarehouse_UTCID12_ReturnsBadRequest_CodeNull()
		{
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("WarehouseCode", "Required");

			var result = await controller.CreateWarehouse(new CreateWarehouseRequest { WarehouseCode = null });

			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");
		}
		#endregion

		// =========================================================
		// 3ï¸âƒ£ UpdateWarehouse â€” 8 Test Cases
		// =========================================================

		#region UTCID 01: UpdateWarehouse â€” Normal â€” ThÃ nh cÃ´ng (Dá»¯ liá»‡u chuáº©n)
		[Fact]
		public async Task UpdateWarehouse_UTCID01_ReturnsOk_StandardSuccess()
		{
			// Arrange â€” ID tá»“n táº¡i (10), Name/Address há»£p lá»‡
			var controller = CreateControllerWithUser(userId: 1);
			var request = new UpdateWarehouseRequest
			{
				WarehouseName = "Kho HÃ  Ná»™i (Cáº­p nháº­t)",
				Address = "456 ÄÆ°á»ng Má»›i",
				IsActive = true
			};
			var expected = new WarehouseResponse { WarehouseId = 10, WarehouseName = "Kho HÃ  Ná»™i (Cáº­p nháº­t)" };

			_warehouseServiceMock.Setup(x => x.UpdateWarehouseAsync(10, request, 1)).ReturnsAsync(expected);

			// Act
			var result = await controller.UpdateWarehouse(10, request);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<WarehouseResponse>>().Subject;

			response.Success.Should().BeTrue();
			response.Message.Should().Be("Cáº­p nháº­t kho thÃ nh cÃ´ng.");
			response.Data!.WarehouseName.Should().Be("Kho HÃ  Ná»™i (Cáº­p nháº­t)");
		}
		#endregion

		#region UTCID 02: UpdateWarehouse â€” Abnormal â€” ID khÃ´ng tá»“n táº¡i (404)
		[Fact]
		public async Task UpdateWarehouse_UTCID02_ReturnsNotFound_WhenIdNotExist()
		{
			// Arrange â€” ID 9999 khÃ´ng cÃ³ trong DB
			var controller = CreateControllerWithUser(userId: 1);
			var request = new UpdateWarehouseRequest { WarehouseName = "Test" };

			_warehouseServiceMock.Setup(x => x.UpdateWarehouseAsync(9999, request, 1))
								  .ThrowsAsync(new KeyNotFoundException("KhÃ´ng tÃ¬m tháº¥y kho."));

			// Act
			var result = await controller.UpdateWarehouse(9999, request);

			// Assert â€” Pháº£i tráº£ vá» 404 NotFound
			var nf = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			var response = nf.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			response.Message.Should().Be("KhÃ´ng tÃ¬m tháº¥y kho.");
			response.Success.Should().BeFalse();
		}
		#endregion

		#region UTCID 04: UpdateWarehouse â€” Boundary â€” ID biÃªn (ID <= 0) (404)
		[Fact]
		public async Task UpdateWarehouse_UTCID04_ReturnsNotFound_WhenIdIsInvalid()
		{
			// Arrange â€” ID = -10 hoáº·c 0
			var controller = CreateControllerWithUser(userId: 1);
			var request = new UpdateWarehouseRequest { WarehouseName = "KHo 12@%$%" };

			_warehouseServiceMock.Setup(x => x.UpdateWarehouseAsync(It.IsInRange(long.MinValue, 0, Moq.Range.Inclusive), It.IsAny<UpdateWarehouseRequest>(), It.IsAny<long>()))
								  .ThrowsAsync(new KeyNotFoundException("KhÃ´ng tÃ¬m tháº¥y kho."));

			// Act
			var result = await controller.UpdateWarehouse(-10, request);

			// Assert
			result.Should().BeOfType<NotFoundObjectResult>();
		}
		#endregion

		#region UTCID 05: UpdateWarehouse â€” Boundary â€” Name trá»‘ng (400)
		[Fact]
		public async Task UpdateWarehouse_UTCID05_ReturnsBadRequest_WhenNameEmpty()
		{
			// Arrange â€” Name trá»‘ng/Null
			var controller = CreateControllerWithUser();
			controller.ModelState.AddModelError("WarehouseName", "Required");
			var request = new UpdateWarehouseRequest { WarehouseName = " " };

			// Act
			var result = await controller.UpdateWarehouse(10, request);

			// Assert
			var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
			((ApiResponse<object>)bad.Value!).Message.Should().Be("Dá»¯ liá»‡u khÃ´ng há»£p lá»‡.");

			_warehouseServiceMock.Verify(x => x.UpdateWarehouseAsync(It.IsAny<long>(), It.IsAny<UpdateWarehouseRequest>(), It.IsAny<long>()), Times.Never);
		}
		#endregion

		#region UTCID 07: UpdateWarehouse â€” Boundary â€” Address kÃ½ tá»± láº¡ (200)
		[Fact]
		public async Task UpdateWarehouse_UTCID07_ReturnsOk_WhenAddressHasSpecialChars()
		{
			// Arrange â€” Äá»‹a chá»‰ 124@ tá»‘ táº¥m
			var controller = CreateControllerWithUser(userId: 1);
			var request = new UpdateWarehouseRequest { WarehouseName = "Kho chuáº©n", Address = "124@ tá»‘ táº¥m", IsActive = true };
			_warehouseServiceMock.Setup(x => x.UpdateWarehouseAsync(10, request, 1)).ReturnsAsync(new WarehouseResponse());

			// Act
			var result = await controller.UpdateWarehouse(10, request);

			// Assert â€” Há»‡ thá»‘ng cho phÃ©p kÃ½ tá»± láº¡ trong Ä‘á»‹a chá»‰
			result.Should().BeOfType<OkObjectResult>();
		}
		#endregion

		#region UTCID 03, 06, 08: UpdateWarehouse â€” Abnormal â€” Lá»—i há»‡ thá»‘ng (500)
		[Fact]
		public async Task UpdateWarehouse_SystemError_Returns500()
		{
			// Arrange â€” Dá»¯ liá»‡u chuáº©n nhÆ°ng DB crash
			var controller = CreateControllerWithUser(userId: 1);
			_warehouseServiceMock.Setup(x => x.UpdateWarehouseAsync(It.IsAny<long>(), It.IsAny<UpdateWarehouseRequest>(), It.IsAny<long>()))
								  .ThrowsAsync(new Exception("DB Crash"));

			// Act
			var result = await controller.UpdateWarehouse(10, new UpdateWarehouseRequest { WarehouseName = "Test" });

			// Assert
			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Be("ÄÃ£ xáº£y ra lá»—i há»‡ thá»‘ng.");
		}
		#endregion

		// =========================================================
		// 4ï¸âƒ£ ToggleWarehouseStatus â€” 6 Test Cases
		// =========================================================

		#region UTCID 01: Toggle sang Enable (Normal - ThÃ nh cÃ´ng)
		[Fact]
		public async Task ToggleWarehouseStatus_UTCID01_ReturnsEnableMessage_WhenSuccess()
		{
			// Arrange: Giáº£ láº­p kho Ä‘ang táº¯t (False), toggle xong sáº½ thÃ nh True (Enable)
			var controller = CreateController();
			var id = 10L;
			var expected = new WarehouseResponse { WarehouseId = id, IsActive = true };

			_warehouseServiceMock.Setup(x => x.ToggleWarehouseStatusAsync(id)).ReturnsAsync(expected);

			// Act
			var result = await controller.ToggleWarehouseStatus(id);

			// Assert: Kiá»ƒm tra status code vÃ  message Ä‘á»™ng
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<WarehouseResponse>>().Subject;

			response.Success.Should().BeTrue();
			response.Message.Should().Be("ÄÃ£ chuyá»ƒn tráº¡ng thÃ¡i kho thÃ nh Enable.");
			response.Data!.IsActive.Should().BeTrue();
		}
		#endregion

		#region UTCID 02: Toggle sang Disable (Normal - ThÃ nh cÃ´ng)
		[Fact]
		public async Task ToggleWarehouseStatus_UTCID02_ReturnsDisableMessage_WhenSuccess()
		{
			// Arrange: Giáº£ láº­p kho Ä‘ang báº­t (True), toggle xong sáº½ thÃ nh False (Disable)
			var controller = CreateController();
			var id = 10L;
			var expected = new WarehouseResponse { WarehouseId = id, IsActive = false };

			_warehouseServiceMock.Setup(x => x.ToggleWarehouseStatusAsync(id)).ReturnsAsync(expected);

			// Act
			var result = await controller.ToggleWarehouseStatus(id);

			// Assert
			var ok = result.Should().BeOfType<OkObjectResult>().Subject;
			var response = ok.Value.Should().BeOfType<ApiResponse<WarehouseResponse>>().Subject;

			response.Message.Should().Be("ÄÃ£ chuyá»ƒn tráº¡ng thÃ¡i kho thÃ nh Disable.");
			response.Data!.IsActive.Should().BeFalse();
		}
		#endregion

		#region UTCID 03: ID khÃ´ng tá»“n táº¡i (Abnormal - 404)
		[Fact]
		public async Task ToggleWarehouseStatus_UTCID03_ReturnsNotFound_WhenIdNotExist()
		{
			// Arrange: ID 9999 khÃ´ng cÃ³ trong há»‡ thá»‘ng
			var controller = CreateController();
			_warehouseServiceMock.Setup(x => x.ToggleWarehouseStatusAsync(9999))
								  .ThrowsAsync(new KeyNotFoundException("KhÃ´ng tÃ¬m tháº¥y kho."));

			// Act
			var result = await controller.ToggleWarehouseStatus(9999);

			// Assert
			var nf = result.Should().BeOfType<NotFoundObjectResult>().Subject;
			var response = nf.Value.Should().BeOfType<ApiResponse<object>>().Subject;

			response.Success.Should().BeFalse();
			response.Message.Should().Be("KhÃ´ng tÃ¬m tháº¥y kho.");
		}
		#endregion

		#region UTCID 04: ID biÃªn (ID <= 0) (Boundary - 404)
		[Fact]
		public async Task ToggleWarehouseStatus_UTCID04_ReturnsNotFound_WhenIdIsZeroOrNegative()
		{
			// Arrange: ID = 0
			var controller = CreateController();
			_warehouseServiceMock.Setup(x => x.ToggleWarehouseStatusAsync(0))
								  .ThrowsAsync(new KeyNotFoundException("KhÃ´ng tÃ¬m tháº¥y kho."));

			// Act
			var result = await controller.ToggleWarehouseStatus(0);

			// Assert
			result.Should().BeOfType<NotFoundObjectResult>();
		}
		#endregion

		#region UTCID 05 & 06: Lá»—i há»‡ thá»‘ng (Abnormal - 500)
		[Fact]
		public async Task ToggleWarehouseStatus_UTCID05_06_Returns500_WhenSystemError()
		{
			// Arrange: Giáº£ láº­p lá»—i káº¿t ná»‘i Database
			var controller = CreateController();
			_warehouseServiceMock.Setup(x => x.ToggleWarehouseStatusAsync(It.IsAny<long>()))
								  .ThrowsAsync(new Exception("Database connection failed"));

			// Act
			var result = await controller.ToggleWarehouseStatus(10);

			// Assert: Controller catch Exception chung -> 500
			var error = result.Should().BeOfType<ObjectResult>().Subject;
			error.StatusCode.Should().Be(500);
			((ApiResponse<object>)error.Value!).Message.Should().Be("ÄÃ£ xáº£y ra lá»—i há»‡ thá»‘ng.");
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

			// Assert: Äáº£m báº£o service chá»‰ Ä‘Æ°á»£c gá»i Ä‘Ãºng 1 láº§n vá»›i Ä‘Ãºng ID
			_warehouseServiceMock.Verify(x => x.ToggleWarehouseStatusAsync(1), Times.Once);
		}
		#endregion
	}
}