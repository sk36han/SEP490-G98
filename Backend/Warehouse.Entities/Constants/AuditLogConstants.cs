namespace Warehouse.Entities.Constants
{
	/// <summary>
	/// Hằng số cho Audit Log — tránh magic string, dễ quản lý và tìm kiếm
	/// </summary>
	public static class AuditAction
	{
		public const string Create = "CREATE";
		public const string Update = "UPDATE";
		public const string Delete = "DELETE";
		public const string Login = "LOGIN";
	}

		public static class AuditEntity
	{
		public const string User = "User";
		public const string Supplier = "Supplier";
		public const string Warehouse = "Warehouse";
		public const string PurchaseOrder = "PurchaseOrder";
		public const string Receiver = "Receiver";
		public const string Item = "Item";
		public const string Role = "Role";
		public const string Brand = "Brand";
		public const string Category = "Category";
		public const string UnitOfMeasure = "UnitOfMeasure";
		public const string ItemParameter = "ItemParameter";
		public const string ItemParameterValue = "ItemParameterValue";
	}
}
