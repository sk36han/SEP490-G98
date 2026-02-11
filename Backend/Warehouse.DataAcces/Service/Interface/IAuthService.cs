using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Warehouse.DataAcces.Repositories;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IAuthService :IGenericRepository<User>
    {

        Task<User?> ValidateLoginAsync(string identifier, string password);
        Task<(string accessToken, DateTime expiresAt, string refreshToken)> IssueTokensAsync(User user, bool rememberMe);
        Task SendResetPasswordEmailAsync(string email);
        Task ResetPasswordAsync(string token, string newPassword);
		Task SendEmailUserAccountAsync(string toEmail, string subject, string body);
	}
}
