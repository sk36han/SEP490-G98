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

public class CategoryControllerTests
{
	private readonly Mock<ICategoryService> _categoryServiceMock = new();

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
	// 1. CreateCategory
	// =========================================================

	[Fact]
	public async Task CreateCategory_ShouldReturnOk_WhenSuccessful()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateCategoryRequest { CategoryCode = "ELEC", CategoryName = "Điện tử", ParentId = null };
		var expected = new CategoryResponse { CategoryId = 1, CategoryCode = "ELEC", CategoryName = "Điện tử", IsActive = true };

		_categoryServiceMock.Setup(x => x.CreateCategoryAsync(request, It.IsAny<long>())).ReturnsAsync(expected);

		var result = await controller.CreateCategory(request);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<CategoryResponse>().Subject;
		response.CategoryCode.Should().Be("ELEC");
		response.CategoryName.Should().Be("Điện tử");
		response.IsActive.Should().BeTrue();
	}

	[Fact]
	public async Task CreateCategory_ShouldReturnBadRequest_WhenModelStateIsInvalid()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		controller.ModelState.AddModelError("CategoryCode", "Mã danh mục không được để trống.");

		var result = await controller.CreateCategory(new CreateCategoryRequest { CategoryName = "Test" });
		result.Should().BeOfType<BadRequestObjectResult>();
	}

	[Fact]
	public async Task CreateCategory_ShouldReturnBadRequest_WhenCodeIsDuplicate()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateCategoryRequest { CategoryCode = "ELEC", CategoryName = "Điện tử" };
		_categoryServiceMock
			.Setup(x => x.CreateCategoryAsync(request, It.IsAny<long>()))
			.ThrowsAsync(new InvalidOperationException("Mã danh mục 'ELEC' đã tồn tại."));

		var result = await controller.CreateCategory(request);
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(new { message = "Mã danh mục 'ELEC' đã tồn tại." });
	}

	[Fact]
	public async Task CreateCategory_ShouldReturnBadRequest_WhenNameIsDuplicate()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateCategoryRequest { CategoryCode = "ELEC2", CategoryName = "Điện tử" };
		_categoryServiceMock
			.Setup(x => x.CreateCategoryAsync(request, It.IsAny<long>()))
			.ThrowsAsync(new InvalidOperationException("Tên danh mục 'Điện tử' đã tồn tại trong cùng cấp cha."));

		var result = await controller.CreateCategory(request);
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(new { message = "Tên danh mục 'Điện tử' đã tồn tại trong cùng cấp cha." });
	}

	[Fact]
	public async Task CreateCategory_ShouldReturnNotFound_WhenParentIdDoesNotExist()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateCategoryRequest { CategoryCode = "SUB", CategoryName = "Sub", ParentId = 999 };
		_categoryServiceMock
			.Setup(x => x.CreateCategoryAsync(request, It.IsAny<long>()))
			.ThrowsAsync(new KeyNotFoundException("Không tìm thấy danh mục cha với ID = 999."));

		var result = await controller.CreateCategory(request);
		var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
		notFoundResult.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy danh mục cha với ID = 999." });
	}

	[Fact]
	public async Task CreateCategory_ShouldReturnBadRequest_WhenServiceThrowsArgumentException()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateCategoryRequest { CategoryCode = "A", CategoryName = "Test" }; // mã quá ngắn
		_categoryServiceMock
			.Setup(x => x.CreateCategoryAsync(request, It.IsAny<long>()))
			.ThrowsAsync(new ArgumentException("Mã danh mục phải có ít nhất 2 ký tự."));

		var result = await controller.CreateCategory(request);
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(new { message = "Mã danh mục phải có ít nhất 2 ký tự." });
	}

	[Fact]
	public async Task CreateCategory_ShouldReturnUnauthorized_WhenUserClaimMissing()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		controller.ControllerContext = new ControllerContext
		{
			HttpContext = new DefaultHttpContext()
		};
		var request = new CreateCategoryRequest { CategoryCode = "ELEC", CategoryName = "Điện tử" };

		var result = await controller.CreateCategory(request);
		result.Should().BeOfType<UnauthorizedObjectResult>();
	}

	[Fact]
	public async Task CreateCategory_ShouldPassCorrectParams_ToService()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		var request = new CreateCategoryRequest { CategoryCode = "FOOD", CategoryName = "Thực phẩm" };
		_categoryServiceMock
			.Setup(x => x.CreateCategoryAsync(request, It.IsAny<long>()))
			.ReturnsAsync(new CategoryResponse { CategoryCode = "FOOD" })
			.Verifiable();

		await controller.CreateCategory(request);
		_categoryServiceMock.Verify(
			x => x.CreateCategoryAsync(It.Is<CreateCategoryRequest>(r => r.CategoryCode == "FOOD"), It.IsAny<long>()),
			Times.Once);
	}

	// =========================================================
	// 2. GetCategories
	// =========================================================

	[Fact]
	public async Task GetCategories_ShouldReturnOk_WithDefaultPagination()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		_categoryServiceMock
			.Setup(x => x.GetCategoriesAsync(1, 20, null, null))
			.ReturnsAsync(new PagedResponse<CategoryResponse> { Page = 1, PageSize = 20, TotalItems = 0, Items = new List<CategoryResponse>() });

		var result = await controller.GetCategories(1, 20);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<PagedResponse<CategoryResponse>>().Subject;
		response.Page.Should().Be(1);
		response.PageSize.Should().Be(20);
	}

	[Fact]
	public async Task GetCategories_ShouldFilterByCategoryName()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		_categoryServiceMock
			.Setup(x => x.GetCategoriesAsync(1, 20, "Điện tử", null))
			.ReturnsAsync(new PagedResponse<CategoryResponse>
			{
				Items = new List<CategoryResponse> { new CategoryResponse { CategoryName = "Điện tử" } }
			});

		var result = await controller.GetCategories(1, 20, "Điện tử");
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<PagedResponse<CategoryResponse>>().Subject;
		response.Items[0].CategoryName.Should().Be("Điện tử");
	}

	[Fact]
	public async Task GetCategories_ShouldFilterByIsActive()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		_categoryServiceMock
			.Setup(x => x.GetCategoriesAsync(1, 20, null, true))
			.ReturnsAsync(new PagedResponse<CategoryResponse>
			{
				Items = new List<CategoryResponse> { new CategoryResponse { IsActive = true } }
			});

		var result = await controller.GetCategories(1, 20, null, true);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<PagedResponse<CategoryResponse>>().Subject;
		response.Items[0].IsActive.Should().BeTrue();
	}

	[Fact]
	public async Task GetCategories_ShouldReturnEmpty_WhenNoMatch()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		_categoryServiceMock
			.Setup(x => x.GetCategoriesAsync(1, 20, "xyz_no_match", null))
			.ReturnsAsync(new PagedResponse<CategoryResponse> { Items = new List<CategoryResponse>(), TotalItems = 0 });

		var result = await controller.GetCategories(1, 20, "xyz_no_match");
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<PagedResponse<CategoryResponse>>().Subject;
		response.Items.Should().BeEmpty();
		response.TotalItems.Should().Be(0);
	}

	[Fact]
	public async Task GetCategories_ShouldReturnBadRequest_WhenPageSizeExceeds100()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		_categoryServiceMock
			.Setup(x => x.GetCategoriesAsync(1, 200, null, null))
			.ThrowsAsync(new ArgumentException("Số lượng item mỗi trang không được vượt quá 100."));

		var result = await controller.GetCategories(1, 200);
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(new { message = "Số lượng item mỗi trang không được vượt quá 100." });
	}

	// =========================================================
	// 3. GetCategoryById
	// =========================================================

	[Fact]
	public async Task GetCategoryById_ShouldReturnOk_WhenFound()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		_categoryServiceMock
			.Setup(x => x.GetCategoryByIdAsync(1))
			.ReturnsAsync(new CategoryResponse { CategoryId = 1, CategoryCode = "ELEC", CategoryName = "Điện tử" });

		var result = await controller.GetCategoryById(1);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<CategoryResponse>().Subject;
		response.CategoryId.Should().Be(1);
		response.CategoryCode.Should().Be("ELEC");
	}

	[Fact]
	public async Task GetCategoryById_ShouldReturnNotFound_WhenCategoryDoesNotExist()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		_categoryServiceMock
			.Setup(x => x.GetCategoryByIdAsync(99))
			.ThrowsAsync(new KeyNotFoundException("Không tìm thấy danh mục với ID = 99."));

		var result = await controller.GetCategoryById(99);
		var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
		notFoundResult.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy danh mục với ID = 99." });
	}

	[Fact]
	public async Task GetCategoryById_ShouldReturnBadRequest_WhenIdIsInvalid()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		_categoryServiceMock
			.Setup(x => x.GetCategoryByIdAsync(0))
			.ThrowsAsync(new ArgumentException("ID danh mục phải là số nguyên dương."));

		var result = await controller.GetCategoryById(0);
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(new { message = "ID danh mục phải là số nguyên dương." });
	}

	[Fact]
	public async Task GetCategoryById_ShouldReturnBadRequest_WhenIdIsNegative()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		_categoryServiceMock
			.Setup(x => x.GetCategoryByIdAsync(-5))
			.ThrowsAsync(new ArgumentException("ID danh mục phải là số nguyên dương."));

		var result = await controller.GetCategoryById(-5);
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(new { message = "ID danh mục phải là số nguyên dương." });
	}

	// =========================================================
	// 4. UpdateCategory
	// =========================================================

	[Fact]
	public async Task UpdateCategory_ShouldReturnOk_WhenSuccessful()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		var request = new UpdateCategoryRequest { CategoryCode = "ELEC", CategoryName = "Điện tử cập nhật", IsActive = true };
		_categoryServiceMock
			.Setup(x => x.UpdateCategoryAsync(1, request, It.IsAny<long>()))
			.ReturnsAsync(new CategoryResponse { CategoryId = 1, CategoryCode = "ELEC", CategoryName = "Điện tử cập nhật", IsActive = true });

		var result = await controller.UpdateCategory(1, request);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		var response = okResult.Value.Should().BeOfType<CategoryResponse>().Subject;
		response.CategoryName.Should().Be("Điện tử cập nhật");
	}

	[Fact]
	public async Task UpdateCategory_ShouldReturnBadRequest_WhenModelStateIsInvalid()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		controller.ModelState.AddModelError("CategoryCode", "Mã danh mục không được để trống.");

		var result = await controller.UpdateCategory(1, new UpdateCategoryRequest { CategoryName = "Test" });
		result.Should().BeOfType<BadRequestObjectResult>();
	}

	[Fact]
	public async Task UpdateCategory_ShouldReturnNotFound_WhenCategoryDoesNotExist()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		var request = new UpdateCategoryRequest { CategoryCode = "ELEC", CategoryName = "Điện tử", IsActive = true };
		_categoryServiceMock
			.Setup(x => x.UpdateCategoryAsync(999, request, It.IsAny<long>()))
			.ThrowsAsync(new KeyNotFoundException("Không tìm thấy danh mục với ID = 999."));

		var result = await controller.UpdateCategory(999, request);
		var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
		notFoundResult.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy danh mục với ID = 999." });
	}

	[Fact]
	public async Task UpdateCategory_ShouldReturnBadRequest_WhenCodeIsDuplicate()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		var request = new UpdateCategoryRequest { CategoryCode = "FOOD", CategoryName = "Điện tử", IsActive = true };
		_categoryServiceMock
			.Setup(x => x.UpdateCategoryAsync(1, request, It.IsAny<long>()))
			.ThrowsAsync(new InvalidOperationException("Mã danh mục 'FOOD' đã tồn tại."));

		var result = await controller.UpdateCategory(1, request);
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(new { message = "Mã danh mục 'FOOD' đã tồn tại." });
	}

	[Fact]
	public async Task UpdateCategory_ShouldReturnBadRequest_WhenSelfReferencedParent()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		var request = new UpdateCategoryRequest { CategoryCode = "ELEC", CategoryName = "Điện tử", ParentId = 1, IsActive = true };
		_categoryServiceMock
			.Setup(x => x.UpdateCategoryAsync(1, request, It.IsAny<long>()))
			.ThrowsAsync(new InvalidOperationException("Danh mục không thể là cha của chính nó."));

		var result = await controller.UpdateCategory(1, request);
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(new { message = "Danh mục không thể là cha của chính nó." });
	}

	[Fact]
	public async Task UpdateCategory_ShouldReturnUnauthorized_WhenUserClaimMissing()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
		var request = new UpdateCategoryRequest { CategoryCode = "XX", CategoryName = "Test", IsActive = true };

		var result = await controller.UpdateCategory(1, request);
		result.Should().BeOfType<UnauthorizedObjectResult>();
	}

	[Fact]
	public async Task UpdateCategory_ShouldPassIdToService_Correctly()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		var request = new UpdateCategoryRequest { CategoryCode = "SOFT", CategoryName = "Phần mềm", IsActive = false };
		_categoryServiceMock
			.Setup(x => x.UpdateCategoryAsync(55, request, It.IsAny<long>()))
			.ReturnsAsync(new CategoryResponse { CategoryId = 55 })
			.Verifiable();

		await controller.UpdateCategory(55, request);
		_categoryServiceMock.Verify(x => x.UpdateCategoryAsync(55, request, It.IsAny<long>()), Times.Once);
	}

	// =========================================================
	// 5. ToggleCategoryStatus
	// =========================================================

	[Fact]
	public async Task ToggleCategoryStatus_ShouldReturnOk_WhenActivating()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		_categoryServiceMock
			.Setup(x => x.ToggleCategoryStatusAsync(1, true, It.IsAny<long>()))
			.ReturnsAsync(new CategoryResponse { CategoryId = 1, IsActive = true });

		var result = await controller.ToggleCategoryStatus(1, true);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		okResult.Value.Should().BeOfType<CategoryResponse>().Which.IsActive.Should().BeTrue();
	}

	[Fact]
	public async Task ToggleCategoryStatus_ShouldReturnOk_WhenDeactivating()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		_categoryServiceMock
			.Setup(x => x.ToggleCategoryStatusAsync(1, false, It.IsAny<long>()))
			.ReturnsAsync(new CategoryResponse { CategoryId = 1, IsActive = false });

		var result = await controller.ToggleCategoryStatus(1, false);
		var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
		okResult.Value.Should().BeOfType<CategoryResponse>().Which.IsActive.Should().BeFalse();
	}

	[Fact]
	public async Task ToggleCategoryStatus_ShouldReturnNotFound_WhenCategoryDoesNotExist()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		_categoryServiceMock
			.Setup(x => x.ToggleCategoryStatusAsync(99, true, It.IsAny<long>()))
			.ThrowsAsync(new KeyNotFoundException("Không tìm thấy danh mục với ID = 99."));

		var result = await controller.ToggleCategoryStatus(99, true);
		var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
		notFoundResult.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy danh mục với ID = 99." });
	}

	[Fact]
	public async Task ToggleCategoryStatus_ShouldReturnBadRequest_WhenStatusAlreadySame()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		_categoryServiceMock
			.Setup(x => x.ToggleCategoryStatusAsync(1, true, It.IsAny<long>()))
			.ThrowsAsync(new InvalidOperationException("Danh mục 'Điện tử' hiện tại đang hoạt động. Không cần thay đổi."));

		var result = await controller.ToggleCategoryStatus(1, true);
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(
			new { message = "Danh mục 'Điện tử' hiện tại đang hoạt động. Không cần thay đổi." });
	}

	[Fact]
	public async Task ToggleCategoryStatus_ShouldReturnBadRequest_WhenIdIsInvalid()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		_categoryServiceMock
			.Setup(x => x.ToggleCategoryStatusAsync(0, true, It.IsAny<long>()))
			.ThrowsAsync(new ArgumentException("ID danh mục phải là số nguyên dương."));

		var result = await controller.ToggleCategoryStatus(0, true);
		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		badRequest.Value.Should().BeEquivalentTo(new { message = "ID danh mục phải là số nguyên dương." });
	}

	[Fact]
	public async Task ToggleCategoryStatus_ShouldReturnUnauthorized_WhenUserClaimMissing()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

		var result = await controller.ToggleCategoryStatus(1, true);
		result.Should().BeOfType<UnauthorizedObjectResult>();
	}

	[Fact]
	public async Task ToggleCategoryStatus_ShouldPassParameters_ToServiceCorrectly()
	{
		var controller = new CategoryController(_categoryServiceMock.Object);
		SetupUserClaims(controller);
		_categoryServiceMock
			.Setup(x => x.ToggleCategoryStatusAsync(77, false, It.IsAny<long>()))
			.ReturnsAsync(new CategoryResponse { CategoryId = 77, IsActive = false })
			.Verifiable();

		await controller.ToggleCategoryStatus(77, false);
		_categoryServiceMock.Verify(x => x.ToggleCategoryStatusAsync(77, false, It.IsAny<long>()), Times.Once);
	}
}
