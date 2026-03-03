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

        /// <summary>
        /// Lấy thông tin chi tiết người nhận (Get Receiver By ID)
        /// </summary>
        Task<ReceiverResponse> GetReceiverByIdAsync(long id);

        /// <summary>
        /// Xem lịch sử giao dịch của người nhận (View Transaction History)
        /// </summary>
        Task<ReceiverTransactionUnifiedResponse> GetReceiverTransactionsAsync(
            long receiverId,
            int page,
            int pageSize,
            string? transactionType,
            string? status,
            DateTime? fromDate,
            DateTime? toDate,
            string? detailType,
            long? detailDocId);
    }
}
