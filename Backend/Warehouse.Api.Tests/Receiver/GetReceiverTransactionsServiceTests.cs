using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelResponse;
using ReceiverEntity = Warehouse.Entities.Models.Receiver;
using WarehouseEntity = Warehouse.Entities.Models.Warehouse;
using Warehouse.DataAcces.Service.Interface;

namespace WarehouseTests.ReceiverServiceTests;

public class GetReceiverTransactionsServiceTests : IDisposable
{
    private readonly Mock<IGenericRepository<ReceiverEntity>> _repoMock = new();
    private readonly Mkiwms5Context _context;
    private readonly Mock<IAuditLogService> _mockAuditLogService = new();

    public GetReceiverTransactionsServiceTests()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new Mkiwms5Context(options);
        SeedDatabase();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    private ReceiverService CreateService() => new(_repoMock.Object, _context, _mockAuditLogService.Object);

    // ─── Seed Data ──────────────────────────────────────────────
    private void SeedDatabase()
    {
        // Users
        var user1 = new User
        {
            UserId = 1,
            Email = "admin@test.com",
            FullName = "Admin User",
            IsActive = true,
            PasswordHash = "hash",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user1);

        // Warehouses
        var wh1 = new WarehouseEntity
        {
            WarehouseId = 1,
            WarehouseCode = "WH01",
            WarehouseName = "Main Warehouse",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _context.Warehouses.Add(wh1);

        // Receivers
        var receiver1 = new ReceiverEntity
        {
            ReceiverId = 1,
            ReceiverCode = "RCV001",
            ReceiverName = "Alpha Corp",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        var receiver2 = new ReceiverEntity
        {
            ReceiverId = 2,
            ReceiverCode = "RCV002",
            ReceiverName = "Beta LLC",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _context.Receivers.AddRange(receiver1, receiver2);

        // Release Requests for receiver1
        var rr1 = new ReleaseRequest
        {
            ReleaseRequestId = 1,
            ReleaseRequestCode = "RR-0001",
            RequestedBy = 1,
            ReceiverId = 1,
            WarehouseId = 1,
            RequestedDate = new DateOnly(2026, 3, 1),
            Purpose = "Production",
            Status = "APPROVED",
            CreatedAt = new DateTime(2026, 3, 1, 10, 0, 0),
            LifecycleStatus = "IssuePending"
        };
        var rr2 = new ReleaseRequest
        {
            ReleaseRequestId = 2,
            ReleaseRequestCode = "RR-0002",
            RequestedBy = 1,
            ReceiverId = 1,
            WarehouseId = 1,
            RequestedDate = new DateOnly(2026, 3, 15),
            Purpose = "Maintenance",
            Status = "DRAFT",
            CreatedAt = new DateTime(2026, 3, 15, 10, 0, 0),
            LifecycleStatus = "IssuePending"
        };
        _context.ReleaseRequests.AddRange(rr1, rr2);

        // Release Request Lines
        _context.ReleaseRequestLines.AddRange(
            new ReleaseRequestLine { ReleaseRequestLineId = 1, ReleaseRequestId = 1, ItemId = 1, RequestedQty = 10, UomId = 1, LineStatus = "Open" },
            new ReleaseRequestLine { ReleaseRequestLineId = 2, ReleaseRequestId = 1, ItemId = 1, RequestedQty = 20, UomId = 1, LineStatus = "Open" },
            new ReleaseRequestLine { ReleaseRequestLineId = 3, ReleaseRequestId = 2, ItemId = 1, RequestedQty = 5, UomId = 1, LineStatus = "Open" }
        );

        // GDN for receiver1 (via RR1)
        var gdn1 = new GoodsDeliveryNote
        {
            Gdnid = 1,
            Gdncode = "GDN-0001",
            ReleaseRequestId = 1,
            WarehouseId = 1,
            IssueDate = new DateOnly(2026, 3, 5),
            CreatedBy = 1,
            Status = "POSTED",
            SubmittedAt = new DateTime(2026, 3, 5, 12, 0, 0)
        };
        _context.GoodsDeliveryNotes.Add(gdn1);

        // GDN Lines
        _context.GoodsDeliveryNoteLines.AddRange(
            new GoodsDeliveryNoteLine { GdnlineId = 1, Gdnid = 1, ItemId = 1, ActualQty = 8, UomId = 1 },
            new GoodsDeliveryNoteLine { GdnlineId = 2, Gdnid = 1, ItemId = 1, ActualQty = 15, UomId = 1 }
        );

        _context.SaveChanges();
    }

    // ═══════════════════════════════════════════════════════════
    // 1. Detail mode - RR
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetTransactions_DetailModeRR_ShouldReturnDetail()
    {
        var result = await CreateService().GetReceiverTransactionsAsync(
            1, 1, 20, null, null, null, null, "RR", 1);

        result.Detail.Should().NotBeNull();
        result.Summary.Should().BeNull();
        result.History.Should().BeNull();
    }

    // ═══════════════════════════════════════════════════════════
    // 2. Detail mode - GDN
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetTransactions_DetailModeGDN_ShouldReturnDetail()
    {
        var result = await CreateService().GetReceiverTransactionsAsync(
            1, 1, 20, null, null, null, null, "GDN", 1);

        result.Detail.Should().NotBeNull();
        result.Summary.Should().BeNull();
        result.History.Should().BeNull();
    }

    // ═══════════════════════════════════════════════════════════
    // 3. Detail = null khi document không tồn tại
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetTransactions_DetailModeNonExistingDoc_ShouldReturnNullDetail()
    {
        var result = await CreateService().GetReceiverTransactionsAsync(
            1, 1, 20, null, null, null, null, "RR", 9999);

        result.Detail.Should().BeNull();
    }

    // ═══════════════════════════════════════════════════════════
    // 4. Summary trả đúng thống kê
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetTransactions_Summary_ShouldReturnCorrectStats()
    {
        var result = await CreateService().GetReceiverTransactionsAsync(
            1, 1, 20, null, null, null, null, null, null);

        result.Summary.Should().NotBeNull();
        result.Summary!.TotalReleaseRequests.Should().Be(2);
        result.Summary.TotalGoodsDeliveryNotes.Should().Be(1);
        result.Summary.TotalQuantityRequested.Should().Be(35); // 10 + 20 + 5
        result.Summary.TotalQuantityDelivered.Should().Be(23); // 8 + 15
    }

    // ═══════════════════════════════════════════════════════════
    // 5. History trả danh sách giao dịch (RR + GDN)
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetTransactions_History_ShouldReturnMergedList()
    {
        var result = await CreateService().GetReceiverTransactionsAsync(
            1, 1, 20, null, null, null, null, null, null);

        result.History.Should().NotBeNull();
        result.History!.Items.Should().HaveCount(3); // 2 RR + 1 GDN
        result.History.TotalItems.Should().Be(3);
    }

    // ═══════════════════════════════════════════════════════════
    // 6. History lọc theo transactionType = RR
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetTransactions_FilterByTypeRR_ShouldReturnOnlyRR()
    {
        var result = await CreateService().GetReceiverTransactionsAsync(
            1, 1, 20, "RR", null, null, null, null, null);

        result.History!.Items.Should().OnlyContain(x => x.TransactionType == "RR");
        result.History.Items.Should().HaveCount(2);
    }

    // ═══════════════════════════════════════════════════════════
    // 7. History lọc theo status = APPROVED
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetTransactions_FilterByStatus_ShouldReturnApprovedOnly()
    {
        var result = await CreateService().GetReceiverTransactionsAsync(
            1, 1, 20, null, "APPROVED", null, null, null, null);

        // RR1 is APPROVED, RR2 is DRAFT. GDN query also filters by APPROVED → 0 because GDN1 is POSTED
        result.History!.Items.Should().OnlyContain(x => x.Status == "APPROVED");
    }

    // ═══════════════════════════════════════════════════════════
    // 8. History lọc theo fromDate/toDate
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetTransactions_FilterByDateRange_ShouldReturnInRange()
    {
        var fromDate = new DateTime(2026, 3, 1);
        var toDate = new DateTime(2026, 3, 5);

        var result = await CreateService().GetReceiverTransactionsAsync(
            1, 1, 20, null, null, fromDate, toDate, null, null);

        // RR1 date: 2026-3-1, RR2 date: 2026-3-15, GDN1 date: 2026-3-5
        result.History!.Items.Should().OnlyContain(x => x.TransactionDate >= fromDate && x.TransactionDate <= toDate);
    }

    // ═══════════════════════════════════════════════════════════
    // 9. Phân trang History đúng
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetTransactions_Paging_ShouldReturnCorrectPage()
    {
        var result = await CreateService().GetReceiverTransactionsAsync(
            1, 1, 2, null, null, null, null, null, null);

        result.History!.Page.Should().Be(1);
        result.History.PageSize.Should().Be(2);
        result.History.TotalItems.Should().Be(3);
        result.History.Items.Should().HaveCount(2);

        // Page 2
        var result2 = await CreateService().GetReceiverTransactionsAsync(
            1, 2, 2, null, null, null, null, null, null);

        result2.History!.Items.Should().HaveCount(1);
    }

    // ═══════════════════════════════════════════════════════════
    // 10. Page <= 0 → mặc định page = 1
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetTransactions_PageZero_ShouldDefaultToOne()
    {
        var result = await CreateService().GetReceiverTransactionsAsync(
            1, 0, 20, null, null, null, null, null, null);

        result.History!.Page.Should().Be(1);
        result.History.Items.Should().HaveCount(3);
    }
}
