using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdatePackagingSpecRequest
    {
        /// <summary>
        /// Tên quy cách đóng gói — bắt buộc, từ 2 đến 255 ký tự
        /// </summary>
        [Required(ErrorMessage = "Tên quy cách đóng gói không được để trống.")]
        [MinLength(2, ErrorMessage = "Tên quy cách đóng gói phải có ít nhất 2 ký tự.")]
        [MaxLength(255, ErrorMessage = "Tên quy cách đóng gói không được vượt quá 255 ký tự.")]
        [RegularExpression(@"^[\p{L}\p{N}\s\-\.\&/]+$",
            ErrorMessage = "Tên quy cách đóng gói chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang, dấu chấm, ký tự & và /.")]
        public string SpecName { get; set; } = null!;

        /// <summary>
        /// Mô tả quy cách đóng gói (Tùy chọn)
        /// </summary>
        [MaxLength(500, ErrorMessage = "Mô tả không được vượt quá 500 ký tự.")]
        public string? Description { get; set; }

        /// <summary>
        /// Trạng thái hoạt động
        /// </summary>
        public bool IsActive { get; set; }
    }
}
