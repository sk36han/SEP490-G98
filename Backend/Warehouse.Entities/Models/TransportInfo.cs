using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class TransportInfo
{
    public long TransportId { get; set; }

    public long Gdnid { get; set; }

    public string? CarrierName { get; set; }

    public string? DriverName { get; set; }

    public string? DriverPhone { get; set; }

    public string? LicensePlate { get; set; }

    public string? Note { get; set; }

    public bool IsActive { get; set; }

    public virtual GoodsDeliveryNote Gdn { get; set; } = null!;
}
