using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class ItemParameter
{
    public int ParamId { get; set; }

    public string ParamCode { get; set; } = null!;

    public string ParamName { get; set; } = null!;

    public string DataType { get; set; } = null!;

    public bool IsActive { get; set; }

    public virtual ICollection<ItemParameterValue> ItemParameterValues { get; set; } = new List<ItemParameterValue>();
}
