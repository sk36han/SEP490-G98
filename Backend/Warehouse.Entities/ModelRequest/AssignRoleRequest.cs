using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
	public class AssignRoleRequest
	{
		[Required(ErrorMessage = "UserId là bắt buộc.")]
		public long UserId { get; set; }

		[Required(ErrorMessage = "RoleId là bắt buộc.")]
		public long RoleId { get; set; }
	}
}
