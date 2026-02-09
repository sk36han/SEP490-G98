using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class StocktakeSession
{
    public long StocktakeId { get; set; }

    public string StocktakeCode { get; set; } = null!;

    public long WarehouseId { get; set; }

    public string Mode { get; set; } = null!;

    public DateTime? PlannedAt { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? EndedAt { get; set; }

    public long CreatedBy { get; set; }

    public string Status { get; set; } = null!;

    public string? Note { get; set; }

    public virtual User CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<InventoryAdjustmentRequest> InventoryAdjustmentRequests { get; set; } = new List<InventoryAdjustmentRequest>();

    public virtual ICollection<StocktakeLine> StocktakeLines { get; set; } = new List<StocktakeLine>();

    public virtual Warehouse Warehouse { get; set; } = null!;
}
