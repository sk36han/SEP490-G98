using AutoMapper;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Warehouse.Api.ApiController;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.Api.Tests;

public class AuthControllerLoginTests
{
    private readonly Mock<IAuthService> _authServiceMock = new();
    private readonly Mock<IMapper> _mapperMock = new();
    private readonly Mock<IAuditLogService> _auditLogServiceMock = new();

    private AuthController CreateController() =>
        new(_authServiceMock.Object, _mapperMock.Object, _auditLogServiceMock.Object);

    private static User BuildActiveUser() =>
        new()
        {
            UserId = 1,
            Email = "john.doe@example.com",
            Username = "john.doe",
            FullName = "John Doe",
            PasswordHash = "hashed",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

    [Fact]
    public async Task UTC001_ValidCredentials_RememberMeFalse_ShouldReturnOkLoginResponse()
    {
        var controller = CreateController();
        var user = BuildActiveUser();
        var expiresAt = DateTime.UtcNow.AddHours(1);
        var token = "jwt-token-001";

        _authServiceMock
            .Setup(x => x.ValidateLoginAsync("john.doe@example.com", "correctPassword123"))
            .ReturnsAsync(user);

        _authServiceMock
            .Setup(x => x.IssueTokensAsync(user, false))
            .ReturnsAsync((token, expiresAt));

        _auditLogServiceMock
            .Setup(x => x.LogAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<long?>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>()))
            .Returns(Task.CompletedTask);

        _mapperMock
            .Setup(x => x.Map<UserResponse>(user))
            .Returns(new UserResponse
            {
                Email = user.Email,
                Username = user.Username,
                FullName = user.FullName,
                IsActive = user.IsActive
            });

        var request = new LoginRequest
        {
            Identifier = "john.doe@example.com",
            Password = "correctPassword123",
            RememberMe = false
        };

        var result = await controller.Login(request);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = ok.Value.Should().BeOfType<LoginResponse>().Subject;
        response.AccessToken.Should().Be(token);
        response.ExpiresAt.Should().Be(expiresAt);
        response.User.Email.Should().Be("john.doe@example.com");
    }

    [Fact]
    public async Task UTC002_NonExistingEmail_ShouldReturnUnauthorized_WithGroupedMessage()
    {
        var controller = CreateController();

        _authServiceMock
            .Setup(x => x.ValidateLoginAsync("nonexistent@example.com", "correctPassword123"))
            .ReturnsAsync((User?)null);

        var request = new LoginRequest
        {
            Identifier = "nonexistent@example.com",
            Password = "correctPassword123"
        };

        var result = await controller.Login(request);

        var unauthorized = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorized.Value.Should().NotBeNull();
        unauthorized.Value!.ToString().Should().Contain("Email/Username hoặc mật khẩu không đúng");
        _authServiceMock.Verify(x => x.IssueTokensAsync(It.IsAny<User>(), It.IsAny<bool>()), Times.Never);
        _mapperMock.Verify(x => x.Map<UserResponse>(It.IsAny<User>()), Times.Never);
    }

    [Fact]
    public async Task UTC003_WrongPassword_ShouldReturnUnauthorized()
    {
        var controller = CreateController();

        _authServiceMock
            .Setup(x => x.ValidateLoginAsync("john.doe@example.com", "wrongPassword123"))
            .ReturnsAsync((User?)null);

        var request = new LoginRequest
        {
            Identifier = "john.doe@example.com",
            Password = "wrongPassword123"
        };

        var result = await controller.Login(request);

        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task UTC004_InactiveAccount_ServiceReturnsNull_ShouldReturnUnauthorized()
    {
        var controller = CreateController();

        _authServiceMock
            .Setup(x => x.ValidateLoginAsync("jane.doe@example.com", "correctPassword123"))
            .ReturnsAsync((User?)null);

        var request = new LoginRequest
        {
            Identifier = "jane.doe@example.com",
            Password = "correctPassword123"
        };

        var result = await controller.Login(request);

        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task UTC005_IdentifierNull_ModelInvalid_ShouldReturnBadRequest_AndNotCallService()
    {
        var controller = CreateController();
        controller.ModelState.AddModelError("Identifier", "Email hoặc Username là bắt buộc");

        var request = new LoginRequest { Identifier = null!, Password = "correctPassword123" };

        var result = await controller.Login(request);

        result.Should().BeOfType<BadRequestObjectResult>();
        _authServiceMock.Verify(x => x.ValidateLoginAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UTC006_IdentifierEmpty_ModelInvalid_ShouldReturnBadRequest()
    {
        var controller = CreateController();
        controller.ModelState.AddModelError("Identifier", "Email hoặc Username là bắt buộc");

        var request = new LoginRequest { Identifier = "", Password = "correctPassword123" };

        var result = await controller.Login(request);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UTC007_PasswordNull_ModelInvalid_ShouldReturnBadRequest()
    {
        var controller = CreateController();
        controller.ModelState.AddModelError("Password", "Password là bắt buộc");

        var request = new LoginRequest { Identifier = "john.doe@example.com", Password = null! };

        var result = await controller.Login(request);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UTC008_PasswordEmpty_ModelInvalid_ShouldReturnBadRequest()
    {
        var controller = CreateController();
        controller.ModelState.AddModelError("Password", "Password là bắt buộc");

        var request = new LoginRequest { Identifier = "john.doe@example.com", Password = "" };

        var result = await controller.Login(request);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UTC009_ValidateLoginThrowsException_ShouldReturn500()
    {
        var controller = CreateController();

        _authServiceMock
            .Setup(x => x.ValidateLoginAsync("john.doe@example.com", "correctPassword123"))
            .ThrowsAsync(new Exception("DB unavailable"));

        var request = new LoginRequest { Identifier = "john.doe@example.com", Password = "correctPassword123" };

        var result = await controller.Login(request);

        var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task UTC010_IssueTokensThrowsException_ShouldReturn500()
    {
        var controller = CreateController();
        var user = BuildActiveUser();

        _authServiceMock
            .Setup(x => x.ValidateLoginAsync("john.doe@example.com", "correctPassword123"))
            .ReturnsAsync(user);

        _authServiceMock
            .Setup(x => x.IssueTokensAsync(user, true))
            .ThrowsAsync(new Exception("Token error"));

        _auditLogServiceMock
            .Setup(x => x.LogAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<long?>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>()))
            .Returns(Task.CompletedTask);

        var request = new LoginRequest
        {
            Identifier = "john.doe@example.com",
            Password = "correctPassword123",
            RememberMe = true
        };

        var result = await controller.Login(request);

        var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task UTC011_ValidCredentials_RememberMeTrue_ShouldCallIssueTokensWithTrue_AndReturnOk()
    {
        var controller = CreateController();
        var user = BuildActiveUser();
        var expiresAt = DateTime.UtcNow.AddDays(7);
        var token = "jwt-token-011";

        _authServiceMock
            .Setup(x => x.ValidateLoginAsync("JOHN.DOE@EXAMPLE.COM", "correctPassword123"))
            .ReturnsAsync(user);

        _authServiceMock
            .Setup(x => x.IssueTokensAsync(user, true))
            .ReturnsAsync((token, expiresAt));

        _auditLogServiceMock
            .Setup(x => x.LogAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<long?>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>()))
            .Returns(Task.CompletedTask);

        _mapperMock
            .Setup(x => x.Map<UserResponse>(user))
            .Returns(new UserResponse { Email = user.Email, Username = user.Username, FullName = user.FullName, IsActive = user.IsActive });

        var request = new LoginRequest
        {
            Identifier = "JOHN.DOE@EXAMPLE.COM",
            Password = "correctPassword123",
            RememberMe = true
        };

        var result = await controller.Login(request);

        result.Should().BeOfType<OkObjectResult>();
        _authServiceMock.Verify(x => x.IssueTokensAsync(user, true), Times.Once);
    }

    [Fact]
    public async Task UTC012_IdentifierWhitespace_ModelInvalid_ShouldReturnBadRequest()
    {
        var controller = CreateController();
        controller.ModelState.AddModelError("Identifier", "Email hoặc Username là bắt buộc");

        var request = new LoginRequest { Identifier = "   ", Password = "correctPassword123" };

        var result = await controller.Login(request);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UTC013_PasswordWhitespace_ModelInvalid_ShouldReturnBadRequest()
    {
        var controller = CreateController();
        controller.ModelState.AddModelError("Password", "Password là bắt buộc");

        var request = new LoginRequest { Identifier = "john.doe@example.com", Password = "   " };

        var result = await controller.Login(request);

        result.Should().BeOfType<BadRequestObjectResult>();
    }
}
