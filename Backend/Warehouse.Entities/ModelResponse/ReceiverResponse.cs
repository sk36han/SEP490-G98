namespace Warehouse.Entities.ModelResponse
{
    public class ReceiverResponse
    {
        public long ReceiverId { get; set; }
        public string? ReceiverCode { get; set; }
        public string ReceiverName { get; set; } = null!;
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? Ward { get; set; }
        public string? District { get; set; }
        public string? Notes { get; set; }
        public string? Position { get; set; }
        public long? CompanyId { get; set; }
        /// <summary>Tên công ty (join từ Company khi có CompanyId).</summary>
        public string? CompanyName { get; set; }
        public string? CompanyCode { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
