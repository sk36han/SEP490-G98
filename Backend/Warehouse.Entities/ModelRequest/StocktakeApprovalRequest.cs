using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class StocktakeApprovalRequest
    {
        /// <summary>
        /// Quyết định: "APPROVE", "RECOUNT", "REJECT"
        /// </summary>
        [Required(ErrorMessage = "Vui lòng chọn quyết định phê duyệt")]
        [RegularExpression("^(APPROVE|RECOUNT|REJECT)$", ErrorMessage = "Quyết định không hợp lệ")]
        public string Decision { get; set; } = null!;

        [MaxLength(500, ErrorMessage = "Lý do không được quá 500 ký tự")]
        public string? Reason { get; set; }
    }
}
