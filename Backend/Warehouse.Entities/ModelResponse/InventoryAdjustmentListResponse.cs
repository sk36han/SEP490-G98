using System.Collections.Generic;

namespace Warehouse.Entities.ModelResponse;

public class InventoryAdjustmentListResponse
{
    public InventoryAdjustmentListSummaryResponse Summary { get; set; } = null!;

    public IReadOnlyList<InventoryAdjustmentListItemResponse> Items { get; set; } = new List<InventoryAdjustmentListItemResponse>();
}
