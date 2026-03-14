using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdateBrandRequest
    {
        /// <summary>
        /// Tên thương hiệu — bắt buộc, từ 2 đến 255 ký tự
        /// </summary>
        [Required(ErrorMessage = "Tên thương hiệu không được để trống.")]
        [MinLength(2, ErrorMessage = "Tên thương hiệu phải có ít nhất 2 ký tự.")]
        [MaxLength(255, ErrorMessage = "Tên thương hiệu không được vượt quá 255 ký tự.")]
        [RegularExpression(@"^[\p{L}\p{N}\s\-\.\&]+$",
            ErrorMessage = "Tên thương hiệu chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang, dấu chấm và ký tự &.")]
        public string BrandName { get; set; } = null!;

        /// <summary>
        /// Trạng thái hoạt động: true = đang hoạt động, false = vô hiệu hoá
        /// </summary>
        public bool IsActive { get; set; }
    }
}
