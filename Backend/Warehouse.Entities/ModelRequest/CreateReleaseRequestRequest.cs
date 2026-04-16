using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Warehouse.Entities.ModelRequest
{
    /// <summary>
    /// Request body cho API tạo yêu cầu xuất kho
    /// </summary>
    public class CreateReleaseRequestRequest
    {
        /// Kho xuất (bắt buộc)
        [Required(ErrorMessage = "Kho xuất là bắt buộc.")]
        public long WarehouseId { get; set; }

        [Required(ErrorMessage = "Người nhận là bắt buộc.")]
        public long ReceiverId { get; set; }

        /// ID Công ty (bắt buộc)
        [Required(ErrorMessage = "Công ty là bắt buộc.")]
        public long? CompanyId { get; set; }

        /// ID Địa chỉ (Từ bảng Addresses)
        public long? AddressId { get; set; }

        /// Ngày xuất dự kiến
        public DateOnly? ExpectedDate { get; set; }

        /// Ghi chú / mục đích xuất kho (tối đa 250 ký tự)
        [MaxLength(250, ErrorMessage = "Ghi chú không được vượt quá 250 ký tự.")]
        public string? Purpose { get; set; }

        /// Trạng thái yêu cầu (DRAFT, PENDING, ...)
        [MaxLength(30)]
        public string? Status { get; set; }

        /// Cho phép xuất từng phần
        public bool IsPartialDeliveryAllowed { get; set; }

        /// Tệp báo giá (Bắt buộc)
        [Required(ErrorMessage = "Vui lòng tải lên ít nhất 1 tệp báo giá.")]
        public List<IFormFile> QuotationFiles { get; set; } = new();

        /// Tệp hợp đồng (Bắt buộc)
        [Required(ErrorMessage = "Vui lòng tải lên ít nhất 1 tệp hợp đồng.")]
        public List<IFormFile> ContractFiles { get; set; } = new();

        /// Danh sách vật tư xuất kho (ít nhất 1)
        [Required(ErrorMessage = "Phải có ít nhất 1 vật tư.")]
        [MinLength(1, ErrorMessage = "Phải có ít nhất 1 vật tư.")]
        public List<CreateReleaseRequestLineRequest> Lines { get; set; } = new();
    }

    /// Chi tiết 1 dòng vật tư trong yêu cầu xuất kho
    public class CreateReleaseRequestLineRequest
    {
    
        /// Mã vật tư
        [Required(ErrorMessage = "Vật tư là bắt buộc.")]
        public long ItemId { get; set; }

        /// Số lượng yêu cầu xuất
        [Required(ErrorMessage = "Số lượng là bắt buộc.")]
        [Range(typeof(decimal), "0.001", "999999999", ErrorMessage = "Số lượng phải lớn hơn 0.")]
        public decimal RequestedQty { get; set; }

        /// Đơn vị tính
        [Required(ErrorMessage = "Đơn vị tính là bắt buộc.")]
        public long UomId { get; set; }

        /// Ghi chú dòng
        [MaxLength(500, ErrorMessage = "Ghi chú dòng không được vượt quá 500 ký tự.")]
        public string? Note { get; set; }

        public decimal? UnitPrice { get; set; }

        /// Quy cách đóng gói (không bắt buộc)
        public long? PackagingSpecId { get; set; }
    }
}
