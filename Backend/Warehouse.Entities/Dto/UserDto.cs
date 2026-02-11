namespace Warehouse.Entities.ModelDto
{
	public class UserDto
	{
		public long UserId { get; set; }
		public string FullName { get; set; } = string.Empty;
		public string? Username { get; set; }
		public string Email { get; set; } = string.Empty;
		public string? Phone { get; set; }
		public string RoleName { get; set; } = "N/A";
		public bool IsActive { get; set; }
		public DateTime CreatedAt { get; set; }
		public DateTime? LastLoginAt { get; set; }
	}
}
