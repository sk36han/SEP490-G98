using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IGoodsDeliveryNoteService
    {
        Task<PagedResponse<GoodsDeliveryNoteResponse>> GetGoodsDeliveryNotesAsync(GDNListRequest request);
        Task<GoodsDeliveryNoteResponse> CreateGDNAsync(long userId, CreateGDNRequest request);
        Task<GoodsDeliveryNoteResponse> UpdateGDNAsync(long gdnId, long userId, CreateGDNRequest request);
        Task<bool> CancelGDNAsync(long gdnId, long userId, string reason);
        Task<GDNDetailResponse> GetGDNDetailAsync(long gdnId);
        Task<GoodsDeliveryNoteResponse> ApproveGDNAsync(long gdnId, long userId, ApproveGDNRequest request);
        Task<GoodsDeliveryNoteResponse> IssueGDNAsync(long gdnId, long userId, WarehouseIssueRequest request);
        Task<GoodsDeliveryNoteResponse> ConfirmDeliveryAsync(long gdnId, long userId, IFormFile evidenceFile, string note);
    }
}
