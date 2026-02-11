using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
	public class UserService : IUserService
	{
		private readonly Mkiwms4Context _context;

		public UserService(Mkiwms4Context context)
		{
			_context = context;
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

			// Tạo mật khẩu ngẫu nhiên
			string generatedPassword = GenerateRandomPassword(12);

			// Hash mật khẩu
			string passwordHash = AuthService.CreatePasswordHash(generatedPassword);

			// Tạo user mới
			var newUser = new User
			{
				Email = request.Email,
				FullName = request.FullName,
				Phone = request.Phone,
				Username = request.Email.Split('@')[0], // Lấy phần trước @ làm username
				PasswordHash = passwordHash,
				IsActive = true,
				CreatedAt = DateTime.UtcNow,
				UpdatedAt = DateTime.UtcNow
			};

			_context.Users.Add(newUser);
			await _context.SaveChangesAsync();

			// Gán role (bắt buộc)
			var role = await _context.Roles.FindAsync(request.RoleId);
			if (role == null)
			{
				throw new InvalidOperationException("Role không tồn tại.");
			}

			var userRole = new UserRole
			{
				UserId = newUser.UserId,
				RoleId = role.RoleId,
				AssignedAt = DateTime.UtcNow
			};
			_context.UserRoles.Add(userRole);
			await _context.SaveChangesAsync();
			string roleName = role.RoleName;

			return new CreateUserResponse
			{
				UserId = newUser.UserId,
				Email = newUser.Email,
				FullName = newUser.FullName,
				Phone = newUser.Phone,
				GeneratedPassword = generatedPassword,
				RoleName = roleName,
				CreatedAt = newUser.CreatedAt
			};
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

			// Cập nhật Username nếu có
			if (!string.IsNullOrWhiteSpace(request.Username))
			{
				// Kiểm tra username trùng
				var existingUser = await _context.Users
					.FirstOrDefaultAsync(u => u.Username == request.Username && u.UserId != userId);
				if (existingUser != null)
				{
					throw new InvalidOperationException("Username này đã được sử dụng.");
				}
				user.Username = request.Username;
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