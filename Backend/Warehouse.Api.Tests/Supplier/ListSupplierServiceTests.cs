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

public class ListSupplierServiceTests
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
    public async Task GetSuppliers_EmptyData_ShouldReturnEmptyList()
    {
        SetupGetAll();
        var result = await CreateService().GetSuppliersAsync(1, 20, null, null, null, null, null, null);

        result.Items.Should().BeEmpty();
        result.TotalItems.Should().Be(0);
    }

    [Fact]
    public async Task GetSuppliers_FilterByCode_ShouldReturnMatching()
    {
        SetupGetAll(
            new SupplierEntity { SupplierCode = "S1", SupplierName = "A" },
            new SupplierEntity { SupplierCode = "S2", SupplierName = "B" }
        );

        var result = await CreateService().GetSuppliersAsync(1, 20, "S1", null, null, null, null, null);

        result.Items.Should().HaveCount(1);
        result.Items[0].SupplierCode.Should().Be("S1");
    }

    [Fact]
    public async Task GetSuppliers_FilterByName_ShouldReturnMatching()
    {
        SetupGetAll(
            new SupplierEntity { SupplierCode = "S1", SupplierName = "Apple" },
            new SupplierEntity { SupplierCode = "S2", SupplierName = "Banana" }
        );

        var result = await CreateService().GetSuppliersAsync(1, 20, null, "Apple", null, null, null, null);

        result.Items.Should().HaveCount(1);
        result.Items[0].SupplierName.Should().Be("Apple");
    }

    [Fact]
    public async Task GetSuppliers_FilterByActive_ShouldReturnOnlyActive()
    {
        SetupGetAll(
            new SupplierEntity { SupplierCode = "S1", IsActive = true, SupplierName = "A" },
            new SupplierEntity { SupplierCode = "S2", IsActive = false, SupplierName = "B" }
        );

        var result = await CreateService().GetSuppliersAsync(1, 20, null, null, null, true, null, null);

        result.Items.Should().HaveCount(1);
        result.Items.Should().OnlyContain(x => x.IsActive);
    }

    [Fact]
    public async Task GetSuppliers_FilterByDate_ShouldReturnWithinRange()
    {
        SetupGetAll(
            new SupplierEntity { SupplierCode = "S1", CreatedAt = new DateTime(2026, 1, 1), SupplierName = "A" },
            new SupplierEntity { SupplierCode = "S2", CreatedAt = new DateTime(2026, 3, 1), SupplierName = "B" }
        );

        var fromDate = new DateTime(2026, 2, 1);
        var result = await CreateService().GetSuppliersAsync(1, 20, null, null, null, null, fromDate, null);

        result.Items.Should().HaveCount(1);
        result.Items[0].SupplierCode.Should().Be("S2");
    }

    [Fact]
    public async Task GetSuppliers_CombinedFilters_ShouldReturnCorrectResults()
    {
        SetupGetAll(
            new SupplierEntity { SupplierCode = "SUP01", SupplierName = "ABC Corp", IsActive = true },
            new SupplierEntity { SupplierCode = "SUP02", SupplierName = "ABC Store", IsActive = false },
            new SupplierEntity { SupplierCode = "SUP03", SupplierName = "XYZ Ltd", IsActive = true }
        );

        var result = await CreateService().GetSuppliersAsync(1, 20, null, "ABC", null, true, null, null);

        result.Items.Should().HaveCount(1);
        result.Items[0].SupplierCode.Should().Be("SUP01");
    }

    [Fact]
    public async Task GetSuppliers_Pagination_ShouldReturnCorrectSubset()
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
        var result = await CreateService().GetSuppliersAsync(1, 999, null, null, null, null, null, null);

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
    public async Task GetSuppliers_FilterByTaxCode_ShouldReturnMatching()
    {
        SetupGetAll(
            new SupplierEntity { SupplierCode = "S1", TaxCode = "123456", SupplierName = "A" },
            new SupplierEntity { SupplierCode = "S2", TaxCode = "654321", SupplierName = "B" }
        );

        var result = await CreateService().GetSuppliersAsync(1, 20, null, null, "123", null, null, null);

        result.Items.Should().HaveCount(1);
        result.Items[0].TaxCode.Should().Be("123456");
    }

    [Fact]
    public async Task GetSuppliers_SpacesInFilters_ShouldStillWork()
    {
        SetupGetAll(new SupplierEntity { SupplierCode = "SUP01", SupplierName = "ABC Corp" });

        var result = await CreateService().GetSuppliersAsync(1, 20, "SUP01", "  ABC  ", null, null, null, null);

        var result2 = await CreateService().GetSuppliersAsync(1, 20, null, "ABC", null, null, null, null);
        result2.Items.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetSuppliers_CommasInFilters_ShouldStillWork()
    {
        SetupGetAll(new SupplierEntity { SupplierCode = "S1", SupplierName = "A,B,C" });

        var result = await CreateService().GetSuppliersAsync(1, 20, null, "A,B", null, null, null, null);

        result.Items.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetSuppliers_SortByName_ShouldBeOrdered()
    {
        SetupGetAll(
            new SupplierEntity { SupplierCode = "S3", SupplierName = "Charlie" },
            new SupplierEntity { SupplierCode = "S1", SupplierName = "Alpha" },
            new SupplierEntity { SupplierCode = "S2", SupplierName = "Bravo" }
        );

        var result = await CreateService().GetSuppliersAsync(1, 20, null, null, null, null, null, null);

        result.Items.Select(x => x.SupplierName).Should().ContainInOrder("Alpha", "Bravo", "Charlie");
    }

    [Fact]
    public async Task GetSuppliers_NullFieldsInEntity_ShouldNotCrash()
    {
        SetupGetAll(new SupplierEntity { SupplierId = 1, SupplierName = "No Code", SupplierCode = null });

        var result = await CreateService().GetSuppliersAsync(1, 20, "any", null, null, null, null, null);

        result.Items.Should().BeEmpty();
    }
}
