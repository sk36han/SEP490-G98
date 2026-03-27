extern alias api;
using AutoMapper;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Moq;
using api::Warehouse.Api.ApiController;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace WarehouseTests;

public class AuthControllerResetPasswordTests
{
	private readonly Mock<IAuthService> _authServiceMock = new();
	private readonly Mock<IMapper> _mapperMock = new();
	private readonly Mock<IAuditLogService> _auditLogServiceMock = new();

	private AuthController CreateController() =>
		new(_authServiceMock.Object, _mapperMock.Object, _auditLogServiceMock.Object);

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
		response.Message.Should().Be("Äáº·t láº¡i máº­t kháº©u thÃ nh cÃ´ng. Báº¡n cÃ³ thá»ƒ Ä‘Äƒng nháº­p vá»›i máº­t kháº©u má»›i.");
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
		response.Message.Should().Be("Token khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n. Vui lÃ²ng yÃªu cáº§u Ä‘áº·t láº¡i máº­t kháº©u má»›i.");
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
		response.Message.Should().Be("Token khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n. Vui lÃ²ng yÃªu cáº§u Ä‘áº·t láº¡i máº­t kháº©u má»›i.");
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
			.ThrowsAsync(new InvalidOperationException("KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n."));

		var result = await controller.ResetPassword(request);

		var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
		var response = badRequest.Value.Should().BeOfType<ResetPasswordResponse>().Subject;

		response.Success.Should().BeFalse();
		response.Message.Should().Be("KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n.");
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
		response.Message.Should().Be("CÃ³ lá»—i xáº£y ra khi Ä‘áº·t láº¡i máº­t kháº©u.");
	}
}
