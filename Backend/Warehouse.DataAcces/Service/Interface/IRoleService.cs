using System.Collections.Generic;
using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
	public interface IRoleService
	{
		Task<List<RoleResponse>> GetAllRolesAsync();
		Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request);
		Task<RoleResponse> UpdateRoleAsync(long roleId, UpdateRoleRequest request);
		Task<AdminUserResponse> AssignRoleToUserAsync(AssignRoleRequest request);
	}
}
