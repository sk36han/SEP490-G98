namespace Warehouse.Entities.ModelRequest
{
    /// <summary>
    /// Request phân trang cho danh sách kho
    /// </summary>
    public class FilterRequest
    {
        private int _pageNumber = 1;
        public int PageNumber
        {
            get => _pageNumber;
            set => _pageNumber = value < 1 ? 1 : value;
        }

        private int _pageSize = 20;
        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = value > 100 ? 100 : value;
        }
    }
}
