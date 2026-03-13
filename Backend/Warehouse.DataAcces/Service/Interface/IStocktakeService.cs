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
    }
}
