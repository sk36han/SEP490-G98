using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class WarehouseIssueRequest
    {
        [Required(ErrorMessage = "Lựa chọn xác nhận đủ hàng hoặc cập nhật chi tiết.")]
        public bool IsAllItemsFulfilled { get; set; } = true;

        public List<WarehouseIssueLineRequest>? Lines { get; set; }
        
        [MaxLength(1000, ErrorMessage = "Ghi chú không được vượt quá 1000 ký tự.")]
        public string? Note { get; set; }
    }

    public class WarehouseIssueLineRequest
    {
        [Required]
        public long GdnLineId { get; set; }
        
        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Số lượng thực xuất không được âm.")]
        public decimal ActualQty { get; set; }
    }
}
