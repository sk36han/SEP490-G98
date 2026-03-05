using Warehouse.Entities.ModelResponse;

namespace Warehouse.Entities.ModelResponse
{
    public class SupplierTransactionUnifiedResponse
    {
        public SupplierTransactionSummaryDto? Summary { get; set; }
        public PagedResponse<SupplierTransactionDto>? History { get; set; }
        public object? Detail { get; set; } // Header + Lines detail
    }
}
