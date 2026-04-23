using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class StorageLocation
{
    public long LocationId { get; set; }

    public long WarehouseId { get; set; }

    public string LocationCode { get; set; } = null!;

    public string? LocationName { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<InventoryLot> InventoryLots { get; set; } = new List<InventoryLot>();

    public virtual Warehouse Warehouse { get; set; } = null!;
}
