using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IPurchaseReturnNoteService
    {
        Task<PurchaseReturnNoteResponse> CreatePRNAsync(long userId, CreatePRNRequest request);
        Task<PagedResponse<PurchaseReturnNoteResponse>> GetPRNsAsync(int page, int pageSize);
        Task<PurchaseReturnNoteDetailResponse> GetPRNDetailAsync(long prnId);
        Task<PurchaseReturnNoteResponse> ApprovePRNAsync(long prnId, long userId);
        Task<PurchaseReturnNoteResponse> CancelPRNAsync(long prnId, long userId);
        Task<PurchaseReturnNoteResponse> RefundPRNAsync(long prnId, long userId, RefundPRNRequest request);
        Task<PurchaseReturnNoteDetailResponse> UpdatePRNAsync(long prnId, long userId, UpdatePRNRequest request);
    }
}