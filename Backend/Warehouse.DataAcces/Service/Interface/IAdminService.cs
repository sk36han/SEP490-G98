using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IAdminService
    {
        Task<PagedResult<AdminUserResponse>> GetUserListAsync(UserFilterRequest filter);
        Task<CreateUserResponse> CreateUserAccountAsync(CreateUserRequest request);
        Task<AdminUserResponse> UpdateUserAsync(long userId, UpdateUserRequest request);
        Task<AdminUserResponse> ToggleUserStatusAsync(long userId);
    }
}
