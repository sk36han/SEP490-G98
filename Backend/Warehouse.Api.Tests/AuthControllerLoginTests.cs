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

    [Fact]
    public async Task Login_ShouldReturnBadRequest_WhenModelStateIsInvalid()
    {
        var controller = new AuthController(_authServiceMock.Object, _mapperMock.Object);
        controller.ModelState.AddModelError("Identifier", "Identifier is required");

        var request = new LoginRequest
        {
            Identifier = string.Empty,
            Password = "123456"
        };

        var result = await controller.Login(request);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Login_ShouldReturnUnauthorized_WhenCredentialsAreInvalid()
    {
        var controller = new AuthController(_authServiceMock.Object, _mapperMock.Object);

        _authServiceMock
            .Setup(x => x.ValidateLoginAsync("invalid_user", "wrong_password"))
            .ReturnsAsync((User?)null);

        var request = new LoginRequest
        {
            Identifier = "invalid_user",
            Password = "wrong_password",
            RememberMe = false
        };

        var result = await controller.Login(request);

        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Login_ShouldReturnOk_WithLoginResponse_WhenCredentialsAreValid()
    {
        var controller = new AuthController(_authServiceMock.Object, _mapperMock.Object);

        var user = new User
        {
            UserId = 1,
            Email = "test@example.com",
            FullName = "Test User",
            PasswordHash = "hashed",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var expiresAt = DateTime.UtcNow.AddHours(1);
        var token = "sample-jwt-token";

        _authServiceMock
            .Setup(x => x.ValidateLoginAsync("test@example.com", "correct_password"))
            .ReturnsAsync(user);

        _authServiceMock
            .Setup(x => x.IssueTokensAsync(user, true))
            .ReturnsAsync((token, expiresAt));

        _mapperMock
            .Setup(x => x.Map<UserResponse>(user))
            .Returns(new UserResponse
            {
                Email = user.Email,
                FullName = user.FullName,
                IsActive = user.IsActive
            });

        var request = new LoginRequest
        {
            Identifier = "test@example.com",
            Password = "correct_password",
            RememberMe = true
        };

        var result = await controller.Login(request);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<LoginResponse>().Subject;

        response.AccessToken.Should().Be(token);
        response.ExpiresAt.Should().Be(expiresAt);
        response.User.Email.Should().Be("test@example.com");
    }
}
