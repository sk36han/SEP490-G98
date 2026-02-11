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
                new Claim(ClaimTypes.Name, user.FullName , ClaimTypes.Role),
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

        public Task SendResetPasswordEmailAsync(string email)
        {
            // TODO: Implement email sending logic
            throw new NotImplementedException("Password reset email functionality not yet implemented");
        }

        public Task ResetPasswordAsync(string token, string newPassword)
        {
            // TODO: Implement password reset logic
            throw new NotImplementedException("Password reset functionality not yet implemented");
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
