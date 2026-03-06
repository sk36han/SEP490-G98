using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
    public class ItemService : GenericRepository<Item>, IItemService
    {
        public ItemService(Mkiwms5Context context) : base(context)
        {
        }

        public async Task<Item> CreateItemAsync(CreateItemRequest request)
        {
            if (request == null)
            {
                throw new ArgumentNullException(nameof(request));
            }

            var itemCode = request.ItemCode?.Trim() ?? string.Empty;
            var itemName = request.ItemName?.Trim() ?? string.Empty;

            var duplicatedCode = _context.Items.Any(i => i.ItemCode == itemCode);
            if (duplicatedCode)
            {
                throw new InvalidOperationException($"ItemCode '{itemCode}' đã tồn tại.");
            }

            var categoryExists = _context.ItemCategories.Any(c => c.CategoryId == request.CategoryId && c.IsActive);
            if (!categoryExists)
            {
                throw new InvalidOperationException("Category không tồn tại hoặc đã bị vô hiệu hóa.");
            }

            var uomExists = _context.UnitOfMeasures.Any(u => u.UomId == request.BaseUomId && u.IsActive);
            if (!uomExists)
            {
                throw new InvalidOperationException("Đơn vị tính cơ bản không tồn tại hoặc đã bị vô hiệu hóa.");
            }

            if (request.BrandId.HasValue)
            {
                var brandExists = _context.Brands.Any(b => b.BrandId == request.BrandId.Value && b.IsActive);
                if (!brandExists)
                {
                    throw new InvalidOperationException("Brand không tồn tại hoặc đã bị vô hiệu hóa.");
                }
            }

            if (request.PackagingSpecId.HasValue)
            {
                var packagingExists = _context.PackagingSpecs.Any(p => p.PackagingSpecId == request.PackagingSpecId.Value && p.IsActive);
                if (!packagingExists)
                {
                    throw new InvalidOperationException("PackagingSpec không tồn tại hoặc đã bị vô hiệu hóa.");
                }
            }

            if (request.DefaultWarehouseId.HasValue)
            {
                var warehouseExists = _context.Warehouses.Any(w => w.WarehouseId == request.DefaultWarehouseId.Value && w.IsActive);
                if (!warehouseExists)
                {
                    throw new InvalidOperationException("DefaultWarehouse không tồn tại hoặc đã bị vô hiệu hóa.");
                }
            }

            var now = DateTime.UtcNow;
            var entity = new Item
            {
                ItemCode = itemCode,
                ItemName = itemName,
                ItemType = request.ItemType?.Trim(),
                Description = request.Description?.Trim(),
                CategoryId = request.CategoryId,
                BrandId = request.BrandId,
                BaseUomId = request.BaseUomId,
                PackagingSpecId = request.PackagingSpecId,
                RequiresCo = request.RequiresCo,
                RequiresCq = request.RequiresCq,
                IsActive = request.IsActive,
                DefaultWarehouseId = request.DefaultWarehouseId,
                InventoryAccount = request.InventoryAccount?.Trim(),
                RevenueAccount = request.RevenueAccount?.Trim(),
                CreatedAt = now,
                UpdatedAt = now
            };

            await CreateAsync(entity);

            var effectiveFrom = request.PriceEffectiveFrom ?? DateOnly.FromDateTime(now);

            if (request.InitialPurchasePrice.HasValue)
            {
                _context.ItemPrices.Add(new ItemPrice
                {
                    ItemId = entity.ItemId,
                    PriceType = "Purchase",
                    Amount = request.InitialPurchasePrice.Value,
                    Currency = "VND",
                    EffectiveFrom = effectiveFrom,
                    EffectiveTo = null,
                    IsActive = true,
                    CreatedAt = now
                });
            }

            if (request.InitialPurchasePrice.HasValue)
            {
                await _context.SaveChangesAsync();
            }

            return entity;
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
