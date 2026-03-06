using Warehouse.Entities.ModelRequest;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IItemParameterValueService
    {
        Task<object> CreateItemParameterValueAsync(CreateItemParameterValueRequest request, long currentUserId);
        Task<object> GetItemParameterValuesByItemIdAsync(long itemId);
        Task<object> GetItemParameterValueByIdAsync(long id);
        Task<object> UpdateItemParameterValueAsync(long id, UpdateItemParameterValueRequest request, long currentUserId);
        Task<object> DeleteItemParameterValueAsync(long id, long currentUserId);
    }
}
