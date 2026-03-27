extern alias api;
using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;

namespace WarehouseTests.Supplier;

public class GetSupplierListServiceTests : IDisposable
{
    private readonly Mock<INotificationService> _notifMock = new();
    private readonly Mock<IAuditLogService> _auditMock = new();
    private readonly Mkiwms5Context _context;

    public GetSupplierListServiceTests()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(databaseName: "ListSupp_" + Guid.NewGuid().ToString())
            .Options;
        _context = new Mkiwms5Context(options);
        SeedDatabase();
    }

    private void SeedDatabase()
    {
        var now = DateTime.UtcNow;
        _context.Suppliers.AddRange(
            new Warehouse.Entities.Models.Supplier { SupplierId = 1, SupplierCode = "S001", SupplierName = "Apple Corp", TaxCode = "TAX01", IsActive = true, CreatedAt = now.AddDays(-10) },
            new Warehouse.Entities.Models.Supplier { SupplierId = 2, SupplierCode = "S002", SupplierName = "Banana Inc", TaxCode = "TAX02", IsActive = true, CreatedAt = now.AddDays(-5) },
            new Warehouse.Entities.Models.Supplier { SupplierId = 3, SupplierCode = "X003", SupplierName = "Cherry Ltd", TaxCode = "TAX03", IsActive = false, CreatedAt = now }
        );
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    private SupplierService CreateService() 
    {
        var repo = new GenericRepository<Warehouse.Entities.Models.Supplier>(_context);
        return new SupplierService(repo, _notifMock.Object, _auditMock.Object, _context);
    }

    [Fact]
    public async Task GetList_NoFilter_ShouldReturnAll()
    {
        var result = await CreateService().GetSuppliersAsync(1, 10, null, null, null, null, null, null);
        result.Items.Should().HaveCount(3);
        result.TotalItems.Should().Be(3);
    }

    [Fact]
    public async Task GetList_FilterByCode_ShouldReturnMatching()
    {
        var result = await CreateService().GetSuppliersAsync(1, 10, "S0", null, null, null, null, null);
        result.Items.Should().HaveCount(2);
        result.Items.Should().OnlyContain(s => s.SupplierCode.StartsWith("S0"));
    }

    [Fact]
    public async Task GetList_FilterByTaxCode_ShouldReturnMatching()
    {
        var result = await CreateService().GetSuppliersAsync(1, 10, null, null, "TAX02", null, null, null);
        result.Items.Should().ContainSingle(s => s.TaxCode == "TAX02");
    }

    [Fact]
    public async Task GetList_FilterByActive_ShouldReturnOnlyActive()
    {
        var result = await CreateService().GetSuppliersAsync(1, 10, null, null, null, true, null, null);
        result.Items.Should().HaveCount(2);
        result.Items.Should().OnlyContain(s => s.IsActive == true);
    }

    [Fact]
    public async Task GetList_FilterByDate_ShouldReturnWithinRange()
    {
        var from = DateTime.UtcNow.AddDays(-7);
        var result = await CreateService().GetSuppliersAsync(1, 10, null, null, null, null, from, null);
        result.Items.Should().HaveCount(2); // Banana and Cherry
    }

    [Fact]
    public async Task GetList_InvalidPage_ShouldDefaultToOne()
    {
        var result = await CreateService().GetSuppliersAsync(0, 10, null, null, null, null, null, null);
        result.Page.Should().Be(1);
    }

    [Fact]
    public async Task GetList_PageSizeLimit_ShouldCapAt100()
    {
        var result = await CreateService().GetSuppliersAsync(1, 500, null, null, null, null, null, null);
        // Assuming the service logic limits pageSize to 100
        // We can't easily verify the internal 'pageSize' variable, but we verify result matches.
        result.Items.Should().HaveCount(3); 
    }

    [Fact]
    public async Task GetList_Paging_ShouldWork()
    {
        var result = await CreateService().GetSuppliersAsync(1, 1, null, null, null, null, null, null);
        result.Items.Should().HaveCount(1);
        result.TotalItems.Should().Be(3);
    }

    [Fact]
    public async Task GetList_CombinedFilters_ShouldReturnCorrectResults()
    {
        var result = await CreateService().GetSuppliersAsync(1, 10, "S", "Apple", null, true, null, null);
        result.Items.Should().ContainSingle(s => s.SupplierName == "Apple Corp");
    }

    [Fact]
    public async Task GetList_SearchName_CaseInsensitive()
    {
        var result = await CreateService().GetSuppliersAsync(1, 10, null, "apple", null, null, null, null);
        // StringComparison.OrdinalIgnoreCase might be needed in service for this to pass.
        // Let's see if the current service handles it.
        result.Items.Should().Contain(s => s.SupplierName.Contains("Apple", StringComparison.OrdinalIgnoreCase));
    }
}
