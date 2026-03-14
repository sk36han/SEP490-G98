using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class StocktakeLineFilterRequest
    {
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;

        /// <summary>
        /// Tìm kiếm theo SKU hoặc Tên sản phẩm
        /// </summary>
        public string? SearchQuery { get; set; }

        /// <summary>
        /// Bộ lọc trạng thái đếm: 
        /// "ALL", "UNCOUNTED" (Chưa đếm), "DISCREPANCY" (Có chênh lệch)
        /// </summary>
        public string? FilterType { get; set; } = "ALL";
    }

    public class UpdateCountedQtyRequest
    {
        [Required(ErrorMessage = "Số lượng thực tế không được để trống")]
        [Range(0, 999999999, ErrorMessage = "Số lượng không hợp lệ")]
        public decimal CountedQty { get; set; }

        [MaxLength(500, ErrorMessage = "Ghi chú tối đa 500 ký tự")]
        public string? Note { get; set; }
    }
}
