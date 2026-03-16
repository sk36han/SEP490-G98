using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IGoodsReceiptNoteService
    {
        Task<PagedResponse<GoodsReceiptNoteResponse>> GetGoodsReceiptNotesAsync(int page, int pageSize);
        Task<GoodsReceiptNoteResponse> CreateGRNAsync(long userId, CreateGRNRequest request);
        Task<GoodsReceiptNoteResponse> ApproveGRNAsync(long grnId, long userId, ApproveGRNRequest request);
        Task<GRNDetailResponse> GetGRNDetailAsync(long grnId);
    }
}
