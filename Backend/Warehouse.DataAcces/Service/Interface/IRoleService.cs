using System.Collections.Generic;
using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
	public interface IRoleService
	{
		Task<List<RoleResponse>> GetAllRolesAsync();
		Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request, long currentUserId);
		Task<RoleResponse> UpdateRoleAsync(long roleId, UpdateRoleRequest request, long currentUserId);
		Task<AdminUserResponse> AssignRoleToUserAsync(AssignRoleRequest request, long assignedBy);
	}
}
