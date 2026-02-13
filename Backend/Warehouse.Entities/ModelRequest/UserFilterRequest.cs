namespace Warehouse.Entities.ModelRequest
{
	public class UserFilterRequest
	{
		// Đảm bảo PageNumber luôn >= 1
		private int _pageNumber = 1;
		public int PageNumber
		{
			get => _pageNumber;
			set => _pageNumber = value < 1 ? 1 : value;
		}

		// Đảm bảo PageSize không quá lớn (tránh treo server)
		private int _pageSize = 10;
		public int PageSize
		{
			get => _pageSize;
			set => _pageSize = value > 100 ? 100 : value;
		}
	}
}