using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace Warehouse.Entities.Models;

public partial class Mkiwms5Context : DbContext
{
    public Mkiwms5Context()
    {
    }

    public Mkiwms5Context(DbContextOptions<Mkiwms5Context> options)
        : base(options)
    {
    }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<Brand> Brands { get; set; }

    public virtual DbSet<Certificate> Certificates { get; set; }

    public virtual DbSet<DocumentApproval> DocumentApprovals { get; set; }

    public virtual DbSet<DocumentAttachment> DocumentAttachments { get; set; }

    public virtual DbSet<GoodsDeliveryNote> GoodsDeliveryNotes { get; set; }

    public virtual DbSet<GoodsDeliveryNoteLine> GoodsDeliveryNoteLines { get; set; }

    public virtual DbSet<GoodsReceiptNote> GoodsReceiptNotes { get; set; }

    public virtual DbSet<GoodsReceiptNoteLine> GoodsReceiptNoteLines { get; set; }

    public virtual DbSet<InventoryAdjustmentLine> InventoryAdjustmentLines { get; set; }

    public virtual DbSet<InventoryAdjustmentRequest> InventoryAdjustmentRequests { get; set; }

    public virtual DbSet<InventoryOnHand> InventoryOnHands { get; set; }

    public virtual DbSet<InventoryTransaction> InventoryTransactions { get; set; }

    public virtual DbSet<InventoryTransactionLine> InventoryTransactionLines { get; set; }

    public virtual DbSet<Item> Items { get; set; }

    public virtual DbSet<ItemCategory> ItemCategories { get; set; }

    public virtual DbSet<ItemParameter> ItemParameters { get; set; }

    public virtual DbSet<ItemParameterValue> ItemParameterValues { get; set; }

    public virtual DbSet<ItemPrice> ItemPrices { get; set; }

    public virtual DbSet<ItemWarehousePolicy> ItemWarehousePolicies { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<PackagingSpec> PackagingSpecs { get; set; }

    public virtual DbSet<PasswordResetToken> PasswordResetTokens { get; set; }

    public virtual DbSet<PurchaseOrder> PurchaseOrders { get; set; }

    public virtual DbSet<PurchaseOrderLine> PurchaseOrderLines { get; set; }

    public virtual DbSet<PurchaseReturnNote> PurchaseReturnNotes { get; set; }

    public virtual DbSet<PurchaseReturnNoteLine> PurchaseReturnNoteLines { get; set; }

    public virtual DbSet<Receiver> Receivers { get; set; }

    public virtual DbSet<ReleaseRequest> ReleaseRequests { get; set; }

    public virtual DbSet<ReleaseRequestLine> ReleaseRequestLines { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<StocktakeLine> StocktakeLines { get; set; }

    public virtual DbSet<StocktakeSession> StocktakeSessions { get; set; }

    public virtual DbSet<Supplier> Suppliers { get; set; }

    public virtual DbSet<UnitOfMeasure> UnitOfMeasures { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserRole> UserRoles { get; set; }

    public virtual DbSet<Warehouse> Warehouses { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.AuditLogId).HasName("PK__AuditLog__EB5F6CBD8313C1F5");

            entity.Property(e => e.Action).HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Detail).HasMaxLength(2000);
            entity.Property(e => e.EntityType).HasMaxLength(50);

            entity.HasOne(d => d.ActorUser).WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.ActorUserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Audit_User");
        });

        modelBuilder.Entity<Brand>(entity =>
        {
            entity.HasKey(e => e.BrandId).HasName("PK__Brands__DAD4F05EA16A2342");

            entity.HasIndex(e => e.BrandName, "UQ__Brands__2206CE9B1B468D79").IsUnique();

            entity.Property(e => e.BrandName).HasMaxLength(200);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<Certificate>(entity =>
        {
            entity.HasKey(e => e.CertificateId).HasName("PK__Certific__BBF8A7C19AE2B5DE");

            entity.Property(e => e.CertNo).HasMaxLength(100);
            entity.Property(e => e.CertType).HasMaxLength(10);
            entity.Property(e => e.GrnlineId).HasColumnName("GRNLineId");
            entity.Property(e => e.IssuedBy).HasMaxLength(200);
            entity.Property(e => e.Note).HasMaxLength(500);

            entity.HasOne(d => d.Grnline).WithMany(p => p.Certificates)
                .HasForeignKey(d => d.GrnlineId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Cert_GRNLine");
        });

        modelBuilder.Entity<DocumentApproval>(entity =>
        {
            entity.HasKey(e => e.ApprovalId).HasName("PK__Document__328477F45A695816");

            entity.ToTable("DocumentApproval");

            entity.Property(e => e.ActionAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Decision).HasMaxLength(20);
            entity.Property(e => e.DocType).HasMaxLength(20);
            entity.Property(e => e.Reason).HasMaxLength(1000);
            entity.Property(e => e.StageNo).HasDefaultValue(1);

            entity.HasOne(d => d.ActionByNavigation).WithMany(p => p.DocumentApprovals)
                .HasForeignKey(d => d.ActionBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DA_ActionBy");
        });

        modelBuilder.Entity<DocumentAttachment>(entity =>
        {
            entity.HasKey(e => e.AttachmentId).HasName("PK__Document__442C64BEBC72448C");

            entity.Property(e => e.AttachmentType)
                .HasMaxLength(30)
                .HasDefaultValue("GENERAL");
            entity.Property(e => e.DocType).HasMaxLength(20);
            entity.Property(e => e.FileName).HasMaxLength(255);
            entity.Property(e => e.FileUrlOrPath).HasMaxLength(800);
            entity.Property(e => e.UploadedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.UploadedByNavigation).WithMany(p => p.DocumentAttachments)
                .HasForeignKey(d => d.UploadedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DAtt_UploadedBy");
        });

        modelBuilder.Entity<GoodsDeliveryNote>(entity =>
        {
            entity.HasKey(e => e.Gdnid).HasName("PK__GoodsDel__9FDAF9A75015AD62");

            entity.HasIndex(e => e.Gdncode, "UQ__GoodsDel__1DA6F0E97DC70B30").IsUnique();

            entity.Property(e => e.Gdnid).HasColumnName("GDNId");
            entity.Property(e => e.Gdncode)
                .HasMaxLength(50)
                .HasColumnName("GDNCode");
            entity.Property(e => e.Note).HasMaxLength(1000);
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("DRAFT");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.GoodsDeliveryNotes)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GDN_CreatedBy");

            entity.HasOne(d => d.ReleaseRequest).WithMany(p => p.GoodsDeliveryNotes)
                .HasForeignKey(d => d.ReleaseRequestId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GDN_GIR");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.GoodsDeliveryNotes)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GDN_Warehouse");
        });

        modelBuilder.Entity<GoodsDeliveryNoteLine>(entity =>
        {
            entity.HasKey(e => e.GdnlineId).HasName("PK__GoodsDel__0E39BC61933D308B");

            entity.Property(e => e.GdnlineId).HasColumnName("GDNLineId");
            entity.Property(e => e.ActualQty).HasColumnType("decimal(18, 3)");
            entity.Property(e => e.Gdnid).HasColumnName("GDNId");
            entity.Property(e => e.RequestedQty).HasColumnType("decimal(18, 3)");

            entity.HasOne(d => d.Gdn).WithMany(p => p.GoodsDeliveryNoteLines)
                .HasForeignKey(d => d.Gdnid)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GDNL_GDN");

            entity.HasOne(d => d.Item).WithMany(p => p.GoodsDeliveryNoteLines)
                .HasForeignKey(d => d.ItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GDNL_Item");

            entity.HasOne(d => d.Uom).WithMany(p => p.GoodsDeliveryNoteLines)
                .HasForeignKey(d => d.UomId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GDNL_Uom");
        });

        modelBuilder.Entity<GoodsReceiptNote>(entity =>
        {
            entity.HasKey(e => e.Grnid).HasName("PK__GoodsRec__BC0E8C42771207C7");

            entity.HasIndex(e => e.Grncode, "UQ__GoodsRec__F1E8DDCBB74205B4").IsUnique();

            entity.Property(e => e.Grnid).HasColumnName("GRNId");
            entity.Property(e => e.Grncode)
                .HasMaxLength(50)
                .HasColumnName("GRNCode");
            entity.Property(e => e.Note).HasMaxLength(1000);
            entity.Property(e => e.PaymentMethod)
                .HasMaxLength(30)
                .IsUnicode(false);
            entity.Property(e => e.ShippingFee).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("DRAFT");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.GoodsReceiptNotes)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GRN_CreatedBy");

            entity.HasOne(d => d.PurchaseOrder).WithMany(p => p.GoodsReceiptNotes)
                .HasForeignKey(d => d.PurchaseOrderId)
                .HasConstraintName("FK_GRN_PR");

            entity.HasOne(d => d.Supplier).WithMany(p => p.GoodsReceiptNotes)
                .HasForeignKey(d => d.SupplierId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GRN_Supplier");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.GoodsReceiptNotes)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GRN_Warehouse");
        });

        modelBuilder.Entity<GoodsReceiptNoteLine>(entity =>
        {
            entity.HasKey(e => e.GrnlineId).HasName("PK__GoodsRec__433F1E90B6F434EC");

            entity.Property(e => e.GrnlineId).HasColumnName("GRNLineId");
            entity.Property(e => e.ActualQty).HasColumnType("decimal(18, 3)");
            entity.Property(e => e.ExpectedQty).HasColumnType("decimal(18, 3)");
            entity.Property(e => e.Grnid).HasColumnName("GRNId");
            entity.Property(e => e.RequiresCocq).HasColumnName("RequiresCOCQ");

            entity.HasOne(d => d.Grn).WithMany(p => p.GoodsReceiptNoteLines)
                .HasForeignKey(d => d.Grnid)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GRNL_GRN");

            entity.HasOne(d => d.Item).WithMany(p => p.GoodsReceiptNoteLines)
                .HasForeignKey(d => d.ItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GRNL_Item");

            entity.HasOne(d => d.PurchaseOrderLine).WithMany(p => p.GoodsReceiptNoteLines)
                .HasForeignKey(d => d.PurchaseOrderLineId)
                .HasConstraintName("FK_GRNLines_PurchaseOrderLines");

            entity.HasOne(d => d.Uom).WithMany(p => p.GoodsReceiptNoteLines)
                .HasForeignKey(d => d.UomId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GRNL_Uom");
        });

        modelBuilder.Entity<InventoryAdjustmentLine>(entity =>
        {
            entity.HasKey(e => e.AdjustmentLineId).HasName("PK__Inventor__A70FA5C16521E02C");

            entity.Property(e => e.CountedQty).HasColumnType("decimal(18, 3)");
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.QtyChange)
                .HasComputedColumnSql("([CountedQty]-[SystemQty])", true)
                .HasColumnType("decimal(19, 3)");
            entity.Property(e => e.SystemQty).HasColumnType("decimal(18, 3)");

            entity.HasOne(d => d.Adjustment).WithMany(p => p.InventoryAdjustmentLines)
                .HasForeignKey(d => d.AdjustmentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ADJL_ADJ");

            entity.HasOne(d => d.Item).WithMany(p => p.InventoryAdjustmentLines)
                .HasForeignKey(d => d.ItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ADJL_Item");
        });

        modelBuilder.Entity<InventoryAdjustmentRequest>(entity =>
        {
            entity.HasKey(e => e.AdjustmentId).HasName("PK__Inventor__E60DB89325B00A55");

            entity.HasIndex(e => e.AdjustmentCode, "UQ__Inventor__292CC6CF3C8BB66C").IsUnique();

            entity.Property(e => e.AdjustmentCode).HasMaxLength(50);
            entity.Property(e => e.Reason).HasMaxLength(1000);
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("DRAFT");

            entity.HasOne(d => d.Stocktake).WithMany(p => p.InventoryAdjustmentRequests)
                .HasForeignKey(d => d.StocktakeId)
                .HasConstraintName("FK_ADJ_ST");

            entity.HasOne(d => d.SubmittedByNavigation).WithMany(p => p.InventoryAdjustmentRequests)
                .HasForeignKey(d => d.SubmittedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ADJ_SubmittedBy");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.InventoryAdjustmentRequests)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ADJ_WH");
        });

        modelBuilder.Entity<InventoryOnHand>(entity =>
        {
            entity.HasKey(e => e.InventoryId).HasName("PK__Inventor__F5FDE6B36AF7E180");

            entity.ToTable("InventoryOnHand");

            entity.HasIndex(e => new { e.WarehouseId, e.ItemId }, "UQ_Inv").IsUnique();

            entity.Property(e => e.OnHandQty).HasColumnType("decimal(18, 3)");
            entity.Property(e => e.ReservedQty).HasColumnType("decimal(18, 3)");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Item).WithMany(p => p.InventoryOnHands)
                .HasForeignKey(d => d.ItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inv_Item");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.InventoryOnHands)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inv_Warehouse");
        });

        modelBuilder.Entity<InventoryTransaction>(entity =>
        {
            entity.HasKey(e => e.InventoryTxnId).HasName("PK__Inventor__F692919B3F23DF00");

            entity.Property(e => e.ReferenceType).HasMaxLength(20);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("POSTED");
            entity.Property(e => e.TxnDate).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.TxnType).HasMaxLength(20);

            entity.HasOne(d => d.PostedByNavigation).WithMany(p => p.InventoryTransactions)
                .HasForeignKey(d => d.PostedBy)
                .HasConstraintName("FK_IT_PostedBy");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.InventoryTransactions)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IT_Warehouse");
        });

        modelBuilder.Entity<InventoryTransactionLine>(entity =>
        {
            entity.HasKey(e => e.InventoryTxnLineId).HasName("PK__Inventor__EE94D3FA446EA11F");

            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.QtyChange).HasColumnType("decimal(18, 3)");

            entity.HasOne(d => d.InventoryTxn).WithMany(p => p.InventoryTransactionLines)
                .HasForeignKey(d => d.InventoryTxnId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ITL_Txn");

            entity.HasOne(d => d.Item).WithMany(p => p.InventoryTransactionLines)
                .HasForeignKey(d => d.ItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ITL_Item");

            entity.HasOne(d => d.Uom).WithMany(p => p.InventoryTransactionLines)
                .HasForeignKey(d => d.UomId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ITL_Uom");
        });

        modelBuilder.Entity<Item>(entity =>
        {
            entity.HasKey(e => e.ItemId).HasName("PK__Items__727E838B0F14339A");

            entity.HasIndex(e => e.ItemCode, "UQ__Items__3ECC0FEAA20BD566").IsUnique();

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.ImageUrl).HasMaxLength(500);
            entity.Property(e => e.InventoryAccount).HasMaxLength(50);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.ItemCode).HasMaxLength(50);
            entity.Property(e => e.ItemName).HasMaxLength(500);
            entity.Property(e => e.ItemType).HasMaxLength(50);
            entity.Property(e => e.RequiresCo).HasColumnName("RequiresCO");
            entity.Property(e => e.RequiresCq).HasColumnName("RequiresCQ");
            entity.Property(e => e.RevenueAccount).HasMaxLength(50);
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.BaseUom).WithMany(p => p.Items)
                .HasForeignKey(d => d.BaseUomId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Items_Uom");

            entity.HasOne(d => d.Brand).WithMany(p => p.Items)
                .HasForeignKey(d => d.BrandId)
                .HasConstraintName("FK_Items_Brand");

            entity.HasOne(d => d.Category).WithMany(p => p.Items)
                .HasForeignKey(d => d.CategoryId)
                .HasConstraintName("FK_Items_Category");

            entity.HasOne(d => d.DefaultWarehouse).WithMany(p => p.Items)
                .HasForeignKey(d => d.DefaultWarehouseId)
                .HasConstraintName("FK_Items_DefaultWarehouse");

            entity.HasOne(d => d.PackagingSpec).WithMany(p => p.Items)
                .HasForeignKey(d => d.PackagingSpecId)
                .HasConstraintName("FK_Items_Packaging");
        });

        modelBuilder.Entity<ItemCategory>(entity =>
        {
            entity.HasKey(e => e.CategoryId).HasName("PK__ItemCate__19093A0B25762087");

            entity.HasIndex(e => e.CategoryCode, "UQ__ItemCate__371BA955CDE0B063").IsUnique();

            entity.Property(e => e.CategoryCode).HasMaxLength(50);
            entity.Property(e => e.CategoryName).HasMaxLength(200);
            entity.Property(e => e.IsActive).HasDefaultValue(true);

            entity.HasOne(d => d.Parent).WithMany(p => p.InverseParent)
                .HasForeignKey(d => d.ParentId)
                .HasConstraintName("FK_ItemCategories_Parent");
        });

        modelBuilder.Entity<ItemParameter>(entity =>
        {
            entity.HasKey(e => e.ParamId).HasName("PK__ItemPara__C132B124BB000576");

            entity.HasIndex(e => e.ParamCode, "UQ__ItemPara__2232AFCBF8AB46C9").IsUnique();

            entity.Property(e => e.DataType)
                .HasMaxLength(30)
                .HasDefaultValue("TEXT");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.ParamCode).HasMaxLength(50);
            entity.Property(e => e.ParamName).HasMaxLength(200);
        });

        modelBuilder.Entity<ItemParameterValue>(entity =>
        {
            entity.HasKey(e => e.ItemParamValueId).HasName("PK__ItemPara__B90EB55F5F2006D9");

            entity.HasIndex(e => new { e.ItemId, e.ParamId }, "UQ_IPV").IsUnique();

            entity.Property(e => e.ParamValue).HasMaxLength(500);

            entity.HasOne(d => d.Item).WithMany(p => p.ItemParameterValues)
                .HasForeignKey(d => d.ItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IPV_Item");

            entity.HasOne(d => d.Param).WithMany(p => p.ItemParameterValues)
                .HasForeignKey(d => d.ParamId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IPV_Param");
        });

        modelBuilder.Entity<ItemPrice>(entity =>
        {
            entity.HasKey(e => e.ItemPriceId).HasName("PK__ItemPric__7E70A2620AB0D401");

            entity.Property(e => e.Amount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Currency).HasMaxLength(10);
            entity.Property(e => e.PriceType).HasMaxLength(20);

            entity.HasOne(d => d.Item).WithMany(p => p.ItemPrices)
                .HasForeignKey(d => d.ItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ItemPrices_Items");
        });

        modelBuilder.Entity<ItemWarehousePolicy>(entity =>
        {
            entity.HasKey(e => e.ItemWarehousePolicyId).HasName("PK__ItemWare__6813183ED7310384");

            entity.ToTable("ItemWarehousePolicy");

            entity.HasIndex(e => new { e.ItemId, e.WarehouseId }, "UQ_IWP").IsUnique();

            entity.Property(e => e.MinQty).HasColumnType("decimal(18, 3)");
            entity.Property(e => e.ReorderQty).HasColumnType("decimal(18, 3)");

            entity.HasOne(d => d.Item).WithMany(p => p.ItemWarehousePolicies)
                .HasForeignKey(d => d.ItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IWP_Item");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.ItemWarehousePolicies)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IWP_Warehouse");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotificationId).HasName("PK__Notifica__20CF2E127742DFD8");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.ExpiresAt).HasPrecision(0);
            entity.Property(e => e.Message).HasMaxLength(1000);
            entity.Property(e => e.RefType).HasMaxLength(20);
            entity.Property(e => e.Severity).HasDefaultValue((byte)1);
            entity.Property(e => e.Title).HasMaxLength(200);
            entity.Property(e => e.Type).HasMaxLength(50);

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Noti_User");
        });

        modelBuilder.Entity<PackagingSpec>(entity =>
        {
            entity.HasKey(e => e.PackagingSpecId).HasName("PK__Packagin__DAD5791CF825AD65");

            entity.Property(e => e.Description).HasMaxLength(400);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.SpecName).HasMaxLength(200);
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(e => e.TokenId).HasName("PK__Password__658FEEEAA6143D31");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.TokenHash).HasMaxLength(256);

            entity.HasOne(d => d.User).WithMany(p => p.PasswordResetTokens)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PRT_User");
        });

        modelBuilder.Entity<PurchaseOrder>(entity =>
        {
            entity.HasKey(e => e.PurchaseOrderId).HasName("PK__Purchase__036BACA4F60B95B9");

            entity.HasIndex(e => e.Pocode, "UQ__Purchase__40ACF5B833096C23").IsUnique();

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.DiscountAmount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Justification).HasMaxLength(1000);
            entity.Property(e => e.LifecycleStatus)
                .HasMaxLength(10)
                .IsUnicode(false)
                .HasDefaultValue("Open");
            entity.Property(e => e.NetAmount)
                .HasComputedColumnSql("(CONVERT([decimal](18,2),[TotalAmount]-[DiscountAmount]))", true)
                .HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Pocode)
                .HasMaxLength(50)
                .HasColumnName("POCode");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("DRAFT");
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.RequestedByNavigation).WithMany(p => p.PurchaseOrderRequestedByNavigations)
                .HasForeignKey(d => d.RequestedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PR_RequestedBy");

            entity.HasOne(d => d.ResponsibleUser).WithMany(p => p.PurchaseOrderResponsibleUsers)
                .HasForeignKey(d => d.ResponsibleUserId)
                .HasConstraintName("FK_PurchaseOrders_ResponsibleUser");

            entity.HasOne(d => d.Supplier).WithMany(p => p.PurchaseOrders)
                .HasForeignKey(d => d.SupplierId)
                .HasConstraintName("FK_PR_Supplier");
        });

        modelBuilder.Entity<PurchaseOrderLine>(entity =>
        {
            entity.HasKey(e => e.PurchaseOrderLineId).HasName("PK__Purchase__2100B03815D3044D");

            entity.Property(e => e.Currency).HasMaxLength(10);
            entity.Property(e => e.LineStatus)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("Open");
            entity.Property(e => e.LineTotal)
                .HasComputedColumnSql("([OrderedQty]*[UnitPrice])", true)
                .HasColumnType("decimal(37, 5)");
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.OrderedQty).HasColumnType("decimal(18, 3)");
            entity.Property(e => e.ReceivedQty).HasColumnType("decimal(18, 3)");
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.Item).WithMany(p => p.PurchaseOrderLines)
                .HasForeignKey(d => d.ItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PRL_Item");

            entity.HasOne(d => d.PurchaseOrder).WithMany(p => p.PurchaseOrderLines)
                .HasForeignKey(d => d.PurchaseOrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PRL_PR");

            entity.HasOne(d => d.Uom).WithMany(p => p.PurchaseOrderLines)
                .HasForeignKey(d => d.UomId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PRL_Uom");
        });

        modelBuilder.Entity<PurchaseReturnNote>(entity =>
        {
            entity.HasKey(e => e.PurchaseReturnId);

            entity.HasIndex(e => e.ReturnCode, "UQ_PurchaseReturnNotes_ReturnCode").IsUnique();

            entity.Property(e => e.ApprovedAt).HasPrecision(0);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.FeeAmount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Note).HasMaxLength(1000);
            entity.Property(e => e.PostedAt).HasPrecision(0);
            entity.Property(e => e.Reason).HasMaxLength(500);
            entity.Property(e => e.RefundMethod)
                .HasMaxLength(30)
                .IsUnicode(false);
            entity.Property(e => e.RefundReference).HasMaxLength(100);
            entity.Property(e => e.RefundStatus)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("NotRefunded");
            entity.Property(e => e.RefundedAmount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.RefundedAt).HasPrecision(0);
            entity.Property(e => e.RelatedGrnid).HasColumnName("RelatedGRNId");
            entity.Property(e => e.ReturnCode)
                .HasMaxLength(30)
                .IsUnicode(false);
            entity.Property(e => e.ReturnDate)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("DRAFT");

            entity.HasOne(d => d.ApprovedByNavigation).WithMany(p => p.PurchaseReturnNoteApprovedByNavigations).HasForeignKey(d => d.ApprovedBy);

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.PurchaseReturnNoteCreatedByNavigations)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.RelatedGrn).WithMany(p => p.PurchaseReturnNotes)
                .HasForeignKey(d => d.RelatedGrnid)
                .HasConstraintName("FK_PurchaseReturnNotes_GoodsReceiptNotes");
        });

        modelBuilder.Entity<PurchaseReturnNoteLine>(entity =>
        {
            entity.HasKey(e => e.PurchaseReturnLineId);

            entity.Property(e => e.LineTotal)
                .HasComputedColumnSql("(CONVERT([decimal](18,2),[ReturnQty]*[UnitPrice]))", true)
                .HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Note).HasMaxLength(1000);
            entity.Property(e => e.Reason).HasMaxLength(500);
            entity.Property(e => e.RelatedGrnlineId).HasColumnName("RelatedGRNLineId");
            entity.Property(e => e.ReturnQty).HasColumnType("decimal(18, 3)");
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.PurchaseReturn).WithMany(p => p.PurchaseReturnNoteLines)
                .HasForeignKey(d => d.PurchaseReturnId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PurchaseReturnNoteLines_PurchaseReturnNotes");

            entity.HasOne(d => d.RelatedGrnline).WithMany(p => p.PurchaseReturnNoteLines)
                .HasForeignKey(d => d.RelatedGrnlineId)
                .HasConstraintName("FK_PurchaseReturnNoteLines_GRNLines");
        });

        modelBuilder.Entity<Receiver>(entity =>
        {
            entity.HasKey(e => e.ReceiverId).HasName("PK__Receiver__FEBB5F27EFF18A78");

            entity.HasIndex(e => e.ReceiverCode, "UQ__Receiver__A918ECE931155718").IsUnique();

            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.District).HasMaxLength(100);
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.Phone).HasMaxLength(30);
            entity.Property(e => e.ReceiverCode).HasMaxLength(50);
            entity.Property(e => e.ReceiverName).HasMaxLength(300);
            entity.Property(e => e.Ward).HasMaxLength(100);
        });

        modelBuilder.Entity<ReleaseRequest>(entity =>
        {
            entity.HasKey(e => e.ReleaseRequestId).HasName("PK__ReleaseR__2901DDA42648EE7E");

            entity.HasIndex(e => e.ReleaseRequestCode, "UQ__ReleaseR__380806C595B6D849").IsUnique();

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Purpose).HasMaxLength(500);
            entity.Property(e => e.ReleaseRequestCode).HasMaxLength(50);
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("DRAFT");

            entity.HasOne(d => d.Receiver).WithMany(p => p.ReleaseRequests)
                .HasForeignKey(d => d.ReceiverId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GIR_Receiver");

            entity.HasOne(d => d.RequestedByNavigation).WithMany(p => p.ReleaseRequests)
                .HasForeignKey(d => d.RequestedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GIR_RequestedBy");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.ReleaseRequests)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GIR_Warehouse");
        });

        modelBuilder.Entity<ReleaseRequestLine>(entity =>
        {
            entity.HasKey(e => e.ReleaseRequestLineId).HasName("PK__ReleaseR__B16BBFF5DBF9C54B");

            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.RequestedQty).HasColumnType("decimal(18, 3)");

            entity.HasOne(d => d.Item).WithMany(p => p.ReleaseRequestLines)
                .HasForeignKey(d => d.ItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GIRL_Item");

            entity.HasOne(d => d.ReleaseRequest).WithMany(p => p.ReleaseRequestLines)
                .HasForeignKey(d => d.ReleaseRequestId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GIRL_GIR");

            entity.HasOne(d => d.Uom).WithMany(p => p.ReleaseRequestLines)
                .HasForeignKey(d => d.UomId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GIRL_Uom");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("PK__Roles__8AFACE1A5276BB10");

            entity.HasIndex(e => e.RoleCode, "UQ__Roles__D62CB59C56146971").IsUnique();

            entity.Property(e => e.RoleCode).HasMaxLength(50);
            entity.Property(e => e.RoleName).HasMaxLength(100);
        });

        modelBuilder.Entity<StocktakeLine>(entity =>
        {
            entity.HasKey(e => e.StocktakeLineId).HasName("PK__Stocktak__CE77AE3615D7C5F5");

            entity.HasIndex(e => new { e.StocktakeId, e.ItemId }, "UQ_STL").IsUnique();

            entity.Property(e => e.CountedQty).HasColumnType("decimal(18, 3)");
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.SystemQtySnapshot).HasColumnType("decimal(18, 3)");
            entity.Property(e => e.VarianceQty)
                .HasComputedColumnSql("(isnull([CountedQty],(0))-[SystemQtySnapshot])", true)
                .HasColumnType("decimal(19, 3)");

            entity.HasOne(d => d.Item).WithMany(p => p.StocktakeLines)
                .HasForeignKey(d => d.ItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_STL_Item");

            entity.HasOne(d => d.Stocktake).WithMany(p => p.StocktakeLines)
                .HasForeignKey(d => d.StocktakeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_STL_ST");
        });

        modelBuilder.Entity<StocktakeSession>(entity =>
        {
            entity.HasKey(e => e.StocktakeId).HasName("PK__Stocktak__5874C46537358D4C");

            entity.HasIndex(e => e.StocktakeCode, "UQ__Stocktak__66FC5709C363D2A9").IsUnique();

            entity.Property(e => e.Mode).HasMaxLength(20);
            entity.Property(e => e.Note).HasMaxLength(1000);
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("DRAFT");
            entity.Property(e => e.StocktakeCode).HasMaxLength(50);

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.StocktakeSessions)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ST_CreatedBy");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.StocktakeSessions)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ST_Warehouse");
        });

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.SupplierId).HasName("PK__Supplier__4BE666B41BCE0C08");

            entity.HasIndex(e => e.SupplierCode, "UQ__Supplier__44BE981B018E2BB4").IsUnique();

            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.District).HasMaxLength(100);
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Phone).HasMaxLength(30);
            entity.Property(e => e.SupplierCode).HasMaxLength(50);
            entity.Property(e => e.SupplierName).HasMaxLength(300);
            entity.Property(e => e.TaxCode).HasMaxLength(50);
            entity.Property(e => e.Ward).HasMaxLength(100);
        });

        modelBuilder.Entity<UnitOfMeasure>(entity =>
        {
            entity.HasKey(e => e.UomId).HasName("PK__UnitOfMe__F6F8D47E61AC8BE5");

            entity.ToTable("UnitOfMeasure");

            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.UomName).HasMaxLength(100);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__Users__1788CC4CA16379C5");

            entity.HasIndex(e => e.Username, "UQ__Users__536C85E42ECD79BF").IsUnique();

            entity.HasIndex(e => e.Email, "UQ__Users__A9D10534B636B23E").IsUnique();

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Dob).HasColumnName("DOB");
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.FullName).HasMaxLength(200);
            entity.Property(e => e.Gender).HasMaxLength(10);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasDefaultValue("");
            entity.Property(e => e.Phone).HasMaxLength(30);
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Username).HasMaxLength(100);
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(e => e.UserRoleId).HasName("PK__UserRole__3D978A3533450B97");

            entity.HasIndex(e => e.UserId, "UQ_UserRoles_User").IsUnique();

            entity.Property(e => e.AssignedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.AssignedByNavigation).WithMany(p => p.UserRoleAssignedByNavigations)
                .HasForeignKey(d => d.AssignedBy)
                .HasConstraintName("FK_UserRoles_AssignedBy");

            entity.HasOne(d => d.Role).WithMany(p => p.UserRoles)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_UserRoles_Role");

            entity.HasOne(d => d.User).WithOne(p => p.UserRoleUser)
                .HasForeignKey<UserRole>(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_UserRoles_User");
        });

        modelBuilder.Entity<Warehouse>(entity =>
        {
            entity.HasKey(e => e.WarehouseId).HasName("PK__Warehous__2608AFF9F3B8E20A");

            entity.HasIndex(e => e.WarehouseCode, "UQ__Warehous__1686A056B08867D4").IsUnique();

            entity.Property(e => e.Address).HasMaxLength(400);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.District).HasMaxLength(100);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.WarehouseCode).HasMaxLength(50);
            entity.Property(e => e.WarehouseName).HasMaxLength(200);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
