using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
	public class CreateRoleRequest
	{
		[Required(ErrorMessage = "Mã role là bắt buộc.")]
		[StringLength(50, ErrorMessage = "Mã role không được vượt quá 50 ký tự.")]
		public string RoleCode { get; set; } = null!;

		[Required(ErrorMessage = "Tên role là bắt buộc.")]
		[StringLength(100, ErrorMessage = "Tên role không được vượt quá 100 ký tự.")]
		public string RoleName { get; set; } = null!;
	}
}
