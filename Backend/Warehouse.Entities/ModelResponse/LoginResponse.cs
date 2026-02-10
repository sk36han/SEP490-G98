namespace Warehouse.Entities.ModelResponse
{
    public class LoginResponse
    {
        public string AccessToken { get; set; } = null!;
        public DateTime ExpiresAt { get; set; }
        public UserResponse User { get; set; } = null!;
    }
}
