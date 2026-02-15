using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IWarehouseService
    {
        Task<PagedResult<WarehouseResponse>> GetWarehouseListAsync(FilterRequest filter);
        Task<WarehouseResponse> CreateWarehouseAsync(CreateWarehouseRequest request);
        Task<WarehouseResponse> ToggleWarehouseStatusAsync(long id);
    }
}
