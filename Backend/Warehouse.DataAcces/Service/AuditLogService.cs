using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
	public class AuditLogService : GenericRepository<AuditLog>, IAuditLogService
	{
		public AuditLogService(Mkiwms5Context context) : base(context)
		{
		}

		public async Task<PagedResponse<AuditLogResponse>> GetAuditLogsAsync(AuditLogFilterRequest filter)
		{
			var query = _context.AuditLogs
				.AsNoTracking()
				.Include(x => x.ActorUser)
				.AsQueryable();

			// === Filter ===
			if (!string.IsNullOrWhiteSpace(filter.Action))
				query = query.Where(x => x.Action == filter.Action);

			if (!string.IsNullOrWhiteSpace(filter.EntityType))
				query = query.Where(x => x.EntityType == filter.EntityType);

			if (filter.ActorUserId.HasValue)
				query = query.Where(x => x.ActorUserId == filter.ActorUserId.Value);

			if (filter.FromDate.HasValue)
				query = query.Where(x => x.CreatedAt >= filter.FromDate.Value);

			if (filter.ToDate.HasValue)
				query = query.Where(x => x.CreatedAt <= filter.ToDate.Value);

			if (!string.IsNullOrWhiteSpace(filter.Keyword))
				query = query.Where(x => x.Detail != null && x.Detail.Contains(filter.Keyword));

			// === Tổng số sau khi filter ===
			var totalItems = await query.CountAsync();

			// === Sắp xếp + Phân trang ===
			var items = await query
				.OrderByDescending(x => x.CreatedAt)
				.Skip((filter.PageNumber - 1) * filter.PageSize)
				.Take(filter.PageSize)
				.Select(x => new AuditLogResponse
				{
					AuditLogId = x.AuditLogId,
					ActorUserId = x.ActorUserId,
					ActorFullName = x.ActorUser.FullName ?? x.ActorUser.Username,
					Action = x.Action,
					EntityType = x.EntityType,
					EntityId = x.EntityId,
					Detail = x.Detail,
					OldValues = x.OldValues,
					NewValues = x.NewValues,
					CreatedAt = x.CreatedAt
				})
				.ToListAsync();

			return new PagedResponse<AuditLogResponse>
			{
				Page = filter.PageNumber,
				PageSize = filter.PageSize,
				TotalItems = totalItems,
				Items = items
			};
		}

		public async Task<AuditLogResponse?> GetByIdAsync(long id)
		{
			var entity = await _context.AuditLogs
				.AsNoTracking()
				.Include(x => x.ActorUser)
				.FirstOrDefaultAsync(x => x.AuditLogId == id);

			if (entity == null) return null;

			return new AuditLogResponse
			{
				AuditLogId = entity.AuditLogId,
				ActorUserId = entity.ActorUserId,
				ActorFullName = entity.ActorUser.FullName ?? entity.ActorUser.Username,
				Action = entity.Action,
				EntityType = entity.EntityType,
				EntityId = entity.EntityId,
				Detail = entity.Detail,
				OldValues = entity.OldValues,
				NewValues = entity.NewValues,
				CreatedAt = entity.CreatedAt
			};
		}

		public async Task LogAsync(long actorUserId, string action, string entityType, long? entityId = null, string? detail = null, string? oldValues = null, string? newValues = null)
		{
			var auditLog = new AuditLog
			{
				ActorUserId = actorUserId,
				Action = action,
				EntityType = entityType,
				EntityId = entityId,
				Detail = detail,
				OldValues = oldValues,
				NewValues = newValues,
				CreatedAt = DateTime.UtcNow
			};

			_context.AuditLogs.Add(auditLog);
			await _context.SaveChangesAsync();
		}
	}
}
