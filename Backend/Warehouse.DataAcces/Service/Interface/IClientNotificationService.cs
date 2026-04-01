using System.Threading.Tasks;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
	public interface IClientNotificationService
	{
		Task SendNotificationAsync(long userId, NotificationResponse notification);
	}
}
