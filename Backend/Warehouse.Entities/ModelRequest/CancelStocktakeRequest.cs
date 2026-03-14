using System.ComponentModel.DataAnnotations;

namespace Warehouse.Entities.ModelRequest
{
    public class CancelStocktakeRequest
    {
        [MaxLength(500, ErrorMessage = "Lý do hủy không được quá 500 ký tự")]
        public string? Reason { get; set; }
    }
}
