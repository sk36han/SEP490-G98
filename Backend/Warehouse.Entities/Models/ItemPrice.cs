using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class ItemPrice
{
    public long ItemPriceId { get; set; }

    public long ItemId { get; set; }

    public string PriceType { get; set; } = null!;

    public decimal Amount { get; set; }

    public string? Currency { get; set; }

    public DateOnly EffectiveFrom { get; set; }

    public DateOnly? EffectiveTo { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Item Item { get; set; } = null!;
}
