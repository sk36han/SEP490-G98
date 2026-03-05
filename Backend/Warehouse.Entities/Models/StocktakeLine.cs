using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class StocktakeLine
{
    public long StocktakeLineId { get; set; }

    public long StocktakeId { get; set; }

    public long ItemId { get; set; }

    public decimal SystemQtySnapshot { get; set; }

    public decimal? CountedQty { get; set; }

    public decimal? VarianceQty { get; set; }

    public string? Note { get; set; }

    public virtual Item Item { get; set; } = null!;

    public virtual StocktakeSession Stocktake { get; set; } = null!;
}
