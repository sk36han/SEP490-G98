namespace Warehouse.Entities.ModelResponse
{
	public class AuditLogResponse
	{
		public long AuditLogId { get; set; }
		public long ActorUserId { get; set; }
		public string ActorFullName { get; set; } = string.Empty;
		public string Action { get; set; } = null!;
		public string EntityType { get; set; } = null!;
		public long? EntityId { get; set; }
		public string? Detail { get; set; }
		public string? OldValues { get; set; }
		public string? NewValues { get; set; }
		public DateTime CreatedAt { get; set; }
	}
}
