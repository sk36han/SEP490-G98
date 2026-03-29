using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
    public class ItemService : GenericRepository<Item>, IItemService
    {
        private readonly IAuditLogService _auditLogService;

        public ItemService(Mkiwms5Context context, IAuditLogService auditLogService) : base(context)
        {
            _auditLogService = auditLogService;
        }

        public async Task<Item> CreateItemAsync(CreateItemRequest request, long userId = 0)
        {
            if (request == null)
            {
                throw new ArgumentNullException(nameof(request));
            }

            // Sinh ItemCode tu dong neu khong truyen len
            var itemCode = string.IsNullOrWhiteSpace(request.ItemCode)
                ? await GenerateNextItemCodeAsync()
                : request.ItemCode.Trim();

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
                ImageUrl = request.ImageUrls?.FirstOrDefault(),
                CreatedAt = now,
                UpdatedAt = now
            };

            await CreateAsync(entity);

            // Tạo giá trị thông số kỹ thuật (đã có ItemParameter từ trước)
            if (request.ParameterValues != null && request.ParameterValues.Any())
            {
                foreach (var param in request.ParameterValues)
                {
                    _context.ItemParameterValues.Add(new ItemParameterValue
                    {
                        ItemId = entity.ItemId,
                        ParamId = param.ParamId,
                        ParamValue = param.ParamValue?.Trim()
                    });
                }
            }

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

            await _context.SaveChangesAsync();

            // Audit log
            if (userId > 0)
            {
                await _auditLogService.LogAsync(
                    userId,
                    AuditAction.Create,
                    AuditEntity.Item,
                    entity.ItemId,
                    $"Tạo sản phẩm {entity.ItemCode} - {entity.ItemName}");
            }

            return entity;
        }

        public async Task<List<ItemDisplayResponse>> GetAllItemsDisplayAsync()
        {
            var items = await _context.Items
                .Include(i => i.Brand)
                .Include(i => i.BaseUom)
                .Include(i => i.PackagingSpec)
                .Include(i => i.Category)
                .Where(i => i.IsActive)
                .ToListAsync();

            var result = new List<ItemDisplayResponse>(items.Count);
            foreach (var item in items)
            {
                var mapped = await MapToDisplay(item);
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

            return await MapToDisplay(item);
        }

        public async Task<ItemDetailResponse?> GetItemDetailByIdAsync(long itemId, int historyPage = 1, int historyPageSize = 20)
        {
            if (historyPage <= 0) historyPage = 1;
            if (historyPageSize <= 0) historyPageSize = 20;

            var item = await _context.Items
                .Where(i => i.ItemId == itemId)
                .Select(i => new
                {
                    i.ItemId,
                    i.ItemCode,
                    i.ItemName,
                    i.ItemType,
                    i.Description,
                    i.RequiresCo,
                    i.RequiresCq,
                    i.IsActive,
                    i.CreatedAt,
                    i.UpdatedAt,
                    i.ImageUrl,
                    CategoryName = i.Category != null ? i.Category.CategoryName : null,
                    BrandName = i.Brand != null ? i.Brand.BrandName : null,
                    BaseUomName = i.BaseUom.UomName,
                    PackagingSpecName = i.PackagingSpec != null ? i.PackagingSpec.SpecName : null,
                    i.DefaultWarehouseId
                })
                .FirstOrDefaultAsync();

            if (item == null)
            {
                return null;
            }

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

            var variants = _context.InventoryOnHands
                .Where(ioh => ioh.ItemId == itemId)
                .Select(ioh => new ItemWarehouseVariantResponse
                {
                    WarehouseId = ioh.WarehouseId,
                    WarehouseName = ioh.Warehouse.WarehouseName,
                    Sku = item.ItemCode,
                    VariantName = item.ItemName,
                    OnHandQty = ioh.OnHandQty,
                    ReservedQty = ioh.ReservedQty,
                    AvailableQty = ioh.OnHandQty - ioh.ReservedQty,
                    PreOrderQty = 0,
                    IsDefaultWarehouse = item.DefaultWarehouseId.HasValue && ioh.WarehouseId == item.DefaultWarehouseId.Value
                })
                .OrderByDescending(x => x.IsDefaultWarehouse)
                .ThenBy(x => x.WarehouseName)
                .ToList();

            var history = _context.InventoryTransactionLines
                .Where(l => l.ItemId == itemId)
                .OrderByDescending(l => l.InventoryTxn.TxnDate)
                .Skip((historyPage - 1) * historyPageSize)
                .Take(historyPageSize)
                .Select(l => new ItemInventoryHistoryResponse
                {
                    DocNo = l.InventoryTxn.ReferenceType + "-" + l.InventoryTxn.ReferenceId,
                    MovementSign = l.QtyChange >= 0 ? "+" : "-",
                    Qty = Math.Abs(l.QtyChange),
                    TransactionAt = l.InventoryTxn.TxnDate,
                    ActorName = l.InventoryTxn.PostedByNavigation != null ? l.InventoryTxn.PostedByNavigation.FullName : null,
                    Note = l.Note,
                    SourceType = l.InventoryTxn.ReferenceType
                })
                .ToList();

            return new ItemDetailResponse
            {
                ProductInfo = new ItemProductInfoResponse
                {
                    ItemId = item.ItemId,
                    ItemCode = item.ItemCode,
                    ItemName = item.ItemName,
                    ItemType = item.ItemType,
                    Description = item.Description,
                    CategoryName = item.CategoryName,
                    BrandName = item.BrandName,
                    BaseUomName = item.BaseUomName,
                    PackagingSpecName = item.PackagingSpecName,
                    RequiresCo = item.RequiresCo,
                    RequiresCq = item.RequiresCq,
                    IsActive = item.IsActive,
                    CreatedAt = item.CreatedAt,
                    UpdatedAt = item.UpdatedAt,
                    ImageUrl = item.ImageUrl,
                    PurchasePrice = purchasePrice,
                    SalePrice = salePrice
                },
                VariantsByWarehouse = variants,
                InventoryHistory = history
            };
        }

        public async Task<Item> UpdateItemAsync(long itemId, UpdateItemRequest request, long userId = 0)
        {
            if (request == null)
            {
                throw new ArgumentNullException(nameof(request));
            }

            var item = await GetByIdAsync(itemId);
            if (item == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy sản phẩm với ID = {itemId}");
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

            item.ItemName = request.ItemName?.Trim() ?? string.Empty;
            item.ItemType = request.ItemType?.Trim();
            item.Description = request.Description?.Trim();
            item.CategoryId = request.CategoryId;
            item.BrandId = request.BrandId;
            item.BaseUomId = request.BaseUomId;
            item.PackagingSpecId = request.PackagingSpecId;
            item.RequiresCo = request.RequiresCo;
            item.RequiresCq = request.RequiresCq;
            item.IsActive = request.IsActive;
            item.DefaultWarehouseId = request.DefaultWarehouseId;
            item.InventoryAccount = request.InventoryAccount?.Trim();
            item.RevenueAccount = request.RevenueAccount?.Trim();
            item.UpdatedAt = DateTime.UtcNow;

            await UpdateAsync(item);

            // Xử lý cập nhật giá
            var effectiveFrom = request.PriceEffectiveFrom ?? DateOnly.FromDateTime(DateTime.UtcNow);

            // Cập nhật giá mua (Purchase)
            if (request.PurchasePrice.HasValue)
            {
                // Deactive các giá purchase cũ và set EffectiveTo
                var existingPurchasePrices = _context.ItemPrices
                    .Where(p => p.ItemId == itemId && p.PriceType == "Purchase" && p.IsActive)
                    .ToList();
                foreach (var price in existingPurchasePrices)
                {
                    price.IsActive = false;
                    price.EffectiveTo = effectiveFrom.AddDays(-1);
                }

                // Thêm giá purchase mới
                _context.ItemPrices.Add(new ItemPrice
                {
                    ItemId = itemId,
                    PriceType = "Purchase",
                    Amount = request.PurchasePrice.Value,
                    Currency = "VND",
                    EffectiveFrom = effectiveFrom,
                    EffectiveTo = null,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Cập nhật giá bán (Sale)
            if (request.SalePrice.HasValue)
            {
                // Deactive các giá sale cũ và set EffectiveTo
                var existingSalePrices = _context.ItemPrices
                    .Where(p => p.ItemId == itemId && p.PriceType == "Sale" && p.IsActive)
                    .ToList();
                foreach (var price in existingSalePrices)
                {
                    price.IsActive = false;
                    price.EffectiveTo = effectiveFrom.AddDays(-1);
                }

                // Thêm giá sale mới
                _context.ItemPrices.Add(new ItemPrice
                {
                    ItemId = itemId,
                    PriceType = "Sale",
                    Amount = request.SalePrice.Value,
                    Currency = "VND",
                    EffectiveFrom = effectiveFrom,
                    EffectiveTo = null,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            // Audit log
            if (userId > 0)
            {
                await _auditLogService.LogAsync(
                    userId,
                    AuditAction.Update,
                    AuditEntity.Item,
                    item.ItemId,
                    $"Cập nhật sản phẩm {item.ItemCode} - {item.ItemName}");
            }

            return item;
        }

        public async Task<Item> UpdateItemStatusAsync(long itemId, bool isActive, long userId = 0)
        {
            var item = await GetByIdAsync(itemId);
            if (item == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy sản phẩm với ID = {itemId}");
            }

            if (item.IsActive != isActive)
            {
                var oldStatus = item.IsActive;
                item.IsActive = isActive;
                item.UpdatedAt = DateTime.UtcNow;
                await UpdateAsync(item);

                // Audit log
                if (userId > 0)
                {
                    await _auditLogService.LogAsync(
                        userId,
                        AuditAction.Update,
                        AuditEntity.Item,
                        item.ItemId,
                        $"{(isActive ? "Kích hoạt" : "Vô hiệu hóa")} sản phẩm {item.ItemCode}",
                        $"IsActive: {oldStatus}",
                        $"IsActive: {isActive}");
                }
            }

            return item;
        }

        private async Task<ItemDisplayResponse> MapToDisplay(Item item)
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

            // Lấy thông số kỹ thuật
            var parameters = await _context.ItemParameterValues
                .Where(pv => pv.ItemId == itemId)
                .Join(_context.ItemParameters.Where(p => p.IsActive),
                    pv => pv.ParamId,
                    p => p.ParamId,
                    (pv, p) => new ItemParameterResponse1
                    {
                        ParamName = p.ParamName,
                        ParamValue = pv.ParamValue
                    })
                .ToListAsync();

            return new ItemDisplayResponse
            {
                ItemId = itemId,
                ItemCode = item.ItemCode,
                ItemName = item.ItemName,
                ItemType = item.ItemType,
                Description = item.Description,
                CategoryName = categoryName,
                BrandName = item.Brand?.BrandName,
                BaseUomName = item.BaseUom?.UomName,
                PackagingSpecName = item.PackagingSpec?.SpecName,
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
                AvailableQty = availableQty,
                Parameters = parameters
            };
        }

        private async Task<string> GenerateNextItemCodeAsync()
        {
            var itemCodes = await _context.Items
                .Where(i => i.ItemCode.StartsWith("ITM"))
                .Select(i => i.ItemCode)
                .ToListAsync();

            var maxNumber = 0;
            foreach (var code in itemCodes)
            {
                if (code.Length <= 3) continue;

                var numberPart = code.Substring(3);
                if (int.TryParse(numberPart, out var number) && number > maxNumber)
                {
                    maxNumber = number;
                }
            }

            return $"ITM{maxNumber + 1}";
        }
    }
}
