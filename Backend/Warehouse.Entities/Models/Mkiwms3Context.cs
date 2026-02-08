using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace Warehouse.Entities.Models;

public partial class Mkiwms3Context : DbContext
{
    public Mkiwms3Context()
    {
    }

    public Mkiwms3Context(DbContextOptions<Mkiwms3Context> options)
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
            entity.HasKey(e => e.AuditLogId).HasName("PK__AuditLog__EB5F6CBDEC6E9957");

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
            entity.HasKey(e => e.BrandId).HasName("PK__Brands__DAD4F05E8B4C8500");

            entity.HasIndex(e => e.BrandName, "UQ__Brands__2206CE9B9511ACB7").IsUnique();

            entity.Property(e => e.BrandName).HasMaxLength(200);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<Certificate>(entity =>
        {
            entity.HasKey(e => e.CertificateId).HasName("PK__Certific__BBF8A7C12D75875C");

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
            entity.HasKey(e => e.ApprovalId).HasName("PK__Document__328477F4737C9B22");

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
            entity.HasKey(e => e.AttachmentId).HasName("PK__Document__442C64BE3D12DA9F");

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
            entity.HasKey(e => e.Gdnid).HasName("PK__GoodsDel__9FDAF9A70E1E4E61");

            entity.HasIndex(e => e.Gdncode, "UQ__GoodsDel__1DA6F0E9E94B04C6").IsUnique();

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
            entity.HasKey(e => e.GdnlineId).HasName("PK__GoodsDel__0E39BC6138CAD185");

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
            entity.HasKey(e => e.Grnid).HasName("PK__GoodsRec__BC0E8C42A91DC028");

            entity.HasIndex(e => e.Grncode, "UQ__GoodsRec__F1E8DDCBDEF4A146").IsUnique();

            entity.Property(e => e.Grnid).HasColumnName("GRNId");
            entity.Property(e => e.Grncode)
                .HasMaxLength(50)
                .HasColumnName("GRNCode");
            entity.Property(e => e.Note).HasMaxLength(1000);
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
            entity.HasKey(e => e.GrnlineId).HasName("PK__GoodsRec__433F1E90EA8F2C1C");

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

            entity.HasOne(d => d.Uom).WithMany(p => p.GoodsReceiptNoteLines)
                .HasForeignKey(d => d.UomId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GRNL_Uom");
        });

        modelBuilder.Entity<InventoryAdjustmentLine>(entity =>
        {
            entity.HasKey(e => e.AdjustmentLineId).HasName("PK__Inventor__A70FA5C1D9BBA543");

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
            entity.HasKey(e => e.AdjustmentId).HasName("PK__Inventor__E60DB893E7B97EB7");

            entity.HasIndex(e => e.AdjustmentCode, "UQ__Inventor__292CC6CF4104DE62").IsUnique();

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
            entity.HasKey(e => e.InventoryId).HasName("PK__Inventor__F5FDE6B396F64581");

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
            entity.HasKey(e => e.InventoryTxnId).HasName("PK__Inventor__F692919B4AD1DB91");

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
            entity.HasKey(e => e.InventoryTxnLineId).HasName("PK__Inventor__EE94D3FAA293F4EA");

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
            entity.HasKey(e => e.ItemId).HasName("PK__Items__727E838BE5AA9E83");

            entity.HasIndex(e => e.ItemCode, "UQ__Items__3ECC0FEA979F2830").IsUnique();

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Description).HasMaxLength(1000);
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
            entity.HasKey(e => e.CategoryId).HasName("PK__ItemCate__19093A0BAEF769D6");

            entity.HasIndex(e => e.CategoryCode, "UQ__ItemCate__371BA95523330360").IsUnique();

            entity.Property(e => e.CategoryCode).HasMaxLength(50);
            entity.Property(e => e.CategoryName).HasMaxLength(200);
            entity.Property(e => e.IsActive).HasDefaultValue(true);

            entity.HasOne(d => d.Parent).WithMany(p => p.InverseParent)
                .HasForeignKey(d => d.ParentId)
                .HasConstraintName("FK_ItemCategories_Parent");
        });

        modelBuilder.Entity<ItemParameter>(entity =>
        {
            entity.HasKey(e => e.ParamId).HasName("PK__ItemPara__C132B124972FADD7");

            entity.HasIndex(e => e.ParamCode, "UQ__ItemPara__2232AFCBF8DB83C0").IsUnique();

            entity.Property(e => e.DataType)
                .HasMaxLength(30)
                .HasDefaultValue("TEXT");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.ParamCode).HasMaxLength(50);
            entity.Property(e => e.ParamName).HasMaxLength(200);
        });

        modelBuilder.Entity<ItemParameterValue>(entity =>
        {
            entity.HasKey(e => e.ItemParamValueId).HasName("PK__ItemPara__B90EB55F52E77C7C");

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
            entity.HasKey(e => e.ItemPriceId).HasName("PK__ItemPric__7E70A2622453E736");

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
            entity.HasKey(e => e.ItemWarehousePolicyId).HasName("PK__ItemWare__6813183E9BED1A53");

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
            entity.HasKey(e => e.NotificationId).HasName("PK__Notifica__20CF2E12DDC876A0");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Message).HasMaxLength(1000);
            entity.Property(e => e.RefType).HasMaxLength(20);
            entity.Property(e => e.Title).HasMaxLength(200);

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Noti_User");
        });

        modelBuilder.Entity<PackagingSpec>(entity =>
        {
            entity.HasKey(e => e.PackagingSpecId).HasName("PK__Packagin__DAD5791C2DA5A544");

            entity.HasIndex(e => e.SpecCode, "UQ__Packagin__BB4FDCAD14DD25FA").IsUnique();

            entity.Property(e => e.Description).HasMaxLength(400);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.SpecCode).HasMaxLength(50);
            entity.Property(e => e.SpecName).HasMaxLength(200);
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(e => e.TokenId).HasName("PK__Password__658FEEEA3038F5BB");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.TokenHash).HasMaxLength(256);

            entity.HasOne(d => d.User).WithMany(p => p.PasswordResetTokens)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PRT_User");
        });

        modelBuilder.Entity<PurchaseOrder>(entity =>
        {
            entity.HasKey(e => e.PurchaseOrderId).HasName("PK__Purchase__036BACA48DABB804");

            entity.HasIndex(e => e.Pocode, "UQ__Purchase__40ACF5B8056712AC").IsUnique();

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Justification).HasMaxLength(1000);
            entity.Property(e => e.Pocode)
                .HasMaxLength(50)
                .HasColumnName("POCode");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("DRAFT");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.RequestedByNavigation).WithMany(p => p.PurchaseOrders)
                .HasForeignKey(d => d.RequestedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PR_RequestedBy");

            entity.HasOne(d => d.Supplier).WithMany(p => p.PurchaseOrders)
                .HasForeignKey(d => d.SupplierId)
                .HasConstraintName("FK_PR_Supplier");
        });

        modelBuilder.Entity<PurchaseOrderLine>(entity =>
        {
            entity.HasKey(e => e.PurchaseOrderLineId).HasName("PK__Purchase__2100B0383C38240F");

            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.OrderedQty).HasColumnType("decimal(18, 3)");

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

        modelBuilder.Entity<Receiver>(entity =>
        {
            entity.HasKey(e => e.ReceiverId).HasName("PK__Receiver__FEBB5F279971FD78");

            entity.HasIndex(e => e.ReceiverCode, "UQ__Receiver__A918ECE987600EE4").IsUnique();

            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.Phone).HasMaxLength(30);
            entity.Property(e => e.ReceiverCode).HasMaxLength(50);
            entity.Property(e => e.ReceiverName).HasMaxLength(300);
        });

        modelBuilder.Entity<ReleaseRequest>(entity =>
        {
            entity.HasKey(e => e.ReleaseRequestId).HasName("PK__ReleaseR__2901DDA4001192C7");

            entity.HasIndex(e => e.ReleaseRequestCode, "UQ__ReleaseR__380806C5C07DE9FE").IsUnique();

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
            entity.HasKey(e => e.ReleaseRequestLineId).HasName("PK__ReleaseR__B16BBFF56A1B0D93");

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
            entity.HasKey(e => e.RoleId).HasName("PK__Roles__8AFACE1AF5D39ADB");

            entity.HasIndex(e => e.RoleCode, "UQ__Roles__D62CB59C6A493627").IsUnique();

            entity.Property(e => e.RoleCode).HasMaxLength(50);
            entity.Property(e => e.RoleName).HasMaxLength(100);
        });

        modelBuilder.Entity<StocktakeLine>(entity =>
        {
            entity.HasKey(e => e.StocktakeLineId).HasName("PK__Stocktak__CE77AE368970B9EB");

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
            entity.HasKey(e => e.StocktakeId).HasName("PK__Stocktak__5874C465BD3A25EA");

            entity.HasIndex(e => e.StocktakeCode, "UQ__Stocktak__66FC5709A4BFCC8C").IsUnique();

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
            entity.HasKey(e => e.SupplierId).HasName("PK__Supplier__4BE666B4F881FE56");

            entity.HasIndex(e => e.SupplierCode, "UQ__Supplier__44BE981B63680F00").IsUnique();

            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Phone).HasMaxLength(30);
            entity.Property(e => e.SupplierCode).HasMaxLength(50);
            entity.Property(e => e.SupplierName).HasMaxLength(300);
            entity.Property(e => e.TaxCode).HasMaxLength(50);
        });

        modelBuilder.Entity<UnitOfMeasure>(entity =>
        {
            entity.HasKey(e => e.UomId).HasName("PK__UnitOfMe__F6F8D47EEA64CAAE");

            entity.ToTable("UnitOfMeasure");

            entity.HasIndex(e => e.UomCode, "UQ__UnitOfMe__562A6DA754987779").IsUnique();

            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.UomCode).HasMaxLength(50);
            entity.Property(e => e.UomName).HasMaxLength(100);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__Users__1788CC4C54EF0410");

            entity.HasIndex(e => e.Username, "UQ__Users__536C85E4E944BA2B").IsUnique();

            entity.HasIndex(e => e.Email, "UQ__Users__A9D10534AD87C14D").IsUnique();

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.FullName).HasMaxLength(200);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.PasswordHash).HasMaxLength(256);
            entity.Property(e => e.PasswordSalt).HasMaxLength(128);
            entity.Property(e => e.Phone).HasMaxLength(30);
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Username).HasMaxLength(100);
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(e => e.UserRoleId).HasName("PK__UserRole__3D978A3599327F2C");

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
            entity.HasKey(e => e.WarehouseId).HasName("PK__Warehous__2608AFF99EE9D1B5");

            entity.HasIndex(e => e.WarehouseCode, "UQ__Warehous__1686A056243D1650").IsUnique();

            entity.Property(e => e.Address).HasMaxLength(400);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.WarehouseCode).HasMaxLength(50);
            entity.Property(e => e.WarehouseName).HasMaxLength(200);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
