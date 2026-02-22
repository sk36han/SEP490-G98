using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;
using WarehouseEntity = Warehouse.Entities.Models.Warehouse;
namespace Warehouse.DataAcces.Service
{
    public class WarehouseService : GenericRepository<WarehouseEntity>, IWarehouseService
    {
		private readonly IConfiguration _configuration;
		public WarehouseService(Mkiwms4Context context, IConfiguration configuration) : base(context)
		{
			_configuration = configuration;
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

        public async Task<WarehouseResponse> CreateWarehouseAsync(CreateWarehouseRequest request)
        {
            var exists = await _context.Warehouses
                .AnyAsync(w => w.WarehouseCode == request.WarehouseCode);
            if (exists)
                throw new InvalidOperationException("Mã kho đã tồn tại.");

            var entity = new WarehouseEntity
            {
                WarehouseCode = request.WarehouseCode,
                WarehouseName = request.WarehouseName,
                Address = request.Address,
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            await CreateAsync(entity);

            return new WarehouseResponse
            {
                WarehouseId = entity.WarehouseId,
                WarehouseCode = entity.WarehouseCode,
                WarehouseName = entity.WarehouseName,
                Address = entity.Address,
                IsActive = entity.IsActive,
                CreatedAt = entity.CreatedAt
            };
        }

        public async Task<WarehouseResponse> UpdateWarehouseAsync(long id, UpdateWarehouseRequest request)
        {
            var entity = await _context.Warehouses.FindAsync(id);
            if (entity == null)
                throw new KeyNotFoundException("Không tìm thấy kho.");

            entity.WarehouseName = request.WarehouseName;
            entity.Address = request.Address;
            entity.IsActive = request.IsActive;
            await _context.SaveChangesAsync();

            return new WarehouseResponse
            {
                WarehouseId = entity.WarehouseId,
                WarehouseCode = entity.WarehouseCode,
                WarehouseName = entity.WarehouseName,
                Address = entity.Address,
                IsActive = entity.IsActive,
                CreatedAt = entity.CreatedAt
            };
        }

        public async Task<WarehouseResponse> ToggleWarehouseStatusAsync(long id)
        {
            var entity = await _context.Warehouses.FindAsync(id);
            if (entity == null)
                throw new KeyNotFoundException("Không tìm thấy kho.");

            entity.IsActive = !entity.IsActive;
            await _context.SaveChangesAsync();

            return new WarehouseResponse
            {
                WarehouseId = entity.WarehouseId,
                WarehouseCode = entity.WarehouseCode,
                WarehouseName = entity.WarehouseName,
                Address = entity.Address,
                IsActive = entity.IsActive,
                CreatedAt = entity.CreatedAt
            };
        }
    }
}
