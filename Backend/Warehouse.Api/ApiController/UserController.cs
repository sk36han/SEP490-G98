using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.ApiController
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Không xác định được người dùng từ token." });
            }

            var profile = await _userService.GetUserProfileAsync(userId);
            if (profile == null)
            {
                return NotFound(new { message = "Không tìm thấy thông tin người dùng." });
            }

            return Ok(profile);
        }
    }
}