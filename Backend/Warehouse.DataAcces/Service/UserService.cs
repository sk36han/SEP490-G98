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
	}
}