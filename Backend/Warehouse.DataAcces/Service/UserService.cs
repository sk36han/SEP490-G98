using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
	public class UserService : IUserService
	{
		private readonly Mkiwms4Context _context;

		public UserService(Mkiwms4Context context)
		{
			_context = context;
		}

		public async Task<PagedResult<UserDto>> GetUserListAsync(UserFilterRequest filter)
		{
			
			var query = _context.Users
				.Include(u => u.UserRoleUser)
				.ThenInclude(ur => ur.Role)
				.AsNoTracking();

			
			query = ApplyFilters(query, filter);
			query = ApplySearch(query, filter.SearchKeyword);
			query = ApplySorting(query, filter.IsNameAscending);

			
			int totalCount = await query.CountAsync();

			
			var items = await query
				.Skip((filter.PageNumber - 1) * filter.PageSize)
				.Take(filter.PageSize)
				.Select(u => new UserDto
				{
					UserId = u.UserId,
					Username = u.Username,
					FullName = u.FullName,
					Email = u.Email,
					Phone = u.Phone,
					IsActive = u.IsActive,
					LastLoginAt = u.LastLoginAt,
					CreatedAt = u.CreatedAt,
					RoleName = (u.UserRoleUser != null && u.UserRoleUser.Role != null)
							   ? u.UserRoleUser.Role.RoleName : "N/A"
				})
				.ToListAsync();

			
			return new PagedResult<UserDto>(items, totalCount, filter.PageNumber, filter.PageSize);
		}

		

		private IQueryable<User> ApplyFilters(IQueryable<User> query, UserFilterRequest filter)
		{
			if (filter.IsActive.HasValue)
				query = query.Where(u => u.IsActive == filter.IsActive.Value);

			if (filter.RoleId.HasValue)
				query = query.Where(u => u.UserRoleUser != null && u.UserRoleUser.RoleId == filter.RoleId);

			return query;
		}

		private IQueryable<User> ApplySearch(IQueryable<User> query, string? keyword)
		{
			if (string.IsNullOrWhiteSpace(keyword)) return query;

			string key = keyword.Trim().ToLower();

			
			if (long.TryParse(key, out long searchId))
			{
				return query.Where(u => u.UserId == searchId || (u.Phone != null && u.Phone.Contains(key)));
			}

			
			return query.Where(u =>
				(u.Username != null && u.Username.ToLower().Contains(key)) ||
				(u.Email != null && u.Email.ToLower().Contains(key)) ||
				(u.FullName != null && u.FullName.ToLower().Contains(key))
			);
		}

		private IQueryable<User> ApplySorting(IQueryable<User> query, bool? isNameAscending)
		{
			if (isNameAscending.HasValue)
			{
				return isNameAscending.Value
					? query.OrderBy(u => u.FullName)
					: query.OrderByDescending(u => u.FullName);
			}
			
			return query.OrderByDescending(u => u.UserId);
		}
	}
}