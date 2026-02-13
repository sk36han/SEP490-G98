using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
	public class RoleService : GenericRepository<Role>, IRoleService
	{
		private readonly IConfiguration _configuration;
		public RoleService(Mkiwms4Context context, IConfiguration configuration) : base(context)
		{
			_configuration = configuration;
		}

		public async Task<List<RoleResponse>> GetAllRolesAsync()
		{
			return await _context.Roles
				.AsNoTracking()
				.Select(r => new RoleResponse
				{
					RoleId = r.RoleId,
					RoleCode = r.RoleCode,
					RoleName = r.RoleName
				})
				.ToListAsync();
		}

		public async Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request)
		{
			// Kiểm tra RoleCode đã tồn tại chưa
			var exists = await _context.Roles
				.AnyAsync(r => r.RoleCode == request.RoleCode);

			if (exists)
			{
				throw new InvalidOperationException("Mã role đã tồn tại.");
			}

			var role = new Role
			{
				RoleCode = request.RoleCode,
				RoleName = request.RoleName
			};

			_context.Roles.Add(role);
			await _context.SaveChangesAsync();

			return new RoleResponse
			{
				RoleId = role.RoleId,
				RoleCode = role.RoleCode,
				RoleName = role.RoleName
			};
		}

		public async Task<RoleResponse> UpdateRoleAsync(long roleId, UpdateRoleRequest request)
		{
			var role = await _context.Roles.FindAsync(roleId);
			if (role == null)
			{
				throw new KeyNotFoundException("Role không tồn tại.");
			}

			// Kiểm tra RoleCode trùng (trừ chính role đó)
			var codeExists = await _context.Roles
				.AnyAsync(r => r.RoleCode == request.RoleCode && r.RoleId != roleId);

			if (codeExists)
			{
				throw new InvalidOperationException("Mã role đã được sử dụng bởi role khác.");
			}

			role.RoleCode = request.RoleCode;
			role.RoleName = request.RoleName;

			await _context.SaveChangesAsync();

			return new RoleResponse
			{
				RoleId = role.RoleId,
				RoleCode = role.RoleCode,
				RoleName = role.RoleName
			};
		}

        public async Task<AdminUserResponse> AssignRoleToUserAsync(AssignRoleRequest request, long assignedBy)
        {
            // Kiểm tra user tồn tại
            var user = await _context.Users
                .Include(u => u.UserRoleUser)
                .FirstOrDefaultAsync(u => u.UserId == request.UserId);

            if (user == null)
            {
                throw new KeyNotFoundException("Người dùng không tồn tại.");
            }

            // Kiểm tra role tồn tại
            var role = await _context.Roles.FindAsync(request.RoleId);
            if (role == null)
            {
                throw new InvalidOperationException("Role không tồn tại.");
            }

            // Gán hoặc cập nhật role
            if (user.UserRoleUser != null)
            {
                user.UserRoleUser.RoleId = role.RoleId;
                user.UserRoleUser.AssignedAt = DateTime.UtcNow;
                user.UserRoleUser.AssignedBy = assignedBy;
            }
            else
            {
                var userRole = new UserRole
                {
                    UserId = user.UserId,
                    RoleId = role.RoleId,
                    AssignedAt = DateTime.UtcNow,
                    AssignedBy = assignedBy
                };
                _context.UserRoles.Add(userRole);
            }

			user.UpdatedAt = DateTime.UtcNow;
			await _context.SaveChangesAsync();

			return new AdminUserResponse
			{
				UserId = user.UserId,
				Username = user.Username,
				FullName = user.FullName,
				Email = user.Email,
				Phone = user.Phone,
				IsActive = user.IsActive,
				LastLoginAt = user.LastLoginAt,
				CreatedAt = user.CreatedAt,
				RoleName = role.RoleName
			};
		}
	}
}
