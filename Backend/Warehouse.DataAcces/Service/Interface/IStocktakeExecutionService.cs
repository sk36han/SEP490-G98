using System.Collections.Generic;
using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IStocktakeExecutionService
    {
        Task<StocktakeDetailResponse> StartStocktakeExecutionAsync(long stocktakeId, long currentUserId);
        Task<PagedResponse<StocktakeLineResponse>> GetStocktakeLinesAsync(long stocktakeId, StocktakeLineFilterRequest request);
        Task<StocktakeLineResponse> UpdateActualCountedQtyAsync(long lineId, UpdateCountedQtyRequest request);
        Task<StocktakeDetailResponse> BulkMatchSystemQtyAsync(long stocktakeId, long currentUserId);
        Task<StocktakeDetailResponse> SubmitStocktakeResultsAsync(long stocktakeId, long currentUserId);
        Task<List<AdjustmentPreviewResponse>> GetAdjustmentPreviewAsync(long stocktakeId);
        Task<StocktakeDetailResponse> ApproveAndFinalizeResultsAsync(long stocktakeId, StocktakeApprovalRequest request, long currentUserId);
        Task<StocktakeDetailResponse> CancelStocktakeAsync(long stocktakeId, string reason, long currentUserId);
        Task<List<StocktakeApprovalHistoryResponse>> GetApprovalHistoryAsync(long stocktakeId);
        Task<PagedResponse<StocktakeSummaryResponse>> ListAllCompletedStocktakesAsync(StocktakeListRequest request);
        Task<StocktakeSheetResponse> GetStocktakeSheetDataAsync(long stocktakeId);
    }
}
