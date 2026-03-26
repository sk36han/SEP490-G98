using System;

namespace Warehouse.Entities.ModelRequest
{
    public class ApproveGRNRequest
    {
        public string? Note { get; set; }
    }

    public class RefundPRNRequest
    {
        public decimal RefundedAmount { get; set; }
        public string? RefundMethod { get; set; }
        public string? RefundReference { get; set; }
        public string? RefundStatus { get; set; }
        public string? Note { get; set; }
    }
}