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

public class BrandControllerTests
{
	private readonly Mock<IBrandService> _brandServiceMock = new();

	/// <summary>
	/// Gán fake HttpContext với UserId claim để tránh NullReferenceException khi controller gọi User.FindFirst().
	/// </summary>
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
	// 1. CreateBrand
	// =========================================================

	[Fact]
	public async Task CreateBrand_ShouldReturnOk_WhenSuccessful()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateBrandRequest { BrandName = "Nike" };
		var expected = new BrandResponse { BrandId = 1, BrandName = "Nike", IsActive = true };

		_brandServiceMock.Setup(x => x.CreateBrandAsync(request, It.IsAny<long>())).ReturnsAsync(expected);

		var result = await controller.CreateBrand(request);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<BrandResponse>().Subject;
		response.BrandName.Should().Be("Nike");
		response.IsActive.Should().BeTrue();
	}

	[Fact]
	public async Task CreateBrand_ShouldReturnBadRequest_WhenModelStateIsInvalid()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		controller.ModelState.AddModelError("BrandName", "Tên thương hiệu không được để trống.");

		var result = await controller.CreateBrand(new CreateBrandRequest());
		result.Should().BeOfType<BadRequestObjectResult>();
	}

	[Fact]
	public async Task CreateBrand_ShouldReturnBadRequest_WhenBrandNameIsDuplicate()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateBrandRequest { BrandName = "Nike" };
		_brandServiceMock
			.Setup(x => x.CreateBrandAsync(request, It.IsAny<long>()))
			.ThrowsAsync(new InvalidOperationException("Thương hiệu 'Nike' đã tồn tại."));

		var result = await controller.CreateBrand(request);
		var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequestResult.Value.Should().BeEquivalentTo(new { message = "Thương hiệu 'Nike' đã tồn tại." });
	}

	[Fact]
	public async Task CreateBrand_ShouldReturnBadRequest_WhenBrandNameIsBlank_ModelState()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		controller.ModelState.AddModelError("BrandName", "Tên thương hiệu không được để trống.");

		var result = await controller.CreateBrand(new CreateBrandRequest { BrandName = "   " });
		result.Should().BeOfType<BadRequestObjectResult>();
	}

	[Fact]
	public async Task CreateBrand_ShouldReturnBadRequest_WhenServiceThrowsArgumentException()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateBrandRequest { BrandName = "A" }; // quá ngắn
		_brandServiceMock
			.Setup(x => x.CreateBrandAsync(request, It.IsAny<long>()))
			.ThrowsAsync(new ArgumentException("Tên thương hiệu phải có ít nhất 2 ký tự."));

		var result = await controller.CreateBrand(request);
		var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequestResult.Value.Should().BeEquivalentTo(new { message = "Tên thương hiệu phải có ít nhất 2 ký tự." });
	}

	[Fact]
	public async Task CreateBrand_ShouldReturnBadRequest_WhenBrandNameExceedsMaxLength()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		controller.ModelState.AddModelError("BrandName", "Tên thương hiệu không được vượt quá 255 ký tự.");

		var result = await controller.CreateBrand(new CreateBrandRequest { BrandName = new string('A', 256) });
		result.Should().BeOfType<BadRequestObjectResult>();
	}

	[Fact]
	public async Task CreateBrand_ShouldPassBrandNameToService_Correctly()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateBrandRequest { BrandName = "Adidas" };
		_brandServiceMock
			.Setup(x => x.CreateBrandAsync(request, It.IsAny<long>()))
			.ReturnsAsync(new BrandResponse { BrandName = "Adidas" })
			.Verifiable();

		await controller.CreateBrand(request);
		_brandServiceMock.Verify(
			x => x.CreateBrandAsync(It.Is<CreateBrandRequest>(r => r.BrandName == "Adidas"), It.IsAny<long>()),
			Times.Once);
	}

	[Fact]
	public async Task CreateBrand_ShouldReturnUnauthorized_WhenUserClaimMissing()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		controller.ControllerContext = new ControllerContext
		{
			HttpContext = new DefaultHttpContext()
		};
		var request = new CreateBrandRequest { BrandName = "Brand X" };

		var result = await controller.CreateBrand(request);
		result.Should().BeOfType<UnauthorizedObjectResult>();
	}

	// =========================================================
	// 2. GetBrands
	// =========================================================

	[Fact]
	public async Task GetBrands_ShouldReturnOk_WithDefaultPagination()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.GetBrandsAsync(1, 20, null, null))
			.ReturnsAsync(new PagedResponse<BrandResponse> { Page = 1, PageSize = 20, TotalItems = 0, Items = new List<BrandResponse>() });

		var result = await controller.GetBrands(1, 20);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<PagedResponse<BrandResponse>>().Subject;
		response.Page.Should().Be(1);
		response.PageSize.Should().Be(20);
	}

	[Fact]
	public async Task GetBrands_ShouldFilterByBrandName()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.GetBrandsAsync(1, 20, "Nike", null))
			.ReturnsAsync(new PagedResponse<BrandResponse>
			{
				Items = new List<BrandResponse> { new BrandResponse { BrandName = "Nike" } }
			});

		var result = await controller.GetBrands(1, 20, "Nike");
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<PagedResponse<BrandResponse>>().Subject;
		response.Items[0].BrandName.Should().Be("Nike");
	}

	[Fact]
	public async Task GetBrands_ShouldFilterByIsActive_True()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.GetBrandsAsync(1, 20, null, true))
			.ReturnsAsync(new PagedResponse<BrandResponse>
			{
				Items = new List<BrandResponse> { new BrandResponse { IsActive = true } }
			});

		var result = await controller.GetBrands(1, 20, null, true);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<PagedResponse<BrandResponse>>().Subject;
		response.Items[0].IsActive.Should().BeTrue();
	}

	[Fact]
	public async Task GetBrands_ShouldReturnEmpty_WhenNoMatch()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.GetBrandsAsync(1, 20, "xyz_no_match", null))
			.ReturnsAsync(new PagedResponse<BrandResponse> { Items = new List<BrandResponse>(), TotalItems = 0 });

		var result = await controller.GetBrands(1, 20, "xyz_no_match");
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<PagedResponse<BrandResponse>>().Subject;
		response.Items.Should().BeEmpty();
		response.TotalItems.Should().Be(0);
	}

	[Fact]
	public async Task GetBrands_ShouldPassAllParams_ToServiceCorrectly()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.GetBrandsAsync(2, 5, "Adidas", true))
			.ReturnsAsync(new PagedResponse<BrandResponse> { Items = new List<BrandResponse>() })
			.Verifiable();

		await controller.GetBrands(2, 5, "Adidas", true);
		_brandServiceMock.Verify(x => x.GetBrandsAsync(2, 5, "Adidas", true), Times.Once);
	}

	// =========================================================
	// 3. GetBrandById
	// =========================================================

	[Fact]
	public async Task GetBrandById_ShouldReturnOk_WhenFound()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.GetBrandByIdAsync(1))
			.ReturnsAsync(new BrandResponse { BrandId = 1, BrandName = "Nike" });

		var result = await controller.GetBrandById(1);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<BrandResponse>().Subject;
		response.BrandId.Should().Be(1);
		response.BrandName.Should().Be("Nike");
	}

	[Fact]
	public async Task GetBrandById_ShouldReturnNotFound_WhenBrandDoesNotExist()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.GetBrandByIdAsync(99))
			.ThrowsAsync(new KeyNotFoundException("Không tìm thấy thương hiệu với ID = 99."));

		var result = await controller.GetBrandById(99);
		var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
		notFoundResult.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy thương hiệu với ID = 99." });
	}

	[Fact]
	public async Task GetBrandById_ShouldReturnBadRequest_WhenIdIsInvalid()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.GetBrandByIdAsync(0))
			.ThrowsAsync(new ArgumentException("ID thương hiệu không hợp lệ."));

		var result = await controller.GetBrandById(0);
		var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequestResult.Value.Should().BeEquivalentTo(new { message = "ID thương hiệu không hợp lệ." });
	}

	// =========================================================
	// 4. UpdateBrand
	// =========================================================

	[Fact]
	public async Task UpdateBrand_ShouldReturnOk_WhenSuccessful()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		SetupUserClaims(controller);
		var request = new UpdateBrandRequest { BrandName = "Updated Nike", IsActive = true };
		_brandServiceMock
			.Setup(x => x.UpdateBrandAsync(1, request, It.IsAny<long>()))
			.ReturnsAsync(new BrandResponse { BrandId = 1, BrandName = "Updated Nike", IsActive = true });

		var result = await controller.UpdateBrand(1, request);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<BrandResponse>().Subject;
		response.BrandName.Should().Be("Updated Nike");
	}

	[Fact]
	public async Task UpdateBrand_ShouldReturnBadRequest_WhenModelStateIsInvalid()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		controller.ModelState.AddModelError("BrandName", "Tên thương hiệu không được để trống.");

		var result = await controller.UpdateBrand(1, new UpdateBrandRequest());
		result.Should().BeOfType<BadRequestObjectResult>();
	}

	[Fact]
	public async Task UpdateBrand_ShouldReturnNotFound_WhenBrandDoesNotExist()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		SetupUserClaims(controller);
		var request = new UpdateBrandRequest { BrandName = "Brand X", IsActive = true };
		_brandServiceMock
			.Setup(x => x.UpdateBrandAsync(999, request, It.IsAny<long>()))
			.ThrowsAsync(new KeyNotFoundException("Không tìm thấy thương hiệu với ID = 999."));

		var result = await controller.UpdateBrand(999, request);
		var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
		notFoundResult.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy thương hiệu với ID = 999." });
	}

	[Fact]
	public async Task UpdateBrand_ShouldReturnBadRequest_WhenBrandNameIsDuplicate()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		SetupUserClaims(controller);
		var request = new UpdateBrandRequest { BrandName = "Adidas", IsActive = true };
		_brandServiceMock
			.Setup(x => x.UpdateBrandAsync(1, request, It.IsAny<long>()))
			.ThrowsAsync(new InvalidOperationException("Thương hiệu 'Adidas' đã tồn tại."));

		var result = await controller.UpdateBrand(1, request);
		var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequestResult.Value.Should().BeEquivalentTo(new { message = "Thương hiệu 'Adidas' đã tồn tại." });
	}

	[Fact]
	public async Task UpdateBrand_ShouldReturnBadRequest_WhenServiceThrowsArgumentException()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		SetupUserClaims(controller);
		var request = new UpdateBrandRequest { BrandName = "A", IsActive = true }; // quá ngắn
		_brandServiceMock
			.Setup(x => x.UpdateBrandAsync(1, request, It.IsAny<long>()))
			.ThrowsAsync(new ArgumentException("Tên thương hiệu phải có ít nhất 2 ký tự."));

		var result = await controller.UpdateBrand(1, request);
		var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequestResult.Value.Should().BeEquivalentTo(new { message = "Tên thương hiệu phải có ít nhất 2 ký tự." });
	}

	[Fact]
	public async Task UpdateBrand_ShouldPassIdToService_Correctly()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		SetupUserClaims(controller);
		var request = new UpdateBrandRequest { BrandName = "Puma", IsActive = false };
		_brandServiceMock
			.Setup(x => x.UpdateBrandAsync(55, request, It.IsAny<long>()))
			.ReturnsAsync(new BrandResponse { BrandId = 55, BrandName = "Puma" })
			.Verifiable();

		await controller.UpdateBrand(55, request);
		_brandServiceMock.Verify(x => x.UpdateBrandAsync(55, request, It.IsAny<long>()), Times.Once);
	}

	[Fact]
	public async Task UpdateBrand_ShouldReturnUnauthorized_WhenUserClaimMissing()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
		var request = new UpdateBrandRequest { BrandName = "Brand Y", IsActive = true };

		var result = await controller.UpdateBrand(1, request);
		result.Should().BeOfType<UnauthorizedObjectResult>();
	}

	// =========================================================
	// 5. ToggleBrandStatus
	// =========================================================

	[Fact]
	public async Task ToggleBrandStatus_ShouldReturnOk_WhenActivating()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.ToggleBrandStatusAsync(1, true))
			.ReturnsAsync(new BrandResponse { BrandId = 1, IsActive = true });

		var result = await controller.ToggleBrandStatus(1, true);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		okResult.Value.Should().BeOfType<BrandResponse>().Which.IsActive.Should().BeTrue();
	}

	[Fact]
	public async Task ToggleBrandStatus_ShouldReturnOk_WhenDeactivating()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.ToggleBrandStatusAsync(1, false))
			.ReturnsAsync(new BrandResponse { BrandId = 1, IsActive = false });

		var result = await controller.ToggleBrandStatus(1, false);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		okResult.Value.Should().BeOfType<BrandResponse>().Which.IsActive.Should().BeFalse();
	}

	[Fact]
	public async Task ToggleBrandStatus_ShouldReturnNotFound_WhenBrandDoesNotExist()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.ToggleBrandStatusAsync(99, true))
			.ThrowsAsync(new KeyNotFoundException("Không tìm thấy thương hiệu với ID = 99."));

		var result = await controller.ToggleBrandStatus(99, true);
		var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
		notFoundResult.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy thương hiệu với ID = 99." });
	}

	[Fact]
	public async Task ToggleBrandStatus_ShouldReturnBadRequest_WhenStatusAlreadySame()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.ToggleBrandStatusAsync(1, true))
			.ThrowsAsync(new InvalidOperationException("Thương hiệu 'Nike' hiện tại đang hoạt động. Không cần thay đổi."));

		var result = await controller.ToggleBrandStatus(1, true);
		var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequestResult.Value.Should().BeEquivalentTo(
			new { message = "Thương hiệu 'Nike' hiện tại đang hoạt động. Không cần thay đổi." });
	}

	[Fact]
	public async Task ToggleBrandStatus_ShouldReturnBadRequest_WhenIdIsInvalid()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.ToggleBrandStatusAsync(0, true))
			.ThrowsAsync(new ArgumentException("ID thương hiệu không hợp lệ."));

		var result = await controller.ToggleBrandStatus(0, true);
		var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequestResult.Value.Should().BeEquivalentTo(new { message = "ID thương hiệu không hợp lệ." });
	}

	[Fact]
	public async Task ToggleBrandStatus_ShouldPassParameters_ToServiceCorrectly()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.ToggleBrandStatusAsync(77, false))
			.ReturnsAsync(new BrandResponse { BrandId = 77, IsActive = false })
			.Verifiable();

		await controller.ToggleBrandStatus(77, false);
		_brandServiceMock.Verify(x => x.ToggleBrandStatusAsync(77, false), Times.Once);
	}

	// =========================================================
	// 6. Service-level Validation (ArgumentException từ service)
	// =========================================================

	[Fact]
	public async Task CreateBrand_ShouldReturnBadRequest_WhenBrandNameContainsInvalidChars()
	{
		// Service validate regex: ký tự < > / \ | ' " ; không được phép
		var controller = new BrandController(_brandServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateBrandRequest { BrandName = "Nike<script>" };
		_brandServiceMock
			.Setup(x => x.CreateBrandAsync(request, It.IsAny<long>()))
			.ThrowsAsync(new ArgumentException(
				"Tên thương hiệu chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.) và ký tự &."));

		var result = await controller.CreateBrand(request);
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(new
		{
			message = "Tên thương hiệu chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.) và ký tự &."
		});
	}

	[Fact]
	public async Task UpdateBrand_ShouldReturnBadRequest_WhenBrandNameContainsInvalidChars()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		SetupUserClaims(controller);
		var request = new UpdateBrandRequest { BrandName = "Brand'; DROP TABLE--", IsActive = true };
		_brandServiceMock
			.Setup(x => x.UpdateBrandAsync(1, request, It.IsAny<long>()))
			.ThrowsAsync(new ArgumentException(
				"Tên thương hiệu chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.) và ký tự &."));

		var result = await controller.UpdateBrand(1, request);
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(new
		{
			message = "Tên thương hiệu chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.) và ký tự &."
		});
	}

	[Fact]
	public async Task GetBrands_ShouldReturnBadRequest_WhenPageSizeExceeds100()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.GetBrandsAsync(1, 200, null, null))
			.ThrowsAsync(new ArgumentException("Số lượng item mỗi trang không được vượt quá 100."));

		var result = await controller.GetBrands(1, 200);
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(new { message = "Số lượng item mỗi trang không được vượt quá 100." });
	}

	[Fact]
	public async Task CreateBrand_ShouldReturnBadRequest_WhenUserIdIsZero()
	{
		// userId = 0 vẫn bị từ chối bởi controller (Unauthorized) vì claim không parse được
		// Trường hợp này test service throw ArgumentException khi userId <= 0
		var controller = new BrandController(_brandServiceMock.Object);
		SetupUserClaims(controller, userId: 0); // claim value = "0"
		var request = new CreateBrandRequest { BrandName = "ValidBrand" };
		_brandServiceMock
			.Setup(x => x.CreateBrandAsync(request, 0))
			.ThrowsAsync(new ArgumentException("ID người dùng không hợp lệ."));

		var result = await controller.CreateBrand(request);
		// Vì token parse thành công nhưng service throw ArgumentException → BadRequest
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(new { message = "ID người dùng không hợp lệ." });
	}

	[Fact]
	public async Task GetBrands_ShouldReturnBadRequest_WhenBrandNameFilterIsTooLong()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		var longKeyword = new string('A', 256);
		_brandServiceMock
			.Setup(x => x.GetBrandsAsync(1, 20, longKeyword, null))
			.ThrowsAsync(new ArgumentException("Từ khoá tìm kiếm không được vượt quá 255 ký tự."));

		var result = await controller.GetBrands(1, 20, longKeyword);
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(new { message = "Từ khoá tìm kiếm không được vượt quá 255 ký tự." });
	}

	[Fact]
	public async Task GetBrandById_ShouldReturnBadRequest_WhenIdIsNegative()
	{
		var controller = new BrandController(_brandServiceMock.Object);
		_brandServiceMock
			.Setup(x => x.GetBrandByIdAsync(-5))
			.ThrowsAsync(new ArgumentException("ID thương hiệu phải là số nguyên dương."));

		var result = await controller.GetBrandById(-5);
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(new { message = "ID thương hiệu phải là số nguyên dương." });
	}
}

