using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IGoodsDeliveryNoteService
    {
        Task<PagedResponse<GoodsDeliveryNoteResponse>> GetGoodsDeliveryNotesAsync(int page, int pageSize);
        Task<GoodsDeliveryNoteResponse> CreateGDNAsync(long userId, CreateGDNRequest request);
        Task<GDNDetailResponse> GetGDNDetailAsync(long gdnId);
        Task<GoodsDeliveryNoteResponse> ApproveGDNAsync(long gdnId, long userId, ApproveGDNRequest request);
    }
}
