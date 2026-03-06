using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreatePackagingSpecRequest
    {
        /// <summary>
        /// Mã quy cách đóng gói — bắt buộc, từ 2 đến 50 ký tự
        /// </summary>
        [Required(ErrorMessage = "Mã quy cách đóng gói không được để trống.")]
        [MinLength(2, ErrorMessage = "Mã quy cách đóng gói phải có ít nhất 2 ký tự.")]
        [MaxLength(50, ErrorMessage = "Mã quy cách đóng gói không được vượt quá 50 ký tự.")]
        [RegularExpression(@"^[A-Za-z0-9_\-]+$",
            ErrorMessage = "Mã quy cách đóng gói chỉ được chứa chữ cái, chữ số, dấu gạch dưới và dấu gạch ngang.")]
        public string SpecCode { get; set; } = null!;

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
    }
}
