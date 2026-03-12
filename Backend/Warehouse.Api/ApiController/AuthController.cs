using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
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
        private readonly IAuditLogService _auditLogService;

        public AuthController(IAuthService authService, IMapper mapper, IAuditLogService auditLogService)
        {
            _authService = authService;
            _mapper = mapper;
            _auditLogService = auditLogService;
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

                // Kiểm tra Role của User
                var roleCode = await _authService.GetUserRoleCodeAsync(user.UserId);
                
                // Các role yêu cầu OTP
                var otpRoles = new[] { "Admin", "GD", "KT", "TK" };

                if (roleCode != null && otpRoles.Contains(roleCode, StringComparer.OrdinalIgnoreCase))
                {
                    // Phát sinh và gửi OTP
                    bool otpSent = await _authService.GenerateAndSendOtpAsync(user);

                    if (!otpSent)
                    {
                        return StatusCode(500, new { message = "Không thể gửi email OTP. Vui lòng kiểm tra lại cấu hình email hoặc thử lại sau." });
                    }

                    return Ok(new LoginResponse
                    {
                        RequiresOtp = true,
                        UserId = user.UserId,
                        Message = "Vui lòng kiểm tra email để nhận mã OTP."
                    });
                }

                // Nếu không thuộc các role trên, cấp token luôn
                var tokenResult = await _authService.IssueTokensAsync(user, request.RememberMe);
                string accessToken = tokenResult.accessToken;
                DateTime expiresAt = tokenResult.expiresAt;

                // Ghi audit log đăng nhập
                await _auditLogService.LogAsync(
                    user.UserId,
                    AuditAction.Login,
                    AuditEntity.User,
                    user.UserId,
                    $"Người dùng '{user.Username}' đăng nhập thành công"
                );

                // Map user to response DTO
                var userResponse = _mapper.Map<UserResponse>(user);

                var response = new LoginResponse
                {
                    RequiresOtp = false,
                    AccessToken = accessToken,
                    ExpiresAt = expiresAt,
                    User = userResponse,
                    Message = "Đăng nhập thành công."
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi trong quá trình đăng nhập", error = ex.Message });
            }
        }

        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Xác thực OTP
                bool isValid = await _authService.VerifyOtpAsync(request.UserId, request.Otp);

                if (!isValid)
                {
                    return BadRequest(new { message = "Mã OTP không hợp lệ, đã hết hạn hoặc bạn đã nhập sai quá nhiều lần. Vui lòng đăng nhập lại." });
                }

                // OTP đúng, lấy lại User để cấp Token
                // Ở đây ta có thể dùng một hàm lấy User by Id từ AuthService hoặc khởi tạo tạm qua thông tin đã có
                // Tốt nhất là thêm 1 hàm GetUserById nếu chưa có, hoặc tạm dùng IUserService / Mkiwms5Context nếu có injection
                // Trong bối cảnh này, ta sẽ cần thêm một hàm GetUserById vào AuthService. 
                // Do AuthService thừa kế GenericRepository<User>, ta có thể gọi hàm GetByIdAsync (nếu có)
                
                var user = await _authService.GetUserByIdAsync(request.UserId);

                if (user == null || !user.IsActive)
                {
                    return Unauthorized(new { message = "Tài khoản không tồn tại hoặc đã bị khóa." });
                }

                // Generate tokens
                var otpTokenResult = await _authService.IssueTokensAsync(user, request.RememberMe);
                string accessToken = otpTokenResult.accessToken;
                DateTime expiresAt = otpTokenResult.expiresAt;

                // Ghi audit log đăng nhập sau khi xác thực OTP thành công
                await _auditLogService.LogAsync(
                    user.UserId,
                    AuditAction.Login,
                    AuditEntity.User,
                    user.UserId,
                    $"Người dùng '{user.Username}' đăng nhập thành công qua OTP"
                );

                // Map user to response DTO
                var userResponse = _mapper.Map<UserResponse>(user);

                var response = new LoginResponse
                {
                    RequiresOtp = false,
                    AccessToken = accessToken,
                    ExpiresAt = expiresAt,
                    User = userResponse,
                    Message = "Đăng nhập thành công."
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi trong quá trình xác thực OTP", error = ex.Message });
            }
        }

        [HttpPost("resend-otp")]
        public async Task<IActionResult> ResendOtp([FromBody] ResendOtpRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var user = await _authService.GetUserByIdAsync(request.UserId);

                if (user == null || !user.IsActive)
                {
                    return Unauthorized(new { message = "Tài khoản không tồn tại hoặc đã bị khóa." });
                }

                // Phát sinh và gửi lại OTP
                bool otpSent = await _authService.GenerateAndSendOtpAsync(user);

                if (!otpSent)
                {
                    return StatusCode(500, new { message = "Không thể gửi email OTP. Vui lòng kiểm tra lại cấu hình email hoặc thử lại sau." });
                }

                return Ok(new { message = "Mã OTP mới đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi trong quá trình gửi lại OTP", error = ex.Message });
            }
        }

    }
}
