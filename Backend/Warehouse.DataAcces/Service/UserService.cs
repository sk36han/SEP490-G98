using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
    public class UserService : GenericRepository<User>, IUserService
    {
        private static readonly Regex StrongPasswordRegex = new(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{6,100}$", RegexOptions.Compiled);
        private static readonly Regex PhoneRegex = new(@"^[0-9+\-\s()]{8,20}$", RegexOptions.Compiled);

        public UserService(Mkiwms5Context context) : base(context)
        {
        }

        public async Task<UserResponse?> GetUserProfileAsync(long userId)
        {
            var user = await _context.Users
                .Include(u => u.UserRoleUser)
                .ThenInclude(ur => ur.Role)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null) return null;

            return new UserResponse
            {
                Email = user.Email,
                Username = user.Username,
                FullName = user.FullName,
                Phone = user.Phone,
                IsActive = user.IsActive,
                RoleName = user.UserRoleUser?.Role?.RoleName,
                LastLoginAt = user.LastLoginAt,
            };
        }

        public async Task ChangePasswordAsync(long userId, string oldPassword, string newPassword)
        {
            if (string.IsNullOrWhiteSpace(oldPassword))
            {
                throw new InvalidOperationException("Mật khẩu hiện tại là bắt buộc.");
            }

            if (string.IsNullOrWhiteSpace(newPassword))
            {
                throw new InvalidOperationException("Mật khẩu mới là bắt buộc.");
            }

            if (oldPassword == newPassword)
            {
                throw new InvalidOperationException("Mật khẩu mới phải khác mật khẩu hiện tại.");
            }

            if (!StrongPasswordRegex.IsMatch(newPassword))
            {
                throw new InvalidOperationException("Mật khẩu mới phải có ít nhất 1 chữ hoa, 1 chữ thường và 1 ký tự đặc biệt.");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                throw new KeyNotFoundException("Người dùng không tồn tại.");
            }

            var isOldPasswordValid = BCrypt.Net.BCrypt.Verify(oldPassword, user.PasswordHash);
            if (!isOldPasswordValid)
            {
                throw new InvalidOperationException("Mật khẩu hiện tại không đúng.");
            }

            user.PasswordHash = AuthService.CreatePasswordHash(newPassword);
            user.UpdatedAt = DateTime.UtcNow;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();
        }

        public async Task<UserResponse?> UpdateProfilePhoneAsync(long userId, string phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
            {
                throw new InvalidOperationException("Số điện thoại là bắt buộc.");
            }

            var normalizedPhone = phone.Trim();
            if (!PhoneRegex.IsMatch(normalizedPhone))
            {
                throw new InvalidOperationException("Số điện thoại không hợp lệ.");
            }

            var user = await _context.Users
                .Include(u => u.UserRoleUser)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
            {
                return null;
            }

            user.Phone = normalizedPhone;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new UserResponse
            {
                Email = user.Email,
                Username = user.Username,
                FullName = user.FullName,
                Phone = user.Phone,
                IsActive = user.IsActive,
                RoleName = user.UserRoleUser?.Role?.RoleName,
                LastLoginAt = user.LastLoginAt
            };
        }
    }
}
