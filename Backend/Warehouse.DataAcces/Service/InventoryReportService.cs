using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service;

public class InventoryReportService : IInventoryReportService
{
    private readonly Mkiwms5Context _context;

    public InventoryReportService(Mkiwms5Context context)
    {
        _context = context;
    }

    public async Task<WeightedAverageReportResponse> GetWeightedAverageReportAsync(string? keyword, long? warehouseId, int page, int pageSize)
    {
        var query = _context.InventoryOnHands
            .Include(i => i.Item)
            .Include(i => i.Warehouse)
            .AsQueryable();

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(i => i.WarehouseId == warehouseId.Value);
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            keyword = keyword.ToLower();
            query = query.Where(i => i.Item.ItemCode.ToLower().Contains(keyword) || 
                                     i.Item.ItemName.ToLower().Contains(keyword));
        }

        var totalRecords = await query.CountAsync();
        
        // Sums
        var summaryData = await query.Select(i => new
        {
            i.ItemId,
            i.OnHandQty,
            InventoryValue = i.OnHandQty * i.UnitCost
        }).ToListAsync();

        var totalMaterials = summaryData.Select(x => x.ItemId).Distinct().Count();
        var totalInventory = summaryData.Sum(x => x.OnHandQty);
        var totalInventoryValue = summaryData.Sum(x => x.InventoryValue);
        var averageWeightedPrice = totalInventory > 0 ? totalInventoryValue / totalInventory : 0;

        var pagedData = await query
            .OrderBy(i => i.Item.ItemCode)
            .ThenBy(i => i.Warehouse.WarehouseName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var itemIds = pagedData.Select(i => i.ItemId).Distinct().ToList();
        var whIds = pagedData.Select(i => i.WarehouseId).Distinct().ToList();

        // Fetch latest import unit cost
        var latestLots = await _context.InventoryLots
            .Where(l => itemIds.Contains(l.ItemId) && whIds.Contains(l.WarehouseId))
            .GroupBy(l => new { l.ItemId, l.WarehouseId })
            .Select(g => g.OrderByDescending(l => l.ReceiptDate).FirstOrDefault())
            .ToListAsync();

        var reportItems = pagedData.Select(i => 
        {
            var latestLot = latestLots.FirstOrDefault(l => l != null && l.ItemId == i.ItemId && l.WarehouseId == i.WarehouseId);

            return new WeightedAverageReportItem
            {
                ItemId = i.ItemId,
                ItemCode = i.Item.ItemCode,
                ItemName = i.Item.ItemName,
                WarehouseId = i.WarehouseId,
                WarehouseName = i.Warehouse.WarehouseName,
                LatestImportPrice = latestLot?.UnitCost ?? 0,
                WeightedAveragePrice = i.UnitCost,
                TotalInventory = i.OnHandQty,
                InventoryValue = i.OnHandQty * i.UnitCost
            };
        }).ToList();

        return new WeightedAverageReportResponse
        {
            TotalMaterials = totalMaterials,
            TotalInventory = totalInventory,
            AverageWeightedPrice = averageWeightedPrice,
            TotalInventoryValue = totalInventoryValue,
            TotalRecords = totalRecords,
            Page = page,
            PageSize = pageSize,
            Items = reportItems
        };
    }
}
