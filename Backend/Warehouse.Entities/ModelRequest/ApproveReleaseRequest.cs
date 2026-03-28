using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class ApproveReleaseRequest
    {
        [Required(ErrorMessage = "Phải chọn duyệt hoặc từ chối.")]
        public bool IsApproved { get; set; }

        [MaxLength(1000, ErrorMessage = "Lý do không được vượt quá 1000 ký tự.")]
        public string? Reason { get; set; }

        /// <summary>
        /// Danh sách số lượng được duyệt cho từng dòng. 
        /// Nếu không truyền, mặc định sẽ duyệt toàn bộ số lượng yêu cầu.
        /// </summary>
        public List<ApproveReleaseRequestLine>? Lines { get; set; }
    }

    public class ApproveReleaseRequestLine
    {
        [Required]
        public long ReleaseRequestLineId { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Số lượng duyệt phải >= 0.")]
        public decimal ApprovedQty { get; set; }
    }
}
