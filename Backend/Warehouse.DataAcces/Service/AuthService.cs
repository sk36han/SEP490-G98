using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Microsoft.EntityFrameworkCore;
using System.Net.Mail;
using System.Net;

using Microsoft.Extensions.Caching.Memory;

namespace Warehouse.DataAcces.Service
{
    public class AuthService : GenericRepository<User>, IAuthService
    {
        private readonly IConfiguration _configuration;
        private readonly IMemoryCache _cache;

        public AuthService(Mkiwms5Context context, IConfiguration configuration, IMemoryCache cache) : base(context)
        {
            _configuration = configuration;
            _cache = cache;
        }

        public async Task<User?> ValidateLoginAsync(string identifier, string password)
        {
            if (string.IsNullOrWhiteSpace(identifier) || string.IsNullOrWhiteSpace(password))
            {
                return null;
            }

            var normalizedIdentifier = identifier.Trim();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == normalizedIdentifier || u.Username == normalizedIdentifier);

            if (user == null || !user.IsActive)
            {
                return null;
            }

            if (!VerifyPasswordHash(password, user.PasswordHash))
            {
                return null;
            }

            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return user;
        }

        public async Task<bool> IsUserActiveAsync(long userId)
        {
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId);
            return user != null && user.IsActive;
        }

        public async Task<(string accessToken, DateTime expiresAt)> IssueTokensAsync(User user, bool rememberMe)
        {
            if (user == null)
            {
                throw new ArgumentNullException(nameof(user));
            }

            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["SecretKey"];
            var issuer = jwtSettings["Issuer"];
            var audience = jwtSettings["Audience"];

            if (string.IsNullOrWhiteSpace(secretKey) || string.IsNullOrWhiteSpace(issuer) || string.IsNullOrWhiteSpace(audience))
            {
                throw new InvalidOperationException("Thiếu cấu hình JWT (SecretKey/Issuer/Audience).");
            }

            var defaultMinutes = int.Parse(jwtSettings["AccessTokenExpirationMinutes"] ?? "60");
            var rememberMeMinutes = int.Parse(jwtSettings["AccessTokenRememberMeMinutes"] ?? defaultMinutes.ToString());
            var expirationMinutes = rememberMe ? rememberMeMinutes : defaultMinutes;

            var roleCode = await GetUserRoleCodeAsync(user.UserId);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            if (!string.IsNullOrEmpty(user.Username))
            {
                claims.Add(new Claim("username", user.Username));
            }

            if (!string.IsNullOrEmpty(roleCode))
            {
                claims.Add(new Claim(ClaimTypes.Role, roleCode));
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes);

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: expiresAt,
                signingCredentials: credentials
            );

            var accessToken = new JwtSecurityTokenHandler().WriteToken(token);
            return (accessToken, expiresAt);
        }

        public async Task SendResetPasswordEmailAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return;
            }

            var normalizedEmail = email.Trim();
            var account = await _context.Set<User>().FirstOrDefaultAsync(a => a.Email == normalizedEmail);
            if (account == null)
            {
                return;
            }

            var jwtKey = _configuration["JwtSettings:SecretKey"];
            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                throw new InvalidOperationException("Missing JwtSettings:SecretKey configuration");
            }

            var issuer = _configuration["JwtSettings:Issuer"];
            var audience = _configuration["JwtSettings:Audience"];

            if (string.IsNullOrWhiteSpace(issuer))
            {
                throw new InvalidOperationException("Missing JwtSettings:Issuer configuration");
            }
            if (string.IsNullOrWhiteSpace(audience))
            {
                throw new InvalidOperationException("Missing JwtSettings:Audience configuration");
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddMinutes(5);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, account.UserId.ToString()),
                new Claim(ClaimTypes.NameIdentifier, account.UserId.ToString()),
                new Claim("purpose", "reset_password"),
                new Claim(JwtRegisteredClaimNames.Email, account.Email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                notBefore: DateTime.UtcNow,
                expires: expires,
                signingCredentials: creds
            );

            var resetToken = new JwtSecurityTokenHandler().WriteToken(token);

            var smtpSection = _configuration.GetSection("Smtp");
            var host = smtpSection["Host"];
            var port = int.Parse(smtpSection["Port"] ?? "587");
            var username = smtpSection["Username"];
            var password = smtpSection["Password"];
            var enableSsl = bool.Parse(smtpSection["EnableSsl"] ?? "true");
            var fromName = smtpSection["FromName"];

            if (string.IsNullOrWhiteSpace(host) ||
                string.IsNullOrWhiteSpace(username) ||
                string.IsNullOrWhiteSpace(password))
            {
                throw new InvalidOperationException("Thiếu cấu hình SMTP trong appsettings.json");
            }

            var resetBaseUrl = _configuration["App:ResetPasswordUrl"] ?? "http://localhost:5173/reset-password?token=";
            var resetLink = $"{resetBaseUrl}{WebUtility.UrlEncode(resetToken)}";

            using var smtp = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                Credentials = new NetworkCredential(username, password)
            };

            var mail = new MailMessage
            {
                From = new MailAddress(username, fromName),
                Subject = "Đặt lại mật khẩu - Minh Khanh WMS",
                Body = $@"
        <div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;"">
            <div style=""background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"">
                <h2 style=""color: #333; margin-bottom: 20px;"">Đặt lại mật khẩu</h2>
                <p style=""color: #555; line-height: 1.6;"">Xin chào <strong>{account.Username}</strong>,</p>
                <p style=""color: #555; line-height: 1.6;"">Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
                <p style=""color: #555; line-height: 1.6;"">Nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
                <div style=""text-align: center; margin: 30px 0;"">
                    <a href=""{resetLink}""
                       style=""background-color:#007bff; color:white; padding:12px 30px;
                       text-decoration:none; border-radius:5px; display:inline-block;
                       font-size:16px; font-weight:bold;"">
                       Đặt lại mật khẩu
                    </a>
                </div>
                <p style=""color: #666; font-size: 14px; line-height: 1.6;"">
                    <strong>Lưu ý:</strong> Liên kết này sẽ hết hạn sau 1 giờ.
                </p>
                <p style=""color: #666; font-size: 14px; line-height: 1.6;"">
                    Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
                </p>
                <hr style=""border: none; border-top: 1px solid #eee; margin: 20px 0;"">
                <p style=""color: #999; font-size: 12px; line-height: 1.6;"">
                    Trân trọng,<br>
                    <strong>{fromName}</strong><br>
                    Minh Khanh Warehouse Management System
                </p>
            </div>
        </div>
    ",
                IsBodyHtml = true
            };

            mail.To.Add(account.Email);
            await smtp.SendMailAsync(mail);
        }

        public async Task ResetPasswordAsync(string token, string newPassword)
        {
            var jwtKey = _configuration["JwtSettings:SecretKey"];
            var issuer = _configuration["JwtSettings:Issuer"];
            var audience = _configuration["JwtSettings:Audience"];

            if (string.IsNullOrWhiteSpace(jwtKey) || string.IsNullOrWhiteSpace(issuer) || string.IsNullOrWhiteSpace(token))
            {
                throw new InvalidOperationException("Thiếu cấu hình JWT hoặc token rỗng.");
            }

            if (string.IsNullOrWhiteSpace(newPassword))
            {
                throw new InvalidOperationException("Mật khẩu mới là bắt buộc.");
            }

            var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = true,
                ValidAudience = audience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1)
            };

            try
            {
                var principal = handler.ValidateToken(token, tokenValidationParameters, out _);

                if (principal.Claims.FirstOrDefault(c => c.Type == "purpose")?.Value != "reset_password")
                    throw new SecurityTokenException("Mục đích token không hợp lệ.");

                var accountIdString = principal.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub || c.Type == ClaimTypes.NameIdentifier)?.Value;

                if (!long.TryParse(accountIdString, out var accountId))
                    throw new SecurityTokenException("ID người dùng không hợp lệ trong token.");

                var account = await _context.Users.FindAsync(accountId)
                              ?? throw new InvalidOperationException("Không tìm thấy tài khoản.");

                account.PasswordHash = CreatePasswordHash(newPassword);
                account.UpdatedAt = DateTime.UtcNow;

                _context.Update(account);
                await _context.SaveChangesAsync();
            }
            catch (SecurityTokenExpiredException)
            {
                throw new SecurityTokenException("Liên kết đặt lại mật khẩu đã hết hạn.");
            }
            catch (SecurityTokenInvalidSignatureException)
            {
                throw new SecurityTokenException("Chữ ký xác thực không hợp lệ.");
            }
            catch (Exception ex) when (ex is not SecurityTokenException && ex is not InvalidOperationException)
            {
                throw new SecurityTokenException($"Lỗi xác thực: {ex.Message}");
            }
        }

        private bool VerifyPasswordHash(string password, string storedHash)
        {
            if (string.IsNullOrWhiteSpace(storedHash))
                return false;

            return BCrypt.Net.BCrypt.Verify(password, storedHash);
        }

        public static string CreatePasswordHash(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
        }

        public async Task<bool> ChangePasswordByEmailAsync(string email, string newPassword)
        {
            if (string.IsNullOrWhiteSpace(email))
                throw new ArgumentException("Email is required");

            if (string.IsNullOrWhiteSpace(newPassword))
                throw new ArgumentException("New password is required");

            var account = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == email.Trim());

            if (account == null)
                return false;

            account.PasswordHash = CreatePasswordHash(newPassword);
            account.UpdatedAt = DateTime.UtcNow;

            _context.Users.Update(account);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task SendEmailUserAccountAsync(string toEmail, string subject, string body)
        {
            var smtpHost = _configuration["Smtp:Host"];
            var smtpPort = int.Parse(_configuration["Smtp:Port"]!);
            var smtpUsername = _configuration["Smtp:Username"];
            var smtpPassword = _configuration["Smtp:Password"];
            var enableSsl = bool.Parse(_configuration["Smtp:EnableSsl"]!);
            var fromName = _configuration["Smtp:FromName"];

            using var smtpClient = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(smtpUsername, smtpPassword),
                EnableSsl = enableSsl
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(smtpUsername!, fromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };

            mailMessage.To.Add(toEmail);
            await smtpClient.SendMailAsync(mailMessage);
        }

        public async Task<string?> GetUserRoleCodeAsync(long userId)
        {
            return await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Include(ur => ur.Role)
                .Select(ur => ur.Role.RoleCode)
                .FirstOrDefaultAsync();
        }

        public async Task<User?> GetUserByIdAsync(long userId)
        {
            return await GetByIdAsync(userId);
        }

        public async Task<bool> GenerateAndSendOtpAsync(User user)
        {
            // Sinh mã OTP 6 số ngẫu nhiên
            var random = new Random();
            var otp = random.Next(100000, 999999).ToString();

            // Băm OTP trước khi lưu vào cache
            var otpHash = BCrypt.Net.BCrypt.HashPassword(otp, workFactor: 12);

            var cacheKey = $"OTP_{user.UserId}";
            var expiry = TimeSpan.FromMinutes(5);
            var otpData = new OtpCacheData
            {
                OtpHash = otpHash,
                FailedAttempts = 0,
                ExpiryAt = DateTime.UtcNow.Add(expiry)
            };

            // Lưu vào IMemoryCache với thời gian hết hạn cố định là 5 phút
            var cacheOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiry
            };

            _cache.Set(cacheKey, otpData, cacheOptions);

            // Gửi email chứa OTP
            var subject = "Mã xác thực đăng nhập (OTP) - Minh Khanh WMS";
            var body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;'>
                    <div style='background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;'>
                        <h2 style='color: #333; margin-bottom: 20px;'>Mã xác thực đăng nhập</h2>
                        <p style='color: #555; line-height: 1.6; font-size: 16px;'>Xin chào <strong>{user.FullName ?? user.Username}</strong>,</p>
                        <p style='color: #555; line-height: 1.6;'>Mã OTP của bạn là:</p>
                        <div style='margin: 20px 0;'>
                            <span style='background-color: #f0f8ff; color: #007bff; padding: 15px 30px; font-size: 28px; font-weight: bold; border-radius: 5px; letter-spacing: 5px;'>{otp}</span>
                        </div>
                        <p style='color: #666; font-size: 14px; line-height: 1.6;'>Mã này có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
                        <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'>
                        <p style='color: #999; font-size: 12px; line-height: 1.6;'>
                            Trân trọng,<br>
                            Minh Khanh Warehouse Management System
                        </p>
                    </div>
                </div>";

            try
            {
                await SendEmailUserAccountAsync(user.Email, subject, body);
                return true;
            }
            catch (Exception)
            {
                // Có thể log lỗi ở đây
                return false;
            }
        }

        public Task<bool> VerifyOtpAsync(long userId, string otp)
        {
            var cacheKey = $"OTP_{userId}";

            // Lấy dữ liệu OTP từ cache
            if (!_cache.TryGetValue(cacheKey, out OtpCacheData? otpData) || otpData == null)
            {
                return Task.FromResult(false); // OTP không tồn tại hoặc đã hết hạn
            }

            // Kiểm tra số lần nhập sai
            if (otpData.FailedAttempts >= 5)
            {
                _cache.Remove(cacheKey); // Xóa cache ngay lập tức nếu vượt quá 5 lần
                return Task.FromResult(false);
            }

            // Kiểm tra chữ ký băm của OTP
            bool isCorrect = BCrypt.Net.BCrypt.Verify(otp, otpData.OtpHash);

            if (!isCorrect)
            {
                // Tăng số lần thử nghiệm sai
                otpData.FailedAttempts++;

                if (otpData.FailedAttempts >= 5)
                {
                    _cache.Remove(cacheKey); // Xóa ngay nếu sai quá 5 lần
                }
                else
                {
                    // Cập nhật lại cache với số đếm mới nhưng giữ nguyên thời gian hết hạn cũ
                    var remaining = otpData.ExpiryAt - DateTime.UtcNow;
                    if (remaining > TimeSpan.Zero)
                    {
                        _cache.Set(cacheKey, otpData, remaining);
                    }
                }

                return Task.FromResult(false); 
            }

            // Xác thực thành công: Xóa OTP trong RAM và trả về true
            _cache.Remove(cacheKey);
            return Task.FromResult(true);
        }
    }

    // Lớp hỗ trợ lưu cấu trúc OTP trong MemoryCache
    public class OtpCacheData
    {
        public string OtpHash { get; set; } = string.Empty;
        public int FailedAttempts { get; set; }
        public DateTime ExpiryAt { get; set; }
    }
}
