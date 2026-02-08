using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class PackagingSpec
{
    public long PackagingSpecId { get; set; }

    public string SpecCode { get; set; } = null!;

    public string SpecName { get; set; } = null!;

    public string? Description { get; set; }

    public bool IsActive { get; set; }

    public virtual ICollection<Item> Items { get; set; } = new List<Item>();
}
