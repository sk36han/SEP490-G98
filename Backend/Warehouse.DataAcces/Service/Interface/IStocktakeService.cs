using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IStocktakeService
    {
        Task<PagedResponse<StocktakeSummaryResponse>> GetStocktakesAsync(StocktakeListRequest request);
        Task<StocktakeDetailResponse?> GetStocktakeDetailAsync(long stocktakeId);
        Task<StocktakeDetailResponse> CreateDraftAsync(CreateStocktakeDraftRequest request, long currentUserId);
        Task<StocktakeDetailResponse> StartStocktakeAsync(long stocktakeId, long currentUserId);
        Task<bool> IsWarehouseFrozenAsync(long warehouseId);

        // Giai đoạn 2: Counting
        Task<PagedResponse<StocktakeLineResponse>> GetStocktakeLinesAsync(long stocktakeId, StocktakeLineFilterRequest request);
        Task<StocktakeLineResponse> UpdateCountedQtyAsync(long lineId, UpdateCountedQtyRequest request);
        Task<StocktakeDetailResponse> BulkMatchSystemQtyAsync(long stocktakeId, long currentUserId);
        Task<StocktakeDetailResponse> SubmitStocktakeAsync(long stocktakeId, long currentUserId);
    }
}
