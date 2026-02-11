using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Warehouse.Entities.ModelRequest
{
	public class CreateUserRequest
	{
		[Required(ErrorMessage = "Email là bắt buộc.")]
		[EmailAddress(ErrorMessage = "Email không hợp lệ.")]
		public string Email { get; set; } = null!;

		[Required(ErrorMessage = "Họ tên là bắt buộc.")]
		[StringLength(100, ErrorMessage = "Họ tên không được vượt quá 100 ký tự.")]
		public string FullName { get; set; } = null!;

		[Required(ErrorMessage = "Role là bắt buộc.")]
		public long RoleId { get; set; }
	}
}
