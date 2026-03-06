using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdateUnitOfMeasureRequest
    {
        /// <summary>
        /// Mã đơn vị tính — bắt buộc, từ 2 đến 50 ký tự
        /// </summary>
        [Required(ErrorMessage = "Mã đơn vị tính không được để trống.")]
        [MinLength(2, ErrorMessage = "Mã đơn vị tính phải có ít nhất 2 ký tự.")]
        [MaxLength(50, ErrorMessage = "Mã đơn vị tính không được vượt quá 50 ký tự.")]
        [RegularExpression(@"^[A-Za-z0-9_\-]+$",
            ErrorMessage = "Mã đơn vị tính chỉ được chứa chữ cái, chữ số, dấu gạch dưới và dấu gạch ngang.")]
        public string UomCode { get; set; } = null!;

        /// <summary>
        /// Tên đơn vị tính — bắt buộc, từ 2 đến 255 ký tự
        /// </summary>
        [Required(ErrorMessage = "Tên đơn vị tính không được để trống.")]
        [MinLength(1, ErrorMessage = "Tên đơn vị tính phải có ít nhất 1 ký tự.")]
        [MaxLength(255, ErrorMessage = "Tên đơn vị tính không được vượt quá 255 ký tự.")]
        [RegularExpression(@"^[\p{L}\p{N}\s\-\.\&/]+$",
            ErrorMessage = "Tên đơn vị tính chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang, dấu chấm, ký tự & và /.")]
        public string UomName { get; set; } = null!;

        /// <summary>
        /// Trạng thái hoạt động: true = đang hoạt động, false = vô hiệu hoá
        /// </summary>
        public bool IsActive { get; set; }
    }
}
