namespace Warehouse.Entities.ModelResponse
{
    public class RRItemLookupResponse
    {
        public long ItemId { get; set; }
        public string ItemCode { get; set; } = null!;
        public string ItemName { get; set; } = null!;
        public long UomId { get; set; }
        public string UomName { get; set; } = null!;
        
        /// <summary>
        /// Tổng số lượng đang có thực tế trong kho
        /// </summary>
        public decimal OnHandQty { get; set; }

        /// <summary>
        /// Số lượng đang được giữ lại cho các phiếu khác
        /// </summary>
        public decimal ReservedQty { get; set; }

        /// <summary>
        /// Số lượng khả dụng có thể xuất = OnHandQty - ReservedQty
        /// </summary>
        public decimal AvailableQty { get; set; }
    }
}
