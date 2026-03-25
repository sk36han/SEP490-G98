using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    /// <summary>
    /// Request body cho API tạo yêu cầu xuất kho
    /// </summary>
    public class CreateReleaseRequestRequest
    {
        /// <summary>
        /// Kho xuất (bắt buộc)
        /// </summary>
        [Required(ErrorMessage = "Kho xuất là bắt buộc.")]
        public long WarehouseId { get; set; }

        /// <summary>
        /// Người nhận (bắt buộc)
        /// </summary>
        [Required(ErrorMessage = "Người nhận là bắt buộc.")]
        public long ReceiverId { get; set; }

        /// <summary>
        /// Ngày xuất dự kiến
        /// </summary>
        public DateOnly? ExpectedDate { get; set; }

        /// <summary>
        /// Ghi chú / mục đích xuất kho (tối đa 250 ký tự)
        /// </summary>
        [MaxLength(250, ErrorMessage = "Ghi chú không được vượt quá 250 ký tự.")]
        public string? Purpose { get; set; }

        /// <summary>
        /// Danh sách vật tư xuất kho (ít nhất 1)
        /// </summary>
        [Required(ErrorMessage = "Phải có ít nhất 1 vật tư.")]
        [MinLength(1, ErrorMessage = "Phải có ít nhất 1 vật tư.")]
        public List<CreateReleaseRequestLineRequest> Lines { get; set; } = new();
    }

    /// <summary>
    /// Chi tiết 1 dòng vật tư trong yêu cầu xuất kho
    /// </summary>
    public class CreateReleaseRequestLineRequest
    {
        /// <summary>
        /// Mã vật tư
        /// </summary>
        [Required(ErrorMessage = "Vật tư là bắt buộc.")]
        public long ItemId { get; set; }

        /// <summary>
        /// Số lượng yêu cầu xuất
        /// </summary>
        [Required(ErrorMessage = "Số lượng là bắt buộc.")]
        [Range(typeof(decimal), "0.001", "999999999", ErrorMessage = "Số lượng phải lớn hơn 0.")]
        public decimal RequestedQty { get; set; }

        /// <summary>
        /// Đơn vị tính
        /// </summary>
        [Required(ErrorMessage = "Đơn vị tính là bắt buộc.")]
        public long UomId { get; set; }

        /// <summary>
        /// Ghi chú dòng
        /// </summary>
        [MaxLength(500, ErrorMessage = "Ghi chú dòng không được vượt quá 500 ký tự.")]
        public string? Note { get; set; }
    }
}
