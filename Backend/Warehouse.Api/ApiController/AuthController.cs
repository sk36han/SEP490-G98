using AutoMapper;
using Microsoft.AspNetCore.Mvc;
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
