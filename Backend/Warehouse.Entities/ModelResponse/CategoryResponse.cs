namespace Warehouse.Entities.ModelResponse
{
    public class CategoryResponse
    {
        public long CategoryId { get; set; }
        public string CategoryCode { get; set; } = null!;
        public string CategoryName { get; set; } = null!;
        public long? ParentId { get; set; }
        public string? ParentName { get; set; }
        public bool IsActive { get; set; }

        /// <summary>Số vật tư (Items) đang gán vào danh mục này.</summary>
        public int ItemCount { get; set; }
    }
}
