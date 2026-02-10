using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.ComponentModel.Design;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;
using System.Net.Mail;
using System.Net;

namespace Warehouse.DataAcces.Service
{
    public class AuthService : GenericRepository<User>, IAuthService
    {
        private readonly IConfiguration _configuration;
        public AuthService(Mkiwms4Context context, IConfiguration configuration) : base(context)
        {
            _configuration = configuration;
        }

        public async Task<User?> ValidateLoginAsync(string identifier, string password)
        {
            // Find user by email or username
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == identifier || u.Username == identifier);

            if (user == null || !user.IsActive)
            {
                return null;
            }

            // Verify password
            if (!VerifyPasswordHash(password, user.PasswordHash))
            {
                return null;
            }

            // Update last login time
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return user;
        }

        public async Task<(string accessToken, DateTime expiresAt, string refreshToken)> IssueTokensAsync(User user, bool rememberMe)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["SecretKey"];
            var issuer = jwtSettings["Issuer"];
            var audience = jwtSettings["Audience"];
            var expirationMinutes = int.Parse(jwtSettings["AccessTokenExpirationMinutes"] ?? "60");

            // Create claims
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

            // Create token
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey!));
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
            var refreshToken = GenerateRefreshToken();

            return (accessToken, expiresAt, refreshToken);
        }

        public async Task SendResetPasswordEmailAsync(string email)
        {// Tìm account theo email
            var account = await _context.Set<User>().FirstOrDefaultAsync(a => a.Email == email);
            if (account == null)
            {
                return;
            }

            // Lấy cấu hình JWT
            var jwtKey = _configuration["JwtSettings:SecretKey"];
            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                throw new InvalidOperationException("Missing JwtSettings:SecretKey configuration");
            }


            var issuer = _configuration["JwtSettings:Issuer"];
            var audience = _configuration["JwtSettings:Audience"];

            // Tạo reset password token
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddMinutes(30); // Reset password token - 30 phút

            var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, account.UserId.ToString()),
            new Claim(ClaimTypes.NameIdentifier, account.UserId.ToString()),
            new Claim("purpose", "reset_password"),
            new Claim(JwtRegisteredClaimNames.Email, account.Email)
        };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
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

            // Tạo reset link
            var resetBaseUrl = _configuration["App:ResetPasswordUrl"] ?? "https://localhost:7164/Account/ResetPassword?token=";
            var resetLink = $"{resetBaseUrl}{WebUtility.UrlEncode(resetToken)}";



            // Gửi email
            using var smtp = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                Credentials = new NetworkCredential(username, password)
            };

            var mail = new MailMessage
            {
                From = new MailAddress(username, fromName),
                Subject = "Đặt lại mật khẩu ",
                Body = $@"
        <h2>Đặt lại mật khẩu</h2>
        <p>Xin chào {account.Username},</p>
        <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
        <p>Nhấn vào liên kết bên dưới để đặt lại mật khẩu:</p>
        <p>
            <a href=""{resetLink}""
               style=""background-color:#007bff;color:white;padding:10px 20px;
               text-decoration:none;border-radius:5px;"">
               Đặt lại mật khẩu
            </a>
        </p>
        <p>Liên kết này sẽ hết hạn sau 30 phút.</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        <br>
        <p>Trân trọng,<br>{fromName}</p>
    ",
                IsBodyHtml = true
            };

            mail.To.Add(account.Email);

            await smtp.SendMailAsync(mail);

        }



        public async Task ResetPasswordAsync(string token, string newPassword)
        {
            var jwtKey = _configuration["JwtSettings:SecretKey"];
            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                throw new InvalidOperationException("Missing JwtSettings:SecretKey configuration");
            }



            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = _configuration["JwtSettings:Issuer"],
                ValidateAudience = true,
                ValidAudience = _configuration["JwtSettings:Audience"],
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(30)
            };

            var handler = new JwtSecurityTokenHandler();
            ClaimsPrincipal principal;

            try
            {
                principal = handler.ValidateToken(token, tokenValidationParameters, out _);
            }
            catch (Exception ex)
            {
                throw new SecurityTokenException($"Token validation failed: {ex.Message}");
            }

            var purpose = principal.Claims.FirstOrDefault(c => c.Type == "purpose")?.Value;
            if (purpose != "reset_password")
            {
                throw new SecurityTokenException("Invalid token purpose");
            }

            // Tìm account ID từ các claim types khác nhau
            var sub = principal.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub)?.Value;
            var nameIdentifier = principal.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;

            // Sử dụng nameIdentifier nếu sub không có
            var accountIdString = sub ?? nameIdentifier;

            if (string.IsNullOrEmpty(accountIdString))
            {
                throw new SecurityTokenException("Token sub and nameIdentifier are null or empty");
            }

            if (!long.TryParse(accountIdString, out var accountId))
            {
                throw new SecurityTokenException("Invalid account ID in token");
            }

            var account = await _context.Set<User>().FirstOrDefaultAsync(a => a.UserId == accountId);
            if (account == null)
            {
                throw new InvalidOperationException("Account not found");
            }

            account.PasswordHash = CreatePasswordHash(newPassword);
            account.UpdatedAt = DateTime.UtcNow;

            _context.Update(account);
            await _context.SaveChangesAsync();
        }


        private bool VerifyPasswordHash(string password, string storedHash)
        {
            if (string.IsNullOrWhiteSpace(storedHash))
                return false;

            return BCrypt.Net.BCrypt.Verify(password, storedHash);
        }

        private string GenerateRefreshToken()
        {
            var randomNumber = new byte[32];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomNumber);
                return Convert.ToBase64String(randomNumber);
            }
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
                .FirstOrDefaultAsync(u => u.Email == email);

            if (account == null)
                return false;

            // Hash mật khẩu mới
            account.PasswordHash = CreatePasswordHash(newPassword);
            account.UpdatedAt = DateTime.UtcNow;

            _context.Users.Update(account);
            await _context.SaveChangesAsync();

            return true;
        }


    }
}
