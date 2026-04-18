namespace Warehouse.Entities.ModelResponse;

/// <summary>
/// Số liệu tổng hợp phía trên danh sách (theo ảnh giao diện).
/// </summary>
public class InventoryAdjustmentListSummaryResponse
{
    /// <summary>Tổng số phiếu điều chỉnh.</summary>
    public int Total { get; set; }

    /// <summary>Số phiếu trạng thái APPROVED (Đã duyệt).</summary>
    public int Approved { get; set; }

    /// <summary>Số phiếu đang chờ duyệt (Status bắt đầu bằng PENDING).</summary>
    public int PendingApproval { get; set; }
}
