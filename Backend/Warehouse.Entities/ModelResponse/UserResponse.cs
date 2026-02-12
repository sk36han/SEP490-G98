namespace Warehouse.Entities.ModelResponse
{
    public class UserResponse
    {
        public long UserId { get; set; }
        public string Email { get; set; } = null!;
        public string? Username { get; set; }
        public string FullName { get; set; } = null!;
        public string? Phone { get; set; }
        public bool IsActive { get; set; }
        public string? RoleName { get; set; }
        public DateTime? LastLoginAt { get; set; }
    }
}
