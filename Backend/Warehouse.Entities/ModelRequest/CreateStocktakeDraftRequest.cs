using System;
using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreateStocktakeDraftRequest
    {
        /// <summary>ID kho cần kiểm kê - chọn từ dropdown (bắt buộc)</summary>
        [Required(ErrorMessage = "Vui lòng chọn kho cần kiểm kê.")]
        [Range(1, long.MaxValue, ErrorMessage = "WarehouseId không hợp lệ.")]
        public long WarehouseId { get; set; }

        /// <summary>Hình thức: PERIODIC (Toàn bộ) hoặc ADHOC (Đột xuất)</summary>
        [Required(ErrorMessage = "Vui lòng chọn hình thức kiểm kê.")]
        [RegularExpression("^(PERIODIC|ADHOC)$", ErrorMessage = "Hình thức kiểm kê không hợp lệ (Chỉ chấp nhận PERIODIC hoặc ADHOC).")]
        public string Mode { get; set; } = "PERIODIC";

        /// <summary>Ngày kiểm kê dự kiến (không bắt buộc)</summary>
        public DateTime? PlannedAt { get; set; }

        /// <summary>Ghi chú (không bắt buộc, tối đa 1000 ký tự)</summary>
        [MaxLength(1000, ErrorMessage = "Ghi chú tối đa 1000 ký tự.")]
        public string? Note { get; set; }
    }
}
