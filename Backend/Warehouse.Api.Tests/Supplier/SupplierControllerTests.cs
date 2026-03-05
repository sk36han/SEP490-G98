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

public class SupplierControllerTests
{
    private readonly Mock<ISupplierService> _supplierServiceMock = new();

    /// <summary>
    /// Tạo SupplierController CÓ claim userId (cần cho Create/Update)
    /// </summary>
    private SupplierController CreateControllerWithUser(long userId = 1)
    {
        var controller = new SupplierController(_supplierServiceMock.Object);
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

    /// <summary>
    /// Tạo SupplierController KHÔNG có claim
    /// </summary>
    private SupplierController CreateController()
    {
        var controller = new SupplierController(_supplierServiceMock.Object);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        return controller;
    }

    // =========================================================
    // 1. CreateSupplier (7 Tests)
    // =========================================================

    [Fact]
    public async Task CreateSupplier_ShouldReturnOk_WhenSuccessful()
    {
        var controller = CreateControllerWithUser(userId: 1);
        var request = new CreateSupplierRequest { SupplierCode = "SUP01", SupplierName = "Supplier 01" };
        var expectedResponse = new SupplierResponse { SupplierId = 1, SupplierCode = "SUP01", SupplierName = "Supplier 01" };

        _supplierServiceMock.Setup(x => x.CreateSupplierAsync(request, 1)).ReturnsAsync(expectedResponse);

        var result = await controller.CreateSupplier(request);
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SupplierResponse>().Subject;
        response.SupplierCode.Should().Be("SUP01");
    }

    [Fact]
    public async Task CreateSupplier_ShouldReturnBadRequest_WhenModelStateIsInvalid()
    {
        var controller = CreateControllerWithUser();
        controller.ModelState.AddModelError("SupplierCode", "SupplierCode is required");

        var result = await controller.CreateSupplier(new CreateSupplierRequest());
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateSupplier_ShouldReturnBadRequest_WhenServiceThrowsInvalidOperationException_DuplicateCode()
    {
        var controller = CreateControllerWithUser(userId: 1);
        var request = new CreateSupplierRequest();
        _supplierServiceMock.Setup(x => x.CreateSupplierAsync(request, 1))
            .ThrowsAsync(new InvalidOperationException("Duplicate supplier code"));

        var result = await controller.CreateSupplier(request);
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().BeEquivalentTo(new { message = "Duplicate supplier code" });
    }

    [Fact]
    public async Task CreateSupplier_ShouldReturnOk_WithOptionalFields()
    {
        var controller = CreateControllerWithUser(userId: 1);
        var request = new CreateSupplierRequest { SupplierCode = "SUP02", TaxCode = "123", Phone = "0123", Address = "HN", Email = "a@a.com" };
        var expectedResponse = new SupplierResponse { SupplierId = 2, TaxCode = "123", Address = "HN" };

        _supplierServiceMock.Setup(x => x.CreateSupplierAsync(It.IsAny<CreateSupplierRequest>(), It.IsAny<long>()))
            .ReturnsAsync(expectedResponse);

        var result = await controller.CreateSupplier(request);
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SupplierResponse>().Subject;
        response.TaxCode.Should().Be("123");
        response.Address.Should().Be("HN");
    }

    [Fact]
    public async Task CreateSupplier_ShouldPassRequestData_ToServiceCorrectly()
    {
        var controller = CreateControllerWithUser(userId: 1);
        var request = new CreateSupplierRequest { SupplierName = "XYZ" };
        _supplierServiceMock.Setup(x => x.CreateSupplierAsync(request, 1))
            .ReturnsAsync(new SupplierResponse { SupplierName = "XYZ" }).Verifiable();

        await controller.CreateSupplier(request);
        _supplierServiceMock.Verify(x => x.CreateSupplierAsync(
            It.Is<CreateSupplierRequest>(req => req.SupplierName == "XYZ"),
            1), Times.Once);
    }

    [Fact]
    public async Task CreateSupplier_ShouldReturnUnauthorized_WhenNoUserClaim()
    {
        // Khi không có claim userId, controller trả về 401
        var controller = CreateController();
        var request = new CreateSupplierRequest { SupplierCode = "SUP01", SupplierName = "Test" };

        var result = await controller.CreateSupplier(request);
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    // =========================================================
    // 2. GetSuppliers (7 Tests)
    // =========================================================

    [Fact]
    public async Task GetSuppliers_ShouldReturnOk_WithDefaultPagination()
    {
        var controller = CreateController();
        _supplierServiceMock.Setup(x => x.GetSuppliersAsync(1, 20, null, null, null, null, null, null))
            .ReturnsAsync(new PagedResponse<SupplierResponse> { Items = new System.Collections.Generic.List<SupplierResponse>(), Page = 1, PageSize = 20 });

        var result = await controller.GetSuppliers(1, 20);
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<PagedResponse<SupplierResponse>>().Subject;
        response.Page.Should().Be(1);
        response.PageSize.Should().Be(20);
    }

    [Fact]
    public async Task GetSuppliers_ShouldFilterBySupplierCode()
    {
        var controller = CreateController();
        _supplierServiceMock.Setup(x => x.GetSuppliersAsync(1, 20, "SUP01", null, null, null, null, null))
            .ReturnsAsync(new PagedResponse<SupplierResponse> { Items = new System.Collections.Generic.List<SupplierResponse> { new SupplierResponse { SupplierCode = "SUP01" } } });

        var result = await controller.GetSuppliers(1, 20, "SUP01");
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<PagedResponse<SupplierResponse>>().Subject;
        response.Items[0].SupplierCode.Should().Be("SUP01");
    }

    [Fact]
    public async Task GetSuppliers_ShouldFilterByIsActive()
    {
        var controller = CreateController();
        _supplierServiceMock.Setup(x => x.GetSuppliersAsync(1, 20, null, null, null, true, null, null))
            .ReturnsAsync(new PagedResponse<SupplierResponse> { Items = new System.Collections.Generic.List<SupplierResponse> { new SupplierResponse { IsActive = true } } });

        var result = await controller.GetSuppliers(1, 20, null, null, null, true);
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<PagedResponse<SupplierResponse>>().Subject;
        response.Items[0].IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task GetSuppliers_ShouldFilterByDateRange()
    {
        var controller = CreateController();
        var fromDate = new DateTime(2023, 1, 1);
        var toDate = new DateTime(2023, 12, 31);
        _supplierServiceMock.Setup(x => x.GetSuppliersAsync(1, 20, null, null, null, null, fromDate, toDate))
            .ReturnsAsync(new PagedResponse<SupplierResponse> { Items = new System.Collections.Generic.List<SupplierResponse>() });

        var result = await controller.GetSuppliers(1, 20, null, null, null, null, fromDate, toDate);
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetSuppliers_ShouldFilterByTaxCodeAndName()
    {
        var controller = CreateController();
        _supplierServiceMock.Setup(x => x.GetSuppliersAsync(1, 20, null, "Corp", "123456", null, null, null))
            .ReturnsAsync(new PagedResponse<SupplierResponse> { Items = new System.Collections.Generic.List<SupplierResponse>() });

        var result = await controller.GetSuppliers(1, 20, null, "Corp", "123456");
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetSuppliers_ShouldReturnEmpty_WhenNoMatchesFound()
    {
        var controller = CreateController();
        _supplierServiceMock.Setup(x => x.GetSuppliersAsync(1, 20, "NO_MATCH", null, null, null, null, null))
            .ReturnsAsync(new PagedResponse<SupplierResponse> { Items = new System.Collections.Generic.List<SupplierResponse>() });

        var result = await controller.GetSuppliers(1, 20, "NO_MATCH");
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<PagedResponse<SupplierResponse>>().Subject;
        response.Items.Should().BeEmpty();
    }

    // =========================================================
    // 3. UpdateSupplier (7 Tests)
    // =========================================================

    [Fact]
    public async Task UpdateSupplier_ShouldReturnOk_WhenSuccessful()
    {
        var controller = CreateControllerWithUser(userId: 1);
        var request = new UpdateSupplierRequest { SupplierName = "Updated Name" };
        var expectedResponse = new SupplierResponse { SupplierId = 1, SupplierName = "Updated Name" };

        _supplierServiceMock.Setup(x => x.UpdateSupplierAsync(1, request, 1)).ReturnsAsync(expectedResponse);

        var result = await controller.UpdateSupplier(1, request);
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SupplierResponse>().Subject;
        response.SupplierName.Should().Be("Updated Name");
    }

    [Fact]
    public async Task UpdateSupplier_ShouldReturnBadRequest_WhenModelStateIsInvalid()
    {
        var controller = CreateControllerWithUser();
        controller.ModelState.AddModelError("SupplierName", "SupplierName is required");

        var result = await controller.UpdateSupplier(1, new UpdateSupplierRequest());
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UpdateSupplier_ShouldReturnNotFound_WhenSupplierDoesNotExist()
    {
        var controller = CreateControllerWithUser(userId: 1);
        var request = new UpdateSupplierRequest();
        _supplierServiceMock.Setup(x => x.UpdateSupplierAsync(1, request, 1))
            .ThrowsAsync(new KeyNotFoundException("Supplier not found"));

        var result = await controller.UpdateSupplier(1, request);
        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().BeEquivalentTo(new { message = "Supplier not found" });
    }

    [Fact]
    public async Task UpdateSupplier_ShouldReturnBadRequest_WhenLogicThrowsInvalidOperationException()
    {
        var controller = CreateControllerWithUser(userId: 1);
        var request = new UpdateSupplierRequest();
        _supplierServiceMock.Setup(x => x.UpdateSupplierAsync(1, request, 1))
            .ThrowsAsync(new InvalidOperationException("Invalid operation"));

        var result = await controller.UpdateSupplier(1, request);
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().BeEquivalentTo(new { message = "Invalid operation" });
    }

    [Fact]
    public async Task UpdateSupplier_ShouldPassIdCorrectly_ToService()
    {
        var controller = CreateControllerWithUser(userId: 1);
        var request = new UpdateSupplierRequest();
        _supplierServiceMock.Setup(x => x.UpdateSupplierAsync(999, request, 1))
            .ReturnsAsync(new SupplierResponse { SupplierId = 999 }).Verifiable();

        await controller.UpdateSupplier(999, request);
        _supplierServiceMock.Verify(x => x.UpdateSupplierAsync(999, request, 1), Times.Once);
    }

    [Fact]
    public async Task UpdateSupplier_ShouldUpdateOnlyAddress_WhenOtherFieldsAreNull()
    {
        var controller = CreateControllerWithUser(userId: 1);
        var request = new UpdateSupplierRequest { Address = "New Address" };
        var expectedResponse = new SupplierResponse { SupplierId = 1, Address = "New Address" };
        _supplierServiceMock.Setup(x => x.UpdateSupplierAsync(1, request, 1)).ReturnsAsync(expectedResponse);

        var result = await controller.UpdateSupplier(1, request);
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SupplierResponse>().Subject;
        response.Address.Should().Be("New Address");
    }

    // =========================================================
    // 4. ToggleSupplierStatus (5 Tests)
    // =========================================================

    [Fact]
    public async Task ToggleSupplierStatus_ShouldReturnOk_WhenActivatingInactiveSupplier()
    {
        var controller = CreateController();
        _supplierServiceMock.Setup(x => x.ToggleSupplierStatusAsync(1, true))
            .ReturnsAsync(new SupplierResponse { SupplierId = 1, IsActive = true });

        var result = await controller.ToggleSupplierStatus(1, true);
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SupplierResponse>().Subject;
        response.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task ToggleSupplierStatus_ShouldReturnOk_WhenDeactivatingActiveSupplier()
    {
        var controller = CreateController();
        _supplierServiceMock.Setup(x => x.ToggleSupplierStatusAsync(1, false))
            .ReturnsAsync(new SupplierResponse { SupplierId = 1, IsActive = false });

        var result = await controller.ToggleSupplierStatus(1, false);
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SupplierResponse>().Subject;
        response.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task ToggleSupplierStatus_ShouldReturnNotFound_WhenSupplierDoesNotExist()
    {
        var controller = CreateController();
        _supplierServiceMock.Setup(x => x.ToggleSupplierStatusAsync(99, false))
            .ThrowsAsync(new KeyNotFoundException("Supplier not found"));

        var result = await controller.ToggleSupplierStatus(99, false);
        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().BeEquivalentTo(new { message = "Supplier not found" });
    }

    [Fact]
    public async Task ToggleSupplierStatus_ShouldReturnBadRequest_WhenStatusAlreadyApplied()
    {
        var controller = CreateController();
        _supplierServiceMock.Setup(x => x.ToggleSupplierStatusAsync(1, false))
            .ThrowsAsync(new InvalidOperationException("Status already applied"));

        var result = await controller.ToggleSupplierStatus(1, false);
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().BeEquivalentTo(new { message = "Status already applied" });
    }

    [Fact]
    public async Task ToggleSupplierStatus_ShouldPassParametersCorrectly_ToService()
    {
        var controller = CreateController();
        _supplierServiceMock.Setup(x => x.ToggleSupplierStatusAsync(55, true))
            .ReturnsAsync(new SupplierResponse { SupplierId = 55, IsActive = true }).Verifiable();

        await controller.ToggleSupplierStatus(55, true);
        _supplierServiceMock.Verify(x => x.ToggleSupplierStatusAsync(55, true), Times.Once);
    }
}
