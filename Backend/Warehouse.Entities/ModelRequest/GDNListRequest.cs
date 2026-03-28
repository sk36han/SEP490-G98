using System;

namespace Warehouse.Entities.ModelRequest
{
    public class GDNListRequest
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;

        public string? Search { get; set; } // Tìm theo code, RR code, người nhận, công ty
        public string? Status { get; set; }
        public long? WarehouseId { get; set; }
        public string? CreatedByName { get; set; }
        
        public DateOnly? FromDate { get; set; }
        public DateOnly? ToDate { get; set; }
    }
}
