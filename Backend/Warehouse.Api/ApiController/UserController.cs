using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.ApiController
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IMapper _mapper;

        public UserController(IUserService userService, IMapper mapper)
        {
            _userService = userService;
            _mapper = mapper;
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Không xác định được người dùng từ token." });
            }

            var user = await _userService.GetUserProfileAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy thông tin người dùng." });
            }

            var profile = _mapper.Map<UserResponse>(user);
            return Ok(profile);
        }

        [HttpGet("profile/export-excel")]
        public async Task<IActionResult> ExportProfileExcel()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Không xác định được người dùng từ token." });
            }

            var user = await _userService.GetUserProfileAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy thông tin người dùng." });
            }

            var profile = _mapper.Map<UserResponse>(user);

            using var workbook = new ClosedXML.Excel.XLWorkbook();
            var ws = workbook.Worksheets.Add("Profile");

            // Header
            ws.Cell(1, 1).Value = "Thông tin";
            ws.Cell(1, 2).Value = "Giá trị";
            ws.Range(1, 1, 1, 2).Style.Font.Bold = true;
            ws.Range(1, 1, 1, 2).Style.Fill.BackgroundColor = ClosedXML.Excel.XLColor.LightGray;

            var row = 2;
            void AddRow(string field, object? value)
            {
                ws.Cell(row, 1).Value = field;
                ws.Cell(row, 2).Value = value?.ToString() ?? "N/A";
                row++;
            }

            AddRow("Mã người dùng", profile.UserId);
            AddRow("Họ và tên", profile.FullName);
            AddRow("Tên đăng nhập", profile.Username);
            AddRow("Email", profile.Email);
            AddRow("Số điện thoại", profile.Phone);
            AddRow("Chức vụ", profile.RoleName);
            AddRow("Trạng thái", profile.IsActive ? "Đang hoạt động" : "Bị khóa");
            AddRow("Đăng nhập cuối", profile.LastLoginAt?.ToString("dd/MM/yyyy HH:mm:ss"));

            ws.Columns().AdjustToContents();

            using var stream = new System.IO.MemoryStream();
            workbook.SaveAs(stream);
            var content = stream.ToArray();

            var fileName = $"Profile_{profile.Username}_{DateTime.Now:yyyyMMdd}.xlsx";
            return File(
                content,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName
            );
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Không xác định được người dùng từ token." });
            }

            try
            {
                await _userService.ChangePasswordAsync(userId, request.OldPassword, request.NewPassword);
                return Ok(new { success = true, message = "Đổi mật khẩu thành công." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
        }
    }
}