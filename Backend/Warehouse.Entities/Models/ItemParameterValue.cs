using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class ItemParameterValue
{
    public long ItemParamValueId { get; set; }

    public long ItemId { get; set; }

    public long ParamId { get; set; }

    public string? ParamValue { get; set; }

    public virtual Item Item { get; set; } = null!;

    public virtual ItemParameter Param { get; set; } = null!;
}
