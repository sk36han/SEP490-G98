using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
    public class AdminService : GenericRepository<User>, IAdminService
    {
        private readonly IConfiguration _configuration;
        private readonly IAuthService _emailService;

        public AdminService(Mkiwms4Context context, IConfiguration configuration, IAuthService emailService) : base(context)
        {
            _configuration = configuration;
            _emailService = emailService;
        }
        public async Task<CreateUserResponse> CreateUserAccountAsync(CreateUserRequest request, long assignedBy)
        {
            // Kiểm tra email đã tồn tại chưa
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email);

            if (existingUser != null)
            {
                throw new InvalidOperationException("Email này đã được sử dụng.");
            }
           
            // Kiểm tra role tồn tại
            var role = await _context.Roles.FindAsync(request.RoleId);
            if (role == null)
            {
                throw new InvalidOperationException("Role không tồn tại.");
            }

            // 1. Tạo Username: Nếu request có Username thì dùng, nếu không thì tự sinh
            string finalUsername;
            if (!string.IsNullOrWhiteSpace(request.Username))
            {
                finalUsername = request.Username.Trim();
                // Check duplicate
                if (await _context.Users.AnyAsync(u => u.Username == finalUsername))
                {
                    throw new InvalidOperationException($"Username '{finalUsername}' đã tồn tại.");
                }
            }
            else
            {
                finalUsername = await GenerateUsernameAsync(request.FullName);
            }

            // 2. Sinh mật khẩu ngẫu nhiên và hash
            string generatedPassword = GenerateRandomPassword(12);
            string passwordHash = AuthService.CreatePasswordHash(generatedPassword);

            // Tạo user mới
            var newUser = new User
            {
                Email = request.Email,
                Username = finalUsername,
                FullName = request.FullName,
                PasswordHash = passwordHash,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            // Gán role
            var userRole = new UserRole
            {
                UserId = newUser.UserId,
                RoleId = role.RoleId,
                AssignedAt = DateTime.UtcNow,
                AssignedBy = assignedBy
            };
            _context.UserRoles.Add(userRole);
            await _context.SaveChangesAsync();

            // Gửi email thông báo tài khoản
            string subject = "Thông tin tài khoản của bạn";
            string body = $@"
				<h2>Chào {newUser.FullName},</h2>
				<p>Tài khoản của bạn đã được tạo thành công. Dưới đây là thông tin đăng nhập:</p>
				<table style='border-collapse: collapse;'>
					<tr><td style='padding: 8px; font-weight: bold;'>Email:</td><td style='padding: 8px;'>{newUser.Email}</td></tr>
					<tr><td style='padding: 8px; font-weight: bold;'>Mật khẩu:</td><td style='padding: 8px;'>{generatedPassword}</td></tr>
				</table>
				<p>Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu.</p>
				<p>Trân trọng,<br/>Hệ thống quản lý kho</p>";

            await _emailService.SendEmailUserAccountAsync(newUser.Email, subject, body);

            return new CreateUserResponse
            {
                UserId = newUser.UserId,
                Email = newUser.Email,
                FullName = newUser.FullName,
                Username = newUser.Username,
                GeneratedPassword = generatedPassword,
                RoleName = role.RoleName,
                CreatedAt = newUser.CreatedAt
            };
        }

        /// <summary>
        /// Tự động sinh username từ FullName.
        /// Số thứ tự là số toàn hệ thống (tổng user + 1).
        /// Ví dụ: User 1 "Vũ Đức Thắng" → "thangvd1", User 2 "Vũ Hải Nam" → "namvh2"...
        /// </summary>
        private async Task<string> GenerateUsernameAsync(string fullName)
        {
            // Bỏ dấu tiếng Việt
            string normalized = RemoveDiacritics(fullName.Trim().ToLower());

            // Tách các phần tên
            string[] parts = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length == 0)
            {
                throw new InvalidOperationException("Họ tên không hợp lệ.");
            }

            // Lấy tên (phần cuối) + chữ cái đầu các phần còn lại
            // "vu duc thang" → lastName = "thang", initials = "vd"
            string lastName = parts[^1];
            string initials = string.Concat(parts.Take(parts.Length - 1).Select(p => p[0]));

            string baseUsername = lastName + initials; // "thangvd"

            // Số thứ tự = tổng số user hiện tại + 1
            int suffix = await _context.Users.CountAsync() + 1;
            string candidateUsername = baseUsername + suffix;

            // Kiểm tra trùng, nếu trùng thì tăng lên
            while (await _context.Users.AnyAsync(u => u.Username == candidateUsername))
            {
                suffix++;
                candidateUsername = baseUsername + suffix;
            }

            return candidateUsername;
        }

        /// <summary>
        /// Bỏ dấu tiếng Việt.
        /// </summary>
        private static string RemoveDiacritics(string text)
        {
            if (string.IsNullOrEmpty(text)) return text;

            var normalizedString = text.Normalize(System.Text.NormalizationForm.FormD);
            var sb = new System.Text.StringBuilder();

            foreach (var c in normalizedString)
            {
                var unicodeCategory = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != System.Globalization.UnicodeCategory.NonSpacingMark)
                {
                    sb.Append(c);
                }
            }

            // Xử lý các ký tự đặc biệt tiếng Việt
            string result = sb.ToString().Normalize(System.Text.NormalizationForm.FormC);
            result = result.Replace("đ", "d").Replace("Đ", "D");

            return result;
        }



        public async Task<PagedResult<AdminUserResponse>> GetUserListAsync(FilterRequest filter)
        {
            var query = _context.Users
                .Include(u => u.UserRoleUser)
                .ThenInclude(ur => ur.Role)
                .AsNoTracking()
                .OrderBy(u => u.UserId);


			int totalCount = await query.CountAsync();

            var items = await query
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(u => new AdminUserResponse
                {
                    UserId = u.UserId,
                    Username = u.Username,
                    FullName = u.FullName,
                    Email = u.Email,
                    Phone = u.Phone,
                    IsActive = u.IsActive,
                    LastLoginAt = u.LastLoginAt,
                    CreatedAt = u.CreatedAt,
                    RoleName = (u.UserRoleUser != null && u.UserRoleUser.Role != null)
                               ? u.UserRoleUser.Role.RoleName : "N/A"
                })
                .ToListAsync();

            return new PagedResult<AdminUserResponse>(items, totalCount, filter.PageNumber, filter.PageSize);
        }

        public async Task<AdminUserResponse> UpdateUserAsync(long userId, UpdateUserRequest request, long assignedBy)
        {
            // Không cho phép admin tự đổi trạng thái (IsActive) tài khoản của chính mình
            if (userId == assignedBy && request.IsActive.HasValue)
            {
                throw new InvalidOperationException("Bạn không được phép thay đổi trạng thái tài khoản của chính mình.");
            }

            // Tìm user
            var user = await _context.Users
                .Include(u => u.UserRoleUser)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);

			// Update FullName
			if (!string.IsNullOrWhiteSpace(request.FullName))
			{
				user.FullName = request.FullName.Trim();
			}

            // Update Username if provided
            if (!string.IsNullOrWhiteSpace(request.Username))
            {
                var newUsername = request.Username.Trim();
                if (newUsername != user.Username)
                {
                    // Check duplicate
                    if (await _context.Users.AnyAsync(u => u.Username == newUsername))
                    {
                        throw new InvalidOperationException($"Username '{newUsername}' đã tồn tại.");
                    }
                    user.Username = newUsername;
                }
            }
            // Optional: If Username is NOT provided but FullName CHANGED, 
            // do we still auto-generate? 
            // The user requested to "move" the feature, implying manual control.
            // So if they don't provide a username, we probably shouldn't change the existing one 
            // just because they fixed a typo in the name.
            // However, if it's a new user creation (handled above), we auto-gen.
            // For Update: Let's assume ONLY explicit Username update changes it.

			if (user == null)
            {
                throw new KeyNotFoundException("Người dùng không tồn tại.");
            }

            // Cập nhật trạng thái nếu có
            if (request.IsActive.HasValue)
            {
                user.IsActive = request.IsActive.Value;
            }

            // Cập nhật Role nếu có
            if (request.RoleId.HasValue)
            {
                var role = await _context.Roles.FindAsync(request.RoleId.Value);
                if (role == null)
                {
                    throw new InvalidOperationException("Role không tồn tại.");
                }

                // Cập nhật hoặc tạo mới UserRole
                if (user.UserRoleUser != null)
                {
                    user.UserRoleUser.RoleId = request.RoleId.Value;
                    user.UserRoleUser.AssignedAt = DateTime.UtcNow;
                    user.UserRoleUser.AssignedBy = assignedBy;
                }
                else
                {
                    var userRole = new UserRole
                    {
                        UserId = user.UserId,
                        RoleId = request.RoleId.Value,
                        AssignedAt = DateTime.UtcNow,
                        AssignedBy = assignedBy
                    };
                    _context.UserRoles.Add(userRole);
                }
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Reload để lấy RoleName mới
            await _context.Entry(user).Reference(u => u.UserRoleUser).LoadAsync();
            if (user.UserRoleUser != null)
            {
                await _context.Entry(user.UserRoleUser).Reference(ur => ur.Role).LoadAsync();
            }

            return new AdminUserResponse
            {
				UserId = user.UserId,
				Username = user.Username,
				FullName = user.FullName,
				Email = user.Email,
				Phone = user.Phone,
				IsActive = user.IsActive,
				LastLoginAt = user.LastLoginAt,
				CreatedAt = user.CreatedAt,
				RoleName = user.UserRoleUser?.Role?.RoleName ?? "N/A"
			};
        }

        public async Task<AdminUserResponse> ToggleUserStatusAsync(long userId, long currentUserId)
        {
            // Không cho phép admin tự đổi trạng thái (enable/disable) tài khoản của chính mình
            if (userId == currentUserId)
            {
                throw new InvalidOperationException("Bạn không được phép thay đổi trạng thái tài khoản của chính mình.");
            }

            var user = await _context.Users
                .Include(u => u.UserRoleUser)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
            {
                throw new KeyNotFoundException("Người dùng không tồn tại.");
            }

            // Chuyển đổi trạng thái: Enable <-> Disable
            user.IsActive = !user.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new AdminUserResponse
            {
                UserId = user.UserId,
                Username = user.Username,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                IsActive = user.IsActive,
                LastLoginAt = user.LastLoginAt,
                CreatedAt = user.CreatedAt,
                RoleName = (user.UserRoleUser != null && user.UserRoleUser.Role != null)
                           ? user.UserRoleUser.Role.RoleName : "N/A"
            };
        }


        public async Task<(byte[] content, string fileName)> ExportUserListExcelAsync()
        {
            var users = await _context.Users
                .Include(u => u.UserRoleUser)
                .ThenInclude(ur => ur.Role)
                .AsNoTracking()
                .OrderByDescending(u => u.CreatedAt)
                .ToListAsync();

            using var workbook = new ClosedXML.Excel.XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Users");

            // Header
            var headers = new string[] { "UserId", "Full Name", "Username", "Email", "Phone", "Role", "Status" };
            for (int i = 0; i < headers.Length; i++)
            {
                var cell = worksheet.Cell(1, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = ClosedXML.Excel.XLColor.LightGray;
            }

            // Data
            int row = 2;
            foreach (var user in users)
            {
                worksheet.Cell(row, 1).Value = user.UserId;
                worksheet.Cell(row, 2).Value = user.FullName;
                worksheet.Cell(row, 3).Value = user.Username;
                worksheet.Cell(row, 4).Value = user.Email;
                worksheet.Cell(row, 5).Value = user.Phone ?? "N/A";
                worksheet.Cell(row, 6).Value = user.UserRoleUser?.Role?.RoleName ?? "N/A";
                worksheet.Cell(row, 7).Value = user.IsActive ? "Active" : "Inactive";
                row++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new System.IO.MemoryStream();
            workbook.SaveAs(stream);
            var content = stream.ToArray();
            var fileName = $"Users_Export_{DateTime.Now:yyyyMMddHHmmss}.xlsx";

            return (content, fileName);
        }
   

		/// <summary>
		/// Tạo mật khẩu ngẫu nhiên với độ dài chỉ định.
		/// Bao gồm chữ hoa, chữ thường, số, và ký tự đặc biệt.
		/// </summary>
		private static string GenerateRandomPassword(int length)
		{
			const string upperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
			const string lowerCase = "abcdefghijklmnopqrstuvwxyz";
			const string digits = "0123456789";
			const string special = "!@#$%&*?";
			const string allChars = upperCase + lowerCase + digits + special;

			var password = new char[length];
			using var rng = RandomNumberGenerator.Create();

			// Đảm bảo có ít nhất 1 ký tự mỗi loại
			password[0] = GetRandomChar(rng, upperCase);
			password[1] = GetRandomChar(rng, lowerCase);
			password[2] = GetRandomChar(rng, digits);
			password[3] = GetRandomChar(rng, special);

			// Các ký tự còn lại random từ tất cả
			for (int i = 4; i < length; i++)
			{
				password[i] = GetRandomChar(rng, allChars);
			}

			// Shuffle để không bị đoán thứ tự
			Shuffle(rng, password);

			return new string(password);
		}

		private static char GetRandomChar(RandomNumberGenerator rng, string chars)
		{
			var bytes = new byte[4];
			rng.GetBytes(bytes);
			int index = (int)(BitConverter.ToUInt32(bytes, 0) % (uint)chars.Length);
			return chars[index];
		}

		private static void Shuffle(RandomNumberGenerator rng, char[] array)
		{
			var bytes = new byte[4];
			for (int i = array.Length - 1; i > 0; i--)
			{
				rng.GetBytes(bytes);
				int j = (int)(BitConverter.ToUInt32(bytes, 0) % (uint)(i + 1));
				(array[i], array[j]) = (array[j], array[i]);
			}
		}
	}

}
