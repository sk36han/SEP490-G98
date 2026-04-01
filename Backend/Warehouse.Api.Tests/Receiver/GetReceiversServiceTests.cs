using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.Entities.Models;
using ReceiverEntity = Warehouse.Entities.Models.Receiver;
using Warehouse.DataAcces.Service.Interface;

namespace WarehouseTests.Receiver;

public class GetReceiversServiceTests
{
    private readonly Mock<IGenericRepository<ReceiverEntity>> _repoMock = new();
    private readonly Mock<Mkiwms5Context> _contextMock = new();
	private readonly Mock<IAuditLogService> _mockAuditLogService = new();

	private ReceiverService CreateService() => new(_repoMock.Object, _contextMock.Object, _mockAuditLogService.Object);

    private List<ReceiverEntity> GetMockData() => new()
    {
        new ReceiverEntity { ReceiverId = 1, ReceiverCode = "RCV01", ReceiverName = "An Nguyen", IsActive = true, CreatedAt = new DateTime(2026, 1, 1) },
        new ReceiverEntity { ReceiverId = 2, ReceiverCode = "RCV02", ReceiverName = "Binh Le", IsActive = false, CreatedAt = new DateTime(2026, 2, 1) },
        new ReceiverEntity { ReceiverId = 3, ReceiverCode = "PRO01", ReceiverName = "Cuong Tran", IsActive = true, CreatedAt = new DateTime(2026, 3, 1) }
    };

    [Fact]
    public async Task GetReceivers_NoFilter_ShouldReturnAllSortedByName()
    {
        // Arrange
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(GetMockData());

        // Act
        var result = await CreateService().GetReceiversAsync(1, 10, null, null, null, null, null);

        // Assert
        result.TotalItems.Should().Be(3);
        result.Items.First().ReceiverName.Should().Be("An Nguyen"); // Sorting by Name
        result.Items.Last().ReceiverName.Should().Be("Cuong Tran");
    }

    [Fact]
    public async Task GetReceivers_SearchByCode_ShouldReturnFiltered()
    {
        // Arrange
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(GetMockData());

        // Act
        var result = await CreateService().GetReceiversAsync(1, 10, "PRO", null, null, null, null);

        // Assert
        result.TotalItems.Should().Be(1);
        result.Items.Should().ContainSingle(r => r.ReceiverCode == "PRO01");
    }

    [Fact]
    public async Task GetReceivers_SearchByName_ShouldReturnFiltered()
    {
        // Arrange
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(GetMockData());

        // Act
        var result = await CreateService().GetReceiversAsync(1, 10, null, "Binh", null, null, null);

        // Assert
        result.TotalItems.Should().Be(1);
        result.Items.Should().ContainSingle(r => r.ReceiverName == "Binh Le");
    }

    [Fact]
    public async Task GetReceivers_FilterByStatus_ShouldReturnOnlyActive()
    {
        // Arrange
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(GetMockData());

        // Act
        var result = await CreateService().GetReceiversAsync(1, 10, null, null, true, null, null);

        // Assert
        result.TotalItems.Should().Be(2);
        result.Items.All(i => i.IsActive).Should().BeTrue();
    }

    [Fact]
    public async Task GetReceivers_FilterByDateRange_ShouldReturnCorrectItems()
    {
        // Arrange
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(GetMockData());
        var from = new DateTime(2026, 1, 15);
        var to = new DateTime(2026, 2, 15);

        // Act
        var result = await CreateService().GetReceiversAsync(1, 10, null, null, null, from, to);

        // Assert
        result.TotalItems.Should().Be(1);
        result.Items.Should().ContainSingle(i => i.ReceiverName == "Binh Le");
    }

    [Fact]
    public async Task GetReceivers_Pagination_ShouldReturnCorrectPage()
    {
        // Arrange
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(GetMockData());

        // Act
        var result = await CreateService().GetReceiversAsync(2, 1, null, null, null, null, null);

        // Assert
        result.Items.Should().HaveCount(1);
        result.TotalItems.Should().Be(3);
        result.Page.Should().Be(2);
        result.Items.First().ReceiverName.Should().Be("Binh Le"); // 2nd item in sorted list
    }

    [Fact]
    public async Task GetReceivers_InvalidPagingValues_ShouldUseDefaults()
    {
        // Arrange
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(GetMockData());

        // Act
        var result = await CreateService().GetReceiversAsync(0, 0, null, null, null, null, null);

        // Assert
        result.Page.Should().Be(1);
        result.PageSize.Should().Be(20);
    }
}
