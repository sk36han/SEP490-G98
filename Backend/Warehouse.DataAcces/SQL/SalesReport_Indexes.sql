/* =============================================================================
   Indexes đề xuất cho báo cáo doanh số (SalesReportService).
   Chạy 1 lần trên SQL Server trước khi triển khai module /api/SalesReport/*.
   Nếu bảng đã lớn (>1M rows) nên chạy ngoài giờ cao điểm với ONLINE = ON
   (chỉ SQL Server Enterprise hỗ trợ ONLINE cho mọi index).
   ============================================================================= */

-- GDN (outbound): truy vấn theo Status='POSTED' + IssueDate range + WarehouseId.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GDN_Status_IssueDate_WarehouseId'
               AND object_id = OBJECT_ID('dbo.GoodsDeliveryNotes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_GDN_Status_IssueDate_WarehouseId
        ON dbo.GoodsDeliveryNotes (Status, IssueDate, WarehouseId)
        INCLUDE (TotalDeliveredQty, TotalDeliveredAmount, ReleaseRequestId)
        WITH (FILLFACTOR = 90);
END
GO

-- GRN (inbound): truy vấn theo Status='POSTED' + ReceiptDate range + WarehouseId.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GRN_Status_ReceiptDate_WarehouseId'
               AND object_id = OBJECT_ID('dbo.GoodsReceiptNotes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_GRN_Status_ReceiptDate_WarehouseId
        ON dbo.GoodsReceiptNotes (Status, ReceiptDate, WarehouseId)
        INCLUDE (TotalReceivedQty, TotalGoodsAmount, SupplierId)
        WITH (FILLFACTOR = 90);
END
GO

-- Lines: tối ưu GROUP BY ItemId khi tính Top Items trên 1 khoảng thời gian.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GDNLines_Gdnid_ItemId'
               AND object_id = OBJECT_ID('dbo.GoodsDeliveryNoteLines'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_GDNLines_Gdnid_ItemId
        ON dbo.GoodsDeliveryNoteLines (Gdnid, ItemId)
        INCLUDE (ActualQty, LineTotal, UomId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GRNLines_Grnid_ItemId'
               AND object_id = OBJECT_ID('dbo.GoodsReceiptNoteLines'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_GRNLines_Grnid_ItemId
        ON dbo.GoodsReceiptNoteLines (Grnid, ItemId)
        INCLUDE (ActualQty, LineTotal, UomId);
END
GO

-- ReleaseRequests: dùng trong JOIN khi group Top Partners (Receiver) cho outbound.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ReleaseRequests_Id_ReceiverId'
               AND object_id = OBJECT_ID('dbo.ReleaseRequests'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ReleaseRequests_Id_ReceiverId
        ON dbo.ReleaseRequests (ReleaseRequestId)
        INCLUDE (ReceiverId);
END
GO

/* =============================================================================
   (Optional) Nếu dataset rất lớn (>10M GDN rows/năm), cân nhắc 1 columnstore
   non-clustered trên GDN/GRN phục vụ aggregate:

   CREATE NONCLUSTERED COLUMNSTORE INDEX CX_GDN_Report
       ON dbo.GoodsDeliveryNotes (Status, IssueDate, WarehouseId,
                                  TotalDeliveredQty, TotalDeliveredAmount);

   Lưu ý: columnstore cần kiểm tra tương thích với các INSERT/UPDATE trigger
   và phiên bản SQL Server hiện dùng.
   ============================================================================= */
