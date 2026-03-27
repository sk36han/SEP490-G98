extern alias api;
using AutoMapper;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;
using api::Warehouse.Api.ApiController;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;

namespace WarehouseTests;

public class UserControllerChangePasswordTests
{
    private readonly Mock<IUserService> _userServiceMock = new();
    private readonly Mock<IMapper> _mapperMock = new();

    private UserController CreateControllerWithUser(string? userIdClaim)
    {
        var controller = new UserController(_userServiceMock.Object, _mapperMock.Object);

        var claims = new List<Claim>();
        if (userIdClaim != null)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userIdClaim));
        }

        var identity = new ClaimsIdentity(claims, "TestAuth");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(identity)
            }
        };

        return controller;
    }

    [Fact]
    public async Task UCP_UTC001_ValidRequest_ShouldReturnOk()
    {
        var controller = CreateControllerWithUser("1");
        var request = new ChangePasswordRequest
        {
            OldPassword = "OldPass@123",
            NewPassword = "NewPass@123",
            ConfirmPassword = "NewPass@123"
        };

        _userServiceMock
            .Setup(x => x.ChangePasswordAsync(1, request.OldPassword, request.NewPassword))
            .Returns(Task.CompletedTask);

        var result = await controller.ChangePassword(request);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value!.ToString().Should().Contain("Äá»•i máº­t kháº©u thÃ nh cÃ´ng");
        _userServiceMock.Verify(x => x.ChangePasswordAsync(1, request.OldPassword, request.NewPassword), Times.Once);
    }

    [Fact]
    public async Task UCP_UTC002_ModelInvalid_ShouldReturnValidationProblem_AndNotCallService()
    {
        var controller = CreateControllerWithUser("1");
        controller.ModelState.AddModelError("ConfirmPassword", "Password and confirm password do not match");

        var request = new ChangePasswordRequest
        {
            OldPassword = "OldPass@123",
            NewPassword = "NewPass@123",
            ConfirmPassword = "Different@123"
        };

        var result = await controller.ChangePassword(request);

        var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.Value.Should().BeOfType<ValidationProblemDetails>();
        _userServiceMock.Verify(x => x.ChangePasswordAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UCP_UTC003_MissingUserIdClaim_ShouldReturnUnauthorized_AndNotCallService()
    {
        var controller = CreateControllerWithUser(null);
        var request = new ChangePasswordRequest
        {
            OldPassword = "OldPass@123",
            NewPassword = "NewPass@123",
            ConfirmPassword = "NewPass@123"
        };

        var result = await controller.ChangePassword(request);

        var unauthorized = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorized.Value!.ToString().Should().Contain("KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c ngÆ°á»i dÃ¹ng tá»« token");
        _userServiceMock.Verify(x => x.ChangePasswordAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UCP_UTC004_InvalidUserIdClaim_ShouldReturnUnauthorized_AndNotCallService()
    {
        var controller = CreateControllerWithUser("abc");
        var request = new ChangePasswordRequest
        {
            OldPassword = "OldPass@123",
            NewPassword = "NewPass@123",
            ConfirmPassword = "NewPass@123"
        };

        var result = await controller.ChangePassword(request);

        result.Should().BeOfType<UnauthorizedObjectResult>();
        _userServiceMock.Verify(x => x.ChangePasswordAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UCP_UTC005_ServiceThrowsInvalidOperationException_ShouldReturnBadRequest()
    {
        var controller = CreateControllerWithUser("1");
        var request = new ChangePasswordRequest
        {
            OldPassword = "WrongOld@123",
            NewPassword = "NewPass@123",
            ConfirmPassword = "NewPass@123"
        };

        _userServiceMock
            .Setup(x => x.ChangePasswordAsync(1, request.OldPassword, request.NewPassword))
            .ThrowsAsync(new InvalidOperationException("Máº­t kháº©u cÅ© khÃ´ng Ä‘Ãºng."));

        var result = await controller.ChangePassword(request);

        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value!.ToString().Should().Contain("Máº­t kháº©u cÅ© khÃ´ng Ä‘Ãºng");
    }

    [Fact]
    public async Task UCP_UTC006_ServiceThrowsKeyNotFoundException_ShouldReturnNotFound()
    {
        var controller = CreateControllerWithUser("999");
        var request = new ChangePasswordRequest
        {
            OldPassword = "OldPass@123",
            NewPassword = "NewPass@123",
            ConfirmPassword = "NewPass@123"
        };

        _userServiceMock
            .Setup(x => x.ChangePasswordAsync(999, request.OldPassword, request.NewPassword))
            .ThrowsAsync(new KeyNotFoundException("KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng."));

        var result = await controller.ChangePassword(request);

        var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFound.Value!.ToString().Should().Contain("KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng");
    }
}
