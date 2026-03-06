using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdateCategoryRequest
    {
        /// <summary>
        /// Mã danh mục — bắt buộc, từ 2 đến 50 ký tự
        /// </summary>
        [Required(ErrorMessage = "Mã danh mục không được để trống.")]
        [MinLength(2, ErrorMessage = "Mã danh mục phải có ít nhất 2 ký tự.")]
        [MaxLength(50, ErrorMessage = "Mã danh mục không được vượt quá 50 ký tự.")]
        [RegularExpression(@"^[A-Za-z0-9_\-]+$",
            ErrorMessage = "Mã danh mục chỉ được chứa chữ cái, chữ số, dấu gạch dưới và dấu gạch ngang.")]
        public string CategoryCode { get; set; } = null!;

        /// <summary>
        /// Tên danh mục — bắt buộc, từ 2 đến 255 ký tự
        /// </summary>
        [Required(ErrorMessage = "Tên danh mục không được để trống.")]
        [MinLength(2, ErrorMessage = "Tên danh mục phải có ít nhất 2 ký tự.")]
        [MaxLength(255, ErrorMessage = "Tên danh mục không được vượt quá 255 ký tự.")]
        [RegularExpression(@"^[\p{L}\p{N}\s\-\.\&/]+$",
            ErrorMessage = "Tên danh mục chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang, dấu chấm, ký tự & và /.")]
        public string CategoryName { get; set; } = null!;

        /// <summary>
        /// ID danh mục cha (tuỳ chọn — null nếu là danh mục gốc)
        /// </summary>
        public long? ParentId { get; set; }

        /// <summary>
        /// Trạng thái hoạt động: true = đang hoạt động, false = vô hiệu hoá
        /// </summary>
        public bool IsActive { get; set; }
    }
}
