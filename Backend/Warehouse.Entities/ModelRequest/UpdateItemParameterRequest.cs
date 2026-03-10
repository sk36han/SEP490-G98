using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdateItemParameterRequest
    {
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

        /// <summary>
        /// Trạng thái hoạt động: true = đang hoạt động, false = vô hiệu hoá
        /// </summary>
        public bool IsActive { get; set; }
    }
}
