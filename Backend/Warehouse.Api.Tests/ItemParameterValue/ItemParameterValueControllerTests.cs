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

namespace Warehouse.Api.Tests;

public class ItemParameterValueControllerTests
{
	private readonly Mock<IItemParameterValueService> _itemParameterValueServiceMock = new();

	private static void SetupUserClaims(ControllerBase controller, long userId = 1)
	{
		var claims = new List<Claim> { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) };
		var identity = new ClaimsIdentity(claims, "TestAuth");
		var principal = new ClaimsPrincipal(identity);
		controller.ControllerContext = new ControllerContext
		{
			HttpContext = new DefaultHttpContext { User = principal }
		};
	}

	// =========================================================
	// 1. CreateItemParameterValue
	// =========================================================

	[Fact]
	public async Task CreateItemParameterValue_ShouldReturnOk_WhenSuccessful()
	{
		var controller = new ItemParameterValueController(_itemParameterValueServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateItemParameterValueRequest { ItemId = 1, ParamId = 1, ParamValue = "Red" };
		var expected = new ItemParameterValueResponse { ItemParamValueId = 1, ItemId = 1, ParamId = 1, ParamValue = "Red" };

		_itemParameterValueServiceMock.Setup(x => x.CreateItemParameterValueAsync(request, It.IsAny<long>())).ReturnsAsync(expected);

		var result = await controller.CreateItemParameterValue(request);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<ItemParameterValueResponse>().Subject;
		response.ParamValue.Should().Be("Red");
	}

	[Fact]
	public async Task CreateItemParameterValue_ShouldReturnBadRequest_WhenModelStateIsInvalid()
	{
		var controller = new ItemParameterValueController(_itemParameterValueServiceMock.Object);
		controller.ModelState.AddModelError("ItemId", "ID mặt hàng không được để trống.");

		var result = await controller.CreateItemParameterValue(new CreateItemParameterValueRequest());
		result.Should().BeOfType<BadRequestObjectResult>();
	}

	[Fact]
	public async Task CreateItemParameterValue_ShouldReturnNotFound_WhenItemOrParamNotExists()
	{
		var controller = new ItemParameterValueController(_itemParameterValueServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateItemParameterValueRequest { ItemId = 99, ParamId = 1, ParamValue = "Red" };
		_itemParameterValueServiceMock
			.Setup(x => x.CreateItemParameterValueAsync(request, It.IsAny<long>()))
			.ThrowsAsync(new KeyNotFoundException("Không tìm thấy mặt hàng với ID = 99."));

		var result = await controller.CreateItemParameterValue(request);
		var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
		notFoundResult.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy mặt hàng với ID = 99." });
	}

	// =========================================================
	// 2. GetItemParameterValuesByItemId
	// =========================================================

	[Fact]
	public async Task GetItemParameterValuesByItemId_ShouldReturnOk_WithValues()
	{
		var controller = new ItemParameterValueController(_itemParameterValueServiceMock.Object);
		var expectedList = new List<ItemParameterValueResponse> 
		{ 
			new ItemParameterValueResponse { ItemParamValueId = 1, ParamValue = "Red" },
			new ItemParameterValueResponse { ItemParamValueId = 2, ParamValue = "XL" }
		};
		
		_itemParameterValueServiceMock
			.Setup(x => x.GetItemParameterValuesByItemIdAsync(1))
			.ReturnsAsync(expectedList);

		var result = await controller.GetItemParameterValuesByItemId(1);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeAssignableTo<IEnumerable<ItemParameterValueResponse>>().Subject;
		response.Should().HaveCount(2);
	}

	// =========================================================
	// 3. GetItemParameterValueById
	// =========================================================

	[Fact]
	public async Task GetItemParameterValueById_ShouldReturnOk_WhenFound()
	{
		var controller = new ItemParameterValueController(_itemParameterValueServiceMock.Object);
		_itemParameterValueServiceMock
			.Setup(x => x.GetItemParameterValueByIdAsync(1))
			.ReturnsAsync(new ItemParameterValueResponse { ItemParamValueId = 1, ParamValue = "Red" });

		var result = await controller.GetItemParameterValueById(1);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<ItemParameterValueResponse>().Subject;
		response.ItemParamValueId.Should().Be(1);
		response.ParamValue.Should().Be("Red");
	}

	[Fact]
	public async Task GetItemParameterValueById_ShouldReturnNotFound_WhenNotExists()
	{
		var controller = new ItemParameterValueController(_itemParameterValueServiceMock.Object);
		_itemParameterValueServiceMock
			.Setup(x => x.GetItemParameterValueByIdAsync(99))
			.ThrowsAsync(new KeyNotFoundException("Không tìm thấy giá trị thông số với ID = 99."));

		var result = await controller.GetItemParameterValueById(99);
		var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
		notFoundResult.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy giá trị thông số với ID = 99." });
	}

	// =========================================================
	// 4. UpdateItemParameterValue
	// =========================================================

	[Fact]
	public async Task UpdateItemParameterValue_ShouldReturnOk_WhenSuccessful()
	{
		var controller = new ItemParameterValueController(_itemParameterValueServiceMock.Object);
		SetupUserClaims(controller);
		var request = new UpdateItemParameterValueRequest { ParamValue = "Blue" };
		_itemParameterValueServiceMock
			.Setup(x => x.UpdateItemParameterValueAsync(1, request, It.IsAny<long>()))
			.ReturnsAsync(new ItemParameterValueResponse { ItemParamValueId = 1, ParamValue = "Blue" });

		var result = await controller.UpdateItemParameterValue(1, request);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<ItemParameterValueResponse>().Subject;
		response.ParamValue.Should().Be("Blue");
	}

	[Fact]
	public async Task UpdateItemParameterValue_ShouldReturnNotFound_WhenNotExists()
	{
		var controller = new ItemParameterValueController(_itemParameterValueServiceMock.Object);
		SetupUserClaims(controller);
		var request = new UpdateItemParameterValueRequest { ParamValue = "Blue" };
		_itemParameterValueServiceMock
			.Setup(x => x.UpdateItemParameterValueAsync(999, request, It.IsAny<long>()))
			.ThrowsAsync(new KeyNotFoundException("Không tìm thấy giá trị thông số với ID = 999."));

		var result = await controller.UpdateItemParameterValue(999, request);
		var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
		notFoundResult.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy giá trị thông số với ID = 999." });
	}

	// =========================================================
	// 5. DeleteItemParameterValue
	// =========================================================

	[Fact]
	public async Task DeleteItemParameterValue_ShouldReturnOk_WhenSuccessful()
	{
		var controller = new ItemParameterValueController(_itemParameterValueServiceMock.Object);
		SetupUserClaims(controller);
		_itemParameterValueServiceMock
			.Setup(x => x.DeleteItemParameterValueAsync(1, It.IsAny<long>()))
			.ReturnsAsync(new { message = "Xóa thành công", id = 1 });

		var result = await controller.DeleteItemParameterValue(1);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		// Check that it returned an anonymous object with our expected properties
		var json = System.Text.Json.JsonSerializer.Serialize(okResult.Value);
		json.Should().Contain("Xóa thành công");
	}

	[Fact]
	public async Task DeleteItemParameterValue_ShouldReturnNotFound_WhenNotExists()
	{
		var controller = new ItemParameterValueController(_itemParameterValueServiceMock.Object);
		SetupUserClaims(controller);
		_itemParameterValueServiceMock
			.Setup(x => x.DeleteItemParameterValueAsync(999, It.IsAny<long>()))
			.ThrowsAsync(new KeyNotFoundException("Không tìm thấy giá trị thông số với ID = 999."));

		var result = await controller.DeleteItemParameterValue(999);
		var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
		notFoundResult.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy giá trị thông số với ID = 999." });
	}
}
