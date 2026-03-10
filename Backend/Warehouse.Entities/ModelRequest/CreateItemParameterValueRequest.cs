using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreateItemParameterValueRequest
    {
        /// <summary>
        /// ID của mặt hàng — bắt buộc
        /// </summary>
        [Required(ErrorMessage = "ID mặt hàng không được để trống.")]
        [Range(1, long.MaxValue, ErrorMessage = "ID mặt hàng phải là số nguyên dương.")]
        public long ItemId { get; set; }

        /// <summary>
        /// ID của thông số kỹ thuật — bắt buộc
        /// </summary>
        [Required(ErrorMessage = "ID thông số kỹ thuật không được để trống.")]
        [Range(1, long.MaxValue, ErrorMessage = "ID thông số kỹ thuật phải là số nguyên dương.")]
        public long ParamId { get; set; }

        /// <summary>
        /// Giá trị thông số — không bắt buộc, tối đa 1000 ký tự
        /// </summary>
        [MaxLength(1000, ErrorMessage = "Giá trị thông số không được vượt quá 1000 ký tự.")]
        public string? ParamValue { get; set; }
    }
}
