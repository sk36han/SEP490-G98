using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Warehouse.Entities.ModelRequest
{
    /// <summary>
    /// Request body cho API cập nhật yêu cầu xuất kho.
    /// Chỉ gửi các field cần thay đổi (nullable = không thay đổi).
    /// </summary>
    public class UpdateReleaseRequestRequest
    {
        /// <summary>
        /// Kho xuất (nếu muốn đổi kho)
        /// </summary>
        public long? WarehouseId { get; set; }

        /// Người nhận (nếu muốn đổi người nhận)
        /// </summary>
        public long? ReceiverId { get; set; }

        /// <summary>
        /// ID Công ty (Cập nhật cho Người nhận)
        /// </summary>
        public long? CompanyId { get; set; }

        /// <summary>
        /// ID Địa chỉ (Từ bảng Addresses)
        /// </summary>
        public long? AddressId { get; set; }

        /// <summary>
        /// Ngày xuất dự kiến
        /// </summary>
        public DateOnly? ExpectedDate { get; set; }

        /// <summary>
        /// Ghi chú / mục đích (tối đa 250 ký tự)
        /// </summary>
        [MaxLength(250, ErrorMessage = "Ghi chú không được vượt quá 250 ký tự.")]
        public string? Purpose { get; set; }

        /// <summary>
        /// Trạng thái yêu cầu (để gửi duyệt: PENDING_ACC, DRAFT)
        /// </summary>
        [MaxLength(30)]
        public string? Status { get; set; }

        /// <summary>
        /// Cho phép xuất từng phần
        /// </summary>
        public bool? IsPartialDeliveryAllowed { get; set; }

        /// <summary>
        /// Danh sách vật tư cập nhật.
        /// - Nếu có LineId > 0 → cập nhật dòng cũ
        /// - Nếu LineId = 0 hoặc null → thêm dòng mới
        /// - Dòng cũ không có trong list → sẽ bị xóa
        /// </summary>
        public List<UpdateReleaseRequestLineRequest>? Lines { get; set; }
    }

    /// <summary>
    /// Chi tiết 1 dòng vật tư khi cập nhật
    /// </summary>
    public class UpdateReleaseRequestLineRequest
    {
        /// <summary>
        /// ID dòng (0 hoặc null = thêm mới, > 0 = cập nhật)
        /// </summary>
        public long? ReleaseRequestLineId { get; set; }

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

        /// <summary>
        /// Đơn giá từ Hợp đồng / Báo giá (Tùy chọn, Sale nhập)
        /// </summary>
        [Range(0, 999999999999, ErrorMessage = "Đơn giá không hợp lệ.")]
        public decimal? UnitPrice { get; set; }

        /// <summary>
        /// Tùy chọn đóng gói
        /// </summary>
        public long? PackagingSpecId { get; set; }
    }
}
