using System;
using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class StocktakeListRequest
    {
        private int _page = 1;

        [Range(1, int.MaxValue, ErrorMessage = "Số trang phải lớn hơn 0.")]
        public int Page
        {
            get => _page;
            set => _page = value < 1 ? 1 : value;
        }

        private int _pageSize = 20;

        [Range(1, 100, ErrorMessage = "Kích thước trang phải từ 1 đến 100.")]
        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = value > 100 ? 100 : (value < 1 ? 20 : value);
        }

        /// <summary>Tìm theo mã phiếu kiểm kê</summary>
        [MaxLength(50, ErrorMessage = "Mã kiểm kê tối đa 50 ký tự.")]
        public string? StocktakeCode { get; set; }

        /// <summary>Lọc theo tên kho (tìm kiếm chứa chuỗi)</summary>
        [MaxLength(100, ErrorMessage = "Tên kho tối đa 100 ký tự.")]
        public string? WarehouseName { get; set; }

        /// <summary>Trạng thái: DRAFT | IN_PROGRESS | COMPLETED | CANCELLED</summary>
        [RegularExpression(@"^(DRAFT|IN_PROGRESS|COMPLETED|CANCELLED)$",
            ErrorMessage = "Status chỉ chấp nhận: DRAFT, IN_PROGRESS, COMPLETED, CANCELLED.")]
        public string? Status { get; set; }

        /// <summary>Chế độ kiểm kê: FULL | PARTIAL</summary>
        [RegularExpression(@"^(FULL|PARTIAL)$",
            ErrorMessage = "Mode chỉ chấp nhận: FULL, PARTIAL.")]
        public string? Mode { get; set; }

        /// <summary>Lọc theo tên người tạo (tìm kiếm chứa chuỗi)</summary>
        [MaxLength(100, ErrorMessage = "Tên người tạo tối đa 100 ký tự.")]
        public string? CreatedByName { get; set; }

        // --- Date range filters ---
        public DateTime? PlannedFrom { get; set; }
        public DateTime? PlannedTo { get; set; }
        public DateTime? StartedFrom { get; set; }
        public DateTime? StartedTo { get; set; }
        public DateTime? EndedFrom { get; set; }
        public DateTime? EndedTo { get; set; }
    }
}
