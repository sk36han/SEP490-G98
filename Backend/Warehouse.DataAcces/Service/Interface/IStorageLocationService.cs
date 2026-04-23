using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IStorageLocationService
    {
        Task<PagedResponse<StorageLocationResponse>> GetStorageLocationsAsync(
            int page,
            int pageSize,
            long? warehouseId,
            string? keyword,
            bool? isActive);

        Task<StorageLocationResponse> GetStorageLocationByIdAsync(long id);

        Task<StorageLocationResponse> CreateStorageLocationAsync(
            CreateStorageLocationRequest request,
            long currentUserId);

        Task<StorageLocationResponse> UpdateStorageLocationAsync(
            long id,
            UpdateStorageLocationRequest request,
            long currentUserId);

        Task<StorageLocationResponse> ToggleStorageLocationStatusAsync(
            long id,
            bool isActive,
            long currentUserId);
    }
}
