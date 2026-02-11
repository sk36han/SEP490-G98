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
		Task<PagedResult<UserDto>> GetUserListAsync(UserFilterRequest filter);
		Task<CreateUserResponse> CreateUserAccountAsync(CreateUserRequest request);
		Task<UserDto> UpdateUserAsync(long userId, UpdateUserRequest request);
		Task<UserDto> ToggleUserStatusAsync(long userId);
	}
}
