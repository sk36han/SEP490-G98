using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.ApiController
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IMapper _mapper;

        public AuthController(IAuthService authService, IMapper mapper)
        {
            _authService = authService;
            _mapper = mapper;
        }
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            try
            {
                await _authService.SendResetPasswordEmailAsync(request.Email);
                return Ok(new ForgotPasswordResponse
                {
                    Success = true,
                    Message = "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu đến email của bạn."
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new ForgotPasswordResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ForgotPasswordResponse
                {
                    Success = false,
                    Message = "Có lỗi xảy ra khi gửi email đặt lại mật khẩu."
                });
            }
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            try
            {
                await _authService.ResetPasswordAsync(request.Token, request.NewPassword);
                return Ok(new ResetPasswordResponse
                {
                    Success = true,
                    Message = "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới."
                });
            }
            catch (SecurityTokenException)
            {
                return BadRequest(new ResetPasswordResponse
                {
                    Success = false,
                    Message = "Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới."
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new ResetPasswordResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
            catch (Exception)
            {
                return StatusCode(500, new ResetPasswordResponse
                {
                    Success = false,
                    Message = "Có lỗi xảy ra khi đặt lại mật khẩu."
                });
            }
        }

        [HttpPost("dev/change-password-by-email")]
        public async Task<IActionResult> ChangePasswordByEmail(string email,string newPassword)
        {
            var result = await _authService.ChangePasswordByEmailAsync(email, newPassword);

            if (!result)
                return NotFound("User not found");

            return Ok("Password changed successfully");
        }


        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Validate credentials
                var user = await _authService.ValidateLoginAsync(request.Identifier, request.Password);
                if (user == null)
                {
                    return Unauthorized(new { message = "Email/Username hoặc mật khẩu không đúng" });
                }

                // Generate tokens
                var (accessToken, expiresAt, refreshToken) = await _authService.IssueTokensAsync(user, request.RememberMe);

                // Map user to response DTO
                var userResponse = _mapper.Map<UserResponse>(user);

                var response = new LoginResponse
                {
                    AccessToken = accessToken,
                    RefreshToken = refreshToken,
                    ExpiresAt = expiresAt,
                    User = userResponse
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi trong quá trình đăng nhập", error = ex.Message });
            }
        }

    }
}
