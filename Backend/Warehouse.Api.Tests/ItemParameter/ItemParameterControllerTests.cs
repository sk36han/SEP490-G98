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

public class ItemParameterControllerTests
{
	private readonly Mock<IItemParameterService> _itemParameterServiceMock = new();

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
	// 1. CreateItemParameter
	// =========================================================

	[Fact]
	public async Task CreateItemParameter_ShouldReturnOk_WhenSuccessful()
	{
		var controller = new ItemParameterController(_itemParameterServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateItemParameterRequest { ParamCode = "COLOR", ParamName = "Màu sắc", DataType = "string" };
		var expected = new ItemParameterResponse { ParamId = 1, ParamCode = "COLOR", ParamName = "Màu sắc", DataType = "string", IsActive = true };

		_itemParameterServiceMock.Setup(x => x.CreateItemParameterAsync(request, It.IsAny<long>())).ReturnsAsync(expected);

		var result = await controller.CreateItemParameter(request);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<ItemParameterResponse>().Subject;
		response.ParamCode.Should().Be("COLOR");
		response.IsActive.Should().BeTrue();
	}

	[Fact]
	public async Task CreateItemParameter_ShouldReturnBadRequest_WhenModelStateIsInvalid()
	{
		var controller = new ItemParameterController(_itemParameterServiceMock.Object);
		controller.ModelState.AddModelError("ParamCode", "Mã thông số kỹ thuật không được để trống.");

		var result = await controller.CreateItemParameter(new CreateItemParameterRequest());
		result.Should().BeOfType<BadRequestObjectResult>();
	}

	[Fact]
	public async Task CreateItemParameter_ShouldReturnBadRequest_WhenParamCodeIsDuplicate()
	{
		var controller = new ItemParameterController(_itemParameterServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateItemParameterRequest { ParamCode = "COLOR", ParamName = "Màu sắc", DataType = "string" };
		_itemParameterServiceMock
			.Setup(x => x.CreateItemParameterAsync(request, It.IsAny<long>()))
			.ThrowsAsync(new InvalidOperationException("Mã thông số kỹ thuật 'COLOR' đã tồn tại."));

		var result = await controller.CreateItemParameter(request);
		var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequestResult.Value.Should().BeEquivalentTo(new { message = "Mã thông số kỹ thuật 'COLOR' đã tồn tại." });
	}

	[Fact]
	public async Task CreateItemParameter_ShouldReturnBadRequest_WhenServiceThrowsArgumentException()
	{
		var controller = new ItemParameterController(_itemParameterServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateItemParameterRequest { ParamCode = "C", ParamName = "A", DataType = "string" }; 
		_itemParameterServiceMock
			.Setup(x => x.CreateItemParameterAsync(request, It.IsAny<long>()))
			.ThrowsAsync(new ArgumentException("Tên thông số kỹ thuật phải có ít nhất 2 ký tự."));

		var result = await controller.CreateItemParameter(request);
		var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequestResult.Value.Should().BeEquivalentTo(new { message = "Tên thông số kỹ thuật phải có ít nhất 2 ký tự." });
	}

	[Fact]
	public async Task CreateItemParameter_ShouldReturnUnauthorized_WhenUserClaimMissing()
	{
		var controller = new ItemParameterController(_itemParameterServiceMock.Object);
		controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
		var request = new CreateItemParameterRequest { ParamCode = "COLOR", ParamName = "Màu sắc", DataType = "string" };

		var result = await controller.CreateItemParameter(request);
		result.Should().BeOfType<UnauthorizedObjectResult>();
	}

	// =========================================================
	// 2. GetItemParameters
	// =========================================================

	[Fact]
	public async Task GetItemParameters_ShouldReturnOk_WithDefaultPagination()
	{
		var controller = new ItemParameterController(_itemParameterServiceMock.Object);
		_itemParameterServiceMock
			.Setup(x => x.GetItemParametersAsync(1, 20, null, null))
			.ReturnsAsync(new PagedResponse<ItemParameterResponse> { Page = 1, PageSize = 20, TotalItems = 0, Items = new List<ItemParameterResponse>() });

		var result = await controller.GetItemParameters(1, 20);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<PagedResponse<ItemParameterResponse>>().Subject;
		response.Page.Should().Be(1);
		response.PageSize.Should().Be(20);
	}

	[Fact]
	public async Task GetItemParameters_ShouldFilterByParamName()
	{
		var controller = new ItemParameterController(_itemParameterServiceMock.Object);
		_itemParameterServiceMock
			.Setup(x => x.GetItemParametersAsync(1, 20, "Màu", null))
			.ReturnsAsync(new PagedResponse<ItemParameterResponse>
			{
				Items = new List<ItemParameterResponse> { new ItemParameterResponse { ParamName = "Màu sắc" } }
			});

		var result = await controller.GetItemParameters(1, 20, "Màu");
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<PagedResponse<ItemParameterResponse>>().Subject;
		response.Items[0].ParamName.Should().Be("Màu sắc");
	}

	// =========================================================
	// 3. GetItemParameterById
	// =========================================================

	[Fact]
	public async Task GetItemParameterById_ShouldReturnOk_WhenFound()
	{
		var controller = new ItemParameterController(_itemParameterServiceMock.Object);
		_itemParameterServiceMock
			.Setup(x => x.GetItemParameterByIdAsync(1))
			.ReturnsAsync(new ItemParameterResponse { ParamId = 1, ParamCode = "COLOR" });

		var result = await controller.GetItemParameterById(1);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<ItemParameterResponse>().Subject;
		response.ParamId.Should().Be(1);
		response.ParamCode.Should().Be("COLOR");
	}

	[Fact]
	public async Task GetItemParameterById_ShouldReturnNotFound_WhenNotExists()
	{
		var controller = new ItemParameterController(_itemParameterServiceMock.Object);
		_itemParameterServiceMock
			.Setup(x => x.GetItemParameterByIdAsync(99))
			.ThrowsAsync(new KeyNotFoundException("Không tìm thấy thông số kỹ thuật với ID = 99."));

		var result = await controller.GetItemParameterById(99);
		var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
		notFoundResult.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy thông số kỹ thuật với ID = 99." });
	}

	// =========================================================
	// 4. UpdateItemParameter
	// =========================================================

	[Fact]
	public async Task UpdateItemParameter_ShouldReturnOk_WhenSuccessful()
	{
		var controller = new ItemParameterController(_itemParameterServiceMock.Object);
		SetupUserClaims(controller);
		var request = new UpdateItemParameterRequest { ParamName = "Màu sắc updated", DataType = "string", IsActive = true };
		_itemParameterServiceMock
			.Setup(x => x.UpdateItemParameterAsync(1, request, It.IsAny<long>()))
			.ReturnsAsync(new ItemParameterResponse { ParamId = 1, ParamName = "Màu sắc updated", IsActive = true });

		var result = await controller.UpdateItemParameter(1, request);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<ItemParameterResponse>().Subject;
		response.ParamName.Should().Be("Màu sắc updated");
	}

	[Fact]
	public async Task UpdateItemParameter_ShouldReturnNotFound_WhenNotExists()
	{
		var controller = new ItemParameterController(_itemParameterServiceMock.Object);
		SetupUserClaims(controller);
		var request = new UpdateItemParameterRequest { ParamName = "Màu", DataType = "string", IsActive = true };
		_itemParameterServiceMock
			.Setup(x => x.UpdateItemParameterAsync(999, request, It.IsAny<long>()))
			.ThrowsAsync(new KeyNotFoundException("Không tìm thấy thông số kỹ thuật với ID = 999."));

		var result = await controller.UpdateItemParameter(999, request);
		var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
		notFoundResult.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy thông số kỹ thuật với ID = 999." });
	}

	// =========================================================
	// 5. ToggleItemParameterStatus
	// =========================================================

	[Fact]
	public async Task ToggleItemParameterStatus_ShouldReturnOk_WhenSuccessful()
	{
		var controller = new ItemParameterController(_itemParameterServiceMock.Object);
		_itemParameterServiceMock
			.Setup(x => x.ToggleItemParameterStatusAsync(1, false))
			.ReturnsAsync(new ItemParameterResponse { ParamId = 1, IsActive = false });

		var result = await controller.ToggleItemParameterStatus(1, false);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		okResult.Value.Should().BeOfType<ItemParameterResponse>().Which.IsActive.Should().BeFalse();
	}

	[Fact]
	public async Task ToggleItemParameterStatus_ShouldReturnBadRequest_WhenStatusAlreadySame()
	{
		var controller = new ItemParameterController(_itemParameterServiceMock.Object);
		_itemParameterServiceMock
			.Setup(x => x.ToggleItemParameterStatusAsync(1, true))
			.ThrowsAsync(new InvalidOperationException("Thông số kỹ thuật 'COLOR' hiện tại đang hoạt động. Không cần thay đổi."));

		var result = await controller.ToggleItemParameterStatus(1, true);
		var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequestResult.Value.Should().BeEquivalentTo(
			new { message = "Thông số kỹ thuật 'COLOR' hiện tại đang hoạt động. Không cần thay đổi." });
	}
}
