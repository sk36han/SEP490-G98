using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelResponse;
using SupplierEntity = Warehouse.Entities.Models.Supplier;

namespace WarehouseTests.Supplier;

public class SupplierListServiceTests
{
    private readonly Mock<IGenericRepository<SupplierEntity>> _repoMock = new();
    private readonly Mock<INotificationService> _notifMock = new();
    private readonly Mock<IAuditLogService> _auditMock = new();

    private SupplierService CreateService() => new(
        _repoMock.Object, 
        _notifMock.Object, 
        _auditMock.Object,
        null!); // context is null for repository-only tests

    private void SetupGetAll(params SupplierEntity[] suppliers)
    {
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(suppliers.AsEnumerable());
    }

    [Fact]
    public async Task GetSuppliers_NoFilters_ShouldReturnAllSortedByName()
    {
        // Arrange
        SetupGetAll(
            new SupplierEntity { SupplierCode = "S3", SupplierName = "Charlie" },
            new SupplierEntity { SupplierCode = "S1", SupplierName = "Alpha" },
            new SupplierEntity { SupplierCode = "S2", SupplierName = "Bravo" }
        );

        // Act
        var result = await CreateService().GetSuppliersAsync(1, 10, null, null, null, null, null, null);

        // Assert
        result.Items.Should().HaveCount(3);
        result.Items.Select(x => x.SupplierName).Should().ContainInOrder("Alpha", "Bravo", "Charlie");
        result.TotalItems.Should().Be(3);
    }

    [Fact]
    public async Task GetSuppliers_FilterByCode_ShouldPerformPartialMatch()
    {
        // Arrange
        SetupGetAll(
            new SupplierEntity { SupplierCode = "S001", SupplierName = "A" },
            new SupplierEntity { SupplierCode = "X001", SupplierName = "B" }
        );

        // Act
        var result = await CreateService().GetSuppliersAsync(1, 10, "S0", null, null, null, null, null);

        // Assert
        result.Items.Should().HaveCount(1);
        result.Items[0].SupplierCode.Should().Be("S001");
    }

    [Fact]
    public async Task GetSuppliers_FilterByName_CaseInsensitive_ShouldWork()
    {
        // Arrange
        SetupGetAll(
            new SupplierEntity { SupplierCode = "S1", SupplierName = "Apple Corp" },
            new SupplierEntity { SupplierCode = "S2", SupplierName = "Banana Inc" }
        );

        // Act
        var result = await CreateService().GetSuppliersAsync(1, 10, null, "apple", null, null, null, null);

        // Assert
        result.Items.Should().ContainSingle(s => s.SupplierName == "Apple Corp");
    }

    [Fact]
    public async Task GetSuppliers_FilterByTaxCode_ShouldPerformPartialMatch()
    {
        // Arrange
        SetupGetAll(
            new SupplierEntity { SupplierCode = "S1", TaxCode = "TAX12345", SupplierName = "A" },
            new SupplierEntity { SupplierCode = "S2", TaxCode = "9999", SupplierName = "B" }
        );

        // Act
        var result = await CreateService().GetSuppliersAsync(1, 20, null, null, "123", null, null, null);

        // Assert
        result.Items.Should().HaveCount(1);
        result.Items[0].TaxCode.Should().Be("TAX12345");
    }

    [Fact]
    public async Task GetSuppliers_FilterByActiveStatus_ShouldFilterCorrectly()
    {
        SetupGetAll(
            new SupplierEntity { SupplierCode = "S1", IsActive = true, SupplierName = "A" },
            new SupplierEntity { SupplierCode = "S2", IsActive = false, SupplierName = "B" }
        );

        var result = await CreateService().GetSuppliersAsync(1, 20, null, null, null, true, null, null);

        result.Items.Should().OnlyContain(x => x.IsActive);
        result.Items.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetSuppliers_FilterByDateRange_ShouldReturnWithinRange()
    {
        var now = DateTime.UtcNow;
        SetupGetAll(
            new SupplierEntity { SupplierCode = "OLD", CreatedAt = now.AddMonths(-1), SupplierName = "A" },
            new SupplierEntity { SupplierCode = "NEW", CreatedAt = now, SupplierName = "B" }
        );

        var fromDate = now.AddDays(-1);
        var result = await CreateService().GetSuppliersAsync(1, 20, null, null, null, null, fromDate, null);

        result.Items.Should().HaveCount(1);
        result.Items[0].SupplierCode.Should().Be("NEW");
    }

    [Fact]
    public async Task GetSuppliers_Pagination_ShouldReturnSubsetAndCorrectTotal()
    {
        var data = Enumerable.Range(1, 15).Select(i => new SupplierEntity 
        { 
            SupplierId = i, 
            SupplierCode = $"S{i:00}", 
            SupplierName = $"Name {i:00}" 
        }).ToArray();
        SetupGetAll(data);

        var result = await CreateService().GetSuppliersAsync(2, 5, null, null, null, null, null, null);

        result.Items.Should().HaveCount(5);
        result.Page.Should().Be(2);
        result.PageSize.Should().Be(5);
        result.TotalItems.Should().Be(15);
    }

    [Fact]
    public async Task GetSuppliers_PageSizeLimit_ShouldCapAt100()
    {
        SetupGetAll();
        var result = await CreateService().GetSuppliersAsync(1, 500, null, null, null, null, null, null);

        result.PageSize.Should().Be(100);
    }

    [Fact]
    public async Task GetSuppliers_InvalidPage_ShouldDefaultToOne()
    {
        SetupGetAll();
        var result = await CreateService().GetSuppliersAsync(0, 20, null, null, null, null, null, null);

        result.Page.Should().Be(1);
    }

    [Fact]
    public async Task GetSuppliers_SearchFiltersWithSpaces_ShouldReturnEmpty_IfNotTrimmed()
    {
        // Hiện tại service chưa Trim() dữ liệu đầu vào, nên nếu truyền space sẽ không tìm thấy
        SetupGetAll(new SupplierEntity { SupplierCode = "SUP01", SupplierName = "Apple Corp" });

        var result = await CreateService().GetSuppliersAsync(1, 20, "SUP01", "  apple  ", null, null, null, null);

        result.Items.Should().BeEmpty();
    }
}
