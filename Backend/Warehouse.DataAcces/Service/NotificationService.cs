using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
	public class NotificationService : GenericRepository<Notification>, INotificationService
	{
		public NotificationService(Mkiwms5Context context) : base(context)
		{
		}

		public async Task CreateAsync(long userId, string title, string message, string? refType = null, long? refId = null, string? type = null, byte severity = 0, DateTime? expiresAt = null)
		{
			var notification = new Notification
			{
				UserId = userId,
				Title = title,
				Message = message,
				RefType = refType,
				RefId = refId,
				IsRead = false,
				CreatedAt = DateTime.UtcNow,
				Type = type,
				Severity = severity,
				IsDeleted = false,
				ExpiresAt = expiresAt
			};

			_context.Notifications.Add(notification);
			await _context.SaveChangesAsync();
		}

		public async Task<PagedResponse<NotificationResponse>> GetByUserAsync(long userId, NotificationFilterRequest filter)
		{
			var query = _context.Notifications
				.AsNoTracking()
				.Where(x => x.UserId == userId && !x.IsDeleted);

			// === Filter ===
			if (!string.IsNullOrWhiteSpace(filter.Type))
				query = query.Where(x => x.Type == filter.Type);

			if (filter.Severity.HasValue)
				query = query.Where(x => x.Severity == filter.Severity.Value);

			if (filter.IsRead.HasValue)
				query = query.Where(x => x.IsRead == filter.IsRead.Value);

			if (filter.FromDate.HasValue)
				query = query.Where(x => x.CreatedAt >= filter.FromDate.Value);

			if (filter.ToDate.HasValue)
				query = query.Where(x => x.CreatedAt <= filter.ToDate.Value);

			// === Tổng số sau khi filter ===
			var totalItems = await query.CountAsync();

			// === Sắp xếp + Phân trang ===
			var items = await query
				.OrderByDescending(x => x.CreatedAt)
				.Skip((filter.PageNumber - 1) * filter.PageSize)
				.Take(filter.PageSize)
				.Select(x => new NotificationResponse
				{
					NotificationId = x.NotificationId,
					Title = x.Title,
					Message = x.Message,
					IsRead = x.IsRead,
					CreatedAt = x.CreatedAt,
					Type = x.Type,
					Severity = x.Severity,
					IsDeleted = x.IsDeleted,
					ExpiresAt = x.ExpiresAt
				})
				.ToListAsync();

			return new PagedResponse<NotificationResponse>
			{
				Page = filter.PageNumber,
				PageSize = filter.PageSize,
				TotalItems = totalItems,
				Items = items
			};
		}

		public async Task<int> GetUnreadCountAsync(long userId)
		{
			return await _context.Notifications
				.CountAsync(x => x.UserId == userId && !x.IsRead && !x.IsDeleted);
		}

		public async Task MarkAsReadAsync(long notificationId, long userId)
		{
			var noti = await _context.Notifications
				.FirstOrDefaultAsync(x => x.NotificationId == notificationId && x.UserId == userId && !x.IsDeleted);

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
				.Where(x => x.UserId == userId && !x.IsRead && !x.IsDeleted)
				.ToListAsync();

			foreach (var item in notifications)
			{
				item.IsRead = true;
				item.ReadAt = DateTime.UtcNow;
			}

			await _context.SaveChangesAsync();
		}

		public async Task CreateForRolesAsync(IEnumerable<string> roleCodes, string title, string message, string? refType = null, long? refId = null, long? excludeUserId = null, string? type = null, byte severity = 0, DateTime? expiresAt = null)
		{
			var roleCodeList = roleCodes.ToList();

			var userIds = await _context.UserRoles
				.Include(ur => ur.Role)
				.Where(ur => roleCodeList.Contains(ur.Role.RoleCode))
				.Select(ur => ur.UserId)
				.Distinct()
				.ToListAsync();

			if (excludeUserId.HasValue)
			{
				userIds.Remove(excludeUserId.Value);
			}

			if (!userIds.Any()) return;

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
					CreatedAt = now,
					Type = type,
					Severity = severity,
					IsDeleted = false,
					ExpiresAt = expiresAt
				});
			}

			await _context.SaveChangesAsync();
		}

		public async Task SoftDeleteAsync(long notificationId, long userId)
		{
			var noti = await _context.Notifications
				.FirstOrDefaultAsync(x => x.NotificationId == notificationId && x.UserId == userId && !x.IsDeleted);

			if (noti == null)
			{
				throw new KeyNotFoundException("Không tìm thấy thông báo.");
			}

			noti.IsDeleted = true;
			await _context.SaveChangesAsync();
		}

		public async Task SoftDeleteAllAsync(long userId)
		{
			var notifications = await _context.Notifications
				.Where(x => x.UserId == userId && !x.IsDeleted)
				.ToListAsync();

			foreach (var item in notifications)
			{
				item.IsDeleted = true;
			}

			await _context.SaveChangesAsync();
		}
	}
}
