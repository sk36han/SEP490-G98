using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class Item
{
    public long ItemId { get; set; }

    public string ItemCode { get; set; } = null!;

    public string ItemName { get; set; } = null!;

    public string? ItemType { get; set; }

    public string? Description { get; set; }

    public int? CategoryId { get; set; }

    public int? BrandId { get; set; }

    public int BaseUomId { get; set; }

    public int? PackagingSpecId { get; set; }

    public bool RequiresCo { get; set; }

    public bool RequiresCq { get; set; }

    public bool IsActive { get; set; }

    public int? DefaultWarehouseId { get; set; }

    public string? InventoryAccount { get; set; }

    public string? RevenueAccount { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual UnitOfMeasure BaseUom { get; set; } = null!;

    public virtual Brand? Brand { get; set; }

    public virtual ItemCategory? Category { get; set; }

    public virtual Warehouse? DefaultWarehouse { get; set; }

    public virtual ICollection<GoodsDeliveryNoteLine> GoodsDeliveryNoteLines { get; set; } = new List<GoodsDeliveryNoteLine>();

    public virtual ICollection<GoodsReceiptNoteLine> GoodsReceiptNoteLines { get; set; } = new List<GoodsReceiptNoteLine>();

    public virtual ICollection<InventoryAdjustmentLine> InventoryAdjustmentLines { get; set; } = new List<InventoryAdjustmentLine>();

    public virtual ICollection<InventoryOnHand> InventoryOnHands { get; set; } = new List<InventoryOnHand>();

    public virtual ICollection<InventoryTransactionLine> InventoryTransactionLines { get; set; } = new List<InventoryTransactionLine>();

    public virtual ICollection<ItemParameterValue> ItemParameterValues { get; set; } = new List<ItemParameterValue>();

    public virtual ICollection<ItemPrice> ItemPrices { get; set; } = new List<ItemPrice>();

    public virtual ICollection<ItemWarehousePolicy> ItemWarehousePolicies { get; set; } = new List<ItemWarehousePolicy>();

    public virtual PackagingSpec? PackagingSpec { get; set; }

    public virtual ICollection<PurchaseOrderLine> PurchaseOrderLines { get; set; } = new List<PurchaseOrderLine>();

    public virtual ICollection<ReleaseRequestLine> ReleaseRequestLines { get; set; } = new List<ReleaseRequestLine>();

    public virtual ICollection<StocktakeLine> StocktakeLines { get; set; } = new List<StocktakeLine>();
}
