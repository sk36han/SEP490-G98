using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class ItemCategory
{
    public int CategoryId { get; set; }

    public string CategoryCode { get; set; } = null!;

    public string CategoryName { get; set; } = null!;

    public int? ParentId { get; set; }

    public bool IsActive { get; set; }

    public virtual ICollection<ItemCategory> InverseParent { get; set; } = new List<ItemCategory>();

    public virtual ICollection<Item> Items { get; set; } = new List<Item>();

    public virtual ItemCategory? Parent { get; set; }
}
