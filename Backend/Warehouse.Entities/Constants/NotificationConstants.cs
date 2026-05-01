using System;

namespace Warehouse.Entities.Constants
{
    public static class NotificationTypes
    {
        public const string NewRequest = "NewRequest";
        public const string ApprovalResult = "ApprovalResult";
        public const string StatusChange = "StatusChange";
        public const string InventoryAlert = "InventoryAlert";
        public const string Stocktake = "Stocktake";
        public const string PurchaseOrder = "PurchaseOrder";
        public const string Release = "Release";
        public const string Supplier = "SUPPLIER";
    }

    public enum NotificationSeverity : byte
    {
        Info = 0,
        Warning = 1,
        Error = 2
    }
}
