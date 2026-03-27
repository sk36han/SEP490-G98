USE [MKIWMS5]
GO
/****** Object:  Table [dbo].[AuditLogs]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[AuditLogs](
	[AuditLogId] [bigint] IDENTITY(1,1) NOT NULL,
	[ActorUserId] [bigint] NOT NULL,
	[Action] [nvarchar](100) NOT NULL,
	[EntityType] [nvarchar](50) NOT NULL,
	[EntityId] [bigint] NULL,
	[Detail] [nvarchar](2000) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[OldValues] [nvarchar](max) NULL,
	[NewValues] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED 
(
	[AuditLogId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Brands]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Brands](
	[BrandId] [bigint] IDENTITY(1,1) NOT NULL,
	[BrandName] [nvarchar](200) NOT NULL,
	[IsActive] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[BrandId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Certificates]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Certificates](
	[CertificateId] [bigint] IDENTITY(1,1) NOT NULL,
	[GRNLineId] [bigint] NOT NULL,
	[CertType] [nvarchar](10) NOT NULL,
	[CertNo] [nvarchar](100) NULL,
	[IssuedBy] [nvarchar](200) NULL,
	[IssuedDate] [date] NULL,
	[Note] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[CertificateId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DocumentApproval]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DocumentApproval](
	[ApprovalId] [bigint] IDENTITY(1,1) NOT NULL,
	[DocType] [nvarchar](20) NOT NULL,
	[DocId] [bigint] NOT NULL,
	[StageNo] [int] NOT NULL,
	[Decision] [nvarchar](20) NOT NULL,
	[Reason] [nvarchar](1000) NULL,
	[ActionBy] [bigint] NOT NULL,
	[ActionAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[ApprovalId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DocumentAttachments]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DocumentAttachments](
	[AttachmentId] [bigint] IDENTITY(1,1) NOT NULL,
	[DocType] [nvarchar](20) NOT NULL,
	[DocId] [bigint] NOT NULL,
	[AttachmentType] [nvarchar](30) NOT NULL,
	[FileName] [nvarchar](255) NOT NULL,
	[FileUrlOrPath] [nvarchar](800) NOT NULL,
	[UploadedBy] [bigint] NOT NULL,
	[UploadedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[AttachmentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[GoodsDeliveryNoteLines]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[GoodsDeliveryNoteLines](
	[GDNLineId] [bigint] IDENTITY(1,1) NOT NULL,
	[GDNId] [bigint] NOT NULL,
	[ItemId] [bigint] NOT NULL,
	[RequestedQty] [decimal](18, 3) NULL,
	[ActualQty] [decimal](18, 3) NOT NULL,
	[UomId] [bigint] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[GDNLineId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[GoodsDeliveryNotes]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[GoodsDeliveryNotes](
	[GDNId] [bigint] IDENTITY(1,1) NOT NULL,
	[GDNCode] [nvarchar](50) NOT NULL,
	[ReleaseRequestId] [bigint] NOT NULL,
	[WarehouseId] [bigint] NOT NULL,
	[IssueDate] [date] NOT NULL,
	[CreatedBy] [bigint] NOT NULL,
	[Status] [nvarchar](30) NOT NULL,
	[SubmittedAt] [datetime2](7) NULL,
	[ApprovedAt] [datetime2](7) NULL,
	[PostedAt] [datetime2](7) NULL,
	[Note] [nvarchar](1000) NULL,
PRIMARY KEY CLUSTERED 
(
	[GDNId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[GoodsReceiptNoteLines]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[GoodsReceiptNoteLines](
	[GRNLineId] [bigint] IDENTITY(1,1) NOT NULL,
	[GRNId] [bigint] NOT NULL,
	[ItemId] [bigint] NOT NULL,
	[ExpectedQty] [decimal](18, 3) NULL,
	[ActualQty] [decimal](18, 3) NOT NULL,
	[UomId] [bigint] NOT NULL,
	[RequiresCOCQ] [bit] NOT NULL,
	[PurchaseOrderLineId] [bigint] NULL,
	[UnitPrice] [decimal](18, 2) NULL,
	[LineTotal]  AS (CONVERT([decimal](18,2),[ActualQty]*isnull([UnitPrice],(0)))) PERSISTED,
PRIMARY KEY CLUSTERED 
(
	[GRNLineId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[GoodsReceiptNotes]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[GoodsReceiptNotes](
	[GRNId] [bigint] IDENTITY(1,1) NOT NULL,
	[GRNCode] [nvarchar](50) NOT NULL,
	[PurchaseOrderId] [bigint] NULL,
	[SupplierId] [bigint] NOT NULL,
	[WarehouseId] [bigint] NOT NULL,
	[ReceiptDate] [date] NOT NULL,
	[CreatedBy] [bigint] NOT NULL,
	[Status] [nvarchar](30) NOT NULL,
	[SubmittedAt] [datetime2](7) NULL,
	[ApprovedAt] [datetime2](7) NULL,
	[PostedAt] [datetime2](7) NULL,
	[Note] [nvarchar](1000) NULL,
	[ShippingFee] [decimal](18, 2) NOT NULL,
	[IsPaid] [bit] NOT NULL,
	[PaymentMethod] [varchar](30) NULL,
	[TotalReceivedQty] [decimal](18, 3) NOT NULL,
	[TotalGoodsAmount] [decimal](18, 2) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[GRNId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InventoryAdjustmentLines]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InventoryAdjustmentLines](
	[AdjustmentLineId] [bigint] IDENTITY(1,1) NOT NULL,
	[AdjustmentId] [bigint] NOT NULL,
	[ItemId] [bigint] NOT NULL,
	[SystemQty] [decimal](18, 3) NOT NULL,
	[CountedQty] [decimal](18, 3) NOT NULL,
	[QtyChange]  AS ([CountedQty]-[SystemQty]) PERSISTED,
	[Note] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[AdjustmentLineId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InventoryAdjustmentRequests]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InventoryAdjustmentRequests](
	[AdjustmentId] [bigint] IDENTITY(1,1) NOT NULL,
	[AdjustmentCode] [nvarchar](50) NOT NULL,
	[StocktakeId] [bigint] NULL,
	[WarehouseId] [bigint] NOT NULL,
	[SubmittedBy] [bigint] NOT NULL,
	[Status] [nvarchar](30) NOT NULL,
	[Reason] [nvarchar](1000) NULL,
	[SubmittedAt] [datetime2](7) NULL,
	[ApprovedAt] [datetime2](7) NULL,
	[PostedAt] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[AdjustmentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InventoryOnHand]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InventoryOnHand](
	[InventoryId] [bigint] IDENTITY(1,1) NOT NULL,
	[WarehouseId] [bigint] NOT NULL,
	[ItemId] [bigint] NOT NULL,
	[OnHandQty] [decimal](18, 3) NOT NULL,
	[ReservedQty] [decimal](18, 3) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
	[UnitCost] [decimal](18, 2) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[InventoryId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InventoryTransactionLines]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InventoryTransactionLines](
	[InventoryTxnLineId] [bigint] IDENTITY(1,1) NOT NULL,
	[InventoryTxnId] [bigint] NOT NULL,
	[ItemId] [bigint] NOT NULL,
	[QtyChange] [decimal](18, 3) NOT NULL,
	[UomId] [bigint] NOT NULL,
	[Note] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[InventoryTxnLineId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InventoryTransactions]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InventoryTransactions](
	[InventoryTxnId] [bigint] IDENTITY(1,1) NOT NULL,
	[TxnType] [nvarchar](20) NOT NULL,
	[TxnDate] [datetime2](7) NOT NULL,
	[WarehouseId] [bigint] NOT NULL,
	[ReferenceType] [nvarchar](20) NOT NULL,
	[ReferenceId] [bigint] NOT NULL,
	[Status] [nvarchar](20) NOT NULL,
	[PostedBy] [bigint] NULL,
	[PostedAt] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[InventoryTxnId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ItemCategories]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ItemCategories](
	[CategoryId] [bigint] IDENTITY(1,1) NOT NULL,
	[CategoryCode] [nvarchar](50) NOT NULL,
	[CategoryName] [nvarchar](200) NOT NULL,
	[ParentId] [bigint] NULL,
	[IsActive] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[CategoryId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ItemParameters]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ItemParameters](
	[ParamId] [bigint] IDENTITY(1,1) NOT NULL,
	[ParamCode] [nvarchar](50) NOT NULL,
	[ParamName] [nvarchar](200) NOT NULL,
	[DataType] [nvarchar](30) NOT NULL,
	[IsActive] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[ParamId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ItemParameterValues]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ItemParameterValues](
	[ItemParamValueId] [bigint] IDENTITY(1,1) NOT NULL,
	[ItemId] [bigint] NOT NULL,
	[ParamId] [bigint] NOT NULL,
	[ParamValue] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[ItemParamValueId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ItemPrices]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ItemPrices](
	[ItemPriceId] [bigint] IDENTITY(1,1) NOT NULL,
	[ItemId] [bigint] NOT NULL,
	[PriceType] [nvarchar](20) NOT NULL,
	[Amount] [decimal](18, 2) NOT NULL,
	[Currency] [nvarchar](10) NULL,
	[EffectiveFrom] [date] NOT NULL,
	[EffectiveTo] [date] NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[ItemPriceId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Items]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Items](
	[ItemId] [bigint] IDENTITY(1,1) NOT NULL,
	[ItemCode] [nvarchar](50) NOT NULL,
	[ItemName] [nvarchar](500) NOT NULL,
	[ItemType] [nvarchar](50) NULL,
	[Description] [nvarchar](1000) NULL,
	[CategoryId] [bigint] NULL,
	[BrandId] [bigint] NULL,
	[BaseUomId] [bigint] NOT NULL,
	[PackagingSpecId] [bigint] NULL,
	[RequiresCO] [bit] NOT NULL,
	[RequiresCQ] [bit] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[DefaultWarehouseId] [bigint] NULL,
	[InventoryAccount] [nvarchar](50) NULL,
	[RevenueAccount] [nvarchar](50) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
	[ShelfLifeDays] [int] NULL,
	[ImageUrl] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[ItemId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ItemWarehousePolicy]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ItemWarehousePolicy](
	[ItemWarehousePolicyId] [bigint] IDENTITY(1,1) NOT NULL,
	[ItemId] [bigint] NOT NULL,
	[WarehouseId] [bigint] NOT NULL,
	[MinQty] [decimal](18, 3) NOT NULL,
	[ReorderQty] [decimal](18, 3) NULL,
PRIMARY KEY CLUSTERED 
(
	[ItemWarehousePolicyId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Notifications]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Notifications](
	[NotificationId] [bigint] IDENTITY(1,1) NOT NULL,
	[UserId] [bigint] NOT NULL,
	[Title] [nvarchar](200) NOT NULL,
	[Message] [nvarchar](1000) NOT NULL,
	[RefType] [nvarchar](20) NULL,
	[RefId] [bigint] NULL,
	[IsRead] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[ReadAt] [datetime2](7) NULL,
	[Type] [nvarchar](50) NULL,
	[Severity] [tinyint] NOT NULL,
	[IsDeleted] [bit] NOT NULL,
	[ExpiresAt] [datetime2](0) NULL,
PRIMARY KEY CLUSTERED 
(
	[NotificationId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PackagingSpecs]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PackagingSpecs](
	[PackagingSpecId] [bigint] IDENTITY(1,1) NOT NULL,
	[SpecName] [nvarchar](200) NOT NULL,
	[Description] [nvarchar](400) NULL,
	[IsActive] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[PackagingSpecId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PasswordResetTokens]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PasswordResetTokens](
	[TokenId] [bigint] IDENTITY(1,1) NOT NULL,
	[UserId] [bigint] NOT NULL,
	[TokenHash] [varbinary](256) NOT NULL,
	[ExpiresAt] [datetime2](7) NOT NULL,
	[UsedAt] [datetime2](7) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[TokenId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PurchaseOrderLines]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PurchaseOrderLines](
	[PurchaseOrderLineId] [bigint] IDENTITY(1,1) NOT NULL,
	[PurchaseOrderId] [bigint] NOT NULL,
	[ItemId] [bigint] NOT NULL,
	[OrderedQty] [decimal](18, 3) NOT NULL,
	[UomId] [bigint] NOT NULL,
	[Note] [nvarchar](500) NULL,
	[ReceivedQty] [decimal](18, 3) NOT NULL,
	[LineStatus] [varchar](20) NOT NULL,
	[UnitPrice] [decimal](18, 2) NULL,
	[Currency] [nvarchar](10) NULL,
	[LineTotal]  AS ([OrderedQty]*[UnitPrice]) PERSISTED,
PRIMARY KEY CLUSTERED 
(
	[PurchaseOrderLineId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PurchaseOrders]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PurchaseOrders](
	[PurchaseOrderId] [bigint] IDENTITY(1,1) NOT NULL,
	[POCode] [nvarchar](50) NOT NULL,
	[RequestedBy] [bigint] NOT NULL,
	[SupplierId] [bigint] NULL,
	[RequestedDate] [date] NULL,
	[Justification] [nvarchar](1000) NULL,
	[Status] [nvarchar](30) NOT NULL,
	[CurrentStageNo] [int] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[SubmittedAt] [datetime2](7) NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
	[ExpectedDeliveryDate] [date] NULL,
	[LifecycleStatus] [varchar](10) NOT NULL,
	[TotalAmount] [decimal](18, 2) NOT NULL,
	[DiscountAmount] [decimal](18, 2) NOT NULL,
	[NetAmount]  AS (CONVERT([decimal](18,2),[TotalAmount]-[DiscountAmount])) PERSISTED,
	[ResponsibleUserId] [bigint] NULL,
	[WarehouseId] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[PurchaseOrderId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PurchaseReturnNoteLines]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PurchaseReturnNoteLines](
	[PurchaseReturnLineId] [bigint] IDENTITY(1,1) NOT NULL,
	[PurchaseReturnId] [bigint] NOT NULL,
	[ReturnQty] [decimal](18, 3) NOT NULL,
	[UnitPrice] [decimal](18, 2) NOT NULL,
	[LineTotal]  AS (CONVERT([decimal](18,2),[ReturnQty]*[UnitPrice])) PERSISTED,
	[Reason] [nvarchar](500) NULL,
	[Note] [nvarchar](1000) NULL,
	[RelatedGRNLineId] [bigint] NULL,
 CONSTRAINT [PK_PurchaseReturnNoteLines] PRIMARY KEY CLUSTERED 
(
	[PurchaseReturnLineId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PurchaseReturnNotes]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PurchaseReturnNotes](
	[PurchaseReturnId] [bigint] IDENTITY(1,1) NOT NULL,
	[ReturnCode] [varchar](30) NOT NULL,
	[RelatedGRNId] [bigint] NULL,
	[ReturnDate] [datetime2](0) NOT NULL,
	[Status] [varchar](20) NOT NULL,
	[Reason] [nvarchar](500) NULL,
	[Note] [nvarchar](1000) NULL,
	[FeeAmount] [decimal](18, 2) NOT NULL,
	[RefundStatus] [varchar](20) NOT NULL,
	[RefundedAmount] [decimal](18, 2) NOT NULL,
	[RefundedAt] [datetime2](0) NULL,
	[RefundMethod] [varchar](30) NULL,
	[RefundReference] [nvarchar](100) NULL,
	[CreatedBy] [bigint] NOT NULL,
	[CreatedAt] [datetime2](0) NOT NULL,
	[ApprovedBy] [bigint] NULL,
	[ApprovedAt] [datetime2](0) NULL,
	[PostedAt] [datetime2](0) NULL,
 CONSTRAINT [PK_PurchaseReturnNotes] PRIMARY KEY CLUSTERED 
(
	[PurchaseReturnId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Receivers]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Receivers](
	[ReceiverId] [bigint] IDENTITY(1,1) NOT NULL,
	[ReceiverCode] [nvarchar](50) NULL,
	[ReceiverName] [nvarchar](300) NOT NULL,
	[Phone] [nvarchar](30) NULL,
	[Email] [nvarchar](255) NULL,
	[Address] [nvarchar](500) NULL,
	[Notes] [nvarchar](1000) NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[City] [nvarchar](100) NULL,
	[Ward] [nvarchar](100) NULL,
	[District] [nvarchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[ReceiverId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ReleaseRequestLines]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ReleaseRequestLines](
	[ReleaseRequestLineId] [bigint] IDENTITY(1,1) NOT NULL,
	[ReleaseRequestId] [bigint] NOT NULL,
	[ItemId] [bigint] NOT NULL,
	[RequestedQty] [decimal](18, 3) NOT NULL,
	[UomId] [bigint] NOT NULL,
	[Note] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[ReleaseRequestLineId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ReleaseRequests]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ReleaseRequests](
	[ReleaseRequestId] [bigint] IDENTITY(1,1) NOT NULL,
	[ReleaseRequestCode] [nvarchar](50) NOT NULL,
	[RequestedBy] [bigint] NOT NULL,
	[ReceiverId] [bigint] NOT NULL,
	[WarehouseId] [bigint] NOT NULL,
	[RequestedDate] [date] NULL,
	[Purpose] [nvarchar](500) NULL,
	[Status] [nvarchar](30) NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[SubmittedAt] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[ReleaseRequestId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Roles]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Roles](
	[RoleId] [bigint] IDENTITY(1,1) NOT NULL,
	[RoleCode] [nvarchar](50) NOT NULL,
	[RoleName] [nvarchar](100) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[RoleId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StocktakeLines]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StocktakeLines](
	[StocktakeLineId] [bigint] IDENTITY(1,1) NOT NULL,
	[StocktakeId] [bigint] NOT NULL,
	[ItemId] [bigint] NOT NULL,
	[SystemQtySnapshot] [decimal](18, 3) NOT NULL,
	[CountedQty] [decimal](18, 3) NULL,
	[VarianceQty]  AS (isnull([CountedQty],(0))-[SystemQtySnapshot]) PERSISTED,
	[Note] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[StocktakeLineId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StocktakeSessions]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StocktakeSessions](
	[StocktakeId] [bigint] IDENTITY(1,1) NOT NULL,
	[StocktakeCode] [nvarchar](50) NOT NULL,
	[WarehouseId] [bigint] NOT NULL,
	[Mode] [nvarchar](20) NOT NULL,
	[PlannedAt] [datetime2](7) NULL,
	[StartedAt] [datetime2](7) NULL,
	[EndedAt] [datetime2](7) NULL,
	[CreatedBy] [bigint] NOT NULL,
	[Status] [nvarchar](30) NOT NULL,
	[Note] [nvarchar](1000) NULL,
PRIMARY KEY CLUSTERED 
(
	[StocktakeId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Suppliers]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Suppliers](
	[SupplierId] [bigint] IDENTITY(1,1) NOT NULL,
	[SupplierCode] [nvarchar](50) NULL,
	[SupplierName] [nvarchar](300) NOT NULL,
	[TaxCode] [nvarchar](50) NULL,
	[Phone] [nvarchar](30) NULL,
	[Email] [nvarchar](255) NULL,
	[Address] [nvarchar](500) NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[City] [nvarchar](100) NULL,
	[Ward] [nvarchar](100) NULL,
	[District] [nvarchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[SupplierId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[UnitOfMeasure]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[UnitOfMeasure](
	[UomId] [bigint] IDENTITY(1,1) NOT NULL,
	[UomName] [nvarchar](100) NOT NULL,
	[IsActive] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[UomId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[UserRoles]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[UserRoles](
	[UserRoleId] [bigint] IDENTITY(1,1) NOT NULL,
	[UserId] [bigint] NOT NULL,
	[RoleId] [bigint] NOT NULL,
	[AssignedAt] [datetime2](7) NOT NULL,
	[AssignedBy] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[UserRoleId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Users]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Users](
	[UserId] [bigint] IDENTITY(1,1) NOT NULL,
	[Email] [nvarchar](255) NOT NULL,
	[Username] [nvarchar](100) NULL,
	[FullName] [nvarchar](200) NOT NULL,
	[Phone] [nvarchar](30) NULL,
	[IsActive] [bit] NOT NULL,
	[LastLoginAt] [datetime2](7) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
	[PasswordHash] [nvarchar](255) NOT NULL,
	[Gender] [nvarchar](10) NULL,
	[DOB] [date] NULL,
PRIMARY KEY CLUSTERED 
(
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Warehouses]    Script Date: 22/03/2026 09:07:47 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Warehouses](
	[WarehouseId] [bigint] IDENTITY(1,1) NOT NULL,
	[WarehouseCode] [nvarchar](50) NOT NULL,
	[WarehouseName] [nvarchar](200) NOT NULL,
	[Address] [nvarchar](400) NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[District] [nvarchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[WarehouseId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET IDENTITY_INSERT [dbo].[AuditLogs] ON 

INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (1, 2, N'CREATE', N'PurchaseOrder', 1, N'Tạo PO-0001', CAST(N'2026-02-08T14:02:47.5534645' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (2, 3, N'POST', N'GRN', 1, N'Post GRN-0001', CAST(N'2026-02-08T14:02:47.5534645' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (3, 3, N'POST', N'GDN', 1, N'Post GDN-0001', CAST(N'2026-02-08T14:02:47.5534645' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (4, 4, N'POST', N'ADJ', 1, N'Post ADJ-0001', CAST(N'2026-02-08T14:02:47.5534645' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (5, 1, N'LOGIN', N'User', 1, N'Người dùng ''admin'' đăng nhập thành công', CAST(N'2026-03-02T15:34:53.4674036' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (6, 1, N'LOGIN', N'User', 1, N'Người dùng ''admin'' đăng nhập thành công', CAST(N'2026-03-02T15:59:00.5177035' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (7, 3, N'LOGIN', N'User', 3, N'Người dùng ''wd'' đăng nhập thành công', CAST(N'2026-03-02T15:59:09.8150196' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (8, 2, N'LOGIN', N'User', 2, N'Người dùng ''sale'' đăng nhập thành công', CAST(N'2026-03-02T16:07:36.1317672' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (9, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-02T16:07:45.2688941' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (10, 5, N'LOGIN', N'User', 5, N'Người dùng ''anv5'' đăng nhập thành công', CAST(N'2026-03-02T16:07:51.1834535' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (11, 1, N'LOGIN', N'User', 1, N'Người dùng ''admin'' đăng nhập thành công', CAST(N'2026-03-02T16:12:44.5914430' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (12, 1, N'UPDATE', N'User', 2, N'Cập nhật tài khoản ''sale''', CAST(N'2026-03-02T16:12:54.1189686' AS DateTime2), N'{"FullName":"Sale Engine","Username":"sale","Email":"anhnthe173447@fpt.edu.vn","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}', N'{"FullName":"Sale Engine","Username":"sale","Email":"anhnthe173447@fpt.edu.vn","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}')
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (13, 1, N'UPDATE', N'User', 2, N'Cập nhật tài khoản ''sale''', CAST(N'2026-03-02T16:13:00.9613268' AS DateTime2), N'{"FullName":"Sale Engine","Username":"sale","Email":"anhnthe173447@fpt.edu.vn","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}', N'{"FullName":"Sale Engine","Username":"sale","Email":"anhnthe173447@fpt.edu.vn","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}')
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (14, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-02T16:14:57.5770744' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (15, 3, N'LOGIN', N'User', 3, N'Người dùng ''wd'' đăng nhập thành công', CAST(N'2026-03-02T16:15:06.6064140' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (16, 1, N'LOGIN', N'User', 1, N'Người dùng ''admin'' đăng nhập thành công', CAST(N'2026-03-02T16:19:01.9787907' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (17, 1, N'UPDATE', N'User', 2, N'Cập nhật tài khoản ''sale''', CAST(N'2026-03-02T16:20:37.0091768' AS DateTime2), N'{"FullName":"Sale Engine","Username":"sale","Email":"anhnthe173447@fpt.edu.vn","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}', N'{"FullName":"Sale Engine","Username":"sale","Email":"anhnthe173447@fpt.edu.vn","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}')
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (18, 2, N'LOGIN', N'User', 2, N'Người dùng ''sale'' đăng nhập thành công', CAST(N'2026-03-02T16:21:47.2795400' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (19, 5, N'LOGIN', N'User', 5, N'Người dùng ''anv5'' đăng nhập thành công', CAST(N'2026-03-02T16:22:45.2732426' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (20, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-02T16:22:52.7299117' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (21, 5, N'LOGIN', N'User', 5, N'Người dùng ''anv5'' đăng nhập thành công', CAST(N'2026-03-02T16:42:28.6735342' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (22, 3, N'LOGIN', N'User', 3, N'Người dùng ''wd'' đăng nhập thành công', CAST(N'2026-03-02T16:42:39.3762304' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (23, 2, N'LOGIN', N'User', 2, N'Người dùng ''sale'' đăng nhập thành công', CAST(N'2026-03-02T16:43:04.6648107' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (24, 5, N'LOGIN', N'User', 5, N'Người dùng ''anv5'' đăng nhập thành công', CAST(N'2026-03-02T16:43:10.8663567' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (25, 1, N'LOGIN', N'User', 1, N'Người dùng ''admin'' đăng nhập thành công', CAST(N'2026-03-02T17:08:29.6340905' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (26, 1, N'UPDATE', N'User', 6, N'Cập nhật tài khoản ''anv6''', CAST(N'2026-03-02T17:08:37.6555616' AS DateTime2), N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}', N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}')
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (27, 1, N'LOGIN', N'User', 1, N'Người dùng ''admin'' đăng nhập thành công', CAST(N'2026-03-02T17:13:07.9813157' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (28, 1, N'UPDATE', N'User', 6, N'Cập nhật tài khoản ''anv6''', CAST(N'2026-03-02T17:13:15.1459334' AS DateTime2), N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}', N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}')
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (29, 1, N'UPDATE', N'User', 6, N'Cập nhật tài khoản ''anv6''', CAST(N'2026-03-02T17:13:21.0052610' AS DateTime2), N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}', N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}')
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (30, 1, N'LOGIN', N'User', 1, N'Người dùng ''admin'' đăng nhập thành công', CAST(N'2026-03-02T17:21:32.9255145' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (31, 1, N'UPDATE', N'User', 6, N'Cập nhật tài khoản ''anv6''', CAST(N'2026-03-02T17:21:40.7066862' AS DateTime2), N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}', N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"K\u1EBF To\u00E1n"}')
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (32, 1, N'LOGIN', N'User', 1, N'Người dùng ''admin'' đăng nhập thành công', CAST(N'2026-03-02T17:22:08.2066450' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (33, 1, N'UPDATE', N'User', 6, N'Cập nhật tài khoản ''anv6''', CAST(N'2026-03-02T17:22:14.8843386' AS DateTime2), N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"K\u1EBF To\u00E1n"}', N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}')
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (34, 1, N'UPDATE', N'User', 6, N'Cập nhật tài khoản ''anv6''', CAST(N'2026-03-02T17:22:18.8567900' AS DateTime2), N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}', N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"K\u1EBF To\u00E1n"}')
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (35, 1, N'UPDATE', N'User', 6, N'Cập nhật tài khoản ''anv6''', CAST(N'2026-03-02T17:22:24.0975192' AS DateTime2), N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"K\u1EBF To\u00E1n"}', N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Support"}')
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (36, 1, N'UPDATE', N'User', 6, N'Cập nhật tài khoản ''anv6''', CAST(N'2026-03-02T17:22:29.3720221' AS DateTime2), N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Support"}', N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}')
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (37, 1, N'UPDATE', N'User', 6, N'Cập nhật tài khoản ''anv6''', CAST(N'2026-03-02T17:22:33.1284569' AS DateTime2), N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"Sale Engine"}', N'{"FullName":"Nguy\u1EC5n v\u0103n A","Username":"anv6","Email":"nguyen123@gmail.com","IsActive":true,"Gender":null,"DOB":null,"RoleName":"K\u1EBF To\u00E1n"}')
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (38, 3, N'LOGIN', N'User', 3, N'Người dùng ''wd'' đăng nhập thành công', CAST(N'2026-03-03T09:08:26.3899816' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (39, 5, N'LOGIN', N'User', 5, N'Người dùng ''anv5'' đăng nhập thành công', CAST(N'2026-03-03T09:08:45.7486332' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (40, 3, N'LOGIN', N'User', 3, N'Người dùng ''wd'' đăng nhập thành công', CAST(N'2026-03-03T09:21:09.0389877' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (41, 5, N'LOGIN', N'User', 5, N'Người dùng ''anv5'' đăng nhập thành công', CAST(N'2026-03-03T09:47:49.9412297' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (42, 7, N'LOGIN', N'User', 7, N'Người dùng ''bnv7'' đăng nhập thành công', CAST(N'2026-03-09T21:25:47.9112851' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (43, 7, N'LOGIN', N'User', 7, N'Người dùng ''bnv7'' đăng nhập thành công', CAST(N'2026-03-09T22:21:03.4573496' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (44, 7, N'LOGIN', N'User', 7, N'Người dùng ''bnv7'' đăng nhập thành công', CAST(N'2026-03-09T22:24:39.0977746' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (45, 7, N'LOGIN', N'User', 7, N'Người dùng ''bnv7'' đăng nhập thành công', CAST(N'2026-03-09T22:29:14.6970432' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (46, 7, N'LOGIN', N'User', 7, N'Người dùng ''bnv7'' đăng nhập thành công', CAST(N'2026-03-09T22:35:25.5266791' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (47, 7, N'LOGIN', N'User', 7, N'Người dùng ''bnv7'' đăng nhập thành công', CAST(N'2026-03-09T22:38:47.1541813' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (48, 7, N'LOGIN', N'User', 7, N'Người dùng ''bnv7'' đăng nhập thành công', CAST(N'2026-03-09T23:03:17.2651850' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (49, 7, N'LOGIN', N'User', 7, N'Người dùng ''bnv7'' đăng nhập thành công', CAST(N'2026-03-09T23:16:28.3414414' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (50, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-13T06:53:15.6564993' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (51, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-13T08:33:04.0994923' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (52, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-13T09:09:52.9332720' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (53, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-13T20:27:08.1501029' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (54, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-13T20:48:51.0525057' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (55, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-13T20:54:45.2467150' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (56, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-13T21:01:26.7459761' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (57, 4, N'CANCEL_STOCKTAKE', N'StocktakeSession', 5, N'Hủy phiếu kiểm kê ST-2026-0001. Lý do: string', CAST(N'2026-03-13T21:05:47.7941915' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (58, 4, N'START_STOCKTAKE', N'StocktakeSession', 6, N'Bắt đầu kiểm kê kho ''Kho HCM'' (Mã phiếu: ST-2026-0002). Snapshot 1 mặt hàng.', CAST(N'2026-03-13T21:13:02.8627313' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (59, 4, N'SUBMIT_STOCKTAKE', N'StocktakeSession', 6, N'Gửi xác nhận hoàn tất đếm phiếu kiểm kê ST-2026-0002 tại kho Kho HCM. Đang chờ phê duyệt.', CAST(N'2026-03-13T21:32:07.6232121' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (60, 4, N'STAGE1_APPROVE', N'StocktakeSession', 6, N'Bước 1 (Manager): APPROVE. Lý do: string', CAST(N'2026-03-13T21:33:30.9983239' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (61, 4, N'CANCEL_STOCKTAKE', N'StocktakeSession', 6, N'Hủy phiếu kiểm kê ST-2026-0002. Lý do: string', CAST(N'2026-03-13T21:51:41.3112496' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (62, 4, N'START_STOCKTAKE', N'StocktakeSession', 7, N'Bắt đầu kiểm kê kho ''Kho HCM'' (Mã phiếu: ST-2026-0003). Snapshot 1 mặt hàng.', CAST(N'2026-03-13T21:52:38.1304637' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (63, 4, N'SUBMIT_STOCKTAKE', N'StocktakeSession', 7, N'Gửi xác nhận hoàn tất đếm phiếu kiểm kê ST-2026-0003 tại kho Kho HCM. Đang chờ phê duyệt.', CAST(N'2026-03-13T21:53:45.7700663' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (64, 4, N'STAGE1_APPROVE', N'StocktakeSession', 7, N'Bước 1 (Manager): APPROVE. Lý do: string', CAST(N'2026-03-13T21:53:54.9072465' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (65, 4, N'POST_ADJUSTMENT', N'StocktakeSession', 7, N'Ghi sổ điều chỉnh tồn kho cho phiếu ST-2026-0003. Đã tạo phiếu điều chỉnh tự động.', CAST(N'2026-03-13T21:54:23.1433151' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (66, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-13T22:06:29.6969291' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (67, 4, N'CANCEL_STOCKTAKE', N'StocktakeSession', 8, N'Hủy phiếu kiểm kê ST-2026-0004. Lý do: string', CAST(N'2026-03-13T22:09:04.1885193' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (68, 4, N'START_STOCKTAKE', N'StocktakeSession', 9, N'Bắt đầu kiểm kê kho ''Kho HCM'' (Mã phiếu: ST-2026-0005). Snapshot 1 mặt hàng.', CAST(N'2026-03-13T22:09:22.1144738' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (69, 4, N'BULK_MATCH_STOCKTAKE', N'StocktakeSession', 9, N'Đánh dấu 1 mặt hàng ''Số thực tế = Tồn hệ thống'' cho mã phiếu ST-2026-0005.', CAST(N'2026-03-13T22:12:35.7056557' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (70, 4, N'SUBMIT_STOCKTAKE', N'StocktakeSession', 9, N'Gửi xác nhận hoàn tất đếm phiếu kiểm kê ST-2026-0005 tại kho Kho HCM. Đang chờ phê duyệt.', CAST(N'2026-03-13T22:12:49.6764049' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (71, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-14T16:01:53.3515342' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (72, 4, N'START_STOCKTAKE', N'StocktakeSession', 10, N'Bắt đầu kiểm kê kho ''Kho HCM'' (Mã phiếu: ST-2026-0006). Snapshot 1 mặt hàng.', CAST(N'2026-03-14T16:03:38.8769722' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (73, 4, N'CANCEL_STOCKTAKE', N'StocktakeSession', 10, N'Hủy phiếu kiểm kê ST-2026-0006. Lý do: string', CAST(N'2026-03-14T16:24:02.0812128' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (74, 4, N'START_STOCKTAKE', N'StocktakeSession', 11, N'Bắt đầu kiểm kê kho ''Kho HCM'' (Mã phiếu: ST-2026-0007). Snapshot 1 mặt hàng.', CAST(N'2026-03-14T16:24:33.2657898' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (75, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-14T17:33:06.6992314' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (76, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-14T17:42:15.0516151' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (77, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-14T17:50:54.7648630' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (78, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-17T15:37:39.0342345' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (79, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-17T15:42:41.5485018' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (80, 4, N'CANCEL_STOCKTAKE', N'StocktakeSession', 11, N'Hủy phiếu kiểm kê ST-2026-0007. Lý do: string', CAST(N'2026-03-17T15:43:33.6423921' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (81, 4, N'CANCEL_STOCKTAKE', N'StocktakeSession', 9, N'Hủy phiếu kiểm kê ST-2026-0005. Lý do: string', CAST(N'2026-03-17T15:44:14.8715364' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (82, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-17T15:50:30.0287110' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (83, 4, N'START_STOCKTAKE', N'StocktakeSession', 12, N'Bắt đầu kiểm kê kho ''Kho HCM'' (Mã phiếu: ST-2026-0008). Snapshot 1 mặt hàng.', CAST(N'2026-03-17T15:50:59.2045030' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (84, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-17T16:47:00.2251860' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (85, 4, N'BULK_MATCH_STOCKTAKE', N'StocktakeSession', 12, N'Đánh dấu 1 mặt hàng ''Số thực tế = Tồn hệ thống'' cho mã phiếu ST-2026-0008.', CAST(N'2026-03-17T16:51:39.0767303' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (86, 4, N'SUBMIT_STOCKTAKE', N'StocktakeSession', 12, N'Gửi xác nhận hoàn tất đếm phiếu kiểm kê ST-2026-0008 tại kho Kho HCM. Đang chờ phê duyệt.', CAST(N'2026-03-17T16:51:42.9007054' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (87, 4, N'LOGIN', N'User', 4, N'Người dùng ''lamhp'' đăng nhập thành công', CAST(N'2026-03-17T17:41:42.1548382' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (88, 4, N'CANCEL_STOCKTAKE_PLAN', N'StocktakeSession', 12, N'Hủy kế hoạch kiểm kê ST-2026-0008. Lý do: string', CAST(N'2026-03-17T17:42:17.3741783' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (89, 4, N'SUBMIT_STOCKTAKE_PLAN', N'StocktakeSession', 13, N'Gửi thông qua kế hoạch kiểm kê ST-2026-0009 tại kho Kho HCM. Đang chờ phê duyệt.', CAST(N'2026-03-17T17:42:45.9369508' AS DateTime2), NULL, NULL)
INSERT [dbo].[AuditLogs] ([AuditLogId], [ActorUserId], [Action], [EntityType], [EntityId], [Detail], [CreatedAt], [OldValues], [NewValues]) VALUES (90, 4, N'PLAN_RECOUNT', N'StocktakeSession', 13, N'Phê duyệt kế hoạch kiểm kê: RECOUNT. Lý do: string', CAST(N'2026-03-17T17:53:33.2347194' AS DateTime2), NULL, NULL)
SET IDENTITY_INSERT [dbo].[AuditLogs] OFF
GO
SET IDENTITY_INSERT [dbo].[Brands] ON 

INSERT [dbo].[Brands] ([BrandId], [BrandName], [IsActive]) VALUES (1, N'MK Brand', 1)
SET IDENTITY_INSERT [dbo].[Brands] OFF
GO
SET IDENTITY_INSERT [dbo].[Certificates] ON 

INSERT [dbo].[Certificates] ([CertificateId], [GRNLineId], [CertType], [CertNo], [IssuedBy], [IssuedDate], [Note]) VALUES (1, 1, N'CO', N'CO-2026-0001', N'Issuer A', CAST(N'2026-02-08' AS Date), N'CO demo')
INSERT [dbo].[Certificates] ([CertificateId], [GRNLineId], [CertType], [CertNo], [IssuedBy], [IssuedDate], [Note]) VALUES (2, 1, N'CQ', N'CQ-2026-0001', N'Issuer A', CAST(N'2026-02-08' AS Date), N'CQ demo')
SET IDENTITY_INSERT [dbo].[Certificates] OFF
GO
SET IDENTITY_INSERT [dbo].[DocumentApproval] ON 

INSERT [dbo].[DocumentApproval] ([ApprovalId], [DocType], [DocId], [StageNo], [Decision], [Reason], [ActionBy], [ActionAt]) VALUES (1, N'GRN', 1, 1, N'APPROVE', N'Duyệt GRN demo', 1, CAST(N'2026-02-08T14:02:47.5514648' AS DateTime2))
INSERT [dbo].[DocumentApproval] ([ApprovalId], [DocType], [DocId], [StageNo], [Decision], [Reason], [ActionBy], [ActionAt]) VALUES (2, N'GDN', 1, 1, N'APPROVE', N'Duyệt GDN demo', 1, CAST(N'2026-02-08T14:02:47.5514648' AS DateTime2))
INSERT [dbo].[DocumentApproval] ([ApprovalId], [DocType], [DocId], [StageNo], [Decision], [Reason], [ActionBy], [ActionAt]) VALUES (3, N'ADJ', 1, 1, N'APPROVE', N'Duyệt ADJ demo', 1, CAST(N'2026-02-08T14:02:47.5514648' AS DateTime2))
INSERT [dbo].[DocumentApproval] ([ApprovalId], [DocType], [DocId], [StageNo], [Decision], [Reason], [ActionBy], [ActionAt]) VALUES (4, N'STOCKTAKE', 1, 1, N'APPROVE', N'Duyệt STOCKTAKE demo', 1, CAST(N'2026-02-08T14:02:47.5514648' AS DateTime2))
INSERT [dbo].[DocumentApproval] ([ApprovalId], [DocType], [DocId], [StageNo], [Decision], [Reason], [ActionBy], [ActionAt]) VALUES (5, N'Stocktake', 6, 1, N'APPROVE', N'string', 4, CAST(N'2026-03-13T21:33:30.8709772' AS DateTime2))
INSERT [dbo].[DocumentApproval] ([ApprovalId], [DocType], [DocId], [StageNo], [Decision], [Reason], [ActionBy], [ActionAt]) VALUES (6, N'Stocktake', 6, 2, N'APPROVE', N'string', 4, CAST(N'2026-03-13T21:35:40.0731443' AS DateTime2))
INSERT [dbo].[DocumentApproval] ([ApprovalId], [DocType], [DocId], [StageNo], [Decision], [Reason], [ActionBy], [ActionAt]) VALUES (7, N'Stocktake', 7, 1, N'APPROVE', N'string', 4, CAST(N'2026-03-13T21:53:54.8767883' AS DateTime2))
INSERT [dbo].[DocumentApproval] ([ApprovalId], [DocType], [DocId], [StageNo], [Decision], [Reason], [ActionBy], [ActionAt]) VALUES (8, N'Stocktake', 7, 2, N'APPROVE', N'string', 4, CAST(N'2026-03-13T21:53:58.5406303' AS DateTime2))
INSERT [dbo].[DocumentApproval] ([ApprovalId], [DocType], [DocId], [StageNo], [Decision], [Reason], [ActionBy], [ActionAt]) VALUES (12, N'STOCKTAKE', 13, 1, N'RECOUNT', N'string', 4, CAST(N'2026-03-17T17:53:33.1112700' AS DateTime2))
SET IDENTITY_INSERT [dbo].[DocumentApproval] OFF
GO
SET IDENTITY_INSERT [dbo].[DocumentAttachments] ON 

INSERT [dbo].[DocumentAttachments] ([AttachmentId], [DocType], [DocId], [AttachmentType], [FileName], [FileUrlOrPath], [UploadedBy], [UploadedAt]) VALUES (1, N'GRN', 1, N'GENERAL', N'GRN-0001.pdf', N'/files/GRN-0001.pdf', 3, CAST(N'2026-02-08T14:02:47.5524647' AS DateTime2))
INSERT [dbo].[DocumentAttachments] ([AttachmentId], [DocType], [DocId], [AttachmentType], [FileName], [FileUrlOrPath], [UploadedBy], [UploadedAt]) VALUES (2, N'GDN', 1, N'GENERAL', N'GDN-0001.pdf', N'/files/GDN-0001.pdf', 3, CAST(N'2026-02-08T14:02:47.5524647' AS DateTime2))
INSERT [dbo].[DocumentAttachments] ([AttachmentId], [DocType], [DocId], [AttachmentType], [FileName], [FileUrlOrPath], [UploadedBy], [UploadedAt]) VALUES (3, N'ADJ', 1, N'EVIDENCE', N'ADJ-0001.jpg', N'/files/ADJ-0001.jpg', 4, CAST(N'2026-02-08T14:02:47.5524647' AS DateTime2))
INSERT [dbo].[DocumentAttachments] ([AttachmentId], [DocType], [DocId], [AttachmentType], [FileName], [FileUrlOrPath], [UploadedBy], [UploadedAt]) VALUES (4, N'STOCKTAKE', 1, N'EVIDENCE', N'STK-0001.jpg', N'/files/STK-0001.jpg', 3, CAST(N'2026-02-08T14:02:47.5524647' AS DateTime2))
SET IDENTITY_INSERT [dbo].[DocumentAttachments] OFF
GO
SET IDENTITY_INSERT [dbo].[GoodsDeliveryNoteLines] ON 

INSERT [dbo].[GoodsDeliveryNoteLines] ([GDNLineId], [GDNId], [ItemId], [RequestedQty], [ActualQty], [UomId]) VALUES (1, 1, 1, CAST(10.000 AS Decimal(18, 3)), CAST(10.000 AS Decimal(18, 3)), 1)
SET IDENTITY_INSERT [dbo].[GoodsDeliveryNoteLines] OFF
GO
SET IDENTITY_INSERT [dbo].[GoodsDeliveryNotes] ON 

INSERT [dbo].[GoodsDeliveryNotes] ([GDNId], [GDNCode], [ReleaseRequestId], [WarehouseId], [IssueDate], [CreatedBy], [Status], [SubmittedAt], [ApprovedAt], [PostedAt], [Note]) VALUES (1, N'GDN-0001', 1, 1, CAST(N'2026-02-08' AS Date), 3, N'POSTED', CAST(N'2026-02-08T14:02:47.5424658' AS DateTime2), CAST(N'2026-02-08T14:02:47.5424658' AS DateTime2), CAST(N'2026-02-08T14:02:47.5424658' AS DateTime2), N'Xuất kho demo')
SET IDENTITY_INSERT [dbo].[GoodsDeliveryNotes] OFF
GO
SET IDENTITY_INSERT [dbo].[GoodsReceiptNoteLines] ON 

INSERT [dbo].[GoodsReceiptNoteLines] ([GRNLineId], [GRNId], [ItemId], [ExpectedQty], [ActualQty], [UomId], [RequiresCOCQ], [PurchaseOrderLineId], [UnitPrice]) VALUES (1, 1, 1, CAST(100.000 AS Decimal(18, 3)), CAST(100.000 AS Decimal(18, 3)), 1, 1, NULL, NULL)
SET IDENTITY_INSERT [dbo].[GoodsReceiptNoteLines] OFF
GO
SET IDENTITY_INSERT [dbo].[GoodsReceiptNotes] ON 

INSERT [dbo].[GoodsReceiptNotes] ([GRNId], [GRNCode], [PurchaseOrderId], [SupplierId], [WarehouseId], [ReceiptDate], [CreatedBy], [Status], [SubmittedAt], [ApprovedAt], [PostedAt], [Note], [ShippingFee], [IsPaid], [PaymentMethod], [TotalReceivedQty], [TotalGoodsAmount]) VALUES (1, N'GRN-0001', 1, 1, 1, CAST(N'2026-02-08' AS Date), 3, N'POSTED', CAST(N'2026-02-08T14:02:47.5384641' AS DateTime2), CAST(N'2026-02-08T14:02:47.5384641' AS DateTime2), CAST(N'2026-02-08T14:02:47.5384641' AS DateTime2), N'Nhập kho demo', CAST(0.00 AS Decimal(18, 2)), 0, NULL, CAST(0.000 AS Decimal(18, 3)), CAST(0.00 AS Decimal(18, 2)))
SET IDENTITY_INSERT [dbo].[GoodsReceiptNotes] OFF
GO
SET IDENTITY_INSERT [dbo].[InventoryAdjustmentLines] ON 

INSERT [dbo].[InventoryAdjustmentLines] ([AdjustmentLineId], [AdjustmentId], [ItemId], [SystemQty], [CountedQty], [Note]) VALUES (1, 1, 1, CAST(90.000 AS Decimal(18, 3)), CAST(89.000 AS Decimal(18, 3)), N'Giảm 1 do kiểm kê')
INSERT [dbo].[InventoryAdjustmentLines] ([AdjustmentLineId], [AdjustmentId], [ItemId], [SystemQty], [CountedQty], [Note]) VALUES (5, 5, 1, CAST(89.000 AS Decimal(18, 3)), CAST(999.000 AS Decimal(18, 3)), N'string')
SET IDENTITY_INSERT [dbo].[InventoryAdjustmentLines] OFF
GO
SET IDENTITY_INSERT [dbo].[InventoryAdjustmentRequests] ON 

INSERT [dbo].[InventoryAdjustmentRequests] ([AdjustmentId], [AdjustmentCode], [StocktakeId], [WarehouseId], [SubmittedBy], [Status], [Reason], [SubmittedAt], [ApprovedAt], [PostedAt]) VALUES (1, N'ADJ-0001', 1, 1, 4, N'POSTED', N'Điều chỉnh theo kiểm kê demo', CAST(N'2026-02-08T14:02:47.5454645' AS DateTime2), CAST(N'2026-02-08T14:02:47.5454645' AS DateTime2), CAST(N'2026-02-08T14:02:47.5454645' AS DateTime2))
INSERT [dbo].[InventoryAdjustmentRequests] ([AdjustmentId], [AdjustmentCode], [StocktakeId], [WarehouseId], [SubmittedBy], [Status], [Reason], [SubmittedAt], [ApprovedAt], [PostedAt]) VALUES (5, N'ADJ-2026-0001', 7, 1, 4, N'POSTED', N'Điều chỉnh tự động từ phiếu kiểm kê ST-2026-0003', CAST(N'2026-03-13T21:54:23.0751576' AS DateTime2), CAST(N'2026-03-13T21:54:23.0751908' AS DateTime2), CAST(N'2026-03-13T21:54:23.0752079' AS DateTime2))
SET IDENTITY_INSERT [dbo].[InventoryAdjustmentRequests] OFF
GO
SET IDENTITY_INSERT [dbo].[InventoryOnHand] ON 

INSERT [dbo].[InventoryOnHand] ([InventoryId], [WarehouseId], [ItemId], [OnHandQty], [ReservedQty], [UpdatedAt], [UnitCost]) VALUES (1, 1, 1, CAST(999.000 AS Decimal(18, 3)), CAST(0.000 AS Decimal(18, 3)), CAST(N'2026-03-13T21:54:23.1273980' AS DateTime2), CAST(0.00 AS Decimal(18, 2)))
SET IDENTITY_INSERT [dbo].[InventoryOnHand] OFF
GO
SET IDENTITY_INSERT [dbo].[InventoryTransactionLines] ON 

INSERT [dbo].[InventoryTransactionLines] ([InventoryTxnLineId], [InventoryTxnId], [ItemId], [QtyChange], [UomId], [Note]) VALUES (1, 1, 1, CAST(100.000 AS Decimal(18, 3)), 1, N'Nhập theo GRN-0001')
INSERT [dbo].[InventoryTransactionLines] ([InventoryTxnLineId], [InventoryTxnId], [ItemId], [QtyChange], [UomId], [Note]) VALUES (2, 2, 1, CAST(-10.000 AS Decimal(18, 3)), 1, N'Xuất theo GDN-0001')
INSERT [dbo].[InventoryTransactionLines] ([InventoryTxnLineId], [InventoryTxnId], [ItemId], [QtyChange], [UomId], [Note]) VALUES (3, 3, 1, CAST(-1.000 AS Decimal(18, 3)), 1, N'Điều chỉnh theo ADJ-0001')
SET IDENTITY_INSERT [dbo].[InventoryTransactionLines] OFF
GO
SET IDENTITY_INSERT [dbo].[InventoryTransactions] ON 

INSERT [dbo].[InventoryTransactions] ([InventoryTxnId], [TxnType], [TxnDate], [WarehouseId], [ReferenceType], [ReferenceId], [Status], [PostedBy], [PostedAt]) VALUES (1, N'INBOUND', CAST(N'2026-02-08T14:02:47.5474654' AS DateTime2), 1, N'GRN', 1, N'POSTED', 3, CAST(N'2026-02-08T14:02:47.5474654' AS DateTime2))
INSERT [dbo].[InventoryTransactions] ([InventoryTxnId], [TxnType], [TxnDate], [WarehouseId], [ReferenceType], [ReferenceId], [Status], [PostedBy], [PostedAt]) VALUES (2, N'OUTBOUND', CAST(N'2026-02-08T14:02:47.5484648' AS DateTime2), 1, N'GDN', 1, N'POSTED', 3, CAST(N'2026-02-08T14:02:47.5484648' AS DateTime2))
INSERT [dbo].[InventoryTransactions] ([InventoryTxnId], [TxnType], [TxnDate], [WarehouseId], [ReferenceType], [ReferenceId], [Status], [PostedBy], [PostedAt]) VALUES (3, N'ADJUST', CAST(N'2026-02-08T14:02:47.5494646' AS DateTime2), 1, N'ADJ', 1, N'POSTED', 4, CAST(N'2026-02-08T14:02:47.5494646' AS DateTime2))
SET IDENTITY_INSERT [dbo].[InventoryTransactions] OFF
GO
SET IDENTITY_INSERT [dbo].[ItemCategories] ON 

INSERT [dbo].[ItemCategories] ([CategoryId], [CategoryCode], [CategoryName], [ParentId], [IsActive]) VALUES (1, N'RAW', N'Raw Materials', NULL, 1)
INSERT [dbo].[ItemCategories] ([CategoryId], [CategoryCode], [CategoryName], [ParentId], [IsActive]) VALUES (2, N'RAW-001', N'Raw Subcategory', 1, 1)
SET IDENTITY_INSERT [dbo].[ItemCategories] OFF
GO
SET IDENTITY_INSERT [dbo].[ItemParameters] ON 

INSERT [dbo].[ItemParameters] ([ParamId], [ParamCode], [ParamName], [DataType], [IsActive]) VALUES (1, N'COLOR', N'Color', N'TEXT', 1)
INSERT [dbo].[ItemParameters] ([ParamId], [ParamCode], [ParamName], [DataType], [IsActive]) VALUES (2, N'SIZE', N'Size', N'TEXT', 1)
SET IDENTITY_INSERT [dbo].[ItemParameters] OFF
GO
SET IDENTITY_INSERT [dbo].[ItemParameterValues] ON 

INSERT [dbo].[ItemParameterValues] ([ItemParamValueId], [ItemId], [ParamId], [ParamValue]) VALUES (1, 1, 1, N'Blue')
INSERT [dbo].[ItemParameterValues] ([ItemParamValueId], [ItemId], [ParamId], [ParamValue]) VALUES (2, 1, 2, N'M')
SET IDENTITY_INSERT [dbo].[ItemParameterValues] OFF
GO
SET IDENTITY_INSERT [dbo].[ItemPrices] ON 

INSERT [dbo].[ItemPrices] ([ItemPriceId], [ItemId], [PriceType], [Amount], [Currency], [EffectiveFrom], [EffectiveTo], [IsActive], [CreatedAt]) VALUES (1, 1, N'PURCHASE', CAST(100.00 AS Decimal(18, 2)), N'VND', CAST(N'2026-02-08' AS Date), NULL, 1, CAST(N'2026-02-08T14:02:47.5354646' AS DateTime2))
INSERT [dbo].[ItemPrices] ([ItemPriceId], [ItemId], [PriceType], [Amount], [Currency], [EffectiveFrom], [EffectiveTo], [IsActive], [CreatedAt]) VALUES (2, 1, N'COST', CAST(90.00 AS Decimal(18, 2)), N'VND', CAST(N'2026-02-08' AS Date), NULL, 1, CAST(N'2026-02-08T14:02:47.5354646' AS DateTime2))
INSERT [dbo].[ItemPrices] ([ItemPriceId], [ItemId], [PriceType], [Amount], [Currency], [EffectiveFrom], [EffectiveTo], [IsActive], [CreatedAt]) VALUES (3, 1, N'SALE', CAST(150.00 AS Decimal(18, 2)), N'VND', CAST(N'2026-02-08' AS Date), NULL, 1, CAST(N'2026-02-08T14:02:47.5354646' AS DateTime2))
SET IDENTITY_INSERT [dbo].[ItemPrices] OFF
GO
SET IDENTITY_INSERT [dbo].[Items] ON 

INSERT [dbo].[Items] ([ItemId], [ItemCode], [ItemName], [ItemType], [Description], [CategoryId], [BrandId], [BaseUomId], [PackagingSpecId], [RequiresCO], [RequiresCQ], [IsActive], [DefaultWarehouseId], [InventoryAccount], [RevenueAccount], [CreatedAt], [UpdatedAt], [ShelfLifeDays], [ImageUrl]) VALUES (1, N'ITEM-001', N'Nguyên liệu demo', N'RAW', N'Demo item for full flow', 2, 1, 1, 1, 1, 1, 1, 1, N'1561', N'511', CAST(N'2026-02-08T14:02:47.5344642' AS DateTime2), CAST(N'2026-02-08T14:02:47.5344642' AS DateTime2), NULL, NULL)
SET IDENTITY_INSERT [dbo].[Items] OFF
GO
SET IDENTITY_INSERT [dbo].[ItemWarehousePolicy] ON 

INSERT [dbo].[ItemWarehousePolicy] ([ItemWarehousePolicyId], [ItemId], [WarehouseId], [MinQty], [ReorderQty]) VALUES (1, 1, 1, CAST(20.000 AS Decimal(18, 3)), CAST(50.000 AS Decimal(18, 3)))
SET IDENTITY_INSERT [dbo].[ItemWarehousePolicy] OFF
GO
SET IDENTITY_INSERT [dbo].[Notifications] ON 

INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (1, 2, N'PO Approved', N'PO-0001 đã được duyệt', N'PR', 1, 0, CAST(N'2026-02-08T14:02:47.5544644' AS DateTime2), NULL, NULL, 1, 0, NULL)
INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (2, 3, N'GRN Posted', N'GRN-0001 đã được post', N'GRN', 1, 0, CAST(N'2026-02-08T14:02:47.5544644' AS DateTime2), NULL, NULL, 1, 0, NULL)
INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (3, 3, N'GDN Posted', N'GDN-0001 đã được post', N'GDN', 1, 0, CAST(N'2026-02-08T14:02:47.5544644' AS DateTime2), NULL, NULL, 1, 0, NULL)
INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (4, 4, N'ADJ Posted', N'ADJ-0001 đã được post', N'ADJ', 1, 0, CAST(N'2026-02-08T14:02:47.5544644' AS DateTime2), NULL, NULL, 1, 0, NULL)
INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (5, 2, N'Thông tin tài khoản được cập nhật', N'Thông tin tài khoản của bạn đã được quản trị viên cập nhật. Vui lòng kiểm tra lại.', N'USER_UPDATED', 2, 0, CAST(N'2026-03-02T16:12:54.0763129' AS DateTime2), NULL, NULL, 1, 0, NULL)
INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (6, 2, N'Thông tin tài khoản được cập nhật', N'Thông tin tài khoản của bạn đã được quản trị viên cập nhật. Vui lòng kiểm tra lại.', N'USER_UPDATED', 2, 0, CAST(N'2026-03-02T16:13:00.9548851' AS DateTime2), NULL, NULL, 1, 0, NULL)
INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (7, 2, N'Thông tin tài khoản được cập nhật', N'Thông tin tài khoản của bạn đã được quản trị viên cập nhật. Vui lòng kiểm tra lại.', N'USER_UPDATED', 2, 0, CAST(N'2026-03-02T16:20:37.0037137' AS DateTime2), NULL, NULL, 1, 0, NULL)
INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (8, 6, N'Thông tin tài khoản được cập nhật', N'Thông tin tài khoản của bạn đã được quản trị viên cập nhật. Vui lòng kiểm tra lại.', N'USER_UPDATED', 6, 0, CAST(N'2026-03-02T17:08:37.6287837' AS DateTime2), NULL, NULL, 1, 0, NULL)
INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (9, 6, N'Thông tin tài khoản được cập nhật', N'Thông tin tài khoản của bạn đã được quản trị viên cập nhật. Vui lòng kiểm tra lại.', N'USER_UPDATED', 6, 0, CAST(N'2026-03-02T17:13:15.1152856' AS DateTime2), NULL, NULL, 1, 0, NULL)
INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (10, 6, N'Thông tin tài khoản được cập nhật', N'Thông tin tài khoản của bạn đã được quản trị viên cập nhật. Vui lòng kiểm tra lại.', N'USER_UPDATED', 6, 0, CAST(N'2026-03-02T17:13:21.0021111' AS DateTime2), NULL, NULL, 1, 0, NULL)
INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (11, 6, N'Thông tin tài khoản được cập nhật', N'Thông tin tài khoản của bạn đã được quản trị viên cập nhật. Vui lòng kiểm tra lại.', N'USER_UPDATED', 6, 0, CAST(N'2026-03-02T17:21:40.6568860' AS DateTime2), NULL, NULL, 1, 0, NULL)
INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (12, 6, N'Thông tin tài khoản được cập nhật', N'Thông tin tài khoản của bạn đã được quản trị viên cập nhật. Vui lòng kiểm tra lại.', N'USER_UPDATED', 6, 0, CAST(N'2026-03-02T17:22:14.8778347' AS DateTime2), NULL, NULL, 1, 0, NULL)
INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (13, 6, N'Thông tin tài khoản được cập nhật', N'Thông tin tài khoản của bạn đã được quản trị viên cập nhật. Vui lòng kiểm tra lại.', N'USER_UPDATED', 6, 0, CAST(N'2026-03-02T17:22:18.8509345' AS DateTime2), NULL, NULL, 1, 0, NULL)
INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (14, 6, N'Thông tin tài khoản được cập nhật', N'Thông tin tài khoản của bạn đã được quản trị viên cập nhật. Vui lòng kiểm tra lại.', N'USER_UPDATED', 6, 0, CAST(N'2026-03-02T17:22:24.0912261' AS DateTime2), NULL, NULL, 1, 0, NULL)
INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (15, 6, N'Thông tin tài khoản được cập nhật', N'Thông tin tài khoản của bạn đã được quản trị viên cập nhật. Vui lòng kiểm tra lại.', N'USER_UPDATED', 6, 0, CAST(N'2026-03-02T17:22:29.3665871' AS DateTime2), NULL, NULL, 1, 0, NULL)
INSERT [dbo].[Notifications] ([NotificationId], [UserId], [Title], [Message], [RefType], [RefId], [IsRead], [CreatedAt], [ReadAt], [Type], [Severity], [IsDeleted], [ExpiresAt]) VALUES (16, 6, N'Thông tin tài khoản được cập nhật', N'Thông tin tài khoản của bạn đã được quản trị viên cập nhật. Vui lòng kiểm tra lại.', N'USER_UPDATED', 6, 0, CAST(N'2026-03-02T17:22:33.1229224' AS DateTime2), NULL, NULL, 1, 0, NULL)
SET IDENTITY_INSERT [dbo].[Notifications] OFF
GO
SET IDENTITY_INSERT [dbo].[PackagingSpecs] ON 

INSERT [dbo].[PackagingSpecs] ([PackagingSpecId], [SpecName], [Description], [IsActive]) VALUES (1, N'Standard Pack', N'Demo packaging spec', 1)
SET IDENTITY_INSERT [dbo].[PackagingSpecs] OFF
GO
SET IDENTITY_INSERT [dbo].[PasswordResetTokens] ON 

INSERT [dbo].[PasswordResetTokens] ([TokenId], [UserId], [TokenHash], [ExpiresAt], [UsedAt], [CreatedAt]) VALUES (1, 2, 0xAA, CAST(N'2026-02-09T14:02:47.5314645' AS DateTime2), NULL, CAST(N'2026-02-08T14:02:47.5314645' AS DateTime2))
SET IDENTITY_INSERT [dbo].[PasswordResetTokens] OFF
GO
SET IDENTITY_INSERT [dbo].[PurchaseOrderLines] ON 

INSERT [dbo].[PurchaseOrderLines] ([PurchaseOrderLineId], [PurchaseOrderId], [ItemId], [OrderedQty], [UomId], [Note], [ReceivedQty], [LineStatus], [UnitPrice], [Currency]) VALUES (1, 1, 1, CAST(100.000 AS Decimal(18, 3)), 1, N'Dòng PO demo', CAST(0.000 AS Decimal(18, 3)), N'Open', NULL, NULL)
INSERT [dbo].[PurchaseOrderLines] ([PurchaseOrderLineId], [PurchaseOrderId], [ItemId], [OrderedQty], [UomId], [Note], [ReceivedQty], [LineStatus], [UnitPrice], [Currency]) VALUES (3, 6, 1, CAST(123123.000 AS Decimal(18, 3)), 1, N'1231321', CAST(0.000 AS Decimal(18, 3)), N'Open', CAST(1232.00 AS Decimal(18, 2)), N'VND')
INSERT [dbo].[PurchaseOrderLines] ([PurchaseOrderLineId], [PurchaseOrderId], [ItemId], [OrderedQty], [UomId], [Note], [ReceivedQty], [LineStatus], [UnitPrice], [Currency]) VALUES (4, 7, 1, CAST(123123.000 AS Decimal(18, 3)), 1, N'1231321', CAST(0.000 AS Decimal(18, 3)), N'Open', CAST(1232.00 AS Decimal(18, 2)), N'VND')
INSERT [dbo].[PurchaseOrderLines] ([PurchaseOrderLineId], [PurchaseOrderId], [ItemId], [OrderedQty], [UomId], [Note], [ReceivedQty], [LineStatus], [UnitPrice], [Currency]) VALUES (5, 8, 1, CAST(100.000 AS Decimal(18, 3)), 1, N'mcmcm', CAST(0.000 AS Decimal(18, 3)), N'Open', CAST(10000.00 AS Decimal(18, 2)), N'VND')
SET IDENTITY_INSERT [dbo].[PurchaseOrderLines] OFF
GO
SET IDENTITY_INSERT [dbo].[PurchaseOrders] ON 

INSERT [dbo].[PurchaseOrders] ([PurchaseOrderId], [POCode], [RequestedBy], [SupplierId], [RequestedDate], [Justification], [Status], [CurrentStageNo], [CreatedAt], [SubmittedAt], [UpdatedAt], [ExpectedDeliveryDate], [LifecycleStatus], [TotalAmount], [DiscountAmount], [ResponsibleUserId], [WarehouseId]) VALUES (1, N'PO-0001', 2, 1, CAST(N'2026-02-08' AS Date), N'Nhập hàng demo', N'APPROVED', 1, CAST(N'2026-02-08T14:02:47.5374647' AS DateTime2), CAST(N'2026-02-08T14:02:47.5374647' AS DateTime2), CAST(N'2026-02-08T14:02:47.5374647' AS DateTime2), NULL, N'PendingRcv', CAST(0.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), NULL, NULL)
INSERT [dbo].[PurchaseOrders] ([PurchaseOrderId], [POCode], [RequestedBy], [SupplierId], [RequestedDate], [Justification], [Status], [CurrentStageNo], [CreatedAt], [SubmittedAt], [UpdatedAt], [ExpectedDeliveryDate], [LifecycleStatus], [TotalAmount], [DiscountAmount], [ResponsibleUserId], [WarehouseId]) VALUES (6, N'PO1', 7, 1, CAST(N'2026-03-09' AS Date), N'czxc', N'DRAFT', 1, CAST(N'2026-03-09T22:39:24.5224533' AS DateTime2), CAST(N'2026-03-09T22:39:24.5224533' AS DateTime2), CAST(N'2026-03-09T22:39:24.5224533' AS DateTime2), CAST(N'2026-03-09' AS Date), N'PendingRcv', CAST(151687536.00 AS Decimal(18, 2)), CAST(3123.00 AS Decimal(18, 2)), 3, 1)
INSERT [dbo].[PurchaseOrders] ([PurchaseOrderId], [POCode], [RequestedBy], [SupplierId], [RequestedDate], [Justification], [Status], [CurrentStageNo], [CreatedAt], [SubmittedAt], [UpdatedAt], [ExpectedDeliveryDate], [LifecycleStatus], [TotalAmount], [DiscountAmount], [ResponsibleUserId], [WarehouseId]) VALUES (7, N'PO2', 7, 1, CAST(N'2026-03-09' AS Date), N'czxc', N'DRAFT', 1, CAST(N'2026-03-09T22:42:09.6496302' AS DateTime2), CAST(N'2026-03-09T22:42:09.6496302' AS DateTime2), CAST(N'2026-03-09T22:42:09.6496302' AS DateTime2), CAST(N'2026-03-09' AS Date), N'PendingRcv', CAST(151687536.00 AS Decimal(18, 2)), CAST(3123.00 AS Decimal(18, 2)), 3, 1)
INSERT [dbo].[PurchaseOrders] ([PurchaseOrderId], [POCode], [RequestedBy], [SupplierId], [RequestedDate], [Justification], [Status], [CurrentStageNo], [CreatedAt], [SubmittedAt], [UpdatedAt], [ExpectedDeliveryDate], [LifecycleStatus], [TotalAmount], [DiscountAmount], [ResponsibleUserId], [WarehouseId]) VALUES (8, N'PO3', 7, 1, CAST(N'2026-03-09' AS Date), N'het hang', N'DRAFT', 1, CAST(N'2026-03-09T22:52:46.1622084' AS DateTime2), CAST(N'2026-03-09T22:52:46.1622084' AS DateTime2), CAST(N'2026-03-09T22:52:46.1622084' AS DateTime2), CAST(N'2026-03-11' AS Date), N'PendingRcv', CAST(1000000.00 AS Decimal(18, 2)), CAST(10000.00 AS Decimal(18, 2)), 3, 1)
SET IDENTITY_INSERT [dbo].[PurchaseOrders] OFF
GO
SET IDENTITY_INSERT [dbo].[Receivers] ON 

INSERT [dbo].[Receivers] ([ReceiverId], [ReceiverCode], [ReceiverName], [Phone], [Email], [Address], [Notes], [IsActive], [CreatedAt], [City], [Ward], [District]) VALUES (1, N'RCV-001', N'Bộ phận sản xuất', N'0280000000', N'factory@mk.local', N'KCN Demo', N'Receiver demo', 1, CAST(N'2026-02-08T14:02:47.5314645' AS DateTime2), NULL, NULL, NULL)
INSERT [dbo].[Receivers] ([ReceiverId], [ReceiverCode], [ReceiverName], [Phone], [Email], [Address], [Notes], [IsActive], [CreatedAt], [City], [Ward], [District]) VALUES (2, N'string', N'string', N' +-0230051190173((80', N'user123@example.com', N'string', N'string', 0, CAST(N'2026-02-11T14:16:57.8521891' AS DateTime2), NULL, NULL, NULL)
SET IDENTITY_INSERT [dbo].[Receivers] OFF
GO
SET IDENTITY_INSERT [dbo].[ReleaseRequestLines] ON 

INSERT [dbo].[ReleaseRequestLines] ([ReleaseRequestLineId], [ReleaseRequestId], [ItemId], [RequestedQty], [UomId], [Note]) VALUES (1, 1, 1, CAST(10.000 AS Decimal(18, 3)), 1, N'Dòng RR demo')
SET IDENTITY_INSERT [dbo].[ReleaseRequestLines] OFF
GO
SET IDENTITY_INSERT [dbo].[ReleaseRequests] ON 

INSERT [dbo].[ReleaseRequests] ([ReleaseRequestId], [ReleaseRequestCode], [RequestedBy], [ReceiverId], [WarehouseId], [RequestedDate], [Purpose], [Status], [CreatedAt], [SubmittedAt]) VALUES (1, N'RR-0001', 2, 1, 1, CAST(N'2026-02-08' AS Date), N'Xuất demo', N'APPROVED', CAST(N'2026-02-08T14:02:47.5414649' AS DateTime2), CAST(N'2026-02-08T14:02:47.5414649' AS DateTime2))
SET IDENTITY_INSERT [dbo].[ReleaseRequests] OFF
GO
SET IDENTITY_INSERT [dbo].[Roles] ON 

INSERT [dbo].[Roles] ([RoleId], [RoleCode], [RoleName]) VALUES (1, N'GD', N'Giám Đốc')
INSERT [dbo].[Roles] ([RoleId], [RoleCode], [RoleName]) VALUES (2, N'SE', N'Sale Engine')
INSERT [dbo].[Roles] ([RoleId], [RoleCode], [RoleName]) VALUES (3, N'KT', N'Kế Toán')
INSERT [dbo].[Roles] ([RoleId], [RoleCode], [RoleName]) VALUES (4, N'SP', N'Sale Support')
INSERT [dbo].[Roles] ([RoleId], [RoleCode], [RoleName]) VALUES (6, N'ADMIN', N'Admin')
INSERT [dbo].[Roles] ([RoleId], [RoleCode], [RoleName]) VALUES (7, N'TK', N'Thủ Kho')
SET IDENTITY_INSERT [dbo].[Roles] OFF
GO
SET IDENTITY_INSERT [dbo].[StocktakeLines] ON 

INSERT [dbo].[StocktakeLines] ([StocktakeLineId], [StocktakeId], [ItemId], [SystemQtySnapshot], [CountedQty], [Note]) VALUES (1, 1, 1, CAST(90.000 AS Decimal(18, 3)), CAST(89.000 AS Decimal(18, 3)), N'Lệch 1 đơn vị (demo)')
INSERT [dbo].[StocktakeLines] ([StocktakeLineId], [StocktakeId], [ItemId], [SystemQtySnapshot], [CountedQty], [Note]) VALUES (4, 6, 1, CAST(89.000 AS Decimal(18, 3)), CAST(99.000 AS Decimal(18, 3)), N'string')
INSERT [dbo].[StocktakeLines] ([StocktakeLineId], [StocktakeId], [ItemId], [SystemQtySnapshot], [CountedQty], [Note]) VALUES (5, 7, 1, CAST(89.000 AS Decimal(18, 3)), CAST(999.000 AS Decimal(18, 3)), N'string')
INSERT [dbo].[StocktakeLines] ([StocktakeLineId], [StocktakeId], [ItemId], [SystemQtySnapshot], [CountedQty], [Note]) VALUES (6, 9, 1, CAST(999.000 AS Decimal(18, 3)), CAST(999.000 AS Decimal(18, 3)), NULL)
INSERT [dbo].[StocktakeLines] ([StocktakeLineId], [StocktakeId], [ItemId], [SystemQtySnapshot], [CountedQty], [Note]) VALUES (7, 10, 1, CAST(999.000 AS Decimal(18, 3)), CAST(999999999.000 AS Decimal(18, 3)), N'string')
INSERT [dbo].[StocktakeLines] ([StocktakeLineId], [StocktakeId], [ItemId], [SystemQtySnapshot], [CountedQty], [Note]) VALUES (8, 11, 1, CAST(999.000 AS Decimal(18, 3)), NULL, NULL)
INSERT [dbo].[StocktakeLines] ([StocktakeLineId], [StocktakeId], [ItemId], [SystemQtySnapshot], [CountedQty], [Note]) VALUES (9, 12, 1, CAST(999.000 AS Decimal(18, 3)), CAST(999.000 AS Decimal(18, 3)), NULL)
SET IDENTITY_INSERT [dbo].[StocktakeLines] OFF
GO
SET IDENTITY_INSERT [dbo].[StocktakeSessions] ON 

INSERT [dbo].[StocktakeSessions] ([StocktakeId], [StocktakeCode], [WarehouseId], [Mode], [PlannedAt], [StartedAt], [EndedAt], [CreatedBy], [Status], [Note]) VALUES (1, N'STK-0001', 1, N'ADHOC', CAST(N'2026-02-08T14:02:47.5444651' AS DateTime2), CAST(N'2026-02-08T14:02:47.5444651' AS DateTime2), CAST(N'2026-02-08T14:02:47.5444651' AS DateTime2), 3, N'COMPLETED', N'Kiểm kê demo')
INSERT [dbo].[StocktakeSessions] ([StocktakeId], [StocktakeCode], [WarehouseId], [Mode], [PlannedAt], [StartedAt], [EndedAt], [CreatedBy], [Status], [Note]) VALUES (5, N'ST-2026-0001', 1, N'PERIODIC', CAST(N'2026-03-13T20:49:13.8100000' AS DateTime2), NULL, CAST(N'2026-03-13T21:05:47.7231709' AS DateTime2), 4, N'CANCELLED', N'string')
INSERT [dbo].[StocktakeSessions] ([StocktakeId], [StocktakeCode], [WarehouseId], [Mode], [PlannedAt], [StartedAt], [EndedAt], [CreatedBy], [Status], [Note]) VALUES (6, N'ST-2026-0002', 1, N'PERIODIC', CAST(N'2026-03-13T21:01:46.5330000' AS DateTime2), CAST(N'2026-03-13T21:13:02.7061457' AS DateTime2), CAST(N'2026-03-13T21:51:41.2362672' AS DateTime2), 4, N'CANCELLED', N'string')
INSERT [dbo].[StocktakeSessions] ([StocktakeId], [StocktakeCode], [WarehouseId], [Mode], [PlannedAt], [StartedAt], [EndedAt], [CreatedBy], [Status], [Note]) VALUES (7, N'ST-2026-0003', 1, N'PERIODIC', CAST(N'2026-03-13T21:01:46.5330000' AS DateTime2), CAST(N'2026-03-13T21:52:38.0841453' AS DateTime2), CAST(N'2026-03-13T21:54:23.1274292' AS DateTime2), 4, N'COMPLETED', N'string')
INSERT [dbo].[StocktakeSessions] ([StocktakeId], [StocktakeCode], [WarehouseId], [Mode], [PlannedAt], [StartedAt], [EndedAt], [CreatedBy], [Status], [Note]) VALUES (8, N'ST-2026-0004', 1, N'ADHOC', CAST(N'2026-03-13T22:07:08.2970000' AS DateTime2), NULL, CAST(N'2026-03-13T22:09:04.1832284' AS DateTime2), 4, N'CANCELLED', N'string')
INSERT [dbo].[StocktakeSessions] ([StocktakeId], [StocktakeCode], [WarehouseId], [Mode], [PlannedAt], [StartedAt], [EndedAt], [CreatedBy], [Status], [Note]) VALUES (9, N'ST-2026-0005', 1, N'PERIODIC', CAST(N'2026-03-13T22:08:35.7580000' AS DateTime2), CAST(N'2026-03-13T22:09:22.0778766' AS DateTime2), CAST(N'2026-03-17T15:44:14.8666679' AS DateTime2), 4, N'CANCELLED', N'Test khớp 100%')
INSERT [dbo].[StocktakeSessions] ([StocktakeId], [StocktakeCode], [WarehouseId], [Mode], [PlannedAt], [StartedAt], [EndedAt], [CreatedBy], [Status], [Note]) VALUES (10, N'ST-2026-0006', 1, N'PERIODIC', CAST(N'2026-03-14T16:02:37.3370000' AS DateTime2), CAST(N'2026-03-14T16:03:38.8130717' AS DateTime2), CAST(N'2026-03-14T16:24:02.0761868' AS DateTime2), 4, N'CANCELLED', N'dot xuat')
INSERT [dbo].[StocktakeSessions] ([StocktakeId], [StocktakeCode], [WarehouseId], [Mode], [PlannedAt], [StartedAt], [EndedAt], [CreatedBy], [Status], [Note]) VALUES (11, N'ST-2026-0007', 1, N'PERIODIC', CAST(N'2026-03-14T16:24:08.2570000' AS DateTime2), CAST(N'2026-03-14T16:24:33.2559528' AS DateTime2), CAST(N'2026-03-17T15:43:33.6241744' AS DateTime2), 4, N'CANCELLED', N'string')
INSERT [dbo].[StocktakeSessions] ([StocktakeId], [StocktakeCode], [WarehouseId], [Mode], [PlannedAt], [StartedAt], [EndedAt], [CreatedBy], [Status], [Note]) VALUES (12, N'ST-2026-0008', 1, N'ADHOC', CAST(N'2026-03-17T15:44:03.6340000' AS DateTime2), CAST(N'2026-03-17T15:50:59.1480388' AS DateTime2), CAST(N'2026-03-17T17:42:17.3412193' AS DateTime2), 4, N'CANCELLED', N'string')
INSERT [dbo].[StocktakeSessions] ([StocktakeId], [StocktakeCode], [WarehouseId], [Mode], [PlannedAt], [StartedAt], [EndedAt], [CreatedBy], [Status], [Note]) VALUES (13, N'ST-2026-0009', 1, N'ADHOC', CAST(N'2026-03-17T17:42:29.1450000' AS DateTime2), NULL, NULL, 4, N'DRAFT', N'string')
SET IDENTITY_INSERT [dbo].[StocktakeSessions] OFF
GO
SET IDENTITY_INSERT [dbo].[Suppliers] ON 

INSERT [dbo].[Suppliers] ([SupplierId], [SupplierCode], [SupplierName], [TaxCode], [Phone], [Email], [Address], [IsActive], [CreatedAt], [City], [Ward], [District]) VALUES (1, N'SUP-001', N'Nhà cung cấp A', N'0100000000', N'0240000000', N'supplierA@mk.local', N'Hà Nội', 1, CAST(N'2026-02-08T14:02:47.5314645' AS DateTime2), NULL, NULL, NULL)
INSERT [dbo].[Suppliers] ([SupplierId], [SupplierCode], [SupplierName], [TaxCode], [Phone], [Email], [Address], [IsActive], [CreatedAt], [City], [Ward], [District]) VALUES (2, N'SUP-002', N'test update', N'string', N'9519211 +8 892030++1', N'user@example.com', N'string', 1, CAST(N'2026-02-10T17:38:48.6360557' AS DateTime2), NULL, NULL, NULL)
INSERT [dbo].[Suppliers] ([SupplierId], [SupplierCode], [SupplierName], [TaxCode], [Phone], [Email], [Address], [IsActive], [CreatedAt], [City], [Ward], [District]) VALUES (3, N'string', N'string', N'string', N'string', N'user@example.com', N'string', 1, CAST(N'2026-02-11T14:16:09.5883295' AS DateTime2), NULL, NULL, NULL)
SET IDENTITY_INSERT [dbo].[Suppliers] OFF
GO
SET IDENTITY_INSERT [dbo].[UnitOfMeasure] ON 

INSERT [dbo].[UnitOfMeasure] ([UomId], [UomName], [IsActive]) VALUES (1, N'Each', 1)
INSERT [dbo].[UnitOfMeasure] ([UomId], [UomName], [IsActive]) VALUES (2, N'Box', 1)
SET IDENTITY_INSERT [dbo].[UnitOfMeasure] OFF
GO
SET IDENTITY_INSERT [dbo].[UserRoles] ON 

INSERT [dbo].[UserRoles] ([UserRoleId], [UserId], [RoleId], [AssignedAt], [AssignedBy]) VALUES (1, 1, 6, CAST(N'2026-02-08T14:02:47.5304641' AS DateTime2), 1)
INSERT [dbo].[UserRoles] ([UserRoleId], [UserId], [RoleId], [AssignedAt], [AssignedBy]) VALUES (2, 2, 2, CAST(N'2026-02-08T14:02:47.5304641' AS DateTime2), 1)
INSERT [dbo].[UserRoles] ([UserRoleId], [UserId], [RoleId], [AssignedAt], [AssignedBy]) VALUES (3, 3, 3, CAST(N'2026-02-28T20:51:13.1768963' AS DateTime2), 1)
INSERT [dbo].[UserRoles] ([UserRoleId], [UserId], [RoleId], [AssignedAt], [AssignedBy]) VALUES (4, 4, 4, CAST(N'2026-02-08T14:02:47.5304641' AS DateTime2), 1)
INSERT [dbo].[UserRoles] ([UserRoleId], [UserId], [RoleId], [AssignedAt], [AssignedBy]) VALUES (5, 5, 7, CAST(N'2026-02-28T20:46:29.0142903' AS DateTime2), 1)
INSERT [dbo].[UserRoles] ([UserRoleId], [UserId], [RoleId], [AssignedAt], [AssignedBy]) VALUES (6, 6, 3, CAST(N'2026-03-02T17:22:33.1137068' AS DateTime2), 1)
INSERT [dbo].[UserRoles] ([UserRoleId], [UserId], [RoleId], [AssignedAt], [AssignedBy]) VALUES (7, 7, 2, CAST(N'2026-02-28T18:38:51.8164046' AS DateTime2), 1)
SET IDENTITY_INSERT [dbo].[UserRoles] OFF
GO
SET IDENTITY_INSERT [dbo].[Users] ON 

INSERT [dbo].[Users] ([UserId], [Email], [Username], [FullName], [Phone], [IsActive], [LastLoginAt], [CreatedAt], [UpdatedAt], [PasswordHash], [Gender], [DOB]) VALUES (1, N'lioninthewide@gmail.com', N'admin', N'Admin', N'0900000001', 1, CAST(N'2026-03-02T17:22:08.1919953' AS DateTime2), CAST(N'2026-02-08T14:02:47.5294632' AS DateTime2), CAST(N'2026-03-02T17:35:09.7662185' AS DateTime2), N'$2a$12$csuC/3W5FEmjQafeDRzrcesKkishvlhsn0.nzf4/RcdtQNr6iVrWG', NULL, NULL)
INSERT [dbo].[Users] ([UserId], [Email], [Username], [FullName], [Phone], [IsActive], [LastLoginAt], [CreatedAt], [UpdatedAt], [PasswordHash], [Gender], [DOB]) VALUES (2, N'anhnthe173447@fpt.edu.vn', N'sale', N'Sale Engine', N'0900000002', 1, CAST(N'2026-03-02T16:43:04.6537756' AS DateTime2), CAST(N'2026-02-08T14:02:47.5294632' AS DateTime2), CAST(N'2026-03-02T16:20:36.9951472' AS DateTime2), N'$2a$12$07W8JSqu7ke6vbEUmVQJ0ukE/SD8khUcf3qGu.VZxCE/y4wEEJWnC', NULL, NULL)
INSERT [dbo].[Users] ([UserId], [Email], [Username], [FullName], [Phone], [IsActive], [LastLoginAt], [CreatedAt], [UpdatedAt], [PasswordHash], [Gender], [DOB]) VALUES (3, N'RyzeChan89@gmail.com', N'wd', N'W&D', N'0900000003', 1, CAST(N'2026-03-03T09:21:09.0177420' AS DateTime2), CAST(N'2026-02-08T14:02:47.5294632' AS DateTime2), CAST(N'2026-02-28T20:51:13.1768976' AS DateTime2), N'$2a$12$LzDDimuuRtrbkeSr9G99buY8y4v8gQOymFpZBBpr05xCAlHLvd3em', NULL, NULL)
INSERT [dbo].[Users] ([UserId], [Email], [Username], [FullName], [Phone], [IsActive], [LastLoginAt], [CreatedAt], [UpdatedAt], [PasswordHash], [Gender], [DOB]) VALUES (4, N'hoangplam03@gmail.com', N'lamhp', N'dtr', N'0328788328', 1, CAST(N'2026-03-17T17:41:41.9625210' AS DateTime2), CAST(N'2026-02-08T14:02:47.5294632' AS DateTime2), CAST(N'2026-02-10T16:03:13.0933402' AS DateTime2), N'$2a$12$9CqPdGyN8sSEWIDvHGbhd.RfK8hpSdIFwhLc7MCNx659LC6h3XCd.', NULL, NULL)
INSERT [dbo].[Users] ([UserId], [Email], [Username], [FullName], [Phone], [IsActive], [LastLoginAt], [CreatedAt], [UpdatedAt], [PasswordHash], [Gender], [DOB]) VALUES (5, N'lucasnevermine@yahoo.com', N'anv5', N'Nguyễn Văn A', NULL, 1, CAST(N'2026-03-03T09:47:49.9224815' AS DateTime2), CAST(N'2026-02-28T18:37:49.1582895' AS DateTime2), CAST(N'2026-02-28T20:46:29.0142911' AS DateTime2), N'$2a$12$2/E75Uxo7Bge9NDZnqYsFeDkY.r5F7tSNXKhEp0jVZL/IzlfD1C1O', NULL, NULL)
INSERT [dbo].[Users] ([UserId], [Email], [Username], [FullName], [Phone], [IsActive], [LastLoginAt], [CreatedAt], [UpdatedAt], [PasswordHash], [Gender], [DOB]) VALUES (6, N'nguyen123@gmail.com', N'anv6', N'Nguyễn văn A', NULL, 1, NULL, CAST(N'2026-02-28T18:38:20.5934049' AS DateTime2), CAST(N'2026-03-02T17:22:33.1137074' AS DateTime2), N'$2a$12$A59r9WWPExfHEzZnafsKr.Qm4sDwGZDoBlrRLclLgKUuAq.BQZSP.', NULL, NULL)
INSERT [dbo].[Users] ([UserId], [Email], [Username], [FullName], [Phone], [IsActive], [LastLoginAt], [CreatedAt], [UpdatedAt], [PasswordHash], [Gender], [DOB]) VALUES (7, N'ab123@gmail.com', N'bnv7', N'Nguyễn văn B', NULL, 1, CAST(N'2026-03-09T23:16:28.1203840' AS DateTime2), CAST(N'2026-02-28T18:38:51.8092608' AS DateTime2), CAST(N'2026-03-09T21:25:37.6921539' AS DateTime2), N'$2a$12$GA/RTjh/i6PWe4jJD8s54u0tHZYU16JSb9jnvqqqGSp05jaQ8hFvW', NULL, NULL)
SET IDENTITY_INSERT [dbo].[Users] OFF
GO
SET IDENTITY_INSERT [dbo].[Warehouses] ON 

INSERT [dbo].[Warehouses] ([WarehouseId], [WarehouseCode], [WarehouseName], [Address], [IsActive], [CreatedAt], [District]) VALUES (1, N'WH-HCM', N'Kho HCM', N'Hồ Chí Minh', 1, CAST(N'2026-02-08T14:02:47.5294632' AS DateTime2), NULL)
SET IDENTITY_INSERT [dbo].[Warehouses] OFF
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Brands__2206CE9B4F7E0EF6]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[Brands] ADD UNIQUE NONCLUSTERED 
(
	[BrandName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__GoodsDel__1DA6F0E9EDF53797]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[GoodsDeliveryNotes] ADD UNIQUE NONCLUSTERED 
(
	[GDNCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__GoodsRec__F1E8DDCBFF089C26]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[GoodsReceiptNotes] ADD UNIQUE NONCLUSTERED 
(
	[GRNCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Inventor__292CC6CF6F0335C6]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[InventoryAdjustmentRequests] ADD UNIQUE NONCLUSTERED 
(
	[AdjustmentCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_Inv]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[InventoryOnHand] ADD  CONSTRAINT [UQ_Inv] UNIQUE NONCLUSTERED 
(
	[WarehouseId] ASC,
	[ItemId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__ItemCate__371BA955253E2E32]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[ItemCategories] ADD UNIQUE NONCLUSTERED 
(
	[CategoryCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__ItemPara__2232AFCBB4C311CD]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[ItemParameters] ADD UNIQUE NONCLUSTERED 
(
	[ParamCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_IPV]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[ItemParameterValues] ADD  CONSTRAINT [UQ_IPV] UNIQUE NONCLUSTERED 
(
	[ItemId] ASC,
	[ParamId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Items__3ECC0FEAE04A1547]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[Items] ADD UNIQUE NONCLUSTERED 
(
	[ItemCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_IWP]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[ItemWarehousePolicy] ADD  CONSTRAINT [UQ_IWP] UNIQUE NONCLUSTERED 
(
	[ItemId] ASC,
	[WarehouseId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Purchase__40ACF5B8652E5AC5]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[PurchaseOrders] ADD UNIQUE NONCLUSTERED 
(
	[POCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ_PurchaseReturnNotes_ReturnCode]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[PurchaseReturnNotes] ADD  CONSTRAINT [UQ_PurchaseReturnNotes_ReturnCode] UNIQUE NONCLUSTERED 
(
	[ReturnCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Receiver__A918ECE946A954C4]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[Receivers] ADD UNIQUE NONCLUSTERED 
(
	[ReceiverCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__ReleaseR__380806C5F153504B]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[ReleaseRequests] ADD UNIQUE NONCLUSTERED 
(
	[ReleaseRequestCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Roles__D62CB59C6CF7291B]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[Roles] ADD UNIQUE NONCLUSTERED 
(
	[RoleCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_STL]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[StocktakeLines] ADD  CONSTRAINT [UQ_STL] UNIQUE NONCLUSTERED 
(
	[StocktakeId] ASC,
	[ItemId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Stocktak__66FC5709D126AEB6]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[StocktakeSessions] ADD UNIQUE NONCLUSTERED 
(
	[StocktakeCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Supplier__44BE981B68E5CD39]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[Suppliers] ADD UNIQUE NONCLUSTERED 
(
	[SupplierCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_UserRoles_User]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[UserRoles] ADD  CONSTRAINT [UQ_UserRoles_User] UNIQUE NONCLUSTERED 
(
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Users__536C85E43AE21514]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[Users] ADD UNIQUE NONCLUSTERED 
(
	[Username] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Users__A9D10534D7A04C25]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[Users] ADD UNIQUE NONCLUSTERED 
(
	[Email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Warehous__1686A056D2B3D8A2]    Script Date: 22/03/2026 09:07:47 PM ******/
ALTER TABLE [dbo].[Warehouses] ADD UNIQUE NONCLUSTERED 
(
	[WarehouseCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[AuditLogs] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Brands] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[DocumentApproval] ADD  DEFAULT ((1)) FOR [StageNo]
GO
ALTER TABLE [dbo].[DocumentApproval] ADD  DEFAULT (sysutcdatetime()) FOR [ActionAt]
GO
ALTER TABLE [dbo].[DocumentAttachments] ADD  DEFAULT ('GENERAL') FOR [AttachmentType]
GO
ALTER TABLE [dbo].[DocumentAttachments] ADD  DEFAULT (sysutcdatetime()) FOR [UploadedAt]
GO
ALTER TABLE [dbo].[GoodsDeliveryNotes] ADD  DEFAULT ('DRAFT') FOR [Status]
GO
ALTER TABLE [dbo].[GoodsReceiptNoteLines] ADD  DEFAULT ((0)) FOR [RequiresCOCQ]
GO
ALTER TABLE [dbo].[GoodsReceiptNotes] ADD  DEFAULT ('DRAFT') FOR [Status]
GO
ALTER TABLE [dbo].[GoodsReceiptNotes] ADD  CONSTRAINT [DF_GRN_ShippingFee]  DEFAULT ((0)) FOR [ShippingFee]
GO
ALTER TABLE [dbo].[GoodsReceiptNotes] ADD  CONSTRAINT [DF_GRN_IsPaid]  DEFAULT ((0)) FOR [IsPaid]
GO
ALTER TABLE [dbo].[GoodsReceiptNotes] ADD  CONSTRAINT [DF_GRN_TotalReceivedQty]  DEFAULT ((0)) FOR [TotalReceivedQty]
GO
ALTER TABLE [dbo].[GoodsReceiptNotes] ADD  CONSTRAINT [DF_GRN_TotalGoodsAmount]  DEFAULT ((0)) FOR [TotalGoodsAmount]
GO
ALTER TABLE [dbo].[InventoryAdjustmentRequests] ADD  DEFAULT ('DRAFT') FOR [Status]
GO
ALTER TABLE [dbo].[InventoryOnHand] ADD  DEFAULT ((0)) FOR [OnHandQty]
GO
ALTER TABLE [dbo].[InventoryOnHand] ADD  DEFAULT ((0)) FOR [ReservedQty]
GO
ALTER TABLE [dbo].[InventoryOnHand] ADD  DEFAULT (sysutcdatetime()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[InventoryOnHand] ADD  CONSTRAINT [DF_InventoryOnHand_UnitCost]  DEFAULT ((0)) FOR [UnitCost]
GO
ALTER TABLE [dbo].[InventoryTransactions] ADD  DEFAULT (sysutcdatetime()) FOR [TxnDate]
GO
ALTER TABLE [dbo].[InventoryTransactions] ADD  DEFAULT ('POSTED') FOR [Status]
GO
ALTER TABLE [dbo].[ItemCategories] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[ItemParameters] ADD  DEFAULT ('TEXT') FOR [DataType]
GO
ALTER TABLE [dbo].[ItemParameters] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Items] ADD  DEFAULT ((0)) FOR [RequiresCO]
GO
ALTER TABLE [dbo].[Items] ADD  DEFAULT ((0)) FOR [RequiresCQ]
GO
ALTER TABLE [dbo].[Items] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Items] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Items] ADD  DEFAULT (sysutcdatetime()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[ItemWarehousePolicy] ADD  DEFAULT ((0)) FOR [MinQty]
GO
ALTER TABLE [dbo].[Notifications] ADD  DEFAULT ((0)) FOR [IsRead]
GO
ALTER TABLE [dbo].[Notifications] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Notifications] ADD  CONSTRAINT [DF_Notifications_Severity]  DEFAULT ((1)) FOR [Severity]
GO
ALTER TABLE [dbo].[Notifications] ADD  CONSTRAINT [DF_Notifications_IsDeleted]  DEFAULT ((0)) FOR [IsDeleted]
GO
ALTER TABLE [dbo].[PackagingSpecs] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[PasswordResetTokens] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[PurchaseOrderLines] ADD  CONSTRAINT [DF_PurchaseOrderLines_ReceivedQty]  DEFAULT ((0)) FOR [ReceivedQty]
GO
ALTER TABLE [dbo].[PurchaseOrderLines] ADD  CONSTRAINT [DF_PurchaseOrderLines_LineStatus]  DEFAULT ('Open') FOR [LineStatus]
GO
ALTER TABLE [dbo].[PurchaseOrders] ADD  DEFAULT ('DRAFT') FOR [Status]
GO
ALTER TABLE [dbo].[PurchaseOrders] ADD  DEFAULT ((0)) FOR [CurrentStageNo]
GO
ALTER TABLE [dbo].[PurchaseOrders] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[PurchaseOrders] ADD  DEFAULT (sysutcdatetime()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[PurchaseOrders] ADD  CONSTRAINT [DF_PurchaseOrders_LifecycleStatus]  DEFAULT ('Open') FOR [LifecycleStatus]
GO
ALTER TABLE [dbo].[PurchaseOrders] ADD  CONSTRAINT [DF_PurchaseOrders_TotalAmount]  DEFAULT ((0)) FOR [TotalAmount]
GO
ALTER TABLE [dbo].[PurchaseOrders] ADD  CONSTRAINT [DF_PurchaseOrders_DiscountAmount]  DEFAULT ((0)) FOR [DiscountAmount]
GO
ALTER TABLE [dbo].[PurchaseReturnNotes] ADD  CONSTRAINT [DF_PurchaseReturnNotes_ReturnDate]  DEFAULT (sysutcdatetime()) FOR [ReturnDate]
GO
ALTER TABLE [dbo].[PurchaseReturnNotes] ADD  CONSTRAINT [DF_PurchaseReturnNotes_Status]  DEFAULT ('DRAFT') FOR [Status]
GO
ALTER TABLE [dbo].[PurchaseReturnNotes] ADD  CONSTRAINT [DF_PurchaseReturnNotes_FeeAmount]  DEFAULT ((0)) FOR [FeeAmount]
GO
ALTER TABLE [dbo].[PurchaseReturnNotes] ADD  CONSTRAINT [DF_PurchaseReturnNotes_RefundStatus]  DEFAULT ('NotRefunded') FOR [RefundStatus]
GO
ALTER TABLE [dbo].[PurchaseReturnNotes] ADD  CONSTRAINT [DF_PurchaseReturnNotes_RefundedAmount]  DEFAULT ((0)) FOR [RefundedAmount]
GO
ALTER TABLE [dbo].[PurchaseReturnNotes] ADD  CONSTRAINT [DF_PurchaseReturnNotes_CreatedAt]  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Receivers] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Receivers] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[ReleaseRequests] ADD  DEFAULT ('DRAFT') FOR [Status]
GO
ALTER TABLE [dbo].[ReleaseRequests] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[StocktakeLines] ADD  DEFAULT ((0)) FOR [SystemQtySnapshot]
GO
ALTER TABLE [dbo].[StocktakeSessions] ADD  DEFAULT ('DRAFT') FOR [Status]
GO
ALTER TABLE [dbo].[Suppliers] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Suppliers] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[UnitOfMeasure] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[UserRoles] ADD  DEFAULT (sysutcdatetime()) FOR [AssignedAt]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (sysutcdatetime()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[Users] ADD  CONSTRAINT [DF_Users_PasswordHash]  DEFAULT (N'') FOR [PasswordHash]
GO
ALTER TABLE [dbo].[Warehouses] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Warehouses] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[AuditLogs]  WITH CHECK ADD  CONSTRAINT [FK_Audit_User] FOREIGN KEY([ActorUserId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[AuditLogs] CHECK CONSTRAINT [FK_Audit_User]
GO
ALTER TABLE [dbo].[Certificates]  WITH CHECK ADD  CONSTRAINT [FK_Cert_GRNLine] FOREIGN KEY([GRNLineId])
REFERENCES [dbo].[GoodsReceiptNoteLines] ([GRNLineId])
GO
ALTER TABLE [dbo].[Certificates] CHECK CONSTRAINT [FK_Cert_GRNLine]
GO
ALTER TABLE [dbo].[DocumentApproval]  WITH CHECK ADD  CONSTRAINT [FK_DA_ActionBy] FOREIGN KEY([ActionBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[DocumentApproval] CHECK CONSTRAINT [FK_DA_ActionBy]
GO
ALTER TABLE [dbo].[DocumentAttachments]  WITH CHECK ADD  CONSTRAINT [FK_DAtt_UploadedBy] FOREIGN KEY([UploadedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[DocumentAttachments] CHECK CONSTRAINT [FK_DAtt_UploadedBy]
GO
ALTER TABLE [dbo].[GoodsDeliveryNoteLines]  WITH CHECK ADD  CONSTRAINT [FK_GDNL_GDN] FOREIGN KEY([GDNId])
REFERENCES [dbo].[GoodsDeliveryNotes] ([GDNId])
GO
ALTER TABLE [dbo].[GoodsDeliveryNoteLines] CHECK CONSTRAINT [FK_GDNL_GDN]
GO
ALTER TABLE [dbo].[GoodsDeliveryNoteLines]  WITH CHECK ADD  CONSTRAINT [FK_GDNL_Item] FOREIGN KEY([ItemId])
REFERENCES [dbo].[Items] ([ItemId])
GO
ALTER TABLE [dbo].[GoodsDeliveryNoteLines] CHECK CONSTRAINT [FK_GDNL_Item]
GO
ALTER TABLE [dbo].[GoodsDeliveryNoteLines]  WITH CHECK ADD  CONSTRAINT [FK_GDNL_Uom] FOREIGN KEY([UomId])
REFERENCES [dbo].[UnitOfMeasure] ([UomId])
GO
ALTER TABLE [dbo].[GoodsDeliveryNoteLines] CHECK CONSTRAINT [FK_GDNL_Uom]
GO
ALTER TABLE [dbo].[GoodsDeliveryNotes]  WITH CHECK ADD  CONSTRAINT [FK_GDN_CreatedBy] FOREIGN KEY([CreatedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[GoodsDeliveryNotes] CHECK CONSTRAINT [FK_GDN_CreatedBy]
GO
ALTER TABLE [dbo].[GoodsDeliveryNotes]  WITH CHECK ADD  CONSTRAINT [FK_GDN_GIR] FOREIGN KEY([ReleaseRequestId])
REFERENCES [dbo].[ReleaseRequests] ([ReleaseRequestId])
GO
ALTER TABLE [dbo].[GoodsDeliveryNotes] CHECK CONSTRAINT [FK_GDN_GIR]
GO
ALTER TABLE [dbo].[GoodsDeliveryNotes]  WITH CHECK ADD  CONSTRAINT [FK_GDN_Warehouse] FOREIGN KEY([WarehouseId])
REFERENCES [dbo].[Warehouses] ([WarehouseId])
GO
ALTER TABLE [dbo].[GoodsDeliveryNotes] CHECK CONSTRAINT [FK_GDN_Warehouse]
GO
ALTER TABLE [dbo].[GoodsReceiptNoteLines]  WITH CHECK ADD  CONSTRAINT [FK_GRNL_GRN] FOREIGN KEY([GRNId])
REFERENCES [dbo].[GoodsReceiptNotes] ([GRNId])
GO
ALTER TABLE [dbo].[GoodsReceiptNoteLines] CHECK CONSTRAINT [FK_GRNL_GRN]
GO
ALTER TABLE [dbo].[GoodsReceiptNoteLines]  WITH CHECK ADD  CONSTRAINT [FK_GRNL_Item] FOREIGN KEY([ItemId])
REFERENCES [dbo].[Items] ([ItemId])
GO
ALTER TABLE [dbo].[GoodsReceiptNoteLines] CHECK CONSTRAINT [FK_GRNL_Item]
GO
ALTER TABLE [dbo].[GoodsReceiptNoteLines]  WITH CHECK ADD  CONSTRAINT [FK_GRNL_Uom] FOREIGN KEY([UomId])
REFERENCES [dbo].[UnitOfMeasure] ([UomId])
GO
ALTER TABLE [dbo].[GoodsReceiptNoteLines] CHECK CONSTRAINT [FK_GRNL_Uom]
GO
ALTER TABLE [dbo].[GoodsReceiptNoteLines]  WITH CHECK ADD  CONSTRAINT [FK_GRNLines_PurchaseOrderLines] FOREIGN KEY([PurchaseOrderLineId])
REFERENCES [dbo].[PurchaseOrderLines] ([PurchaseOrderLineId])
GO
ALTER TABLE [dbo].[GoodsReceiptNoteLines] CHECK CONSTRAINT [FK_GRNLines_PurchaseOrderLines]
GO
ALTER TABLE [dbo].[GoodsReceiptNotes]  WITH CHECK ADD  CONSTRAINT [FK_GRN_CreatedBy] FOREIGN KEY([CreatedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[GoodsReceiptNotes] CHECK CONSTRAINT [FK_GRN_CreatedBy]
GO
ALTER TABLE [dbo].[GoodsReceiptNotes]  WITH CHECK ADD  CONSTRAINT [FK_GRN_PR] FOREIGN KEY([PurchaseOrderId])
REFERENCES [dbo].[PurchaseOrders] ([PurchaseOrderId])
GO
ALTER TABLE [dbo].[GoodsReceiptNotes] CHECK CONSTRAINT [FK_GRN_PR]
GO
ALTER TABLE [dbo].[GoodsReceiptNotes]  WITH CHECK ADD  CONSTRAINT [FK_GRN_Supplier] FOREIGN KEY([SupplierId])
REFERENCES [dbo].[Suppliers] ([SupplierId])
GO
ALTER TABLE [dbo].[GoodsReceiptNotes] CHECK CONSTRAINT [FK_GRN_Supplier]
GO
ALTER TABLE [dbo].[GoodsReceiptNotes]  WITH CHECK ADD  CONSTRAINT [FK_GRN_Warehouse] FOREIGN KEY([WarehouseId])
REFERENCES [dbo].[Warehouses] ([WarehouseId])
GO
ALTER TABLE [dbo].[GoodsReceiptNotes] CHECK CONSTRAINT [FK_GRN_Warehouse]
GO
ALTER TABLE [dbo].[InventoryAdjustmentLines]  WITH CHECK ADD  CONSTRAINT [FK_ADJL_ADJ] FOREIGN KEY([AdjustmentId])
REFERENCES [dbo].[InventoryAdjustmentRequests] ([AdjustmentId])
GO
ALTER TABLE [dbo].[InventoryAdjustmentLines] CHECK CONSTRAINT [FK_ADJL_ADJ]
GO
ALTER TABLE [dbo].[InventoryAdjustmentLines]  WITH CHECK ADD  CONSTRAINT [FK_ADJL_Item] FOREIGN KEY([ItemId])
REFERENCES [dbo].[Items] ([ItemId])
GO
ALTER TABLE [dbo].[InventoryAdjustmentLines] CHECK CONSTRAINT [FK_ADJL_Item]
GO
ALTER TABLE [dbo].[InventoryAdjustmentRequests]  WITH CHECK ADD  CONSTRAINT [FK_ADJ_ST] FOREIGN KEY([StocktakeId])
REFERENCES [dbo].[StocktakeSessions] ([StocktakeId])
GO
ALTER TABLE [dbo].[InventoryAdjustmentRequests] CHECK CONSTRAINT [FK_ADJ_ST]
GO
ALTER TABLE [dbo].[InventoryAdjustmentRequests]  WITH CHECK ADD  CONSTRAINT [FK_ADJ_SubmittedBy] FOREIGN KEY([SubmittedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[InventoryAdjustmentRequests] CHECK CONSTRAINT [FK_ADJ_SubmittedBy]
GO
ALTER TABLE [dbo].[InventoryAdjustmentRequests]  WITH CHECK ADD  CONSTRAINT [FK_ADJ_WH] FOREIGN KEY([WarehouseId])
REFERENCES [dbo].[Warehouses] ([WarehouseId])
GO
ALTER TABLE [dbo].[InventoryAdjustmentRequests] CHECK CONSTRAINT [FK_ADJ_WH]
GO
ALTER TABLE [dbo].[InventoryOnHand]  WITH CHECK ADD  CONSTRAINT [FK_Inv_Item] FOREIGN KEY([ItemId])
REFERENCES [dbo].[Items] ([ItemId])
GO
ALTER TABLE [dbo].[InventoryOnHand] CHECK CONSTRAINT [FK_Inv_Item]
GO
ALTER TABLE [dbo].[InventoryOnHand]  WITH CHECK ADD  CONSTRAINT [FK_Inv_Warehouse] FOREIGN KEY([WarehouseId])
REFERENCES [dbo].[Warehouses] ([WarehouseId])
GO
ALTER TABLE [dbo].[InventoryOnHand] CHECK CONSTRAINT [FK_Inv_Warehouse]
GO
ALTER TABLE [dbo].[InventoryTransactionLines]  WITH CHECK ADD  CONSTRAINT [FK_ITL_Item] FOREIGN KEY([ItemId])
REFERENCES [dbo].[Items] ([ItemId])
GO
ALTER TABLE [dbo].[InventoryTransactionLines] CHECK CONSTRAINT [FK_ITL_Item]
GO
ALTER TABLE [dbo].[InventoryTransactionLines]  WITH CHECK ADD  CONSTRAINT [FK_ITL_Txn] FOREIGN KEY([InventoryTxnId])
REFERENCES [dbo].[InventoryTransactions] ([InventoryTxnId])
GO
ALTER TABLE [dbo].[InventoryTransactionLines] CHECK CONSTRAINT [FK_ITL_Txn]
GO
ALTER TABLE [dbo].[InventoryTransactionLines]  WITH CHECK ADD  CONSTRAINT [FK_ITL_Uom] FOREIGN KEY([UomId])
REFERENCES [dbo].[UnitOfMeasure] ([UomId])
GO
ALTER TABLE [dbo].[InventoryTransactionLines] CHECK CONSTRAINT [FK_ITL_Uom]
GO
ALTER TABLE [dbo].[InventoryTransactions]  WITH CHECK ADD  CONSTRAINT [FK_IT_PostedBy] FOREIGN KEY([PostedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[InventoryTransactions] CHECK CONSTRAINT [FK_IT_PostedBy]
GO
ALTER TABLE [dbo].[InventoryTransactions]  WITH CHECK ADD  CONSTRAINT [FK_IT_Warehouse] FOREIGN KEY([WarehouseId])
REFERENCES [dbo].[Warehouses] ([WarehouseId])
GO
ALTER TABLE [dbo].[InventoryTransactions] CHECK CONSTRAINT [FK_IT_Warehouse]
GO
ALTER TABLE [dbo].[ItemCategories]  WITH CHECK ADD  CONSTRAINT [FK_ItemCategories_Parent] FOREIGN KEY([ParentId])
REFERENCES [dbo].[ItemCategories] ([CategoryId])
GO
ALTER TABLE [dbo].[ItemCategories] CHECK CONSTRAINT [FK_ItemCategories_Parent]
GO
ALTER TABLE [dbo].[ItemParameterValues]  WITH CHECK ADD  CONSTRAINT [FK_IPV_Item] FOREIGN KEY([ItemId])
REFERENCES [dbo].[Items] ([ItemId])
GO
ALTER TABLE [dbo].[ItemParameterValues] CHECK CONSTRAINT [FK_IPV_Item]
GO
ALTER TABLE [dbo].[ItemParameterValues]  WITH CHECK ADD  CONSTRAINT [FK_IPV_Param] FOREIGN KEY([ParamId])
REFERENCES [dbo].[ItemParameters] ([ParamId])
GO
ALTER TABLE [dbo].[ItemParameterValues] CHECK CONSTRAINT [FK_IPV_Param]
GO
ALTER TABLE [dbo].[ItemPrices]  WITH CHECK ADD  CONSTRAINT [FK_ItemPrices_Items] FOREIGN KEY([ItemId])
REFERENCES [dbo].[Items] ([ItemId])
GO
ALTER TABLE [dbo].[ItemPrices] CHECK CONSTRAINT [FK_ItemPrices_Items]
GO
ALTER TABLE [dbo].[Items]  WITH CHECK ADD  CONSTRAINT [FK_Items_Brand] FOREIGN KEY([BrandId])
REFERENCES [dbo].[Brands] ([BrandId])
GO
ALTER TABLE [dbo].[Items] CHECK CONSTRAINT [FK_Items_Brand]
GO
ALTER TABLE [dbo].[Items]  WITH CHECK ADD  CONSTRAINT [FK_Items_Category] FOREIGN KEY([CategoryId])
REFERENCES [dbo].[ItemCategories] ([CategoryId])
GO
ALTER TABLE [dbo].[Items] CHECK CONSTRAINT [FK_Items_Category]
GO
ALTER TABLE [dbo].[Items]  WITH CHECK ADD  CONSTRAINT [FK_Items_DefaultWarehouse] FOREIGN KEY([DefaultWarehouseId])
REFERENCES [dbo].[Warehouses] ([WarehouseId])
GO
ALTER TABLE [dbo].[Items] CHECK CONSTRAINT [FK_Items_DefaultWarehouse]
GO
ALTER TABLE [dbo].[Items]  WITH CHECK ADD  CONSTRAINT [FK_Items_Packaging] FOREIGN KEY([PackagingSpecId])
REFERENCES [dbo].[PackagingSpecs] ([PackagingSpecId])
GO
ALTER TABLE [dbo].[Items] CHECK CONSTRAINT [FK_Items_Packaging]
GO
ALTER TABLE [dbo].[Items]  WITH CHECK ADD  CONSTRAINT [FK_Items_Uom] FOREIGN KEY([BaseUomId])
REFERENCES [dbo].[UnitOfMeasure] ([UomId])
GO
ALTER TABLE [dbo].[Items] CHECK CONSTRAINT [FK_Items_Uom]
GO
ALTER TABLE [dbo].[ItemWarehousePolicy]  WITH CHECK ADD  CONSTRAINT [FK_IWP_Item] FOREIGN KEY([ItemId])
REFERENCES [dbo].[Items] ([ItemId])
GO
ALTER TABLE [dbo].[ItemWarehousePolicy] CHECK CONSTRAINT [FK_IWP_Item]
GO
ALTER TABLE [dbo].[ItemWarehousePolicy]  WITH CHECK ADD  CONSTRAINT [FK_IWP_Warehouse] FOREIGN KEY([WarehouseId])
REFERENCES [dbo].[Warehouses] ([WarehouseId])
GO
ALTER TABLE [dbo].[ItemWarehousePolicy] CHECK CONSTRAINT [FK_IWP_Warehouse]
GO
ALTER TABLE [dbo].[Notifications]  WITH CHECK ADD  CONSTRAINT [FK_Noti_User] FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[Notifications] CHECK CONSTRAINT [FK_Noti_User]
GO
ALTER TABLE [dbo].[PasswordResetTokens]  WITH CHECK ADD  CONSTRAINT [FK_PRT_User] FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[PasswordResetTokens] CHECK CONSTRAINT [FK_PRT_User]
GO
ALTER TABLE [dbo].[PurchaseOrderLines]  WITH CHECK ADD  CONSTRAINT [FK_PRL_Item] FOREIGN KEY([ItemId])
REFERENCES [dbo].[Items] ([ItemId])
GO
ALTER TABLE [dbo].[PurchaseOrderLines] CHECK CONSTRAINT [FK_PRL_Item]
GO
ALTER TABLE [dbo].[PurchaseOrderLines]  WITH CHECK ADD  CONSTRAINT [FK_PRL_PR] FOREIGN KEY([PurchaseOrderId])
REFERENCES [dbo].[PurchaseOrders] ([PurchaseOrderId])
GO
ALTER TABLE [dbo].[PurchaseOrderLines] CHECK CONSTRAINT [FK_PRL_PR]
GO
ALTER TABLE [dbo].[PurchaseOrderLines]  WITH CHECK ADD  CONSTRAINT [FK_PRL_Uom] FOREIGN KEY([UomId])
REFERENCES [dbo].[UnitOfMeasure] ([UomId])
GO
ALTER TABLE [dbo].[PurchaseOrderLines] CHECK CONSTRAINT [FK_PRL_Uom]
GO
ALTER TABLE [dbo].[PurchaseOrders]  WITH CHECK ADD  CONSTRAINT [FK_PR_RequestedBy] FOREIGN KEY([RequestedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[PurchaseOrders] CHECK CONSTRAINT [FK_PR_RequestedBy]
GO
ALTER TABLE [dbo].[PurchaseOrders]  WITH CHECK ADD  CONSTRAINT [FK_PR_Supplier] FOREIGN KEY([SupplierId])
REFERENCES [dbo].[Suppliers] ([SupplierId])
GO
ALTER TABLE [dbo].[PurchaseOrders] CHECK CONSTRAINT [FK_PR_Supplier]
GO
ALTER TABLE [dbo].[PurchaseOrders]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseOrders_ResponsibleUser] FOREIGN KEY([ResponsibleUserId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[PurchaseOrders] CHECK CONSTRAINT [FK_PurchaseOrders_ResponsibleUser]
GO
ALTER TABLE [dbo].[PurchaseOrders]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseOrders_Warehouses] FOREIGN KEY([WarehouseId])
REFERENCES [dbo].[Warehouses] ([WarehouseId])
GO
ALTER TABLE [dbo].[PurchaseOrders] CHECK CONSTRAINT [FK_PurchaseOrders_Warehouses]
GO
ALTER TABLE [dbo].[PurchaseReturnNoteLines]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseReturnNoteLines_GRNLines] FOREIGN KEY([RelatedGRNLineId])
REFERENCES [dbo].[GoodsReceiptNoteLines] ([GRNLineId])
GO
ALTER TABLE [dbo].[PurchaseReturnNoteLines] CHECK CONSTRAINT [FK_PurchaseReturnNoteLines_GRNLines]
GO
ALTER TABLE [dbo].[PurchaseReturnNoteLines]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseReturnNoteLines_PurchaseReturnNotes] FOREIGN KEY([PurchaseReturnId])
REFERENCES [dbo].[PurchaseReturnNotes] ([PurchaseReturnId])
GO
ALTER TABLE [dbo].[PurchaseReturnNoteLines] CHECK CONSTRAINT [FK_PurchaseReturnNoteLines_PurchaseReturnNotes]
GO
ALTER TABLE [dbo].[PurchaseReturnNotes]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseReturnNotes_GoodsReceiptNotes] FOREIGN KEY([RelatedGRNId])
REFERENCES [dbo].[GoodsReceiptNotes] ([GRNId])
GO
ALTER TABLE [dbo].[PurchaseReturnNotes] CHECK CONSTRAINT [FK_PurchaseReturnNotes_GoodsReceiptNotes]
GO
ALTER TABLE [dbo].[PurchaseReturnNotes]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseReturnNotes_Users_ApprovedBy] FOREIGN KEY([ApprovedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[PurchaseReturnNotes] CHECK CONSTRAINT [FK_PurchaseReturnNotes_Users_ApprovedBy]
GO
ALTER TABLE [dbo].[PurchaseReturnNotes]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseReturnNotes_Users_CreatedBy] FOREIGN KEY([CreatedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[PurchaseReturnNotes] CHECK CONSTRAINT [FK_PurchaseReturnNotes_Users_CreatedBy]
GO
ALTER TABLE [dbo].[ReleaseRequestLines]  WITH CHECK ADD  CONSTRAINT [FK_GIRL_GIR] FOREIGN KEY([ReleaseRequestId])
REFERENCES [dbo].[ReleaseRequests] ([ReleaseRequestId])
GO
ALTER TABLE [dbo].[ReleaseRequestLines] CHECK CONSTRAINT [FK_GIRL_GIR]
GO
ALTER TABLE [dbo].[ReleaseRequestLines]  WITH CHECK ADD  CONSTRAINT [FK_GIRL_Item] FOREIGN KEY([ItemId])
REFERENCES [dbo].[Items] ([ItemId])
GO
ALTER TABLE [dbo].[ReleaseRequestLines] CHECK CONSTRAINT [FK_GIRL_Item]
GO
ALTER TABLE [dbo].[ReleaseRequestLines]  WITH CHECK ADD  CONSTRAINT [FK_GIRL_Uom] FOREIGN KEY([UomId])
REFERENCES [dbo].[UnitOfMeasure] ([UomId])
GO
ALTER TABLE [dbo].[ReleaseRequestLines] CHECK CONSTRAINT [FK_GIRL_Uom]
GO
ALTER TABLE [dbo].[ReleaseRequests]  WITH CHECK ADD  CONSTRAINT [FK_GIR_Receiver] FOREIGN KEY([ReceiverId])
REFERENCES [dbo].[Receivers] ([ReceiverId])
GO
ALTER TABLE [dbo].[ReleaseRequests] CHECK CONSTRAINT [FK_GIR_Receiver]
GO
ALTER TABLE [dbo].[ReleaseRequests]  WITH CHECK ADD  CONSTRAINT [FK_GIR_RequestedBy] FOREIGN KEY([RequestedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[ReleaseRequests] CHECK CONSTRAINT [FK_GIR_RequestedBy]
GO
ALTER TABLE [dbo].[ReleaseRequests]  WITH CHECK ADD  CONSTRAINT [FK_GIR_Warehouse] FOREIGN KEY([WarehouseId])
REFERENCES [dbo].[Warehouses] ([WarehouseId])
GO
ALTER TABLE [dbo].[ReleaseRequests] CHECK CONSTRAINT [FK_GIR_Warehouse]
GO
ALTER TABLE [dbo].[StocktakeLines]  WITH CHECK ADD  CONSTRAINT [FK_STL_Item] FOREIGN KEY([ItemId])
REFERENCES [dbo].[Items] ([ItemId])
GO
ALTER TABLE [dbo].[StocktakeLines] CHECK CONSTRAINT [FK_STL_Item]
GO
ALTER TABLE [dbo].[StocktakeLines]  WITH CHECK ADD  CONSTRAINT [FK_STL_ST] FOREIGN KEY([StocktakeId])
REFERENCES [dbo].[StocktakeSessions] ([StocktakeId])
GO
ALTER TABLE [dbo].[StocktakeLines] CHECK CONSTRAINT [FK_STL_ST]
GO
ALTER TABLE [dbo].[StocktakeSessions]  WITH CHECK ADD  CONSTRAINT [FK_ST_CreatedBy] FOREIGN KEY([CreatedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[StocktakeSessions] CHECK CONSTRAINT [FK_ST_CreatedBy]
GO
ALTER TABLE [dbo].[StocktakeSessions]  WITH CHECK ADD  CONSTRAINT [FK_ST_Warehouse] FOREIGN KEY([WarehouseId])
REFERENCES [dbo].[Warehouses] ([WarehouseId])
GO
ALTER TABLE [dbo].[StocktakeSessions] CHECK CONSTRAINT [FK_ST_Warehouse]
GO
ALTER TABLE [dbo].[UserRoles]  WITH CHECK ADD  CONSTRAINT [FK_UserRoles_AssignedBy] FOREIGN KEY([AssignedBy])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[UserRoles] CHECK CONSTRAINT [FK_UserRoles_AssignedBy]
GO
ALTER TABLE [dbo].[UserRoles]  WITH CHECK ADD  CONSTRAINT [FK_UserRoles_Role] FOREIGN KEY([RoleId])
REFERENCES [dbo].[Roles] ([RoleId])
GO
ALTER TABLE [dbo].[UserRoles] CHECK CONSTRAINT [FK_UserRoles_Role]
GO
ALTER TABLE [dbo].[UserRoles]  WITH CHECK ADD  CONSTRAINT [FK_UserRoles_User] FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[UserRoles] CHECK CONSTRAINT [FK_UserRoles_User]
GO
ALTER TABLE [dbo].[Certificates]  WITH CHECK ADD  CONSTRAINT [CK_Cert_Type] CHECK  (([CertType]='CQ' OR [CertType]='CO'))
GO
ALTER TABLE [dbo].[Certificates] CHECK CONSTRAINT [CK_Cert_Type]
GO
ALTER TABLE [dbo].[DocumentApproval]  WITH CHECK ADD  CONSTRAINT [CK_DA_Decision] CHECK  (([Decision]='CANCEL' OR [Decision]='REQUEST_MODIFY' OR [Decision]='REJECT' OR [Decision]='APPROVE' OR [Decision]='SUBMIT' OR [Decision]='RECOUNT'))
GO
ALTER TABLE [dbo].[DocumentApproval] CHECK CONSTRAINT [CK_DA_Decision]
GO
ALTER TABLE [dbo].[DocumentApproval]  WITH CHECK ADD  CONSTRAINT [CK_DA_DocType] CHECK  (([DocType]='STOCKTAKE' OR [DocType]='ADJ' OR [DocType]='GDN' OR [DocType]='GIR' OR [DocType]='GRN' OR [DocType]='PR'))
GO
ALTER TABLE [dbo].[DocumentApproval] CHECK CONSTRAINT [CK_DA_DocType]
GO
ALTER TABLE [dbo].[DocumentAttachments]  WITH CHECK ADD  CONSTRAINT [CK_DAtt_AttType] CHECK  (([AttachmentType]='OTHER' OR [AttachmentType]='EVIDENCE' OR [AttachmentType]='CQ' OR [AttachmentType]='CO' OR [AttachmentType]='INVOICE' OR [AttachmentType]='GENERAL'))
GO
ALTER TABLE [dbo].[DocumentAttachments] CHECK CONSTRAINT [CK_DAtt_AttType]
GO
ALTER TABLE [dbo].[DocumentAttachments]  WITH CHECK ADD  CONSTRAINT [CK_DAtt_DocType] CHECK  (([DocType]='STOCKTAKE' OR [DocType]='ADJ' OR [DocType]='GDN' OR [DocType]='GIR' OR [DocType]='GRN' OR [DocType]='PR'))
GO
ALTER TABLE [dbo].[DocumentAttachments] CHECK CONSTRAINT [CK_DAtt_DocType]
GO
ALTER TABLE [dbo].[GoodsDeliveryNotes]  WITH CHECK ADD  CONSTRAINT [CK_GDN_Status] CHECK  (([Status]='REJECTED' OR [Status]='POSTED' OR [Status]='APPROVED' OR [Status]='PENDING_ACC' OR [Status]='DRAFT'))
GO
ALTER TABLE [dbo].[GoodsDeliveryNotes] CHECK CONSTRAINT [CK_GDN_Status]
GO
ALTER TABLE [dbo].[GoodsReceiptNoteLines]  WITH CHECK ADD  CONSTRAINT [CK_GRNLines_UnitPrice_NonNegative] CHECK  (([UnitPrice] IS NULL OR [UnitPrice]>=(0)))
GO
ALTER TABLE [dbo].[GoodsReceiptNoteLines] CHECK CONSTRAINT [CK_GRNLines_UnitPrice_NonNegative]
GO
ALTER TABLE [dbo].[GoodsReceiptNotes]  WITH CHECK ADD  CONSTRAINT [CK_GRN_Paid_Method] CHECK  (([IsPaid]=(0) AND [PaymentMethod] IS NULL OR [IsPaid]=(1) AND [PaymentMethod] IS NOT NULL))
GO
ALTER TABLE [dbo].[GoodsReceiptNotes] CHECK CONSTRAINT [CK_GRN_Paid_Method]
GO
ALTER TABLE [dbo].[GoodsReceiptNotes]  WITH NOCHECK ADD  CONSTRAINT [CK_GRN_PaymentMethod] CHECK  (([PaymentMethod] IS NULL OR ([PaymentMethod]='OTHER' OR [PaymentMethod]='E_WALLET' OR [PaymentMethod]='CARD' OR [PaymentMethod]='BANK_TRANSFER' OR [PaymentMethod]='CASH')))
GO
ALTER TABLE [dbo].[GoodsReceiptNotes] NOCHECK CONSTRAINT [CK_GRN_PaymentMethod]
GO
ALTER TABLE [dbo].[GoodsReceiptNotes]  WITH CHECK ADD  CONSTRAINT [CK_GRN_ShippingFee_NonNegative] CHECK  (([ShippingFee]>=(0)))
GO
ALTER TABLE [dbo].[GoodsReceiptNotes] CHECK CONSTRAINT [CK_GRN_ShippingFee_NonNegative]
GO
ALTER TABLE [dbo].[GoodsReceiptNotes]  WITH CHECK ADD  CONSTRAINT [CK_GRN_Status] CHECK  (([Status]='REJECTED' OR [Status]='POSTED' OR [Status]='APPROVED' OR [Status]='NEED_MODIFY' OR [Status]='PENDING_ACC' OR [Status]='DRAFT'))
GO
ALTER TABLE [dbo].[GoodsReceiptNotes] CHECK CONSTRAINT [CK_GRN_Status]
GO
ALTER TABLE [dbo].[GoodsReceiptNotes]  WITH CHECK ADD  CONSTRAINT [CK_GRN_Totals_NonNegative] CHECK  (([TotalReceivedQty]>=(0) AND [TotalGoodsAmount]>=(0)))
GO
ALTER TABLE [dbo].[GoodsReceiptNotes] CHECK CONSTRAINT [CK_GRN_Totals_NonNegative]
GO
ALTER TABLE [dbo].[InventoryAdjustmentRequests]  WITH CHECK ADD  CONSTRAINT [CK_ADJ_Status] CHECK  (([Status]='POSTED' OR [Status]='REJECTED' OR [Status]='APPROVED' OR [Status]='PENDING_DIR' OR [Status]='DRAFT'))
GO
ALTER TABLE [dbo].[InventoryAdjustmentRequests] CHECK CONSTRAINT [CK_ADJ_Status]
GO
ALTER TABLE [dbo].[InventoryOnHand]  WITH CHECK ADD  CONSTRAINT [CK_InventoryOnHand_UnitCost_NonNegative] CHECK  (([UnitCost]>=(0)))
GO
ALTER TABLE [dbo].[InventoryOnHand] CHECK CONSTRAINT [CK_InventoryOnHand_UnitCost_NonNegative]
GO
ALTER TABLE [dbo].[InventoryTransactions]  WITH CHECK ADD  CONSTRAINT [CK_IT_RefType] CHECK  (([ReferenceType]='STOCKTAKE' OR [ReferenceType]='ADJ' OR [ReferenceType]='GDN' OR [ReferenceType]='GIR' OR [ReferenceType]='GRN' OR [ReferenceType]='PR'))
GO
ALTER TABLE [dbo].[InventoryTransactions] CHECK CONSTRAINT [CK_IT_RefType]
GO
ALTER TABLE [dbo].[InventoryTransactions]  WITH CHECK ADD  CONSTRAINT [CK_IT_TxnType] CHECK  (([TxnType]='ADJUST' OR [TxnType]='OUTBOUND' OR [TxnType]='INBOUND'))
GO
ALTER TABLE [dbo].[InventoryTransactions] CHECK CONSTRAINT [CK_IT_TxnType]
GO
ALTER TABLE [dbo].[ItemPrices]  WITH CHECK ADD  CONSTRAINT [CK_ItemPrices_PriceType] CHECK  (([PriceType]='PURCHASE' OR [PriceType]='COST' OR [PriceType]='SALE'))
GO
ALTER TABLE [dbo].[ItemPrices] CHECK CONSTRAINT [CK_ItemPrices_PriceType]
GO
ALTER TABLE [dbo].[Items]  WITH CHECK ADD  CONSTRAINT [CK_Items_ShelfLifeDays_NonNegative] CHECK  (([ShelfLifeDays] IS NULL OR [ShelfLifeDays]>=(0)))
GO
ALTER TABLE [dbo].[Items] CHECK CONSTRAINT [CK_Items_ShelfLifeDays_NonNegative]
GO
ALTER TABLE [dbo].[PurchaseOrderLines]  WITH CHECK ADD  CONSTRAINT [CK_PurchaseOrderLines_LineStatus] CHECK  (([LineStatus]='FullyReceived' OR [LineStatus]='PartiallyReceived' OR [LineStatus]='Open'))
GO
ALTER TABLE [dbo].[PurchaseOrderLines] CHECK CONSTRAINT [CK_PurchaseOrderLines_LineStatus]
GO
ALTER TABLE [dbo].[PurchaseOrders]  WITH CHECK ADD  CONSTRAINT [CK_PR_Status] CHECK  (([Status]='CANCELLED' OR [Status]='REJECTED' OR [Status]='APPROVED' OR [Status]='PENDING_DIR' OR [Status]='PENDING_ACC' OR [Status]='DRAFT'))
GO
ALTER TABLE [dbo].[PurchaseOrders] CHECK CONSTRAINT [CK_PR_Status]
GO
ALTER TABLE [dbo].[PurchaseOrders]  WITH CHECK ADD  CONSTRAINT [CK_PurchaseOrders_Discount_Valid] CHECK  (([TotalAmount]>=(0) AND [DiscountAmount]>=(0) AND [DiscountAmount]<=[TotalAmount]))
GO
ALTER TABLE [dbo].[PurchaseOrders] CHECK CONSTRAINT [CK_PurchaseOrders_Discount_Valid]
GO
ALTER TABLE [dbo].[PurchaseOrders]  WITH CHECK ADD  CONSTRAINT [CK_PurchaseOrders_LifecycleStatus] CHECK  (([LifecycleStatus]='Cancelled' OR [LifecycleStatus]='FullRcv' OR [LifecycleStatus]='PartRcv' OR [LifecycleStatus]='PendingRcv'))
GO
ALTER TABLE [dbo].[PurchaseOrders] CHECK CONSTRAINT [CK_PurchaseOrders_LifecycleStatus]
GO
ALTER TABLE [dbo].[PurchaseOrders]  WITH NOCHECK ADD  CONSTRAINT [CK_PurchaseOrders_Status] CHECK  (([Status]='Pending' OR [Status]='Approved' OR [Status]='Draft'))
GO
ALTER TABLE [dbo].[PurchaseOrders] NOCHECK CONSTRAINT [CK_PurchaseOrders_Status]
GO
ALTER TABLE [dbo].[PurchaseReturnNoteLines]  WITH CHECK ADD  CONSTRAINT [CK_PurchaseReturnNoteLines_ReturnQty_Positive] CHECK  (([ReturnQty]>(0)))
GO
ALTER TABLE [dbo].[PurchaseReturnNoteLines] CHECK CONSTRAINT [CK_PurchaseReturnNoteLines_ReturnQty_Positive]
GO
ALTER TABLE [dbo].[PurchaseReturnNoteLines]  WITH CHECK ADD  CONSTRAINT [CK_PurchaseReturnNoteLines_UnitPrice_NonNegative] CHECK  (([UnitPrice]>=(0)))
GO
ALTER TABLE [dbo].[PurchaseReturnNoteLines] CHECK CONSTRAINT [CK_PurchaseReturnNoteLines_UnitPrice_NonNegative]
GO
ALTER TABLE [dbo].[PurchaseReturnNotes]  WITH CHECK ADD  CONSTRAINT [CK_PurchaseReturnNotes_FeeAmount_NonNegative] CHECK  (([FeeAmount]>=(0)))
GO
ALTER TABLE [dbo].[PurchaseReturnNotes] CHECK CONSTRAINT [CK_PurchaseReturnNotes_FeeAmount_NonNegative]
GO
ALTER TABLE [dbo].[PurchaseReturnNotes]  WITH CHECK ADD  CONSTRAINT [CK_PurchaseReturnNotes_RefundedAmount_NonNegative] CHECK  (([RefundedAmount]>=(0)))
GO
ALTER TABLE [dbo].[PurchaseReturnNotes] CHECK CONSTRAINT [CK_PurchaseReturnNotes_RefundedAmount_NonNegative]
GO
ALTER TABLE [dbo].[PurchaseReturnNotes]  WITH CHECK ADD  CONSTRAINT [CK_PurchaseReturnNotes_RefundStatus] CHECK  (([RefundStatus]='Refunded' OR [RefundStatus]='PartiallyRefunded' OR [RefundStatus]='NotRefunded'))
GO
ALTER TABLE [dbo].[PurchaseReturnNotes] CHECK CONSTRAINT [CK_PurchaseReturnNotes_RefundStatus]
GO
ALTER TABLE [dbo].[PurchaseReturnNotes]  WITH CHECK ADD  CONSTRAINT [CK_PurchaseReturnNotes_Status] CHECK  (([Status]='CANCELLED' OR [Status]='POSTED' OR [Status]='APPROVED' OR [Status]='SUBMITTED' OR [Status]='DRAFT'))
GO
ALTER TABLE [dbo].[PurchaseReturnNotes] CHECK CONSTRAINT [CK_PurchaseReturnNotes_Status]
GO
ALTER TABLE [dbo].[ReleaseRequests]  WITH CHECK ADD  CONSTRAINT [CK_GIR_Status] CHECK  (([Status]='CANCELLED' OR [Status]='REJECTED' OR [Status]='APPROVED' OR [Status]='PENDING_ACC' OR [Status]='DRAFT'))
GO
ALTER TABLE [dbo].[ReleaseRequests] CHECK CONSTRAINT [CK_GIR_Status]
GO
ALTER TABLE [dbo].[StocktakeSessions]  WITH CHECK ADD  CONSTRAINT [CK_ST_Mode] CHECK  (([Mode]='ADHOC' OR [Mode]='PERIODIC'))
GO
ALTER TABLE [dbo].[StocktakeSessions] CHECK CONSTRAINT [CK_ST_Mode]
GO
ALTER TABLE [dbo].[StocktakeSessions]  WITH CHECK ADD  CONSTRAINT [CK_ST_Status] CHECK  (([Status]='CANCELLED' OR [Status]='COMPLETED' OR [Status]='IN_PROGRESS' OR [Status]='APPROVED' OR [Status]='PENDING_APPROVAL' OR [Status]='DRAFT'))
GO
ALTER TABLE [dbo].[StocktakeSessions] CHECK CONSTRAINT [CK_ST_Status]
GO
