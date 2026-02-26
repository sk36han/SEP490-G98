using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
	public class NotificationService : GenericRepository<Notification>, INotificationService
	{
		public NotificationService(Mkiwms4Context context) : base(context)
		{
		}

		public async Task CreateAsync(long userId, string title, string message, string? refType = null, long? refId = null)
		{
			var notification = new Notification
			{
				UserId = userId,
				Title = title,
				Message = message,
				RefType = refType,
				RefId = refId,
				IsRead = false,
				CreatedAt = DateTime.UtcNow
			};

			_context.Notifications.Add(notification);
			await _context.SaveChangesAsync();
		}

		public async Task<List<NotificationResponse>> GetByUserAsync(long userId)
		{
			return await _context.Notifications
				.Where(x => x.UserId == userId)
				.OrderByDescending(x => x.CreatedAt)
				.Select(x => new NotificationResponse
				{
					NotificationId = x.NotificationId,
					Title = x.Title,
					Message = x.Message,
					IsRead = x.IsRead,
					CreatedAt = x.CreatedAt
				})
				.ToListAsync();
		}

		public async Task<int> GetUnreadCountAsync(long userId)
		{
			return await _context.Notifications
				.CountAsync(x => x.UserId == userId && !x.IsRead);
		}

		public async Task MarkAsReadAsync(long notificationId, long userId)
		{
			var noti = await _context.Notifications
				.FirstOrDefaultAsync(x => x.NotificationId == notificationId && x.UserId == userId);

			if (noti == null)
			{
				throw new KeyNotFoundException("Không tìm thấy thông báo.");
			}

			if (!noti.IsRead)
			{
				noti.IsRead = true;
				noti.ReadAt = DateTime.UtcNow;
				await _context.SaveChangesAsync();
			}
		}

		public async Task MarkAllAsReadAsync(long userId)
		{
			var notifications = await _context.Notifications
				.Where(x => x.UserId == userId && !x.IsRead)
				.ToListAsync();

			foreach (var item in notifications)
			{
				item.IsRead = true;
				item.ReadAt = DateTime.UtcNow;
			}

			await _context.SaveChangesAsync();
		}

		public async Task CreateForRolesAsync(IEnumerable<string> roleCodes, string title, string message, string? refType = null, long? refId = null, long? excludeUserId = null)
		{
			var roleCodeList = roleCodes.ToList();

			// Lấy danh sách userId có role nằm trong danh sách target
			var userIds = await _context.UserRoles
				.Include(ur => ur.Role)
				.Where(ur => roleCodeList.Contains(ur.Role.RoleCode))
				.Select(ur => ur.UserId)
				.Distinct()
				.ToListAsync();

			// Loại bỏ người thực hiện hành động để không tự gửi thông báo cho chính mình
			if (excludeUserId.HasValue)
			{
				userIds.Remove(excludeUserId.Value);
			}

			if (!userIds.Any()) return;

			// Tạo notification cho từng user
			var now = DateTime.UtcNow;
			foreach (var userId in userIds)
			{
				_context.Notifications.Add(new Notification
				{
					UserId = userId,
					Title = title,
					Message = message,
					RefType = refType,
					RefId = refId,
					IsRead = false,
					CreatedAt = now
				});
			}

			await _context.SaveChangesAsync();
		}
	}
}
