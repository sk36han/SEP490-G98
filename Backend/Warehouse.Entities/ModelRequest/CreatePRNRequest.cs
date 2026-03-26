using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CreatePRNRequest
    {
        [Required]
        public long RelatedGrnId { get; set; }

        [Required]
        public DateTime ReturnDate { get; set; }

        public string? Reason { get; set; }

        public string? Note { get; set; }

        public decimal FeeAmount { get; set; }

        public string? RefundMethod { get; set; }

        public string? Status { get; set; }

        public string? RefundStatus { get; set; }

        [Required]
        [MinLength(1, ErrorMessage = "Phai co it nhat 1 dong tra")]
        public List<CreatePRNLineRequest> Lines { get; set; } = new();
    }

    public class CreatePRNLineRequest
    {
        [Required]
        public long RelatedGrnlineId { get; set; }

        [Required]
        [Range(0.001, double.MaxValue, ErrorMessage = "So luong tra phai lon hon 0")]
        public decimal ReturnQty { get; set; }

        public string? Reason { get; set; }

        public string? Note { get; set; }
    }
}