using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Warehouse.Entities.ModelResponse
{
	public class CreateUserResponse
	{
		public long UserId { get; set; }
		public string Email { get; set; } = null!;
		public string FullName { get; set; } = null!;
		public string? Phone { get; set; }
		public string GeneratedPassword { get; set; } = null!;
		public string? RoleName { get; set; }
		public DateTime CreatedAt { get; set; }
	}
}
