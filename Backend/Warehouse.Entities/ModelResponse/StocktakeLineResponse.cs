namespace Warehouse.Entities.ModelResponse
{
    public class StocktakeLineResponse
    {
        public long StocktakeLineId { get; set; }
        public long ItemId { get; set; }
        public string ItemCode { get; set; } = null!;
        public string ItemName { get; set; } = null!;
        public string UomName { get; set; } = null!;

        public decimal SystemQtySnapshot { get; set; }
        public decimal? CountedQty { get; set; }
        public decimal? VarianceQty { get; set; }
        public string? Note { get; set; }

        // Field bổ sung để FE dễ hiển thị
        public bool IsCounted => CountedQty.HasValue;
        public bool HasDiscrepancy => CountedQty.HasValue && VarianceQty != 0;
    }
}
