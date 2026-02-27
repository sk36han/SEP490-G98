using AutoMapper;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Warehouse.Api.ApiController;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.Tests;

public class AuthControllerResetPasswordTests
{
    private readonly Mock<IAuthService> _authServiceMock = new();
    private readonly Mock<IMapper> _mapperMock = new();

    private AuthController CreateController() => new(_authServiceMock.Object, _mapperMock.Object);

    [Fact]
    public async Task UTC001_ValidTokenAndPassword_ShouldReturnOkSuccessResponse()
    {
        var controller = CreateController();
        var request = new ResetPasswordRequest
        {
            Token = "valid-token",
            NewPassword = "newPassword123",
            ConfirmPassword = "newPassword123"
        };

        _authServiceMock
            .Setup(x => x.ResetPasswordAsync(request.Token, request.NewPassword))
            .Returns(Task.CompletedTask);

        var result = await controller.ResetPassword(request);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = ok.Value.Should().BeOfType<ResetPasswordResponse>().Subject;

        response.Success.Should().BeTrue();
        response.Message.Should().Be("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.");
    }

    [Fact]
    public async Task UTC002_InvalidToken_ShouldReturnBadRequestWithTokenMessage()
    {
        var controller = CreateController();
        var request = new ResetPasswordRequest
        {
            Token = "invalid-token",
            NewPassword = "newPassword123",
            ConfirmPassword = "newPassword123"
        };

        _authServiceMock
            .Setup(x => x.ResetPasswordAsync(request.Token, request.NewPassword))
            .ThrowsAsync(new SecurityTokenException("Invalid token"));

        var result = await controller.ResetPassword(request);

        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequest.Value.Should().BeOfType<ResetPasswordResponse>().Subject;

        response.Success.Should().BeFalse();
        response.Message.Should().Be("Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.");
    }

    [Fact]
    public async Task UTC003_ExpiredToken_ShouldReturnBadRequestWithTokenMessage()
    {
        var controller = CreateController();
        var request = new ResetPasswordRequest
        {
            Token = "expired-token",
            NewPassword = "newPassword123",
            ConfirmPassword = "newPassword123"
        };

        _authServiceMock
            .Setup(x => x.ResetPasswordAsync(request.Token, request.NewPassword))
            .ThrowsAsync(new SecurityTokenException("Token expired"));

        var result = await controller.ResetPassword(request);

        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequest.Value.Should().BeOfType<ResetPasswordResponse>().Subject;

        response.Success.Should().BeFalse();
        response.Message.Should().Be("Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.");
    }

    [Fact]
    public async Task UTC004_InvalidOperation_ShouldReturnBadRequestWithServiceMessage()
    {
        var controller = CreateController();
        var request = new ResetPasswordRequest
        {
            Token = "valid-token",
            NewPassword = "newPassword123",
            ConfirmPassword = "newPassword123"
        };

        _authServiceMock
            .Setup(x => x.ResetPasswordAsync(request.Token, request.NewPassword))
            .ThrowsAsync(new InvalidOperationException("Không tìm thấy tài khoản."));

        var result = await controller.ResetPassword(request);

        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequest.Value.Should().BeOfType<ResetPasswordResponse>().Subject;

        response.Success.Should().BeFalse();
        response.Message.Should().Be("Không tìm thấy tài khoản.");
    }

    [Fact]
    public async Task UTC005_InvalidModelState_ShouldReturnValidationProblem()
    {
        var controller = CreateController();
        controller.ModelState.AddModelError("Token", "Token is required");

        var request = new ResetPasswordRequest
        {
            Token = "",
            NewPassword = "newPassword123",
            ConfirmPassword = "newPassword123"
        };

        var result = await controller.ResetPassword(request);

        var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.Value.Should().BeOfType<ValidationProblemDetails>();
    }

    [Fact]
    public async Task UTC006_ConfirmPasswordMismatch_ShouldReturnValidationProblem_AndNotCallService()
    {
        var controller = CreateController();
        controller.ModelState.AddModelError("ConfirmPassword", "Password and confirm password do not match");

        var request = new ResetPasswordRequest
        {
            Token = "valid-token",
            NewPassword = "newPassword123",
            ConfirmPassword = "newPassword321"
        };

        var result = await controller.ResetPassword(request);

        var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.Value.Should().BeOfType<ValidationProblemDetails>();
        _authServiceMock.Verify(x => x.ResetPasswordAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UTC007_UnexpectedException_ShouldReturnInternalServerError()
    {
        var controller = CreateController();
        var request = new ResetPasswordRequest
        {
            Token = "valid-token",
            NewPassword = "newPassword123",
            ConfirmPassword = "newPassword123"
        };

        _authServiceMock
            .Setup(x => x.ResetPasswordAsync(request.Token, request.NewPassword))
            .ThrowsAsync(new Exception("Unexpected error"));

        var result = await controller.ResetPassword(request);

        var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);

        var response = objectResult.Value.Should().BeOfType<ResetPasswordResponse>().Subject;
        response.Success.Should().BeFalse();
        response.Message.Should().Be("Có lỗi xảy ra khi đặt lại mật khẩu.");
    }
}
