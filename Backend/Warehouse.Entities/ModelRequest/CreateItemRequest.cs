using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreateItemRequest
    {
        [Required(ErrorMessage = "ItemCode là bắt buộc.")]
        [MaxLength(50, ErrorMessage = "ItemCode không được vượt quá 50 ký tự.")]
        public string ItemCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "ItemName là bắt buộc.")]
        [MaxLength(255, ErrorMessage = "ItemName không được vượt quá 255 ký tự.")]
        public string ItemName { get; set; } = string.Empty;

        [MaxLength(100, ErrorMessage = "ItemType không được vượt quá 100 ký tự.")]
        public string? ItemType { get; set; }

        [MaxLength(1000, ErrorMessage = "Description không được vượt quá 1000 ký tự.")]
        public string? Description { get; set; }

        [Required(ErrorMessage = "CategoryId là bắt buộc.")]
        public long CategoryId { get; set; }

        public long? BrandId { get; set; }

        [Required(ErrorMessage = "BaseUomId là bắt buộc.")]
        public long BaseUomId { get; set; }

        public long? PackagingSpecId { get; set; }

        public bool RequiresCo { get; set; }

        public bool RequiresCq { get; set; }

        public bool IsActive { get; set; } = true;

        public long? DefaultWarehouseId { get; set; }

        [MaxLength(100, ErrorMessage = "InventoryAccount không được vượt quá 100 ký tự.")]
        public string? InventoryAccount { get; set; }

        [MaxLength(100, ErrorMessage = "RevenueAccount không được vượt quá 100 ký tự.")]
        public string? RevenueAccount { get; set; }

        [Range(typeof(decimal), "0.0000001", "79228162514264337593543950335", ErrorMessage = "Giá nhập ban đầu phải lớn hơn 0.")]
        public decimal? InitialPurchasePrice { get; set; }

        public DateOnly? PriceEffectiveFrom { get; set; }
    }
}
