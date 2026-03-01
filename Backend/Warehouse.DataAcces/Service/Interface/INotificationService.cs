using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service.Interface
{
	public interface INotificationService
	{
		Task CreateAsync(long userId, string title, string message, string? refType = null, long? refId = null, string? type = null, byte severity = 0, DateTime? expiresAt = null);

		Task<PagedResponse<NotificationResponse>> GetByUserAsync(long userId, NotificationFilterRequest filter);

		Task<int> GetUnreadCountAsync(long userId);

		Task MarkAsReadAsync(long notificationId, long userId);

		Task MarkAllAsReadAsync(long userId);

		Task CreateForRolesAsync(IEnumerable<string> roleCodes, string title, string message, string? refType = null, long? refId = null, long? excludeUserId = null, string? type = null, byte severity = 0, DateTime? expiresAt = null);

		Task SoftDeleteAsync(long notificationId, long userId);

		Task SoftDeleteAllAsync(long userId);
	}
}
