using System.Collections.Generic;
using System.Threading.Tasks;
using Warehouse.Entities.ModelDto;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
	public interface IRoleService
	{
		Task<List<RoleDto>> GetAllRolesAsync();
		Task<RoleDto> CreateRoleAsync(CreateRoleRequest request);
		Task<RoleDto> UpdateRoleAsync(long roleId, UpdateRoleRequest request);
		Task<UserDto> AssignRoleToUserAsync(AssignRoleRequest request);
	}
}
