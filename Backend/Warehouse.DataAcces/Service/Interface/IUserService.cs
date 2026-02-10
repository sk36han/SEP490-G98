using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.ModelRequest;



namespace Warehouse.DataAcces.Service.Interface
{
	public interface IUserService
	{
		Task<(IEnumerable<UserDto> Data, int TotalCount)> GetUserListAsync(UserFilterRequest filter);
	}
}
