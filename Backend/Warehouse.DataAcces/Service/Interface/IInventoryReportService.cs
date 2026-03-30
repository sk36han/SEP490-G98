using System.Threading.Tasks;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface;

public interface IInventoryReportService
{
    Task<WeightedAverageReportResponse> GetWeightedAverageReportAsync(string? keyword, long? warehouseId, int page, int pageSize);
}
