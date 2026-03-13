using System;

namespace Warehouse.Entities.ModelResponse
{
    public class StocktakeApprovalHistoryResponse
    {
        public long ApprovalId { get; set; }
        public int StageNo { get; set; }
        public string Decision { get; set; } = null!;
        public string? Reason { get; set; }
        public string ActionByName { get; set; } = null!;
        public DateTime ActionAt { get; set; }
    }

    public class AdjustmentPreviewResponse
    {
        public long StocktakeLineId { get; set; }
        public string ItemCode { get; set; } = null!;
        public string ItemName { get; set; } = null!;
        public string UomName { get; set; } = null!;
        public decimal SystemQtySnapshot { get; set; }
        public decimal CountedQty { get; set; }
        public decimal VarianceQty { get; set; }
        
        // Giá trị chênh lệch (nếu có đơn giá - optional cho phase sau)
        // public decimal? VarianceValue { get; set; }
    }
}
