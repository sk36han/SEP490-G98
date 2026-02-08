using System;
using System.Collections.Generic;

namespace Warehouse.Entities.Models;

public partial class Supplier
{
    public long SupplierId { get; set; }

    public string? SupplierCode { get; set; }

    public string SupplierName { get; set; } = null!;

    public string? TaxCode { get; set; }

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public string? Address { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<GoodsReceiptNote> GoodsReceiptNotes { get; set; } = new List<GoodsReceiptNote>();

    public virtual ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
}
