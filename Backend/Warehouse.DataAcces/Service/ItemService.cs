using System;
using System.Threading.Tasks;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
    public class ItemService : IItemService
    {
        private readonly IGenericRepository<Item> _itemRepository;

        public ItemService(IGenericRepository<Item> itemRepository)
        {
            _itemRepository = itemRepository;
        }

        public async Task<Item> UpdateItemStatusAsync(long itemId, bool isActive)
        {
            var item = await _itemRepository.GetByIdAsync(itemId);
            if (item == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy sản phẩm với ID = {itemId}");
            }

            // Idempotent: nếu trạng thái đã đúng thì vẫn trả về OK
            if (item.IsActive != isActive)
            {
                item.IsActive = isActive;
                item.UpdatedAt = DateTime.UtcNow;
                await _itemRepository.UpdateAsync(item);
            }

            return item;
        }
    }
}
