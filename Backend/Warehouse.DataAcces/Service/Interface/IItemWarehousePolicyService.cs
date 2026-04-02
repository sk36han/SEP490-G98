using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface;

public interface IItemWarehousePolicyService
{
    Task<ItemWarehousePolicyListResponse> GetListAsync(ItemWarehousePolicyFilterRequest filter);
    Task<ItemWarehousePolicyResponse?> GetByIdAsync(long id);
    Task<ItemWarehousePolicyResponse> CreateAsync(CreateItemWarehousePolicyRequest request);
    Task<ItemWarehousePolicyResponse> UpdateAsync(long id, UpdateItemWarehousePolicyRequest request);
    Task DeleteAsync(long id);
}
