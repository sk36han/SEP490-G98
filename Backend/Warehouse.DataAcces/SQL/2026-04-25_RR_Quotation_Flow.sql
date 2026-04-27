/* RR quotation flow extension: keep DRAFT/PENDING_ACC statuses */

ALTER TABLE [dbo].[ReleaseRequests]
ADD
    [IsQuotationFlow] [bit] NOT NULL CONSTRAINT [DF_ReleaseRequests_IsQuotationFlow] DEFAULT ((0)),
    [QuotationStatus] [nvarchar](20) NULL,
    [QuotationSentAt] [datetime2](7) NULL,
    [QuotationConfirmedAt] [datetime2](7) NULL,
    [QuotationVersion] [int] NOT NULL CONSTRAINT [DF_ReleaseRequests_QuotationVersion] DEFAULT ((1));
GO

CREATE TABLE [dbo].[ReleaseRequestEmailLogs]
(
    [ReleaseRequestEmailLogId] [bigint] IDENTITY(1,1) NOT NULL,
    [ReleaseRequestId] [bigint] NOT NULL,
    [SenderUserId] [bigint] NOT NULL,
    [ToEmails] [nvarchar](2000) NOT NULL,
    [CcEmails] [nvarchar](2000) NULL,
    [BccEmails] [nvarchar](2000) NULL,
    [Subject] [nvarchar](500) NOT NULL,
    [SentAt] [datetime2](7) NOT NULL CONSTRAINT [DF_ReleaseRequestEmailLogs_SentAt] DEFAULT (sysutcdatetime()),
    [Status] [nvarchar](20) NOT NULL,
    [ErrorMessage] [nvarchar](2000) NULL,
    CONSTRAINT [PK_ReleaseRequestEmailLogs] PRIMARY KEY CLUSTERED ([ReleaseRequestEmailLogId] ASC)
);
GO

ALTER TABLE [dbo].[ReleaseRequestEmailLogs] WITH CHECK
ADD CONSTRAINT [FK_ReleaseRequestEmailLogs_ReleaseRequests]
FOREIGN KEY([ReleaseRequestId]) REFERENCES [dbo].[ReleaseRequests]([ReleaseRequestId]);
GO

ALTER TABLE [dbo].[ReleaseRequestEmailLogs] WITH CHECK
ADD CONSTRAINT [FK_ReleaseRequestEmailLogs_Users]
FOREIGN KEY([SenderUserId]) REFERENCES [dbo].[Users]([UserId]);
GO
