using System;

namespace Warehouse.Entities.ModelRequest
{
    public class ApproveGRNRequest
    {
        public string? Note { get; set; }

        /// <summary>Đã thanh toán hay chưa (kế toán xác nhận khi duyệt).</summary>
        public bool IsPaid { get; set; }

        /// <summary>Phương thức thanh toán (ví dụ cash, bank_transfer).</summary>
        public string? PaymentMethod { get; set; }
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