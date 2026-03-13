namespace Warehouse.Entities.ModelResponse
{
    /// <summary>
    /// Item dùng cho dropdown chọn kho — chỉ chứa ID và tên.
    /// </summary>
    public class WarehouseDropdownItem
    {
        public long WarehouseId { get; set; }
        public string WarehouseName { get; set; } = string.Empty;
        public string WarehouseCode { get; set; } = string.Empty;
    }
}
