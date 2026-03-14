using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreateBrandRequest
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
    }
}
