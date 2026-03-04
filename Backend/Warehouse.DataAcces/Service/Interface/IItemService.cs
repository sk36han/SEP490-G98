using System.Collections.Generic;
using System.Threading.Tasks;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IItemService
    {
        Task<List<ItemDisplayResponse>> GetAllItemsDisplayAsync();
        Task<ItemDisplayResponse?> GetItemDisplayByIdAsync(long itemId);
        Task<Item> UpdateItemStatusAsync(long itemId, bool isActive);
    }
}
