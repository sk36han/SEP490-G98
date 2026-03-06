using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Warehouse.Api.Controllers;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Xunit;

namespace Warehouse.Api.Tests.PackagingSpec;

public class PackagingSpecControllerTests
{
    private readonly Mock<IPackagingSpecService> _packagingSpecServiceMock = new();

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

    [Fact]
    public async Task CreatePackagingSpec_ShouldReturnCreated_WhenSuccessful()
    {
        var controller = new PackagingSpecController(_packagingSpecServiceMock.Object);
        SetupUserClaims(controller);
        var request = new CreatePackagingSpecRequest { SpecCode = "BOX", SpecName = "Hộp Carton" };
        var expected = new PackagingSpecResponse { PackagingSpecId = 1, SpecCode = "BOX", SpecName = "Hộp Carton", IsActive = true };

        _packagingSpecServiceMock.Setup(x => x.CreatePackagingSpecAsync(request, It.IsAny<long>())).ReturnsAsync(expected);

        var result = await controller.CreatePackagingSpec(request);
        var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.Value.Should().BeEquivalentTo(new { code = 201, message = "Tạo quy cách đóng gói thành công.", data = expected });
    }

    [Fact]
    public async Task CreatePackagingSpec_ShouldReturnBadRequest_WhenArgumentExceptionThrown()
    {
        var controller = new PackagingSpecController(_packagingSpecServiceMock.Object);
        SetupUserClaims(controller);
        var request = new CreatePackagingSpecRequest();
        
        _packagingSpecServiceMock.Setup(x => x.CreatePackagingSpecAsync(request, It.IsAny<long>())).ThrowsAsync(new ArgumentException("Mã không hợp lệ"));

        var result = await controller.CreatePackagingSpec(request);
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().BeEquivalentTo(new { code = 400, message = "Mã không hợp lệ" });
    }

    [Fact]
    public async Task CreatePackagingSpec_ShouldReturnConflict_WhenInvalidOperationExceptionThrown()
    {
        var controller = new PackagingSpecController(_packagingSpecServiceMock.Object);
        SetupUserClaims(controller);
        var request = new CreatePackagingSpecRequest();
        
        _packagingSpecServiceMock.Setup(x => x.CreatePackagingSpecAsync(request, It.IsAny<long>())).ThrowsAsync(new InvalidOperationException("Mã đã tồn tại"));

        var result = await controller.CreatePackagingSpec(request);
        var conflictResult = result.Should().BeOfType<ConflictObjectResult>().Subject;
        conflictResult.Value.Should().BeEquivalentTo(new { code = 409, message = "Mã đã tồn tại" });
    }

    [Fact]
    public async Task GetAllPackagingSpecs_ShouldReturnOk_WhenSuccessful()
    {
        var controller = new PackagingSpecController(_packagingSpecServiceMock.Object);
        var expected = new List<PackagingSpecResponse> { new PackagingSpecResponse { PackagingSpecId = 1 } };
        
        _packagingSpecServiceMock.Setup(x => x.GetAllPackagingSpecsAsync()).ReturnsAsync(expected);

        var result = await controller.GetAllPackagingSpecs();
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { code = 200, message = "Lấy danh sách quy cách đóng gói thành công.", data = expected });
    }

    [Fact]
    public async Task GetPackagingSpecById_ShouldReturnOk_WhenSuccessful()
    {
        var controller = new PackagingSpecController(_packagingSpecServiceMock.Object);
        var expected = new PackagingSpecResponse { PackagingSpecId = 1 };
        
        _packagingSpecServiceMock.Setup(x => x.GetPackagingSpecByIdAsync(1)).ReturnsAsync(expected);

        var result = await controller.GetPackagingSpecById(1);
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { code = 200, message = "Lấy thông tin quy cách đóng gói thành công.", data = expected });
    }

    [Fact]
    public async Task GetPackagingSpecById_ShouldReturnNotFound_WhenKeyNotFoundExceptionThrown()
    {
        var controller = new PackagingSpecController(_packagingSpecServiceMock.Object);
        
        _packagingSpecServiceMock.Setup(x => x.GetPackagingSpecByIdAsync(99)).ThrowsAsync(new KeyNotFoundException("Không tìm thấy"));

        var result = await controller.GetPackagingSpecById(99);
        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().BeEquivalentTo(new { code = 404, message = "Không tìm thấy" });
    }

    [Fact]
    public async Task UpdatePackagingSpec_ShouldReturnOk_WhenSuccessful()
    {
        var controller = new PackagingSpecController(_packagingSpecServiceMock.Object);
        SetupUserClaims(controller);
        var request = new UpdatePackagingSpecRequest { SpecName = "Updated" };
        var expected = new PackagingSpecResponse { PackagingSpecId = 1, SpecName = "Updated" };

        _packagingSpecServiceMock.Setup(x => x.UpdatePackagingSpecAsync(1, request, It.IsAny<long>())).ReturnsAsync(expected);

        var result = await controller.UpdatePackagingSpec(1, request);
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { code = 200, message = "Cập nhật thông tin quy cách đóng gói thành công.", data = expected });
    }

    [Fact]
    public async Task DeletePackagingSpec_ShouldReturnOk_WhenSuccessful()
    {
        var controller = new PackagingSpecController(_packagingSpecServiceMock.Object);
        SetupUserClaims(controller);

        _packagingSpecServiceMock.Setup(x => x.DeletePackagingSpecAsync(1, It.IsAny<long>())).ReturnsAsync(true);

        var result = await controller.DeletePackagingSpec(1);
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { code = 200, message = "Xoá quy cách đóng gói thành công." });
    }
}
