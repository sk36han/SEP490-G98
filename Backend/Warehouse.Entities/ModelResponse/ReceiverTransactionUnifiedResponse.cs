using Warehouse.Entities.ModelResponse;

namespace Warehouse.Entities.ModelResponse
{
    public class ReceiverTransactionUnifiedResponse
    {
        public ReceiverTransactionSummaryDto? Summary { get; set; }
        public PagedResponse<ReceiverTransactionDto>? History { get; set; }
        public object? Detail { get; set; } // Header + Lines detail
    }
}
