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
            bool? isActive)
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
                var lotGroups = await _context.InventoryLots
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

                var itemIds = lotGroups.Select(x => x.ItemId).Distinct().ToList();
                var itemCodeMap = await _context.Items
                    .AsNoTracking()
                    .Where(i => itemIds.Contains(i.ItemId))
                    .ToDictionaryAsync(i => i.ItemId, i => i.ItemCode);

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
