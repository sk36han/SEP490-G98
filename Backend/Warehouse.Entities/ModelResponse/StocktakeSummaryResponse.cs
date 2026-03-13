using System;

namespace Warehouse.Entities.ModelResponse
{
    public class StocktakeSummaryResponse
    {
        public long StocktakeId { get; set; }
        public string StocktakeCode { get; set; } = string.Empty;
        public long WarehouseId { get; set; }
        public string WarehouseName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Mode { get; set; } = string.Empty;
        public DateTime? PlannedAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
        public long CreatedBy { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
        public string? Note { get; set; }

        public int TotalLines { get; set; }
        public int CountedLines { get; set; }
        public int VarianceLines { get; set; }
        public decimal ProgressPercent { get; set; }
    }
}
