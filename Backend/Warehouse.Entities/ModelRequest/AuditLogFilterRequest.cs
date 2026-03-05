namespace Warehouse.Entities.ModelRequest
{
	/// <summary>
	/// Request filter + phân trang cho danh sách audit log
	/// </summary>
	public class AuditLogFilterRequest
	{
		/// <summary>
		/// Lọc theo hành động (vd: CREATE, UPDATE, DELETE, LOGIN...)
		/// </summary>
		public string? Action { get; set; }

		/// <summary>
		/// Lọc theo loại entity (vd: User, Supplier, PurchaseOrder...)
		/// </summary>
		public string? EntityType { get; set; }

		/// <summary>
		/// Lọc theo người thực hiện
		/// </summary>
		public long? ActorUserId { get; set; }

		/// <summary>
		/// Lọc từ ngày
		/// </summary>
		public DateTime? FromDate { get; set; }

		/// <summary>
		/// Lọc đến ngày
		/// </summary>
		public DateTime? ToDate { get; set; }

		/// <summary>
		/// Tìm kiếm theo detail
		/// </summary>
		public string? Keyword { get; set; }

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
