using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
    public class WarehouseService : IWarehouseService
    {
        private readonly Mkiwms4Context _context;

        public WarehouseService(Mkiwms4Context context)
        {
            _context = context;
        }

        public async Task<PagedResult<WarehouseResponse>> GetWarehouseListAsync(FilterRequest filter)
        {
            var query = _context.Warehouses.AsNoTracking().OrderBy(w => w.WarehouseId);

            int totalCount = await query.CountAsync();

            var items = await query
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(w => new WarehouseResponse
                {
                    WarehouseId = w.WarehouseId,
                    WarehouseCode = w.WarehouseCode,
                    WarehouseName = w.WarehouseName,
                    Address = w.Address,
                    IsActive = w.IsActive,
                    CreatedAt = w.CreatedAt
                })
                .ToListAsync();

            return new PagedResult<WarehouseResponse>(items, totalCount, filter.PageNumber, filter.PageSize);
        }
    }
}
