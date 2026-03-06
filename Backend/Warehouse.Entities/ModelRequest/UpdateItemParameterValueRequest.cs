using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdateItemParameterValueRequest
    {
        /// <summary>
        /// Giá trị thông số — không bắt buộc, tối đa 1000 ký tự
        /// </summary>
        [MaxLength(1000, ErrorMessage = "Giá trị thông số không được vượt quá 1000 ký tự.")]
        public string? ParamValue { get; set; }
    }
}
