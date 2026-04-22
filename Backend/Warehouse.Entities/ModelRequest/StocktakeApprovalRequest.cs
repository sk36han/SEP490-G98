using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class StocktakeApprovalRequest
    {
        /// <summary>
        /// Quyết định nghiệp vụ: <c>APPROVE</c> (đồng ý), <c>RECOUNT</c> (đếm lại), <c>REJECT</c> (từ chối).
        /// Giá trị <c>APPROVED</c> được chấp nhận ở API nhưng sẽ được chuẩn hóa thành <c>APPROVE</c> trước khi xử lý.
        /// </summary>
        [Required(ErrorMessage = "Vui lòng chọn quyết định phê duyệt")]
        [RegularExpression("^(APPROVE|APPROVED|RECOUNT|REJECT)$", ErrorMessage = "Quyết định không hợp lệ")]
        public string Decision { get; set; } = null!;

        [MaxLength(500, ErrorMessage = "Lý do không được quá 500 ký tự")]
        public string? Reason { get; set; }

        /// <summary>Chuẩn hóa alias phổ biến (ví dụ APPROVED) về giá trị dùng trong service (APPROVE).</summary>
        public void NormalizeDecisionAlias()
        {
            if (string.IsNullOrWhiteSpace(Decision)) return;
            if (string.Equals(Decision.Trim(), "APPROVED", System.StringComparison.OrdinalIgnoreCase))
                Decision = "APPROVE";
        }
    }
}
