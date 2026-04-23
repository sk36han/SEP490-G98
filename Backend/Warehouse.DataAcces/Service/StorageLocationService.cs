using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
    public class StorageLocationService : IStorageLocationService
    {
        private readonly Mkiwms5Context _context;
        private readonly IAuditLogService _auditLogService;

        public StorageLocationService(Mkiwms5Context context, IAuditLogService auditLogService)
        {
            _context = context;
            _auditLogService = auditLogService;
        }

        public async Task<PagedResponse<StorageLocationResponse>> GetStorageLocationsAsync(
            int page,
            int pageSize,
            long? warehouseId,
            string? keyword,
            bool? isActive,
            bool? hasStock,
            string? itemCode,
            decimal? minQty,
            decimal? maxQty)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var query = _context.StorageLocations
                .AsNoTracking()
                .Include(x => x.Warehouse)
                .AsQueryable();

            if (warehouseId.HasValue)
            {
                query = query.Where(x => x.WarehouseId == warehouseId.Value);
            }

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim();
                query = query.Where(x =>
                    x.LocationCode.Contains(kw) ||
                    (x.LocationName != null && x.LocationName.Contains(kw)));
            }

            if (isActive.HasValue)
            {
                query = query.Where(x => x.IsActive == isActive.Value);
            }

            var applyAdvancedFilters = hasStock.HasValue
                || !string.IsNullOrWhiteSpace(itemCode)
                || minQty.HasValue
                || maxQty.HasValue;

            var preComputedLotGroups = new List<(long LocationId, long ItemId, decimal Qty)>();
            var preComputedItemCodeMap = new Dictionary<long, string>();

            if (applyAdvancedFilters)
            {
                var baseLocationIds = await query.Select(x => x.LocationId).ToListAsync();
                if (baseLocationIds.Count == 0)
                {
                    return new PagedResponse<StorageLocationResponse>
                    {
                        Page = page,
                        PageSize = pageSize,
                        TotalItems = 0,
                        Items = new List<StorageLocationResponse>()
                    };
                }

                preComputedLotGroups = await _context.InventoryLots
                    .AsNoTracking()
                    .Where(l => l.LocationId != null
                                && baseLocationIds.Contains(l.LocationId.Value)
                                && l.Quantity > 0)
                    .GroupBy(l => new { LocationId = l.LocationId!.Value, l.ItemId })
                    .Select(g => new ValueTuple<long, long, decimal>(
                        g.Key.LocationId,
                        g.Key.ItemId,
                        g.Sum(x => x.Quantity)))
                    .ToListAsync();

                var allItemIds = preComputedLotGroups.Select(x => x.ItemId).Distinct().ToList();
                if (allItemIds.Count > 0)
                {
                    preComputedItemCodeMap = await _context.Items
                        .AsNoTracking()
                        .Where(i => allItemIds.Contains(i.ItemId))
                        .ToDictionaryAsync(i => i.ItemId, i => i.ItemCode);
                }

                var totalByLocation = preComputedLotGroups
                    .GroupBy(x => x.LocationId)
                    .ToDictionary(g => g.Key, g => g.Sum(x => x.Qty));

                var candidateLocationIds = baseLocationIds
                    .Where(locationId =>
                    {
                        var totalQty = totalByLocation.TryGetValue(locationId, out var qty) ? qty : 0m;

                        if (hasStock.HasValue && hasStock.Value != (totalQty > 0))
                            return false;
                        if (minQty.HasValue && totalQty < minQty.Value)
                            return false;
                        if (maxQty.HasValue && totalQty > maxQty.Value)
                            return false;

                        if (!string.IsNullOrWhiteSpace(itemCode))
                        {
                            var codeFilter = itemCode.Trim();
                            var containsItem = preComputedLotGroups
                                .Where(x => x.LocationId == locationId)
                                .Any(x =>
                                    preComputedItemCodeMap.TryGetValue(x.ItemId, out var code)
                                    && code.Contains(codeFilter, StringComparison.OrdinalIgnoreCase));
                            if (!containsItem)
                                return false;
                        }

                        return true;
                    })
                    .ToList();

                query = query.Where(x => candidateLocationIds.Contains(x.LocationId));
            }

            var totalItems = await query.CountAsync();

            var entities = await query
                .OrderBy(x => x.WarehouseId)
                .ThenBy(x => x.LocationCode)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = entities.Select(ToResponse).ToList();

            var locationIds = items.Select(x => x.LocationId).ToList();
            if (locationIds.Count > 0)
            {
                var lotGroups = preComputedLotGroups.Count > 0
                    ? preComputedLotGroups
                        .Where(x => locationIds.Contains(x.LocationId))
                        .Select(x => new { x.LocationId, x.ItemId, x.Qty })
                        .ToList()
                    : await _context.InventoryLots
                        .AsNoTracking()
                        .Where(l => l.LocationId != null
                                    && locationIds.Contains(l.LocationId.Value)
                                    && l.Quantity > 0)
                        .GroupBy(l => new { LocationId = l.LocationId!.Value, l.ItemId })
                        .Select(g => new
                        {
                            g.Key.LocationId,
                            g.Key.ItemId,
                            Qty = g.Sum(x => x.Quantity)
                        })
                        .ToListAsync();

                var itemCodeMap = preComputedItemCodeMap;
                if (itemCodeMap.Count == 0)
                {
                    var itemIds = lotGroups.Select(x => x.ItemId).Distinct().ToList();
                    itemCodeMap = await _context.Items
                        .AsNoTracking()
                        .Where(i => itemIds.Contains(i.ItemId))
                        .ToDictionaryAsync(i => i.ItemId, i => i.ItemCode);
                }

                var groupedByLocation = lotGroups
                    .GroupBy(x => x.LocationId)
                    .ToDictionary(
                        g => g.Key,
                        g => new
                        {
                            TotalQty = g.Sum(x => x.Qty),
                            Summary = string.Join(", ",
                                g.OrderByDescending(x => x.Qty)
                                 .Take(2)
                                 .Select(x =>
                                     $"{(itemCodeMap.TryGetValue(x.ItemId, out var code) ? code : $"ITEM#{x.ItemId}")}: {FormatQty(x.Qty)}"))
                        });

                foreach (var item in items)
                {
                    if (groupedByLocation.TryGetValue(item.LocationId, out var value))
                    {
                        item.CurrentQty = value.TotalQty;
                        item.CurrentItemsSummary = value.Summary;
                    }
                    else
                    {
                        item.CurrentQty = 0;
                        item.CurrentItemsSummary = null;
                    }
                }
            }

            return new PagedResponse<StorageLocationResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = items
            };
        }

        public async Task<PagedResponse<LocationLedgerEntryResponse>> GetLocationLedgerAsync(
            long locationId,
            int page,
            int pageSize)
        {
            if (locationId <= 0)
                throw new ArgumentException("LocationId phải lớn hơn 0.");
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var locationExists = await _context.StorageLocations
                .AsNoTracking()
                .AnyAsync(x => x.LocationId == locationId);
            if (!locationExists)
                throw new KeyNotFoundException("Không tìm thấy vị trí kho.");

            var lines = await _context.InventoryTransactionLines
                .AsNoTracking()
                .Include(x => x.InventoryTxn)
                .Include(x => x.Item)
                .Include(x => x.Lot)
                    .ThenInclude(l => l!.Location)
                .Where(x =>
                    (x.Lot != null && x.Lot.LocationId == locationId) ||
                    (x.LotId == null && x.InventoryTxn.ReferenceType == "GRN"))
                .OrderBy(x => x.InventoryTxn.TxnDate)
                .ThenBy(x => x.InventoryTxnLineId)
                .Select(x => new
                {
                    x.InventoryTxnLineId,
                    x.QtyChange,
                    x.Note,
                    x.LotId,
                    x.ItemId,
                    x.Item.ItemCode,
                    x.Item.ItemName,
                    TxnDate = x.InventoryTxn.TxnDate,
                    x.InventoryTxn.TxnType,
                    x.InventoryTxn.ReferenceType,
                    x.InventoryTxn.ReferenceId,
                    x.InventoryTxn.PostedBy
                })
                .ToListAsync();

            var locationLots = await _context.InventoryLots
                .AsNoTracking()
                .Include(l => l.Grnline)
                .Where(l => l.LocationId == locationId
                            && l.GrnlineId != null
                            && l.Grnline != null)
                .Select(l => new
                {
                    l.LotId,
                    l.ItemId,
                    l.Quantity,
                    GrnId = l.Grnline!.Grnid
                })
                .ToListAsync();

            var lineCandidates = lines
                .Where(x =>
                    (x.LotId != null) ||
                    (x.ReferenceType == "GRN"
                     && locationLots.Any(l => l.GrnId == x.ReferenceId && l.ItemId == x.ItemId)))
                .ToList();

            var postedByIds = lineCandidates
                .Where(x => x.PostedBy.HasValue)
                .Select(x => x.PostedBy!.Value)
                .Distinct()
                .ToList();
            var userMap = await _context.Users
                .AsNoTracking()
                .Where(u => postedByIds.Contains(u.UserId))
                .ToDictionaryAsync(u => u.UserId, u => u.FullName);

            var grnIds = lineCandidates.Where(x => x.ReferenceType == "GRN").Select(x => x.ReferenceId).Distinct().ToList();
            var gdnIds = lineCandidates.Where(x => x.ReferenceType == "GDN").Select(x => x.ReferenceId).Distinct().ToList();
            var adjIds = lineCandidates.Where(x => x.ReferenceType == "ADJ").Select(x => x.ReferenceId).Distinct().ToList();

            var grnMap = await _context.GoodsReceiptNotes
                .AsNoTracking()
                .Where(x => grnIds.Contains(x.Grnid))
                .ToDictionaryAsync(x => x.Grnid, x => x.Grncode);
            var gdnMap = await _context.GoodsDeliveryNotes
                .AsNoTracking()
                .Where(x => gdnIds.Contains(x.Gdnid))
                .ToDictionaryAsync(x => x.Gdnid, x => x.Gdncode);
            var adjMap = await _context.InventoryAdjustmentRequests
                .AsNoTracking()
                .Where(x => adjIds.Contains(x.AdjustmentId))
                .ToDictionaryAsync(x => x.AdjustmentId, x => x.AdjustmentCode);

            var ledgerAsc = new List<LocationLedgerEntryResponse>();
            decimal running = 0m;
            foreach (var line in lineCandidates)
            {
                var isDirectByLot = line.LotId != null;
                var matchedLot = !isDirectByLot
                    ? locationLots.FirstOrDefault(l =>
                        l.GrnId == line.ReferenceId
                        && l.ItemId == line.ItemId
                        && (l.Quantity == line.QtyChange || line.QtyChange == 0 || l.Quantity > 0))
                    : null;

                if (!isDirectByLot && matchedLot == null)
                {
                    continue;
                }

                var before = running;
                var after = before + line.QtyChange;
                running = after;

                string? voucherCode = line.ReferenceType switch
                {
                    "GRN" when grnMap.TryGetValue(line.ReferenceId, out var grnCode) => grnCode,
                    "GDN" when gdnMap.TryGetValue(line.ReferenceId, out var gdnCode) => gdnCode,
                    "ADJ" when adjMap.TryGetValue(line.ReferenceId, out var adjCode) => adjCode,
                    _ => $"{line.ReferenceType}-{line.ReferenceId}"
                };

                ledgerAsc.Add(new LocationLedgerEntryResponse
                {
                    InventoryTxnLineId = line.InventoryTxnLineId,
                    TxnDate = line.TxnDate,
                    VoucherCode = voucherCode,
                    ReferenceType = line.ReferenceType,
                    ReferenceId = line.ReferenceId,
                    TxnType = line.TxnType,
                    ItemId = line.ItemId,
                    ItemCode = line.ItemCode,
                    ItemName = line.ItemName,
                    QtyChange = line.QtyChange,
                    BalanceBefore = before,
                    BalanceAfter = after,
                    PerformedByName = line.PostedBy.HasValue && userMap.TryGetValue(line.PostedBy.Value, out var fullName)
                        ? fullName
                        : "Hệ thống",
                    Note = line.Note
                });
            }

            var ledgerDesc = ledgerAsc
                .OrderByDescending(x => x.TxnDate)
                .ThenByDescending(x => x.InventoryTxnLineId)
                .ToList();

            var totalItems = ledgerDesc.Count;
            var pageItems = ledgerDesc
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return new PagedResponse<LocationLedgerEntryResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = pageItems
            };
        }

        public async Task<StorageLocationResponse> GetStorageLocationByIdAsync(long id)
        {
            if (id <= 0)
                throw new ArgumentException("LocationId phải lớn hơn 0.");

            var entity = await _context.StorageLocations
                .AsNoTracking()
                .Include(x => x.Warehouse)
                .FirstOrDefaultAsync(x => x.LocationId == id);

            if (entity == null)
                throw new KeyNotFoundException("Không tìm thấy vị trí kho.");

            return ToResponse(entity);
        }

        public async Task<StorageLocationResponse> CreateStorageLocationAsync(
            CreateStorageLocationRequest request,
            long currentUserId)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));
            if (currentUserId <= 0)
                throw new ArgumentException("Người dùng không hợp lệ.");

            var warehouseExists = await _context.Warehouses
                .AnyAsync(w => w.WarehouseId == request.WarehouseId);
            if (!warehouseExists)
                throw new KeyNotFoundException("Không tìm thấy kho.");

            var code = request.LocationCode.Trim();
            var duplicate = await _context.StorageLocations.AnyAsync(x =>
                x.WarehouseId == request.WarehouseId &&
                x.LocationCode.ToUpper() == code.ToUpper());
            if (duplicate)
                throw new InvalidOperationException("Mã vị trí đã tồn tại trong kho này.");

            var entity = new StorageLocation
            {
                WarehouseId = request.WarehouseId,
                LocationCode = code,
                LocationName = request.LocationName?.Trim(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.StorageLocations.Add(entity);
            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Create,
                AuditEntity.Warehouse,
                entity.LocationId,
                $"Tạo vị trí kho '{entity.LocationCode}' cho kho #{entity.WarehouseId}");

            var created = await _context.StorageLocations
                .AsNoTracking()
                .Include(x => x.Warehouse)
                .FirstAsync(x => x.LocationId == entity.LocationId);

            return ToResponse(created);
        }

        public async Task<StorageLocationResponse> UpdateStorageLocationAsync(
            long id,
            UpdateStorageLocationRequest request,
            long currentUserId)
        {
            if (id <= 0)
                throw new ArgumentException("LocationId phải lớn hơn 0.");
            if (request == null)
                throw new ArgumentNullException(nameof(request));
            if (currentUserId <= 0)
                throw new ArgumentException("Người dùng không hợp lệ.");

            var entity = await _context.StorageLocations
                .FirstOrDefaultAsync(x => x.LocationId == id);

            if (entity == null)
                throw new KeyNotFoundException("Không tìm thấy vị trí kho.");

            var newCode = request.LocationCode.Trim();
            var duplicate = await _context.StorageLocations.AnyAsync(x =>
                x.LocationId != id &&
                x.WarehouseId == entity.WarehouseId &&
                x.LocationCode.ToUpper() == newCode.ToUpper());
            if (duplicate)
                throw new InvalidOperationException("Mã vị trí đã tồn tại trong kho này.");

            var oldValues = JsonSerializer.Serialize(new
            {
                entity.LocationCode,
                entity.LocationName,
                entity.IsActive
            });

            entity.LocationCode = newCode;
            entity.LocationName = request.LocationName?.Trim();
            entity.IsActive = request.IsActive;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var newValues = JsonSerializer.Serialize(new
            {
                entity.LocationCode,
                entity.LocationName,
                entity.IsActive
            });

            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Update,
                AuditEntity.Warehouse,
                entity.LocationId,
                $"Cập nhật vị trí kho '{entity.LocationCode}'",
                oldValues,
                newValues);

            var updated = await _context.StorageLocations
                .AsNoTracking()
                .Include(x => x.Warehouse)
                .FirstAsync(x => x.LocationId == entity.LocationId);

            return ToResponse(updated);
        }

        public async Task<StorageLocationResponse> ToggleStorageLocationStatusAsync(
            long id,
            bool isActive,
            long currentUserId)
        {
            if (id <= 0)
                throw new ArgumentException("LocationId phải lớn hơn 0.");
            if (currentUserId <= 0)
                throw new ArgumentException("Người dùng không hợp lệ.");

            var entity = await _context.StorageLocations
                .FirstOrDefaultAsync(x => x.LocationId == id);
            if (entity == null)
                throw new KeyNotFoundException("Không tìm thấy vị trí kho.");

            if (entity.IsActive == isActive)
                throw new InvalidOperationException("Trạng thái vị trí không thay đổi.");

            entity.IsActive = isActive;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Update,
                AuditEntity.Warehouse,
                entity.LocationId,
                $"{(isActive ? "Kích hoạt" : "Vô hiệu hóa")} vị trí kho '{entity.LocationCode}'");

            var updated = await _context.StorageLocations
                .AsNoTracking()
                .Include(x => x.Warehouse)
                .FirstAsync(x => x.LocationId == entity.LocationId);

            return ToResponse(updated);
        }

        private static string FormatQty(decimal qty)
            => qty % 1 == 0 ? decimal.Truncate(qty).ToString() : qty.ToString("0.###");

        private static StorageLocationResponse ToResponse(StorageLocation entity) => new()
        {
            LocationId = entity.LocationId,
            WarehouseId = entity.WarehouseId,
            WarehouseName = entity.Warehouse?.WarehouseName,
            LocationCode = entity.LocationCode,
            LocationName = entity.LocationName,
            IsActive = entity.IsActive
        };
    }
}
