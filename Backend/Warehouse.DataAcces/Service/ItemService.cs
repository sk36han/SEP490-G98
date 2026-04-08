using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
        private readonly ILogger<ItemService> _logger;
        private readonly IAuditLogService _auditLogService;

        public ItemService(Mkiwms5Context context, ILogger<ItemService> logger, IAuditLogService auditLogService) : base(context)
        {
            _logger = logger;
            _auditLogService = auditLogService;
        }

        public async Task<List<RRItemLookupResponse>> GetAvailableItemsByWarehouseAsync(long warehouseId)
        {
            return await _context.InventoryOnHands
                .Include(ioh => ioh.Item)
                .ThenInclude(i => i.BaseUom)
                .Where(ioh => ioh.WarehouseId == warehouseId && ioh.OnHandQty > 0 && ioh.Item.IsActive)
                .Select(ioh => new RRItemLookupResponse
                {
                    ItemId = ioh.ItemId,
                    ItemCode = ioh.Item.ItemCode,
                    ItemName = ioh.Item.ItemName,
                    UomId = ioh.Item.BaseUomId,
                    UomName = ioh.Item.BaseUom.UomName,
                    OnHandQty = ioh.OnHandQty,
                    ReservedQty = ioh.ReservedQty,
                    AvailableQty = ioh.OnHandQty - ioh.ReservedQty
                })
                .ToListAsync();
        }

        public async Task<Item> CreateItemAsync(CreateItemRequest request, long userId = 0)
        {
            _logger.LogInformation("[ItemService] Bat dau tao item moi.");

            if (request == null)
            {
                _logger.LogWarning("[ItemService] Request tao item la null.");
                throw new ArgumentNullException(nameof(request));
            }

            var itemCode = string.IsNullOrWhiteSpace(request.ItemCode)
                ? await GenerateNextItemCodeAsync()
                : request.ItemCode.Trim();

            var itemName = request.ItemName?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(itemName))
            {
                _logger.LogWarning("[ItemService] ItemName khong duoc de trong.");
                throw new InvalidOperationException("ItemName khong duoc de trong.");
            }
            _logger.LogDebug("[ItemService] ItemCode: {ItemCode}, ItemName: {ItemName}", itemCode, itemName);

            var duplicatedCode = _context.Items.Any(i => i.ItemCode == itemCode);
            if (duplicatedCode)
            {
                _logger.LogWarning("[ItemService] ItemCode da ton tai: {ItemCode}", itemCode);
                throw new InvalidOperationException($"ItemCode '{itemCode}' da ton tai.");
            }

            var categoryExists = _context.ItemCategories.Any(c => c.CategoryId == request.CategoryId && c.IsActive);
            if (!categoryExists)
            {
                _logger.LogWarning("[ItemService] Category khong ton tai hoac inactive: {CategoryId}", request.CategoryId);
                throw new InvalidOperationException("Category khong ton tai hoac da bi vo hieu hoa.");
            }

            var uomExists = _context.UnitOfMeasures.Any(u => u.UomId == request.BaseUomId && u.IsActive);
            if (!uomExists)
            {
                _logger.LogWarning("[ItemService] BaseUom khong ton tai hoac inactive: {BaseUomId}", request.BaseUomId);
                throw new InvalidOperationException("Don vi tinh co ban khong ton tai hoac da bi vo hieu hoa.");
            }

            if (request.BrandId.HasValue)
            {
                var brandExists = _context.Brands.Any(b => b.BrandId == request.BrandId.Value && b.IsActive);
                if (!brandExists)
                {
                    _logger.LogWarning("[ItemService] Brand khong ton tai hoac inactive: {BrandId}", request.BrandId);
                    throw new InvalidOperationException("Brand khong ton tai hoac da bi vo hieu hoa.");
                }
                _logger.LogDebug("[ItemService] BrandId: {BrandId}", request.BrandId);
            }

            if (request.PackagingSpecId.HasValue)
            {
                var packagingExists = _context.PackagingSpecs.Any(p => p.PackagingSpecId == request.PackagingSpecId.Value && p.IsActive);
                if (!packagingExists)
                {
                    _logger.LogWarning("[ItemService] PackagingSpec khong ton tai hoac inactive: {PackagingSpecId}", request.PackagingSpecId);
                    throw new InvalidOperationException("PackagingSpec khong ton tai hoac da bi vo hieu hoa.");
                }
                _logger.LogDebug("[ItemService] PackagingSpecId: {PackagingSpecId}", request.PackagingSpecId);
            }

            if (request.DefaultWarehouseId.HasValue)
            {
                var warehouseExists = _context.Warehouses.Any(w => w.WarehouseId == request.DefaultWarehouseId.Value && w.IsActive);
                if (!warehouseExists)
                {
                    _logger.LogWarning("[ItemService] DefaultWarehouse khong ton tai hoac inactive: {DefaultWarehouseId}", request.DefaultWarehouseId);
                    throw new InvalidOperationException("DefaultWarehouse khong ton tai hoac da bi vo hieu hoa.");
                }
                _logger.LogDebug("[ItemService] DefaultWarehouseId: {DefaultWarehouseId}", request.DefaultWarehouseId);
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

            _logger.LogDebug("[ItemService] Tao item entity: ItemCode={ItemCode}, ItemName={ItemName}, CategoryId={CategoryId}, BaseUomId={BaseUomId}",
                entity.ItemCode, entity.ItemName, entity.CategoryId, entity.BaseUomId);

            await CreateAsync(entity);
            _logger.LogDebug("[ItemService] Item da duoc tao trong DB, ItemId={ItemId}", entity.ItemId);

            if (request.ParameterValues != null && request.ParameterValues.Any())
            {
                _logger.LogDebug("[ItemService] Them {Count} thong so ky thuat cho item {ItemId}", request.ParameterValues.Count, entity.ItemId);
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
                if (request.InitialPurchasePrice.Value < 0)
                {
                    _logger.LogWarning("[ItemService] InitialPurchasePrice khong duoc am: {Amount}", request.InitialPurchasePrice.Value);
                    throw new InvalidOperationException("InitialPurchasePrice khong duoc am.");
                }
                _logger.LogDebug("[ItemService] Them InitialPurchasePrice={Amount} cho item {ItemId}, EffectiveFrom={EffectiveFrom}",
                    request.InitialPurchasePrice.Value, entity.ItemId, effectiveFrom);
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
            _logger.LogInformation("[ItemService] Tao item thanh cong: ItemId={ItemId}, ItemCode={ItemCode}, ItemName={ItemName}",
                entity.ItemId, entity.ItemCode, entity.ItemName);

            // Audit log
            if (userId > 0)
            {
                await _auditLogService.LogAsync(
                    userId,
                    AuditAction.Create,
                    AuditEntity.Item,
                    entity.ItemId,
                    $"Tao san pham {entity.ItemCode} - {entity.ItemName}");
            }

            return entity;
        }

        public async Task<List<ItemDisplayResponse>> GetAllItemsDisplayAsync()
        {
            _logger.LogInformation("[ItemService] Lay danh sach item hien thi.");

            var items = await _context.Items
                .Include(i => i.Brand)
                .Include(i => i.BaseUom)
                .Include(i => i.PackagingSpec)
                .Include(i => i.Category)
                .Where(i => i.IsActive)
                .ToListAsync();

            _logger.LogDebug("[ItemService] Tim thay {Count} item active", items.Count);

            var result = new List<ItemDisplayResponse>(items.Count);
            foreach (var item in items)
            {
                var mapped = await MapToDisplay(item);
                result.Add(mapped);
            }

            _logger.LogInformation("[ItemService] Tra ve {Count} item", result.Count);
            return result;
        }

        public async Task<ItemDisplayResponse?> GetItemDisplayByIdAsync(long itemId)
        {
            _logger.LogInformation("[ItemService] Lay item hien thi theo ID={ItemId}", itemId);

            var item = await GetByIdAsync(itemId);
            if (item == null)
            {
                _logger.LogWarning("[ItemService] Khong tim thay item ID={ItemId}", itemId);
                return null;
            }

            var mapped = await MapToDisplay(item);
            _logger.LogDebug("[ItemService] Lay item thanh cong: ItemCode={ItemCode}", mapped.ItemCode);
            return mapped;
        }

        public async Task<ItemDetailResponse?> GetItemDetailByIdAsync(long itemId, int historyPage = 1, int historyPageSize = 20)
        {
            _logger.LogInformation("[ItemService] Lay chi tiet item ID={ItemId}, HistoryPage={Page}, HistoryPageSize={PageSize}",
                itemId, historyPage, historyPageSize);

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
                _logger.LogWarning("[ItemService] Khong tim thay item ID={ItemId}", itemId);
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

            _logger.LogDebug("[ItemService] Tim thay {VariantCount} warehouse variants cho item {ItemId}", variants.Count, itemId);

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

            _logger.LogDebug("[ItemService] Tim thay {HistoryCount} lich su ton kho cho item {ItemId}", history.Count, itemId);
            _logger.LogInformation("[ItemService] Lay chi tiet item thanh cong: ItemCode={ItemCode}", item.ItemCode);

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
            _logger.LogInformation("[ItemService] Bat dau cap nhat item ID={ItemId}", itemId);

            if (request == null)
            {
                _logger.LogWarning("[ItemService] Request cap nhat item la null.");
                throw new ArgumentNullException(nameof(request));
            }

            var item = await GetByIdAsync(itemId);
            if (item == null)
            {
                _logger.LogWarning("[ItemService] Khong tim thay item ID={ItemId}", itemId);
                throw new KeyNotFoundException($"Khong tim thay san pham voi ID = {itemId}");
            }

            _logger.LogDebug("[ItemService] Tim thay item: ItemCode={ItemCode}, ItemName={ItemName}", item.ItemCode, item.ItemName);

            var categoryExists = _context.ItemCategories.Any(c => c.CategoryId == request.CategoryId && c.IsActive);
            if (!categoryExists)
            {
                _logger.LogWarning("[ItemService] Category khong ton tai hoac inactive: {CategoryId}", request.CategoryId);
                throw new InvalidOperationException("Category khong ton tai hoac da bi vo hieu hoa.");
            }

            var uomExists = _context.UnitOfMeasures.Any(u => u.UomId == request.BaseUomId && u.IsActive);
            if (!uomExists)
            {
                _logger.LogWarning("[ItemService] BaseUom khong ton tai hoac inactive: {BaseUomId}", request.BaseUomId);
                throw new InvalidOperationException("Don vi tinh co ban khong ton tai hoac da bi vo hieu hoa.");
            }

            if (request.BrandId.HasValue)
            {
                var brandExists = _context.Brands.Any(b => b.BrandId == request.BrandId.Value && b.IsActive);
                if (!brandExists)
                {
                    _logger.LogWarning("[ItemService] Brand khong ton tai hoac inactive: {BrandId}", request.BrandId);
                    throw new InvalidOperationException("Brand khong ton tai hoac da bi vo hieu hoa.");
                }
                _logger.LogDebug("[ItemService] BrandId: {BrandId}", request.BrandId);
            }

            if (request.PackagingSpecId.HasValue)
            {
                var packagingExists = _context.PackagingSpecs.Any(p => p.PackagingSpecId == request.PackagingSpecId.Value && p.IsActive);
                if (!packagingExists)
                {
                    _logger.LogWarning("[ItemService] PackagingSpec khong ton tai hoac inactive: {PackagingSpecId}", request.PackagingSpecId);
                    throw new InvalidOperationException("PackagingSpec khong ton tai hoac da bi vo hieu hoa.");
                }
                _logger.LogDebug("[ItemService] PackagingSpecId: {PackagingSpecId}", request.PackagingSpecId);
            }

            if (request.DefaultWarehouseId.HasValue)
            {
                var warehouseExists = _context.Warehouses.Any(w => w.WarehouseId == request.DefaultWarehouseId.Value && w.IsActive);
                if (!warehouseExists)
                {
                    _logger.LogWarning("[ItemService] DefaultWarehouse khong ton tai hoac inactive: {DefaultWarehouseId}", request.DefaultWarehouseId);
                    throw new InvalidOperationException("DefaultWarehouse khong ton tai hoac da bi vo hieu hoa.");
                }
                _logger.LogDebug("[ItemService] DefaultWarehouseId: {DefaultWarehouseId}", request.DefaultWarehouseId);
            }

            var updatedItemName = request.ItemName?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(updatedItemName))
            {
                _logger.LogWarning("[ItemService] ItemName khong duoc de trong.");
                throw new InvalidOperationException("ItemName khong duoc de trong.");
            }
            item.ItemName = updatedItemName;
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

            _logger.LogDebug("[ItemService] Cap nhat thong tin item: ItemName={ItemName}, CategoryId={CategoryId}, BaseUomId={BaseUomId}",
                item.ItemName, item.CategoryId, item.BaseUomId);

            await UpdateAsync(item);

            var effectiveFrom = request.PriceEffectiveFrom ?? DateOnly.FromDateTime(DateTime.UtcNow);

            if (request.PurchasePrice.HasValue)
            {
                if (request.PurchasePrice.Value < 0)
                {
                    _logger.LogWarning("[ItemService] PurchasePrice khong duoc am: {Amount}", request.PurchasePrice.Value);
                    throw new InvalidOperationException("PurchasePrice khong duoc am.");
                }
                _logger.LogDebug("[ItemService] Cap nhat PurchasePrice={Amount} cho item {ItemId}, EffectiveFrom={EffectiveFrom}",
                    request.PurchasePrice.Value, itemId, effectiveFrom);

                var existingPurchasePrices = _context.ItemPrices
                    .Where(p => p.ItemId == itemId && p.PriceType == "Purchase" && p.IsActive)
                    .ToList();
                foreach (var price in existingPurchasePrices)
                {
                    price.IsActive = false;
                    price.EffectiveTo = effectiveFrom.AddDays(-1);
                }
                _logger.LogDebug("[ItemService] Da deactive {Count} PurchasePrice cu", existingPurchasePrices.Count);

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

            if (request.SalePrice.HasValue)
            {
                _logger.LogDebug("[ItemService] Cap nhat SalePrice={Amount} cho item {ItemId}, EffectiveFrom={EffectiveFrom}",
                    request.SalePrice.Value, itemId, effectiveFrom);

                var existingSalePrices = _context.ItemPrices
                    .Where(p => p.ItemId == itemId && p.PriceType == "Sale" && p.IsActive)
                    .ToList();
                foreach (var price in existingSalePrices)
                {
                    price.IsActive = false;
                    price.EffectiveTo = effectiveFrom.AddDays(-1);
                }
                _logger.LogDebug("[ItemService] Da deactive {Count} SalePrice cu", existingSalePrices.Count);

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
            _logger.LogInformation("[ItemService] Cap nhat item thanh cong: ItemId={ItemId}, ItemCode={ItemCode}, ItemName={ItemName}",
                item.ItemId, item.ItemCode, item.ItemName);

            // Audit log
            if (userId > 0)
            {
                await _auditLogService.LogAsync(
                    userId,
                    AuditAction.Update,
                    AuditEntity.Item,
                    item.ItemId,
                    $"Cap nhat san pham {item.ItemCode} - {item.ItemName}");
            }

            return item;
        }

        public async Task<Item> UpdateItemStatusAsync(long itemId, bool isActive, long userId = 0)
        {
            _logger.LogInformation("[ItemService] Cap nhat trang thai item ID={ItemId}, IsActive={IsActive}", itemId, isActive);

            var item = await GetByIdAsync(itemId);
            if (item == null)
            {
                _logger.LogWarning("[ItemService] Khong tim thay item ID={ItemId}", itemId);
                throw new KeyNotFoundException($"Khong tim thay san pham voi ID = {itemId}");
            }

            if (item.IsActive != isActive)
            {
                _logger.LogDebug("[ItemService] Thay doi trang thai item: {OldStatus} -> {NewStatus}", item.IsActive, isActive);
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
                        $"{(isActive ? "Kich hoat" : "Vo hieu hoa")} san pham {item.ItemCode}",
                        $"IsActive: {oldStatus}",
                        $"IsActive: {isActive}");
                }
            }
            else
            {
                _logger.LogDebug("[ItemService] Trang thai khong thay doi, bo qua.");
            }

            _logger.LogInformation("[ItemService] Cap nhat trang thai item thanh cong: ItemId={ItemId}, IsActive={IsActive}", item.ItemId, item.IsActive);
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
                if (code == null || code.Length <= 3) continue;

                var numberPart = code.Substring(3);
                if (int.TryParse(numberPart, out var number) && number > maxNumber)
                {
                    maxNumber = number;
                }
            }

            var nextNumber = maxNumber + 1;
            return $"ITM{nextNumber:D6}";
        }

        public async Task<(byte[] content, string fileName)> ExportItemListExcelAsync()
        {
            var items = await _context.Items
                .Include(i => i.Category)
                .Include(i => i.Brand)
                .Include(i => i.BaseUom)
                .Include(i => i.PackagingSpec)
                .Include(i => i.InventoryOnHands)
                .AsNoTracking()
                .OrderBy(i => i.ItemCode)
                .ToListAsync();

            using var workbook = new ClosedXML.Excel.XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Items");

            // ── Header ──
            var headers = new[]
            {
                "STT", "Mã vật tư", "Tên vật tư", "Loại", "Danh mục",
                "Thương hiệu", "Đơn vị tính", "Quy cách", "Yêu cầu CO",
                "Yêu cầu CQ", "Giá mua", "Giá bán",
                "Tồn kho", "Đã đặt", "Khả dụng",
                "Trạng thái", "Ngày tạo"
            };

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = worksheet.Cell(1, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = ClosedXML.Excel.XLColor.FromHtml("#4472C4");
                cell.Style.Font.FontColor = ClosedXML.Excel.XLColor.White;
                cell.Style.Alignment.Horizontal = ClosedXML.Excel.XLAlignmentHorizontalValues.Center;
            }

            // ── Data ──
            int row = 2;
            int stt = 1;
            foreach (var item in items)
            {
                var onHand    = item.InventoryOnHands?.Sum(x => x.OnHandQty) ?? 0;
                var reserved  = item.InventoryOnHands?.Sum(x => x.ReservedQty) ?? 0;
                var available = onHand - reserved;

                worksheet.Cell(row, 1).Value  = stt++;
                worksheet.Cell(row, 2).Value  = item.ItemCode;
                worksheet.Cell(row, 3).Value  = item.ItemName;
                worksheet.Cell(row, 4).Value  = item.ItemType ?? "";
                worksheet.Cell(row, 5).Value  = item.Category?.CategoryName ?? "";
                worksheet.Cell(row, 6).Value  = item.Brand?.BrandName ?? "";
                worksheet.Cell(row, 7).Value  = item.BaseUom?.UomName ?? "";
                worksheet.Cell(row, 8).Value  = item.PackagingSpec?.SpecName ?? "";
                worksheet.Cell(row, 9).Value  = item.RequiresCo ? "Có" : "Không";
                worksheet.Cell(row, 10).Value = item.RequiresCq ? "Có" : "Không";

                // Giá mua / bán — lấy giá hiệu lực mới nhất theo PriceType
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var allPrices = await _context.ItemPrices
                    .Where(p => p.ItemId == item.ItemId && p.IsActive && p.EffectiveFrom <= today)
                    .ToListAsync();

                var purchasePrice = allPrices
                    .Where(p => p.PriceType == "Purchase")
                    .OrderByDescending(p => p.EffectiveFrom)
                    .FirstOrDefault()?.Amount ?? 0;

                var salePrice = allPrices
                    .Where(p => p.PriceType == "Sale")
                    .OrderByDescending(p => p.EffectiveFrom)
                    .FirstOrDefault()?.Amount ?? 0;

                worksheet.Cell(row, 11).Value = (double)purchasePrice;
                worksheet.Cell(row, 12).Value = (double)salePrice;
                worksheet.Cell(row, 11).Style.NumberFormat.Format = "#,##0";
                worksheet.Cell(row, 12).Style.NumberFormat.Format = "#,##0";

                worksheet.Cell(row, 13).Value = (double)onHand;
                worksheet.Cell(row, 14).Value = (double)reserved;
                worksheet.Cell(row, 15).Value = (double)available;

                worksheet.Cell(row, 16).Value = item.IsActive ? "Hoạt động" : "Ngừng hoạt động";
                worksheet.Cell(row, 17).Value = item.CreatedAt.ToString("dd/MM/yyyy");

                // Tô màu dòng xen kẽ
                if (row % 2 == 0)
                {
                    worksheet.Row(row).Style.Fill.BackgroundColor = ClosedXML.Excel.XLColor.FromHtml("#F2F2F2");
                }

                row++;
            }

            worksheet.Columns().AdjustToContents();

            // Freeze header row
            worksheet.SheetView.FreezeRows(1);

            using var stream = new System.IO.MemoryStream();
            workbook.SaveAs(stream);
            var content = stream.ToArray();
            var fileName = $"Items_Export_{DateTime.Now:yyyyMMddHHmmss}.xlsx";

            return (content, fileName);
        }
    }
}
