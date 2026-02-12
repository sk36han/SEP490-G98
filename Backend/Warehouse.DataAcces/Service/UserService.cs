using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelDto;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
	public class UserService : GenericRepository<User>, IUserService
	{
		private readonly IConfiguration _configuration;
		private readonly IAuthService _emailService;
		public UserService(Mkiwms4Context context, IConfiguration configuration, IAuthService emailService) : base(context)
		{
			_configuration = configuration;
			_emailService = emailService;
		}
		public async Task<CreateUserResponse> CreateUserAccountAsync(CreateUserRequest request)
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

			// Tự động sinh username từ FullName
			string generatedUsername = await GenerateUsernameAsync(request.FullName);

			// Mật khẩu mặc định
			string generatedPassword = "Mkh123456@";

			// Hash mật khẩu
			string passwordHash = AuthService.CreatePasswordHash(generatedPassword);

			// Tạo user mới
			var newUser = new User
			{
				Email = request.Email,
				FullName = request.FullName,
				Username = generatedUsername,
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
				AssignedAt = DateTime.UtcNow
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



		public async Task<PagedResult<UserDto>> GetUserListAsync(UserFilterRequest filter)
		{
			var query = _context.Users
				.Include(u => u.UserRoleUser)
				.ThenInclude(ur => ur.Role)
				.AsNoTracking()
				.OrderByDescending(u => u.UserId);

			int totalCount = await query.CountAsync();

			var items = await query
				.Skip((filter.PageNumber - 1) * filter.PageSize)
				.Take(filter.PageSize)
				.Select(u => new UserDto
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

			return new PagedResult<UserDto>(items, totalCount, filter.PageNumber, filter.PageSize);
		}

		public async Task<UserDto> UpdateUserAsync(long userId, UpdateUserRequest request)
		{
			// Tìm user
			var user = await _context.Users
				.Include(u => u.UserRoleUser)
				.ThenInclude(ur => ur.Role)
				.FirstOrDefaultAsync(u => u.UserId == userId);

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
				}
				else
				{
					var userRole = new UserRole
					{
						UserId = user.UserId,
						RoleId = request.RoleId.Value,
						AssignedAt = DateTime.UtcNow
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

			return new UserDto
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

		public async Task<UserDto> ToggleUserStatusAsync(long userId)
		{
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

			return new UserDto
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
	}
}