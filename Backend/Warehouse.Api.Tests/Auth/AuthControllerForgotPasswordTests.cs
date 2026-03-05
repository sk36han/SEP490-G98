using AutoMapper;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Warehouse.Api.ApiController;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.Tests;

public class AuthControllerForgotPasswordTests
{
    private readonly Mock<IAuthService> _authServiceMock = new();
    private readonly Mock<IMapper> _mapperMock = new();
    private readonly Mock<IAuditLogService> _auditLogServiceMock = new();

    private AuthController CreateController() =>
        new(_authServiceMock.Object, _mapperMock.Object, _auditLogServiceMock.Object);

    [Fact]
    public async Task FP_UTC001_ValidEmail_ShouldReturnOkSuccessResponse()
    {
        var controller = CreateController();
        var request = new ForgotPasswordRequest { Email = "john.doe@example.com" };

        _authServiceMock
            .Setup(x => x.SendResetPasswordEmailAsync(request.Email))
            .Returns(Task.CompletedTask);

        var result = await controller.ForgotPassword(request);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = ok.Value.Should().BeOfType<ForgotPasswordResponse>().Subject;

        response.Success.Should().BeTrue();
        response.Message.Should().Be("Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu đến email của bạn.");
    }

    [Fact]
    public async Task FP_UTC002_NonExistingEmail_ShouldStillReturnOkSuccessResponse()
    {
        var controller = CreateController();
        var request = new ForgotPasswordRequest { Email = "nonexistent@example.com" };

        _authServiceMock
            .Setup(x => x.SendResetPasswordEmailAsync(request.Email))
            .Returns(Task.CompletedTask);

        var result = await controller.ForgotPassword(request);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = ok.Value.Should().BeOfType<ForgotPasswordResponse>().Subject;

        response.Success.Should().BeTrue();
        response.Message.Should().Be("Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu đến email của bạn.");
    }

    [Fact]
    public async Task FP_UTC003_InvalidModelState_ShouldReturnValidationProblem_AndNotCallService()
    {
        var controller = CreateController();
        controller.ModelState.AddModelError("Email", "Invalid email format");

        var request = new ForgotPasswordRequest { Email = "invalid-format-email" };

        var result = await controller.ForgotPassword(request);

        var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.Value.Should().BeOfType<ValidationProblemDetails>();
        _authServiceMock.Verify(x => x.SendResetPasswordEmailAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task FP_UTC004_EmailNull_ModelInvalid_ShouldReturnValidationProblem()
    {
        var controller = CreateController();
        controller.ModelState.AddModelError("Email", "Email is required");

        var request = new ForgotPasswordRequest { Email = null! };

        var result = await controller.ForgotPassword(request);

        result.Should().BeOfType<ObjectResult>();
        _authServiceMock.Verify(x => x.SendResetPasswordEmailAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task FP_UTC005_EmailEmpty_ModelInvalid_ShouldReturnValidationProblem()
    {
        var controller = CreateController();
        controller.ModelState.AddModelError("Email", "Email is required");

        var request = new ForgotPasswordRequest { Email = string.Empty };

        var result = await controller.ForgotPassword(request);

        result.Should().BeOfType<ObjectResult>();
        _authServiceMock.Verify(x => x.SendResetPasswordEmailAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task FP_UTC006_EmailWhitespace_ModelInvalid_ShouldReturnValidationProblem()
    {
        var controller = CreateController();
        controller.ModelState.AddModelError("Email", "Email is required");

        var request = new ForgotPasswordRequest { Email = "   " };

        var result = await controller.ForgotPassword(request);

        result.Should().BeOfType<ObjectResult>();
        _authServiceMock.Verify(x => x.SendResetPasswordEmailAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task FP_UTC007_ServiceThrowsInvalidOperationException_ShouldReturnBadRequest()
    {
        var controller = CreateController();
        var request = new ForgotPasswordRequest { Email = "john.doe@example.com" };

        _authServiceMock
            .Setup(x => x.SendResetPasswordEmailAsync(request.Email))
            .ThrowsAsync(new InvalidOperationException("Thiếu cấu hình SMTP trong appsettings.json"));

        var result = await controller.ForgotPassword(request);

        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequest.Value.Should().BeOfType<ForgotPasswordResponse>().Subject;

        response.Success.Should().BeFalse();
        response.Message.Should().Be("Thiếu cấu hình SMTP trong appsettings.json");
    }

    [Fact]
    public async Task FP_UTC008_ServiceThrowsUnexpectedException_ShouldReturnInternalServerError()
    {
        var controller = CreateController();
        var request = new ForgotPasswordRequest { Email = "john.doe@example.com" };

        _authServiceMock
            .Setup(x => x.SendResetPasswordEmailAsync(request.Email))
            .ThrowsAsync(new Exception("SMTP timeout"));

        var result = await controller.ForgotPassword(request);

        var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);

        var response = objectResult.Value.Should().BeOfType<ForgotPasswordResponse>().Subject;
        response.Success.Should().BeFalse();
        response.Message.Should().Be("Có lỗi xảy ra khi gửi email đặt lại mật khẩu.");
    }
}
