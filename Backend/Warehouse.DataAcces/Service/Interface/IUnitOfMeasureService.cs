using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IUnitOfMeasureService
    {
        Task<UnitOfMeasureResponse> CreateUnitOfMeasureAsync(CreateUnitOfMeasureRequest request, long currentUserId);
        
        Task<PagedResponse<UnitOfMeasureResponse>> GetUnitsOfMeasureAsync(
            int page,
            int pageSize,
            string? keyword,
            bool? isActive);
            
        Task<UnitOfMeasureResponse> GetUnitOfMeasureByIdAsync(long id);
        
        Task<UnitOfMeasureResponse> UpdateUnitOfMeasureAsync(long id, UpdateUnitOfMeasureRequest request, long currentUserId);
        
        Task<UnitOfMeasureResponse> ToggleUnitOfMeasureStatusAsync(long id, bool isActive, long currentUserId);
    }
}
