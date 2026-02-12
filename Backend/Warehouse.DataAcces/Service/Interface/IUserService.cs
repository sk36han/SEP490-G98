using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelDto;



namespace Warehouse.DataAcces.Service.Interface
{
	public interface IUserService
	{
		
		Task<UserResponse?> GetUserProfileAsync(long userId);

	}
}
