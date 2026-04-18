using System.Threading.Tasks;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface;

public interface IInventoryAdjustmentService
{
    /// <summary>
    /// Lấy toàn bộ phiếu điều chỉnh tồn kho (không phân trang). Tìm theo mã phiếu, tên kho, người đề xuất.
    /// </summary>
    Task<InventoryAdjustmentListResponse> GetAllAsync(string? search);
}
