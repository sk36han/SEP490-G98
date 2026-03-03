using AutoMapper;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;
using Warehouse.Api.ApiController;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.Tests;

public class UserControllerUpdateProfileTests
{
    private readonly Mock<IUserService> _userServiceMock = new();
    private readonly Mock<IMapper> _mapperMock = new();

    private static UpdateProfileRequest BuildRequest(string phone = "0901234567") => new()
    {
        Phone = phone
    };

    private (UserController controller, Mock<IUserService> userServiceMock) BuildController(string? userIdClaim = "1")
    {
        var controller = new UserController(_userServiceMock.Object, _mapperMock.Object);

        var claims = new List<Claim>();
        if (userIdClaim != null)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userIdClaim));
        }

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
            }
        };

        return (controller, _userServiceMock);
    }

    private static void AssertValidationProblem(IActionResult actionResult)
    {
        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.Value.Should().BeOfType<ValidationProblemDetails>();
    }

    [Fact]
    public async Task UpdateProfile_WhenRequestIsValid_ShouldReturnOkWithUpdatedData()
    {
        var request = BuildRequest("0901234567");
        var updatedUser = new UserResponse
        {
            Email = "john.doe@example.com",
            FullName = "John Doe",
            Phone = "0901234567",
            IsActive = true
        };

        var (controller, userServiceMock) = BuildController("1");

        userServiceMock
            .Setup(x => x.UpdateProfilePhoneAsync(1, request.Phone))
            .ReturnsAsync(updatedUser);

        var actionResult = await controller.UpdateProfile(request);

        var okResult = actionResult.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value!.ToString().Should().Contain("Cập nhật số điện thoại thành công");

        var dataProp = okResult.Value!.GetType().GetProperty("data");
        dataProp.Should().NotBeNull();

        var dataValue = dataProp!.GetValue(okResult.Value);
        var returnedUser = dataValue.Should().BeOfType<UserResponse>().Subject;
        returnedUser.Phone.Should().Be("0901234567");

        userServiceMock.Verify(x => x.UpdateProfilePhoneAsync(1, request.Phone), Times.Once);
    }

    [Fact]
    public async Task UpdateProfile_WhenModelIsInvalid_ShouldReturnValidationProblem_AndNotCallService()
    {
        var request = BuildRequest("invalid-phone");
        var (controller, userServiceMock) = BuildController("1");
        controller.ModelState.AddModelError("Phone", "Invalid phone number");

        var actionResult = await controller.UpdateProfile(request);

        AssertValidationProblem(actionResult);
        userServiceMock.Verify(x => x.UpdateProfilePhoneAsync(It.IsAny<long>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfile_WhenUserIdClaimMissing_ShouldReturnUnauthorized_AndNotCallService()
    {
        var request = BuildRequest();
        var (controller, userServiceMock) = BuildController(null);

        var actionResult = await controller.UpdateProfile(request);

        var unauthorized = actionResult.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorized.Value!.ToString().Should().Contain("Không xác định được người dùng từ token");
        userServiceMock.Verify(x => x.UpdateProfilePhoneAsync(It.IsAny<long>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfile_WhenUserIdClaimInvalid_ShouldReturnUnauthorized_AndNotCallService()
    {
        var request = BuildRequest();
        var (controller, userServiceMock) = BuildController("abc");

        var actionResult = await controller.UpdateProfile(request);

        actionResult.Should().BeOfType<UnauthorizedObjectResult>();
        userServiceMock.Verify(x => x.UpdateProfilePhoneAsync(It.IsAny<long>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfile_WhenServiceReturnsNull_ShouldReturnNotFound()
    {
        var request = BuildRequest("0901234567");
        var (controller, userServiceMock) = BuildController("1");

        userServiceMock
            .Setup(x => x.UpdateProfilePhoneAsync(1, request.Phone))
            .ReturnsAsync((UserResponse?)null);

        var actionResult = await controller.UpdateProfile(request);

        var notFound = actionResult.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFound.Value!.ToString().Should().Contain("Không tìm thấy thông tin người dùng");
    }

    [Fact]
    public async Task UpdateProfile_WhenUnexpectedExceptionOccurs_ShouldReturnInternalServerError()
    {
        var request = BuildRequest("0901234567");
        var (controller, userServiceMock) = BuildController("1");

        userServiceMock
            .Setup(x => x.UpdateProfilePhoneAsync(1, request.Phone))
            .ThrowsAsync(new Exception("DB down"));

        var actionResult = await controller.UpdateProfile(request);

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);
        objectResult.Value!.ToString().Should().Contain("Đã xảy ra lỗi hệ thống");
    }
}
