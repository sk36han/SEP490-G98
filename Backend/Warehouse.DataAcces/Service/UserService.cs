using Microsoft.EntityFrameworkCore;
using System;
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

		public async Task<(IEnumerable<UserDto> Data, int TotalCount)> GetUserListAsync(UserFilterRequest filter)
		{
			// 1. Khởi tạo Query
			var query = _context.Users
				.Include(u => u.UserRoleUser)
				.ThenInclude(ur => ur.Role)
				.AsNoTracking()
				.AsQueryable();

			// 2. Filter: Trạng thái
			if (filter.IsActive.HasValue)
			{
				query = query.Where(u => u.IsActive == filter.IsActive.Value);
			}

			// 3. Filter: Quyền hạn
			if (filter.RoleId.HasValue)
			{
				query = query.Where(u => u.UserRoleUser != null && u.UserRoleUser.RoleId == filter.RoleId);
			}

			// 4. Filter: Tìm kiếm thông minh (Smart Search)
			if (!string.IsNullOrEmpty(filter.SearchKeyword))
			{
				string key = filter.SearchKeyword.Trim().ToLower();

				// Kiểm tra xem có phải đang tìm số (ID/SĐT) không
				if (long.TryParse(key, out long searchId))
				{
					// Tìm chính xác UserId HOẶC Số điện thoại chứa số đó
					query = query.Where(u => u.UserId == searchId || (u.Phone != null && u.Phone.Contains(key)));
				}
				else
				{
					// Tìm theo Text (Username, Email, FullName)
					// Lưu ý: Cần check Username != null trước khi .ToLower() để tránh lỗi
					query = query.Where(u => (u.Username != null && u.Username.ToLower().Contains(key))
										  || u.Email.ToLower().Contains(key)
										  || u.FullName.ToLower().Contains(key));
				}
			}

			// 5. Tính tổng số bản ghi (trước khi phân trang)
			int totalCount = await query.CountAsync();

			// 6. Sắp xếp (Sorting) - Logic đơn giản hóa
			if (filter.IsNameAscending.HasValue)
			{
				if (filter.IsNameAscending.Value)
				{
					// True -> Tăng dần (A -> Z) theo Tên đầy đủ
					query = query.OrderBy(u => u.FullName);
				}
				else
				{
					// False -> Giảm dần (Z -> A) theo Tên đầy đủ
					query = query.OrderByDescending(u => u.FullName);
				}
			}
			else
			{
				// Null -> Mặc định: Người mới nhất lên đầu
				query = query.OrderByDescending(u => u.UserId);
			}

			// 7. Phân trang & Mapping dữ liệu
			var data = await query
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

					// Xử lý RoleName an toàn
					RoleName = (u.UserRoleUser != null && u.UserRoleUser.Role != null)
							   ? u.UserRoleUser.Role.RoleName
							   : "N/A"
				})
				.ToListAsync();

			return (data, totalCount);
		}
	}
}