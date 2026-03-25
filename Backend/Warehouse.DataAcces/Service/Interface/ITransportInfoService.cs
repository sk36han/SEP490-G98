using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface ITransportInfoService
    {
        Task<PagedResponse<TransportInfoResponse>> GetTransportInfosAsync(FilterTransportInfoRequest request);
        Task<TransportInfoResponse> GetTransportInfoByIdAsync(long id);
        Task<TransportInfoResponse> GetTransportInfoByGdnIdAsync(long gdnId);
        Task<TransportInfoResponse> CreateTransportInfoAsync(CreateTransportInfoRequest request, long currentUserId);
        Task<TransportInfoResponse> UpdateTransportInfoAsync(long id, UpdateTransportInfoRequest request, long currentUserId);
    }
}
