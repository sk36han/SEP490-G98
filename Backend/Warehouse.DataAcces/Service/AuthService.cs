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

namespace Warehouse.DataAcces.Service
{
    public class  AuthService : GenericRepository<User>, IAuthService
    {
        private readonly IConfiguration _configuration;
        public AuthService(Mkiwms3Context context, IConfiguration configuration) : base(context)
        {
            _configuration = configuration;
        }

        public Task<(string accessToken, DateTime expiresAt, string refreshToken)> IssueTokensAsync(User user, bool rememberMe)
        {
            throw new NotImplementedException();

        }

        public Task ResetPasswordAsync(string token, string newPassword)
        {
            throw new NotImplementedException();
        }

        public Task SendResetPasswordEmailAsync(string email)
        {
            throw new NotImplementedException();
        }

        public Task<User?> ValidateLoginAsync(string identifier, string password)
        {
            throw new NotImplementedException();
        }
    }
}
