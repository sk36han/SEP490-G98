using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service;

public class ItemWarehousePolicyService : IItemWarehousePolicyService
{
    private readonly Mkiwms5Context _context;

    public ItemWarehousePolicyService(Mkiwms5Context context)
    {
        _context = context;
    }

    public async Task<ItemWarehousePolicyListResponse> GetListAsync(ItemWarehousePolicyFilterRequest filter)
    {
        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize < 1 ? 20 : filter.PageSize;

        // Join ItemWarehousePolicy + InventoryOnHand + Item + Warehouse
        var query = from p in _context.ItemWarehousePolicies
                    join i in _context.Items on p.ItemId equals i.ItemId into itemGroup
                    from item in itemGroup.DefaultIfEmpty()
                    join wh in _context.Warehouses on p.WarehouseId equals wh.WarehouseId into whGroup
                    from wh in whGroup.DefaultIfEmpty()
                    join ioh in _context.InventoryOnHands
                        on new { p.ItemId, p.WarehouseId } equals new { ioh.ItemId, ioh.WarehouseId } into iohGroup
                    from ioh in iohGroup.DefaultIfEmpty()
                    select new { Policy = p, Item = item!, Warehouse = wh!, Ioh = ioh! };

        // Filter by keyword
        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.ToLower();
            query = query.Where(x =>
                (x.Item != null && (x.Item.ItemCode.ToLower().Contains(kw) || x.Item.ItemName.ToLower().Contains(kw))));
        }

        // Filter by warehouse
        if (filter.WarehouseId.HasValue && filter.WarehouseId.Value > 0)
        {
            query = query.Where(x => x.Warehouse.WarehouseId == filter.WarehouseId.Value);
        }

        // Filter by status
        // "under" = onHandQty < minQty; "safe" = onHandQty >= minQty
        if (!string.IsNullOrWhiteSpace(filter.StatusFilter))
        {
            if (filter.StatusFilter == "under")
            {
                query = query.Where(x => x.Ioh != null && x.Ioh.OnHandQty < x.Policy.MinQty);
            }
            else if (filter.StatusFilter == "safe")
            {
                query = query.Where(x => x.Ioh == null || x.Ioh.OnHandQty >= x.Policy.MinQty);
            }
        }

        var totalRecords = await query.CountAsync();

        var items = await query
            .OrderBy(x => x.Item.ItemCode)
            .ThenBy(x => x.Warehouse.WarehouseName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new ItemWarehousePolicyResponse
            {
                ItemWarehousePolicyId = x.Policy.ItemWarehousePolicyId,
                ItemId = x.Policy.ItemId,
                ItemCode = x.Item != null ? x.Item.ItemCode : "",
                ItemName = x.Item != null ? x.Item.ItemName : "",
                WarehouseId = x.Policy.WarehouseId,
                WarehouseName = x.Warehouse != null ? x.Warehouse.WarehouseName : "",
                Uom = x.Item != null ? x.Item.UnitOfMeasure : null,
                MinQty = x.Policy.MinQty,
                ReorderQty = x.Policy.ReorderQty,
                OnHandQty = x.Ioh != null ? x.Ioh.OnHandQty : 0
            })
            .ToListAsync();

        return new ItemWarehousePolicyListResponse
        {
            TotalRecords = totalRecords,
            Page = page,
            PageSize = pageSize,
            Items = items
        };
    }

    public async Task<ItemWarehousePolicyResponse?> GetByIdAsync(long id)
    {
        var p = await _context.ItemWarehousePolicies
            .Include(x => x.Item)
            .Include(x => x.Warehouse)
            .FirstOrDefaultAsync(x => x.ItemWarehousePolicyId == id);

        if (p == null) return null;

        var ioh = await _context.InventoryOnHands
            .FirstOrDefaultAsync(x => x.ItemId == p.ItemId && x.WarehouseId == p.WarehouseId);

        return new ItemWarehousePolicyResponse
        {
            ItemWarehousePolicyId = p.ItemWarehousePolicyId,
            ItemId = p.ItemId,
            ItemCode = p.Item?.ItemCode ?? "",
            ItemName = p.Item?.ItemName ?? "",
            WarehouseId = p.WarehouseId,
            WarehouseName = p.Warehouse?.WarehouseName ?? "",
            Uom = p.Item?.UnitOfMeasure,
            MinQty = p.MinQty,
            ReorderQty = p.ReorderQty,
            OnHandQty = ioh?.OnHandQty ?? 0
        };
    }

    public async Task<ItemWarehousePolicyResponse> CreateAsync(CreateItemWarehousePolicyRequest request)
    {
        // Check duplicate
        var exists = await _context.ItemWarehousePolicies
            .AnyAsync(x => x.ItemId == request.ItemId && x.WarehouseId == request.WarehouseId);
        if (exists)
            throw new InvalidOperationException("Policy đã tồn tại cho vật tư và kho này.");

        var policy = new ItemWarehousePolicy
        {
            ItemId = request.ItemId,
            WarehouseId = request.WarehouseId,
            MinQty = request.MinQty,
            ReorderQty = request.ReorderQty
        };

        _context.ItemWarehousePolicies.Add(policy);
        await _context.SaveChangesAsync();

        return (await GetByIdAsync(policy.ItemWarehousePolicyId))!;
    }

    public async Task<ItemWarehousePolicyResponse> UpdateAsync(long id, UpdateItemWarehousePolicyRequest request)
    {
        var policy = await _context.ItemWarehousePolicies.FindAsync(id);
        if (policy == null)
            throw new KeyNotFoundException("Không tìm thấy policy.");

        policy.MinQty = request.MinQty;
        policy.ReorderQty = request.ReorderQty;

        await _context.SaveChangesAsync();

        return (await GetByIdAsync(id))!;
    }

    public async Task DeleteAsync(long id)
    {
        var policy = await _context.ItemWarehousePolicies.FindAsync(id);
        if (policy == null)
            throw new KeyNotFoundException("Không tìm thấy policy.");

        _context.ItemWarehousePolicies.Remove(policy);
        await _context.SaveChangesAsync();
    }
}
