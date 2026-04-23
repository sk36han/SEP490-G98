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
            bool? isActive,
            bool? hasStock,
            string? itemCode,
            decimal? minQty,
            decimal? maxQty);

        Task<PagedResponse<LocationLedgerEntryResponse>> GetLocationLedgerAsync(
            long locationId,
            int page,
            int pageSize);

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
