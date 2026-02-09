using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class Warehouse
{
    public int WarehouseId { get; set; }

    public string WarehouseCode { get; set; } = null!;

    public string WarehouseName { get; set; } = null!;

    public string? Address { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<GoodsDeliveryNote> GoodsDeliveryNotes { get; set; } = new List<GoodsDeliveryNote>();

    public virtual ICollection<GoodsReceiptNote> GoodsReceiptNotes { get; set; } = new List<GoodsReceiptNote>();

    public virtual ICollection<InventoryAdjustmentRequest> InventoryAdjustmentRequests { get; set; } = new List<InventoryAdjustmentRequest>();

    public virtual ICollection<InventoryOnHand> InventoryOnHands { get; set; } = new List<InventoryOnHand>();

    public virtual ICollection<InventoryTransaction> InventoryTransactions { get; set; } = new List<InventoryTransaction>();

    public virtual ICollection<ItemWarehousePolicy> ItemWarehousePolicies { get; set; } = new List<ItemWarehousePolicy>();

    public virtual ICollection<Item> Items { get; set; } = new List<Item>();

    public virtual ICollection<ReleaseRequest> ReleaseRequests { get; set; } = new List<ReleaseRequest>();

    public virtual ICollection<StocktakeSession> StocktakeSessions { get; set; } = new List<StocktakeSession>();
}
