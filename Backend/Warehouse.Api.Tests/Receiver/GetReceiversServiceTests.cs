using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelResponse;
using ReceiverEntity = Warehouse.Entities.Models.Receiver;
using Warehouse.DataAcces.Service.Interface;

namespace WarehouseTests.ReceiverServiceTests;

public class GetReceiversServiceTests
{
    private readonly Mock<IGenericRepository<ReceiverEntity>> _repoMock = new();
    private readonly Mock<Mkiwms5Context> _contextMock = new();
	private readonly Mock<IAuditLogService> _mockAuditLogService = new();

	private ReceiverService CreateService() => new(_repoMock.Object, _contextMock.Object, _mockAuditLogService.Object);

    // ─── Helpers ────────────────────────────────────────────────
    private List<ReceiverEntity> SeedReceivers() => new()
    {
        new() { ReceiverId = 1, ReceiverCode = "RCV001", ReceiverName = "Alpha Corp",  IsActive = true,  CreatedAt = new DateTime(2026, 1, 15) },
        new() { ReceiverId = 2, ReceiverCode = "RCV002", ReceiverName = "Beta LLC",    IsActive = true,  CreatedAt = new DateTime(2026, 2, 20) },
        new() { ReceiverId = 3, ReceiverCode = "RCV003", ReceiverName = "Gamma Inc",   IsActive = false, CreatedAt = new DateTime(2026, 3, 10) },
        new() { ReceiverId = 4, ReceiverCode = "RCV004", ReceiverName = "Delta Co",    IsActive = true,  CreatedAt = new DateTime(2026, 4, 5) },
        new() { ReceiverId = 5, ReceiverCode = "RCV005", ReceiverName = "Alpha Beta",  IsActive = false, CreatedAt = new DateTime(2026, 5, 1) },
    };

    private void SetupGetAll(IEnumerable<ReceiverEntity>? data = null)
    {
        _repoMock.Setup(r => r.GetAllAsync())
            .ReturnsAsync(data ?? SeedReceivers());
    }

    // ═══════════════════════════════════════════════════════════
    // 1. Trả về danh sách có dữ liệu (happy path)
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetReceivers_WithData_ShouldReturnPagedResult()
    {
        SetupGetAll();

        var result = await CreateService().GetReceiversAsync(1, 20, null, null, null, null, null);

        result.Page.Should().Be(1);
        result.PageSize.Should().Be(20);
        result.TotalItems.Should().Be(5);
        result.Items.Should().HaveCount(5);
    }

    // ═══════════════════════════════════════════════════════════
    // 2. Danh sách rỗng
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetReceivers_EmptyData_ShouldReturnEmptyItems()
    {
        SetupGetAll(new List<ReceiverEntity>());

        var result = await CreateService().GetReceiversAsync(1, 20, null, null, null, null, null);

        result.TotalItems.Should().Be(0);
        result.Items.Should().BeEmpty();
    }

    // ═══════════════════════════════════════════════════════════
    // 3. Lọc theo receiverCode
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetReceivers_FilterByCode_ShouldReturnMatching()
    {
        SetupGetAll();

        var result = await CreateService().GetReceiversAsync(1, 20, "RCV001", null, null, null, null);

        result.TotalItems.Should().Be(1);
        result.Items.Should().ContainSingle(x => x.ReceiverCode == "RCV001");
    }

    // ═══════════════════════════════════════════════════════════
    // 4. Lọc theo receiverName (partial match)
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetReceivers_FilterByName_ShouldReturnPartialMatch()
    {
        SetupGetAll();

        var result = await CreateService().GetReceiversAsync(1, 20, null, "Alpha", null, null, null);

        result.TotalItems.Should().Be(2);
        result.Items.Should().OnlyContain(x => x.ReceiverName.Contains("Alpha"));
    }

    // ═══════════════════════════════════════════════════════════
    // 5. Lọc theo isActive = true
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetReceivers_FilterByActiveTrue_ShouldReturnActiveOnly()
    {
        SetupGetAll();

        var result = await CreateService().GetReceiversAsync(1, 20, null, null, true, null, null);

        result.TotalItems.Should().Be(3);
        result.Items.Should().OnlyContain(x => x.IsActive);
    }

    // ═══════════════════════════════════════════════════════════
    // 6. Lọc theo isActive = false
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetReceivers_FilterByActiveFalse_ShouldReturnInactiveOnly()
    {
        SetupGetAll();

        var result = await CreateService().GetReceiversAsync(1, 20, null, null, false, null, null);

        result.TotalItems.Should().Be(2);
        result.Items.Should().OnlyContain(x => !x.IsActive);
    }

    // ═══════════════════════════════════════════════════════════
    // 7. Lọc theo fromDate
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetReceivers_FilterByFromDate_ShouldReturnAfterDate()
    {
        SetupGetAll();

        var fromDate = new DateTime(2026, 3, 1);
        var result = await CreateService().GetReceiversAsync(1, 20, null, null, null, fromDate, null);

        result.Items.Should().OnlyContain(x => x.ReceiverCode == "RCV003" || x.ReceiverCode == "RCV004" || x.ReceiverCode == "RCV005");
    }

    // ═══════════════════════════════════════════════════════════
    // 8. Lọc theo toDate
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetReceivers_FilterByToDate_ShouldReturnBeforeDate()
    {
        SetupGetAll();

        var toDate = new DateTime(2026, 2, 28);
        var result = await CreateService().GetReceiversAsync(1, 20, null, null, null, null, toDate);

        result.TotalItems.Should().Be(2);
    }

    // ═══════════════════════════════════════════════════════════
    // 9. Lọc kết hợp nhiều điều kiện
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetReceivers_CombinedFilters_ShouldApplyAll()
    {
        SetupGetAll();

        var result = await CreateService().GetReceiversAsync(
            1, 20, null, "Alpha", true, new DateTime(2026, 1, 1), new DateTime(2026, 2, 1));

        result.TotalItems.Should().Be(1);
        result.Items.First().ReceiverName.Should().Be("Alpha Corp");
    }

    // ═══════════════════════════════════════════════════════════
    // 10. Page <= 0 → mặc định page = 1
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetReceivers_PageZeroOrNegative_ShouldDefaultToPageOne()
    {
        SetupGetAll();

        var result = await CreateService().GetReceiversAsync(0, 20, null, null, null, null, null);

        result.Page.Should().Be(1);
        result.Items.Should().HaveCount(5);
    }

    // ═══════════════════════════════════════════════════════════
    // 11. PageSize <= 0 → mặc định pageSize = 20
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetReceivers_PageSizeZeroOrNegative_ShouldDefaultToTwenty()
    {
        SetupGetAll();

        var result = await CreateService().GetReceiversAsync(1, -5, null, null, null, null, null);

        result.PageSize.Should().Be(20);
    }

    // ═══════════════════════════════════════════════════════════
    // 12. Tìm kiếm với receiverCode = space "   " → bỏ qua filter
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetReceivers_SearchCodeWithOnlySpaces_ShouldIgnoreCodeFilter()
    {
        SetupGetAll();

        var result = await CreateService().GetReceiversAsync(1, 20, "   ", null, null, null, null);

        // string.IsNullOrWhiteSpace("   ") = true → filter bị bỏ qua → trả về tất cả
        result.TotalItems.Should().Be(5);
    }

    // ═══════════════════════════════════════════════════════════
    // 13. Tìm kiếm với receiverName = "," → không tìm thấy
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetReceivers_SearchNameWithComma_ShouldReturnNoMatch()
    {
        SetupGetAll();

        var result = await CreateService().GetReceiversAsync(1, 20, null, ",", null, null, null);

        result.TotalItems.Should().Be(0);
        result.Items.Should().BeEmpty();
    }

    // ═══════════════════════════════════════════════════════════
    // 14. Phân trang chính xác (skip/take)
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetReceivers_Paging_ShouldReturnCorrectPage()
    {
        SetupGetAll();

        // Page 1 with pageSize 2 → lấy 2 records đầu (sorted by Name)
        var page1 = await CreateService().GetReceiversAsync(1, 2, null, null, null, null, null);

        page1.Items.Should().HaveCount(2);
        page1.TotalItems.Should().Be(5);

        // Page 2 with pageSize 2 → lấy 2 records tiếp
        var page2 = await CreateService().GetReceiversAsync(2, 2, null, null, null, null, null);

        page2.Items.Should().HaveCount(2);

        // Page 3 with pageSize 2 → lấy 1 record cuối
        var page3 = await CreateService().GetReceiversAsync(3, 2, null, null, null, null, null);

        page3.Items.Should().HaveCount(1);
    }
}
