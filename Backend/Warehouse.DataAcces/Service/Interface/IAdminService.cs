using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Warehouse.Entities.ModelDto;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IAdminService
    {
        Task<PagedResult<UserDto>> GetUserListAsync(UserFilterRequest filter);
        Task<CreateUserResponse> CreateUserAccountAsync(CreateUserRequest request);
        Task<UserDto> UpdateUserAsync(long userId, UpdateUserRequest request);
        Task<UserDto> ToggleUserStatusAsync(long userId);
        Task<(byte[] content, string fileName)> ExportUserListExcelAsync();
    }
}
