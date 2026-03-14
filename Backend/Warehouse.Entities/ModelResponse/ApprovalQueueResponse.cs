using System;

namespace Warehouse.Entities.ModelResponse
{
    public class ApprovalQueueResponse
    {
        public long RequestId { get; set; }
        public string RequestCode { get; set; } = null!;
        public string RequestType { get; set; } = null!; // "Release", "InventoryAdjustment"
        public string? Priority { get; set; } // "High", "Medium", "Low"
        public long SubmittedBy { get; set; }
        public string SubmittedByName { get; set; } = null!;
        public DateTime? SubmittedAt { get; set; }
        public string Status { get; set; } = null!;
        public string? Note { get; set; }
    }
}
