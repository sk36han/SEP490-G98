using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class Brand
{
    public long BrandId { get; set; }

    public string BrandName { get; set; } = null!;

    public bool IsActive { get; set; }

    public virtual ICollection<Item> Items { get; set; } = new List<Item>();
}
