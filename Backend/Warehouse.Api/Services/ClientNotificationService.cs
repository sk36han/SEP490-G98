using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using Warehouse.Api.Hubs;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.Services
{
	public class ClientNotificationService : IClientNotificationService
	{
		private readonly IHubContext<NotificationHub> _hubContext;

		public ClientNotificationService(IHubContext<NotificationHub> hubContext)
		{
			_hubContext = hubContext;
		}

		public async Task SendNotificationAsync(long userId, NotificationResponse notification)
		{
			// SignalR uses the User property internally (ClaimTypes.NameIdentifier mappings by default)
			await _hubContext.Clients.User(userId.ToString()).SendAsync("ReceiveNotification", notification);
		}

		public async Task SendUnreadCountAsync(long userId, int count)
		{
			await _hubContext.Clients.User(userId.ToString()).SendAsync("UpdateUnreadCount", count);
		}
	}
}
