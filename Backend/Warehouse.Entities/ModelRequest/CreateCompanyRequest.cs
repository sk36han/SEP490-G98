using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreateCompanyRequest
    {
        /// <summary>
        /// Mã công ty — bắt buộc, từ 2 đến 50 ký tự
        /// </summary>
        [Required(ErrorMessage = "Mã công ty không được để trống.")]
        [MinLength(2, ErrorMessage = "Mã công ty phải có ít nhất 2 ký tự.")]
        [MaxLength(50, ErrorMessage = "Mã công ty không được vượt quá 50 ký tự.")]
        [RegularExpression(@"^[A-Za-z0-9_\-]+$",
            ErrorMessage = "Mã công ty chỉ được chứa chữ cái, chữ số, dấu gạch dưới và dấu gạch ngang.")]
        public string CompanyCode { get; set; } = null!;

        /// <summary>
        /// Tên công ty — bắt buộc, từ 2 đến 255 ký tự
        /// </summary>
        [Required(ErrorMessage = "Tên công ty không được để trống.")]
        [MinLength(2, ErrorMessage = "Tên công ty phải có ít nhất 2 ký tự.")]
        [MaxLength(255, ErrorMessage = "Tên công ty không được vượt quá 255 ký tự.")]
        [RegularExpression(@"^[\p{L}\p{N}\s\-\.\&/]+$",
            ErrorMessage = "Tên công ty chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang, dấu chấm, ký tự & và /.")]
        public string CompanyName { get; set; } = null!;
    }
}
