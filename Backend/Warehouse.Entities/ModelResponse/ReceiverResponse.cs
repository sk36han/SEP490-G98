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
        public string? Notes { get; set; }
        public bool IsActive { get; set; }
    }
}
