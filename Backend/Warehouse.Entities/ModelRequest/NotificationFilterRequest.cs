namespace Warehouse.Entities.ModelRequest
{
    /// <summary>
    /// Request filter + phân trang cho danh sách thông báo
    /// </summary>
    public class NotificationFilterRequest
    {
        /// <summary>
        /// Lọc theo loại thông báo (vd: SUPPLIER, USER_CREATED, USER_UPDATED...)
        /// </summary>
        public string? Type { get; set; }

        /// <summary>
        /// Lọc theo mức độ: 0 = Info, 1 = Warning, 2 = Error
        /// </summary>
        public byte? Severity { get; set; }

        /// <summary>
        /// Lọc theo trạng thái đã đọc (true/false)
        /// </summary>
        public bool? IsRead { get; set; }

        /// <summary>
        /// Lọc từ ngày tạo
        /// </summary>
        public DateTime? FromDate { get; set; }

        /// <summary>
        /// Lọc đến ngày tạo
        /// </summary>
        public DateTime? ToDate { get; set; }

        private int _pageNumber = 1;
        public int PageNumber
        {
            get => _pageNumber;
            set => _pageNumber = value < 1 ? 1 : value;
        }

        private int _pageSize = 20;
        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = value > 100 ? 100 : value;
        }
    }
}
