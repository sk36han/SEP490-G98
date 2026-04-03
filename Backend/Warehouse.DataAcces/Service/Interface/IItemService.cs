using System.Collections.Generic;
using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IItemService
    {
        Task<Item> CreateItemAsync(CreateItemRequest request, long userId = 0);
        Task<List<ItemDisplayResponse>> GetAllItemsDisplayAsync();
        Task<ItemDisplayResponse?> GetItemDisplayByIdAsync(long itemId);
        Task<ItemDetailResponse?> GetItemDetailByIdAsync(long itemId, int historyPage = 1, int historyPageSize = 20);
        Task<Item> UpdateItemAsync(long itemId, UpdateItemRequest request, long userId = 0);
        Task<Item> UpdateItemStatusAsync(long itemId, bool isActive, long userId = 0);
        
        /// <summary>
        /// Lấy danh sách Vật tư có tồn kho khả dụng tại một kho
        /// </summary>
        Task<List<RRItemLookupResponse>> GetAvailableItemsByWarehouseAsync(long warehouseId);
    }
}
