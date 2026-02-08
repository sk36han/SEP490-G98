using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class InventoryTransaction
{
    public long InventoryTxnId { get; set; }

    public string TxnType { get; set; } = null!;

    public DateTime TxnDate { get; set; }

    public int WarehouseId { get; set; }

    public string ReferenceType { get; set; } = null!;

    public long ReferenceId { get; set; }

    public string Status { get; set; } = null!;

    public long? PostedBy { get; set; }

    public DateTime? PostedAt { get; set; }

    public virtual ICollection<InventoryTransactionLine> InventoryTransactionLines { get; set; } = new List<InventoryTransactionLine>();

    public virtual User? PostedByNavigation { get; set; }

    public virtual Warehouse Warehouse { get; set; } = null!;
}
