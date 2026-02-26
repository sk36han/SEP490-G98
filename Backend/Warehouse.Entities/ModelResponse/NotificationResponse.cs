using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Warehouse.Entities.ModelResponse
{
	public class NotificationResponse
	{
		public long NotificationId { get; set; }
		public string Title { get; set; } = null!;
		public string Message { get; set; } = null!;
		public bool IsRead { get; set; }
		public DateTime CreatedAt { get; set; }
	}
}
