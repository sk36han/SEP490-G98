using System.Collections.Generic;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IWarehouseService
    {
        Task<PagedResult<WarehouseResponse>> GetWarehouseListAsync(FilterRequest filter);
        Task<WarehouseResponse> CreateWarehouseAsync(CreateWarehouseRequest request, long currentUserId);
        Task<WarehouseResponse> UpdateWarehouseAsync(long id, UpdateWarehouseRequest request, long currentUserId);
        Task<WarehouseResponse> ToggleWarehouseStatusAsync(long id);
        /// <summary>Danh sách kho đối với dropdown (chỉ kho IsActive = true)</summary>
        Task<List<WarehouseDropdownItem>> GetWarehouseDropdownAsync();
    }
}
