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
using BCrypt.Net;

namespace Warehouse.DataAcces.Service
{
    public class UserService : GenericRepository<User>, IUserService
    {

        public UserService(Mkiwms4Context context) : base(context)
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

            var result = new UserResponse
            {
                UserId = userId,
                Email = user.Email,
                Username = user.Username,
                FullName = user.FullName,
                Phone = user.Phone,
                IsActive = user.IsActive,
                RoleName = user.UserRoleUser.Role.RoleName,
                LastLoginAt = user.LastLoginAt,
            };

            // Bổ sung RoleName từ navigation nếu cần
            if (user.UserRoleUser?.Role != null)
            {
                result.RoleName = user.UserRoleUser.Role.RoleName;
            }

            return result;
        }


        public async Task ChangePasswordAsync(long userId, string oldPassword, string newPassword)
        {
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
    }
}