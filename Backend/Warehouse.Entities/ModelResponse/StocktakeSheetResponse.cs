using System.Collections.Generic;

namespace Warehouse.Entities.ModelResponse
{
    public class StocktakeSheetResponse
    {
        public StocktakeDetailResponse Header { get; set; } = null!;
        public List<StocktakeLineResponse> Lines { get; set; } = new List<StocktakeLineResponse>();
    }
}
