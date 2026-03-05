using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
	public interface IAuditLogService
	{
		Task<PagedResponse<AuditLogResponse>> GetAuditLogsAsync(AuditLogFilterRequest filter);

		Task<AuditLogResponse?> GetByIdAsync(long id);

		Task LogAsync(long actorUserId, string action, string entityType, long? entityId = null, string? detail = null, string? oldValues = null, string? newValues = null);
	}
}
