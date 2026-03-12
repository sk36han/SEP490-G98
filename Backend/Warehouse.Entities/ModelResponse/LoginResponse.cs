namespace Warehouse.Entities.ModelResponse
{
    public class LoginResponse
    {
        public bool RequiresOtp { get; set; }
        public string? Message { get; set; }
        public long? UserId { get; set; }
        public string? AccessToken { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public UserResponse? User { get; set; }
    }
}
