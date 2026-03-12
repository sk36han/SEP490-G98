using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreatePurchaseOrderRequest
    {
        [Required]
        public long SupplierId { get; set; }

        [Required]
        public long WarehouseId { get; set; }

        public long? ResponsibleUserId { get; set; }

        public DateOnly? ExpectedDeliveryDate { get; set; }

        [MaxLength(1000)]
        public string? Justification { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? DiscountAmount { get; set; }

        /// <summary>
        /// Trạng thái đơn: DRAFT, PENDING. Nếu không truyền sẽ mặc định là DRAFT.
        /// </summary>
        public string? Status { get; set; }

        [Required]
        [MinLength(1)]
        public List<CreatePurchaseOrderLineRequest> Lines { get; set; } = new();
    }

    public class CreatePurchaseOrderLineRequest
    {
        [Required]
        public long ItemId { get; set; }

        [Range(typeof(decimal), "0.001", "999999999999999999")]
        public decimal OrderedQty { get; set; }

        [Range(typeof(decimal), "0", "999999999999999999")]
        public decimal UnitPrice { get; set; }

        [MaxLength(500)]
        public string? Note { get; set; }
    }
}
