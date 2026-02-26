namespace Warehouse.Entities.ModelRequest
{
	public class UpdateUserRequest
	{
		public string? FullName { get; set; }
		public long? RoleId { get; set; }
		public bool? IsActive { get; set; }
	}
}
