using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IPackagingSpecService
    {
        Task<IEnumerable<PackagingSpecResponse>> GetAllPackagingSpecsAsync();
        Task<PackagingSpecResponse> GetPackagingSpecByIdAsync(long specId);
        Task<PackagingSpecResponse> CreatePackagingSpecAsync(CreatePackagingSpecRequest request, long currentUserId);
        Task<PackagingSpecResponse> UpdatePackagingSpecAsync(long specId, UpdatePackagingSpecRequest request, long currentUserId);
        Task<PackagingSpecResponse> TogglePackagingSpecStatusAsync(long specId, bool isActive, long currentUserId);
      
    }
}
