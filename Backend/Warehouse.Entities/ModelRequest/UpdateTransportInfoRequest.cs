using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class UpdateTransportInfoRequest
    {
        [MaxLength(200, ErrorMessage = "Tên đơn vị vận chuyển không được vượt quá 200 ký tự.")]
        public string? CarrierName { get; set; }

        [MaxLength(200, ErrorMessage = "Tên tài xế không được vượt quá 200 ký tự.")]
        public string? DriverName { get; set; }

        [MaxLength(20, ErrorMessage = "Số điện thoại tài xế không được vượt quá 20 ký tự.")]
        [RegularExpression(@"^[0-9]+$", ErrorMessage = "Số điện thoại chỉ được chứa các chữ số.")]
        public string? DriverPhone { get; set; }

        [MaxLength(50, ErrorMessage = "Biển số xe không được vượt quá 50 ký tự.")]
        public string? LicensePlate { get; set; }

        [MaxLength(500, ErrorMessage = "Ghi chú không được vượt quá 500 ký tự.")]
        public string? Note { get; set; }
    }
}
