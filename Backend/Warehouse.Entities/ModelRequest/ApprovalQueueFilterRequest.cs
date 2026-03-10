using System;

namespace Warehouse.Entities.ModelRequest
{
    public class ApprovalQueueFilterRequest : FilterRequest
    {
        public string? RequestType { get; set; }
        public string? Priority { get; set; }
        public DateTime? SubmittedDateFrom { get; set; }
        public DateTime? SubmittedDateTo { get; set; }
    }
}
