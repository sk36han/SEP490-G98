using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IStocktakePlanService
    {
        Task<StocktakeDetailResponse> CreateStocktakePlanAsync(CreateStocktakeDraftRequest request, long currentUserId);
        Task<StocktakeDetailResponse> SubmitStocktakePlanAsync(long stocktakeId, long currentUserId);
        Task<StocktakeDetailResponse> ApproveStocktakePlanAsync(long stocktakeId, StocktakeApprovalRequest request, long currentUserId);
        Task<StocktakeDetailResponse> CancelStocktakeAsync(long stocktakeId, string reason, long currentUserId);
        Task<PagedResponse<StocktakeSummaryResponse>> ListAllStocktakePlansAsync(StocktakeListRequest request);
    }
}
