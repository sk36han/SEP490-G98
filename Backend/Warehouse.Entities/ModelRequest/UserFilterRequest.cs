using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Warehouse.Entities.ModelRequest
{
	public class UserFilterRequest
	{
		public string? SearchKeyword { get; set; }
		public long? RoleId { get; set; }          
		public bool? IsActive { get; set; }        

		
		public int PageNumber { get; set; } = 1;
		public int PageSize { get; set; } = 10;


		// true: A->Z | false: Z->A | null: Mặc định (Mới nhất)
		public bool? IsNameAscending { get; set; }
	}
}
