using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
    public class ItemService : GenericRepository<Item>, IItemService
    {
        public ItemService(Mkiwms5Context context) : base(context)
        {
        }

        public async Task<List<ItemDisplayResponse>> GetAllItemsDisplayAsync()
        {
            var items = await GetAllAsync();
            var itemList = items.ToList();

            var result = new List<ItemDisplayResponse>(itemList.Count);
            foreach (var item in itemList)
            {
                var mapped = MapToDisplay(item);
                result.Add(mapped);
            }

            return result;
        }

        public async Task<ItemDisplayResponse?> GetItemDisplayByIdAsync(long itemId)
        {
            var item = await GetByIdAsync(itemId);
            if (item == null)
            {
                return null;
            }

            return MapToDisplay(item);
        }

        public async Task<Item> UpdateItemStatusAsync(long itemId, bool isActive)
        {
            var item = await GetByIdAsync(itemId);
            if (item == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy sản phẩm với ID = {itemId}");
            }

            if (item.IsActive != isActive)
            {
                item.IsActive = isActive;
                item.UpdatedAt = DateTime.UtcNow;
                await UpdateAsync(item);
            }

            return item;
        }

        private ItemDisplayResponse MapToDisplay(Item item)
        {
            var itemId = item.ItemId;

            var categoryName = item.CategoryId == null
                ? null
                : _context.ItemCategories
                    .Where(c => c.CategoryId == item.CategoryId)
                    .Select(c => c.CategoryName)
                    .FirstOrDefault();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            var purchasePrice = _context.ItemPrices
                .Where(p => p.ItemId == itemId
                    && p.IsActive
                    && p.PriceType == "Purchase"
                    && p.EffectiveFrom <= today
                    && (p.EffectiveTo == null || p.EffectiveTo >= today))
                .OrderByDescending(p => p.EffectiveFrom)
                .ThenByDescending(p => p.CreatedAt)
                .Select(p => (decimal?)p.Amount)
                .FirstOrDefault();

            var salePrice = _context.ItemPrices
                .Where(p => p.ItemId == itemId
                    && p.IsActive
                    && p.PriceType == "Sale"
                    && p.EffectiveFrom <= today
                    && (p.EffectiveTo == null || p.EffectiveTo >= today))
                .OrderByDescending(p => p.EffectiveFrom)
                .ThenByDescending(p => p.CreatedAt)
                .Select(p => (decimal?)p.Amount)
                .FirstOrDefault();

            var stock = _context.InventoryOnHands
                .Where(i => i.ItemId == itemId)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    OnHandQty = g.Sum(x => x.OnHandQty),
                    ReservedQty = g.Sum(x => x.ReservedQty)
                })
                .FirstOrDefault();

            var onHandQty = stock?.OnHandQty ?? 0m;
            var reservedQty = stock?.ReservedQty ?? 0m;
            var availableQty = onHandQty - reservedQty;

            return new ItemDisplayResponse
            {
                ItemCode = item.ItemCode,
                ItemName = item.ItemName,
                ItemType = item.ItemType,
                Description = item.Description,
                CategoryName = categoryName,
                RequiresCo = item.RequiresCo,
                RequiresCq = item.RequiresCq,
                IsActive = item.IsActive,
                InventoryAccount = item.InventoryAccount,
                RevenueAccount = item.RevenueAccount,
                CreatedAt = item.CreatedAt,
                UpdatedAt = item.UpdatedAt,
                PurchasePrice = purchasePrice,
                SalePrice = salePrice,
                OnHandQty = onHandQty,
                ReservedQty = reservedQty,
                AvailableQty = availableQty
            };
        }
    }
}
