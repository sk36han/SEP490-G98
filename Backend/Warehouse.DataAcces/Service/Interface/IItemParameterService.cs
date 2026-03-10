using Warehouse.Entities.ModelRequest;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IItemParameterService
    {
        Task<object> CreateItemParameterAsync(CreateItemParameterRequest request, long currentUserId);
        Task<object> GetItemParametersAsync(int page, int pageSize, string? paramName, bool? isActive);
        Task<object> GetItemParameterByIdAsync(long id);
        Task<object> UpdateItemParameterAsync(long id, UpdateItemParameterRequest request, long currentUserId);
        Task<object> ToggleItemParameterStatusAsync(long id, bool isActive);
    }
}
