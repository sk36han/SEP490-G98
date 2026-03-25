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
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace WarehouseTests.Supplier;

public class UpdateSupplierServiceTests : IDisposable
{
    private readonly Mock<INotificationService> _notifMock = new();
    private readonly Mock<IAuditLogService> _auditMock = new();
    private readonly Mkiwms5Context _context;
    private long _suppId;
    private const long CurrentUserId = 1;

    public UpdateSupplierServiceTests()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(databaseName: "UpdateSupp_" + Guid.NewGuid().ToString())
            .Options;
        _context = new Mkiwms5Context(options);
        SeedDatabase();
    }

    private void SeedDatabase()
    {
        var supp = new Warehouse.Entities.Models.Supplier { SupplierCode = "S1", SupplierName = "Original", IsActive = true };
        _context.Suppliers.Add(supp);
        _context.SaveChanges();
        _suppId = supp.SupplierId;
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
    public async Task UpdateSupplier_ValidData_ShouldSucceed()
    {
        var request = new UpdateSupplierRequest
        {
            SupplierName = "Updated Name",
            IsActive = true
        };

        var result = await CreateService().UpdateSupplierAsync(_suppId, request, CurrentUserId);

        result.Should().NotBeNull();
        result.SupplierName.Should().Be("Updated Name");
    }

    [Fact]
    public async Task UpdateSupplier_NotFound_ShouldThrowKeyNotFound()
    {
        var request = new UpdateSupplierRequest { SupplierName = "N" };
        Func<Task> act = () => CreateService().UpdateSupplierAsync(99999, request, CurrentUserId);
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
