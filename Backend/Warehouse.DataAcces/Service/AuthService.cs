using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
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

        public async Task<(string accessToken, DateTime expiresAt)> IssueTokensAsync(User user, bool rememberMe)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["SecretKey"];
            var issuer = jwtSettings["Issuer"];
            var audience = jwtSettings["Audience"];

            // Access token lifetime
            var defaultMinutes = int.Parse(jwtSettings["AccessTokenExpirationMinutes"] ?? "60");
            var rememberMeMinutes = int.Parse(jwtSettings["AccessTokenRememberMeMinutes"] ?? defaultMinutes.ToString());
            var expirationMinutes = rememberMe ? rememberMeMinutes : defaultMinutes;
			// Lấy RoleCode (khớp với [Authorize(Roles = "Admin")]) - không dùng RoleName
			var roleCode = await _context.UserRoles
				.Where(ur => ur.UserId == user.UserId)
				.Include(ur => ur.Role)
				.Select(ur => ur.Role.RoleCode)
				.FirstOrDefaultAsync();

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
			if (!string.IsNullOrEmpty(roleCode))
			{
				claims.Add(new Claim(ClaimTypes.Role, roleCode));
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

            return (accessToken, expiresAt);
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

            // Validate issuer and audience
            if (string.IsNullOrWhiteSpace(issuer))
            {
                throw new InvalidOperationException("Missing JwtSettings:Issuer configuration");
            }
            if (string.IsNullOrWhiteSpace(audience))
            {
                throw new InvalidOperationException("Missing JwtSettings:Audience configuration");
            }

            // Tạo reset password token
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddMinutes(5); // Token chỉ có hiệu lực trong 5 phút

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, account.UserId.ToString()),
                new Claim(ClaimTypes.NameIdentifier, account.UserId.ToString()),
                new Claim("purpose", "reset_password"),
                new Claim(JwtRegisteredClaimNames.Email, account.Email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };

            // Đảm bảo issuer và audience được truyền vào constructor thay vì chỉ nằm trong claims list
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

            // Tạo reset link
            var resetBaseUrl = _configuration["App:ResetPasswordUrl"] ?? "http://localhost:5173/reset-password?token=";
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
                    <strong>Lưu ý:</strong> Liên kết này sẽ hết hạn sau 3 giờ.
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



		// #endregion
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
	}

}
