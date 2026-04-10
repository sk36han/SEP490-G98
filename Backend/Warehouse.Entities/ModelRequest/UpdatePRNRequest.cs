using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    /// <summary>
    /// Cap nhat phieu tra hang khi con o trang thai DRAFT hoac SUBMITTED.
    /// </summary>
    public class UpdatePRNRequest
    {
        [Required]
        public DateTime ReturnDate { get; set; }

        public string? Reason { get; set; }

        public string? Note { get; set; }

        public decimal FeeAmount { get; set; }

        [Required]
        [MinLength(1, ErrorMessage = "Phai co it nhat 1 dong tra")]
        public List<CreatePRNLineRequest> Lines { get; set; } = new();
    }
}
