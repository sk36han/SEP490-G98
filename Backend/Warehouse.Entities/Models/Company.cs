using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class Company
{
    public long CompanyId { get; set; }

    public string CompanyCode { get; set; } = null!;

    public string CompanyName { get; set; } = null!;

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<Address> Addresses { get; set; } = new List<Address>();

    public virtual ICollection<Receiver> Receivers { get; set; } = new List<Receiver>();
}
