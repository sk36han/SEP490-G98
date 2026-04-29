
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
    public class UserService : GenericRepository<User>, IUserService
    {
        private static readonly Regex StrongPasswordRegex = new(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{6,100}$", RegexOptions.Compiled);
        private static readonly Regex PhoneRegex = new(@"^[0-9+\-\s()]{8,20}$", RegexOptions.Compiled);
        private readonly IAuditLogService _auditLogService;
        private readonly IDateTimeProvider _dateTimeProvider;

        public UserService(Mkiwms5Context context, IAuditLogService auditLogService, IDateTimeProvider dateTimeProvider) : base(context)
        {
            _auditLogService = auditLogService;
            _dateTimeProvider = dateTimeProvider;
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

            // Audit log
            await _auditLogService.LogAsync(
                userId,
                AuditAction.ChangePassword,
                AuditEntity.User,
                userId,
                $"Người dùng {user.FullName} đã đổi mật khẩu");
        }

        public async Task<UserResponse?> UpdateProfilePhoneAsync(long userId, string phone)
        {
            // Giữ lại để không breaking change interface cũ
            return await UpdateProfileAsync(userId, new UpdateProfileRequest { Phone = phone });
        }

        public async Task<UserResponse?> UpdateProfileAsync(long userId, UpdateProfileRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Phone))
            {
                throw new InvalidOperationException("Số điện thoại là bắt buộc.");
            }

            var normalizedPhone = request.Phone.Trim();
            if (!PhoneRegex.IsMatch(normalizedPhone))
            {
                throw new InvalidOperationException("Số điện thoại không hợp lệ.");
            }

            // Validate Gender nếu có
            var allowedGenders = new[] { "Nam", "Nữ", "Khác" };
            if (!string.IsNullOrWhiteSpace(request.Gender) &&
                !Array.Exists(allowedGenders, g => g == request.Gender.Trim()))
            {
                throw new InvalidOperationException("Giới tính không hợp lệ. Chỉ chấp nhận: Nam, Nữ, Khác.");
            }

            // Validate Dob nếu có
            if (request.Dob.HasValue)
            {
                var today = _dateTimeProvider.BusinessToday();
                if (request.Dob.Value > today)
                {
                    throw new InvalidOperationException("Ngày sinh không được lớn hơn ngày hiện tại.");
                }
                if (request.Dob.Value.Year < 1900)
                {
                    throw new InvalidOperationException("Ngày sinh không hợp lệ.");
                }
            }

            var user = await _context.Users
                .Include(u => u.UserRoleUser)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
            {
                return null;
            }

            // Lưu giá trị cũ để audit log
            var oldPhone  = user.Phone;
            var oldGender = user.Gender;
            var oldDob    = user.Dob;

            // Cập nhật
            user.Phone = normalizedPhone;

            if (!string.IsNullOrWhiteSpace(request.Gender))
            {
                user.Gender = request.Gender.Trim();
            }

            if (request.Dob.HasValue)
            {
                user.Dob = request.Dob.Value;
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Audit log
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Update,
                AuditEntity.User,
                userId,
                $"Cập nhật thông tin cá nhân cho {user.FullName}",
                $"Phone: {oldPhone}, Gender: {oldGender}, Dob: {oldDob}",
                $"Phone: {normalizedPhone}, Gender: {user.Gender}, Dob: {user.Dob}");

            return new UserResponse
            {
                Email = user.Email,
                Username = user.Username,
                FullName = user.FullName,
                Phone = user.Phone,
                IsActive = user.IsActive,
                RoleName = user.UserRoleUser?.Role?.RoleName,
                LastLoginAt = user.LastLoginAt,
                Gender = user.Gender,
                Dob = user.Dob
            };
        }

        public async Task<List<UserResponse>> GetAccountantsAsync()
        {
            const string roleName = "Kế Toán";

            var users = await _context.Users
                .Include(u => u.UserRoleUser)
                .ThenInclude(ur => ur.Role)
                .AsNoTracking()
                .Where(u => u.UserRoleUser != null &&
                            u.UserRoleUser.Role.RoleName == roleName &&
                            u.IsActive)
                .Select(u => new UserResponse
                {
                    Email = u.Email,
                    Username = u.Username,
                    FullName = u.FullName,
                    Phone = u.Phone,
                    IsActive = u.IsActive,
                    RoleName = u.UserRoleUser!.Role.RoleName,
                    LastLoginAt = u.LastLoginAt,
                })
                .ToListAsync();

            return users;
        }
    }
}
