namespace Warehouse.Entities.ModelRequest
{
	public class UpdateUserRequest
	{
		public string? FullName { get; set; }
		public string? Username { get; set; }
		public string? Email { get; set; }
		public long? RoleId { get; set; }
		public bool? IsActive { get; set; }
		public string? Gender { get; set; }
		public DateOnly? DOB { get; set; }
	}
}
