using System;

namespace Warehouse.Entities.ModelResponse;

/// <summary>
/// Một dòng trong danh sách phiếu điều chỉnh tồn kho (không phân trang).
/// </summary>
public class InventoryAdjustmentListItemResponse
{
    /// <summary>Thứ tự dòng (1-based).</summary>
    public int Stt { get; set; }

    public long AdjustmentId { get; set; }

    /// <summary>Mã phiếu điều chỉnh (ví dụ ADJ-2026-0001).</summary>
    public string AdjustmentCode { get; set; } = null!;

    /// <summary>Mã phiếu kiểm kê liên kết, null nếu không có.</summary>
    public string? StocktakeCode { get; set; }

    /// <summary>Tên kho.</summary>
    public string WarehouseName { get; set; } = null!;

    /// <summary>Giá trị trạng thái lưu trong DB (POSTED, APPROVED, DRAFT, …).</summary>
    public string Status { get; set; } = null!;

    /// <summary>Nhãn hiển thị tiếng Việt cho cột Trạng thái.</summary>
    public string StatusDisplay { get; set; } = null!;

    /// <summary>Ngày giờ tạo / gửi (ưu tiên SubmittedAt).</summary>
    public DateTime? CreatedAt { get; set; }

    /// <summary>Người đề xuất (phục vụ tìm kiếm / chi tiết).</summary>
    public string? SubmittedByName { get; set; }
}
