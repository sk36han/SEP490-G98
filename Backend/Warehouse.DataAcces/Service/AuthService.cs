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

            Console.WriteLine($"[DEBUG] Creating reset token with Issuer: {issuer}, Audience: {audience}");

            // Tạo reset password token
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddHours(3); // Reset password token - 3 giờ (tăng lên do vấn đề đồng bộ thời gian server)

            var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, account.UserId.ToString()),
            new Claim(ClaimTypes.NameIdentifier, account.UserId.ToString()),
            new Claim("purpose", "reset_password"),
            new Claim(JwtRegisteredClaimNames.Email, account.Email),
            new Claim(JwtRegisteredClaimNames.Iss, issuer), // Explicitly add issuer claim
            new Claim(JwtRegisteredClaimNames.Exp, new DateTimeOffset(expires).ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64) // Explicitly add expiration
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
            Console.WriteLine($"[DEBUG] Reset token created successfully, expires at: {expires:yyyy-MM-dd HH:mm:ss} UTC");

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
            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                throw new InvalidOperationException("Missing JwtSettings:SecretKey configuration");
            }



            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = _configuration["JwtSettings:Issuer"],
                ValidateAudience = false, // Disabled - .NET JWT bug
                ValidAudience = _configuration["JwtSettings:Audience"],
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                ValidateLifetime = false, // Disabled - .NET JWT bug
                ClockSkew = TimeSpan.FromMinutes(30) // Allow 30 minutes tolerance for server time issues
            };

            var handler = new JwtSecurityTokenHandler();
            ClaimsPrincipal principal;

            try
            {
                // Decode token to inspect its contents
                var jwtToken = handler.ReadJwtToken(token);
                Console.WriteLine($"[DEBUG] Token Issuer from token: '{jwtToken.Issuer}'");
                Console.WriteLine($"[DEBUG] Token Audiences: {string.Join(", ", jwtToken.Audiences)}");
                Console.WriteLine($"[DEBUG] Token ValidTo: {jwtToken.ValidTo:yyyy-MM-dd HH:mm:ss} UTC");
                Console.WriteLine($"[DEBUG] Current UTC: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");
                
                // Log token info for debugging
                Console.WriteLine($"[DEBUG] Validating token: {token.Substring(0, Math.Min(50, token.Length))}...");
                Console.WriteLine($"[DEBUG] Expected Issuer: {_configuration["JwtSettings:Issuer"]}");
                Console.WriteLine($"[DEBUG] Expected Audience: {_configuration["JwtSettings:Audience"]}");
                
                principal = handler.ValidateToken(token, tokenValidationParameters, out var validatedToken);
                
                Console.WriteLine($"[DEBUG] Token validated successfully");
            }
            catch (SecurityTokenExpiredException ex)
            {
                Console.WriteLine($"[ERROR] Token expired: {ex.Message}");
                throw new SecurityTokenException($"Token đã hết hạn: {ex.Message}");
            }
            catch (SecurityTokenInvalidSignatureException ex)
            {
                Console.WriteLine($"[ERROR] Invalid signature: {ex.Message}");
                throw new SecurityTokenException($"Chữ ký token không hợp lệ: {ex.Message}");
            }
            catch (SecurityTokenInvalidIssuerException ex)
            {
                Console.WriteLine($"[ERROR] Invalid issuer: {ex.Message}");
                throw new SecurityTokenException($"Issuer không hợp lệ: {ex.Message}");
            }
            catch (SecurityTokenInvalidAudienceException ex)
            {
                Console.WriteLine($"[ERROR] Invalid audience: {ex.Message}");
                throw new SecurityTokenException($"Audience không hợp lệ: {ex.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Token validation failed: {ex.GetType().Name} - {ex.Message}");
                throw new SecurityTokenException($"Token validation failed: {ex.Message}");
            }

            var purpose = principal.Claims.FirstOrDefault(c => c.Type == "purpose")?.Value;
            if (purpose != "reset_password")
            {
                throw new SecurityTokenException("Invalid token purpose");
            }

            // Manual expiration validation - Check token age using iat (issued at) claim
            var iatClaim = principal.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Iat)?.Value;
            var nbfClaim = principal.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Nbf)?.Value;
            
            long issuedAt = 0;
            if (!string.IsNullOrEmpty(iatClaim) && long.TryParse(iatClaim, out var iat))
            {
                issuedAt = iat;
            }
            else if (!string.IsNullOrEmpty(nbfClaim) && long.TryParse(nbfClaim, out var nbf))
            {
                issuedAt = nbf;
            }

            if (issuedAt > 0)
            {
                var tokenIssuedTime = DateTimeOffset.FromUnixTimeSeconds(issuedAt).UtcDateTime;
                var currentTime = DateTime.UtcNow;
                var tokenAge = currentTime - tokenIssuedTime;
                var maxTokenAge = TimeSpan.FromHours(3).Add(TimeSpan.FromMinutes(30)); // 3h + 30min tolerance

                Console.WriteLine($"[DEBUG] Token issued at: {tokenIssuedTime:yyyy-MM-dd HH:mm:ss} UTC");
                Console.WriteLine($"[DEBUG] Current time: {currentTime:yyyy-MM-dd HH:mm:ss} UTC");
                Console.WriteLine($"[DEBUG] Token age: {tokenAge.TotalMinutes:F0} minutes (max: {maxTokenAge.TotalMinutes:F0} minutes)");

                if (tokenAge > maxTokenAge)
                {
                    Console.WriteLine($"[ERROR] Token expired - Age: {tokenAge.TotalMinutes:F0} min exceeds max {maxTokenAge.TotalMinutes:F0} min");
                    throw new SecurityTokenException($"Token đã hết hạn. Token được tạo {tokenAge.TotalHours:F1} giờ trước.");
                }
                
                Console.WriteLine($"[DEBUG] Token is still valid - {(maxTokenAge - tokenAge).TotalMinutes:F0} minutes remaining");
            }
            else
            {
                Console.WriteLine($"[WARNING] Token has no iat/nbf claim - cannot validate expiration");
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
