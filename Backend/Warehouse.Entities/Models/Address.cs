using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class Address
{
    public long AddressId { get; set; }

    public long CompanyId { get; set; }

    public string? AddressName { get; set; }

    public string AddressDetail { get; set; } = null!;

    public string? District { get; set; }

    public string? City { get; set; }

    public string? Ward { get; set; }

    public bool IsDefault { get; set; }

    public bool IsActive { get; set; }

    public virtual Company Company { get; set; } = null!;
}
