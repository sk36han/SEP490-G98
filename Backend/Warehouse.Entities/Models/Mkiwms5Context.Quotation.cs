using Microsoft.EntityFrameworkCore;

namespace Warehouse.Entities.Models;

public partial class Mkiwms5Context
{
    public virtual DbSet<ReleaseRequestEmailLog> ReleaseRequestEmailLogs { get; set; }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ReleaseRequest>(entity =>
        {
            entity.Property(e => e.IsQuotationFlow).HasDefaultValue(false);
            entity.Property(e => e.QuotationStatus).HasMaxLength(20);
            entity.Property(e => e.QuotationVersion).HasDefaultValue(1);
        });

        modelBuilder.Entity<ReleaseRequestEmailLog>(entity =>
        {
            entity.HasKey(e => e.ReleaseRequestEmailLogId);
            entity.Property(e => e.ToEmails).HasMaxLength(2000);
            entity.Property(e => e.CcEmails).HasMaxLength(2000);
            entity.Property(e => e.BccEmails).HasMaxLength(2000);
            entity.Property(e => e.Subject).HasMaxLength(500);
            entity.Property(e => e.Status).HasMaxLength(20);
            entity.Property(e => e.ErrorMessage).HasMaxLength(2000);
            entity.Property(e => e.SentAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.ReleaseRequest).WithMany(p => p.ReleaseRequestEmailLogs)
                .HasForeignKey(d => d.ReleaseRequestId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.SenderUser).WithMany(p => p.ReleaseRequestEmailLogs)
                .HasForeignKey(d => d.SenderUserId)
                .OnDelete(DeleteBehavior.ClientSetNull);
        });
    }
}
