using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IReceiverService
    {
        Task<PagedResponse<ReceiverResponse>> GetReceiversAsync(
            int page,
            int pageSize,
            string? receiverCode,
            string? receiverName,
            bool? isActive,
            DateTime? fromDate,
            DateTime? toDate
        );

        Task<ReceiverResponse> CreateReceiverAsync(CreateReceiverRequest request);

        Task<ReceiverResponse> UpdateReceiverAsync(long id, UpdateReceiverRequest request);

        Task<ReceiverResponse> ToggleReceiverStatusAsync(long id, bool isActive);
    }
}
