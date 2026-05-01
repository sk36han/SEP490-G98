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
		public const string LoginFailed = "LOGIN_FAILED";
		public const string Approve = "APPROVE";
		public const string Reject = "REJECT";
		public const string Cancel = "CANCEL";
		public const string Close = "CLOSE";
		public const string Issue = "ISSUE";
		public const string Refund = "REFUND";
		public const string ChangePassword = "CHANGE_PASSWORD";
		public const string AssignRole = "ASSIGN_ROLE";
		public const string PasswordResetRequest = "PASSWORD_RESET_REQUEST";
		public const string PasswordReset = "PASSWORD_RESET";
		public const string Submit = "SUBMIT";
		public const string StartStocktake = "START_STOCKTAKE";
		public const string StartStocktakeExecution = "START_STOCKTAKE_EXECUTION";
		public const string BulkMatchStocktake = "BULK_MATCH_STOCKTAKE";
		public const string SubmitStocktake = "SUBMIT_STOCKTAKE";
		public const string PostAdjustment = "POST_ADJUSTMENT";
		public const string CompleteStocktake = "COMPLETE_STOCKTAKE";
		public const string CancelStocktakeExecution = "CANCEL_STOCKTAKE_EXECUTION";
		public const string CancelStocktakePlan = "CANCEL_STOCKTAKE_PLAN";
		public const string SubmitStocktakePlan = "SUBMIT_STOCKTAKE_PLAN";
		public const string ApproveAndFinalizeStocktake = "APPROVE_AND_FINALIZE_STOCKTAKE";
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
		public const string PackagingSpec = "PackagingSpec";
		public const string TransportInfo = "TransportInfo";
		public const string Company = "Company";
		public const string Address = "Address";
		public const string GoodsReceiptNote = "GoodsReceiptNote";
		public const string GoodsDeliveryNote = "GoodsDeliveryNote";
		public const string ReleaseRequest = "ReleaseRequest";
		public const string PurchaseReturnNote = "PurchaseReturnNote";
		public const string Stocktake = "Stocktake";
		public const string StocktakePlan = "StocktakePlan";
		public const string DocumentAttachment = "DocumentAttachment";
		public const string StocktakeSession = "StocktakeSession";
	}
}
