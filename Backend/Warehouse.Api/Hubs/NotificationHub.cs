using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace Warehouse.Api.Hubs
{
	[Authorize]
	public class NotificationHub : Hub
	{
		// SignalR context will map NameIdentifier (UserId) to User connections automatically
		// So we don't strictly need methods here unless the client needs to interact with the hub explicitly
		
		public override async Task OnConnectedAsync()
		{
			await base.OnConnectedAsync();
		}

		public override async Task OnDisconnectedAsync(System.Exception? exception)
		{
			await base.OnDisconnectedAsync(exception);
		}
	}
}
