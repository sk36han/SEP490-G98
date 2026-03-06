using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreateItemParameterRequest
    {
        /// <summary>
        /// Mã thông số kỹ thuật — bắt buộc, tối đa 50 ký tự
        /// </summary>
        [Required(ErrorMessage = "Mã thông số kỹ thuật không được để trống.")]
        [MaxLength(50, ErrorMessage = "Mã thông số kỹ thuật không được vượt quá 50 ký tự.")]
        [RegularExpression(@"^[a-zA-Z0-9_\-]+$",
            ErrorMessage = "Mã thông số kỹ thuật chỉ được chứa chữ cái, chữ số, dấu gạch ngang và dấu gạch dưới.")]
        public string ParamCode { get; set; } = null!;

        /// <summary>
        /// Tên thông số kỹ thuật — bắt buộc, từ 2 đến 255 ký tự
        /// </summary>
        [Required(ErrorMessage = "Tên thông số kỹ thuật không được để trống.")]
        [MinLength(2, ErrorMessage = "Tên thông số kỹ thuật phải có ít nhất 2 ký tự.")]
        [MaxLength(255, ErrorMessage = "Tên thông số kỹ thuật không được vượt quá 255 ký tự.")]
        public string ParamName { get; set; } = null!;

        /// <summary>
        /// Kiểu dữ liệu — bắt buộc, ví dụ: string, number, boolean, ...
        /// </summary>
        [Required(ErrorMessage = "Kiểu dữ liệu không được để trống.")]
        [MaxLength(50, ErrorMessage = "Kiểu dữ liệu không được vượt quá 50 ký tự.")]
        public string DataType { get; set; } = null!;
    }
}
