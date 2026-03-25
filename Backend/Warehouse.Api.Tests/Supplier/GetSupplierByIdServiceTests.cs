extern alias api;
using System;
using System.Collections.Generic;
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

public class GetSupplierByIdServiceTests : IDisposable
{
    private readonly Mock<INotificationService> _notifMock = new();
    private readonly Mock<IAuditLogService> _auditMock = new();
    private readonly Mkiwms5Context _context;
    private long _suppId;

    public GetSupplierByIdServiceTests()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(databaseName: "GetByIdSupp_" + Guid.NewGuid().ToString())
            .Options;
        _context = new Mkiwms5Context(options);
        SeedDatabase();
    }

    private void SeedDatabase()
    {
        var supp = new Warehouse.Entities.Models.Supplier { SupplierCode = "S1", SupplierName = "Target", IsActive = true };
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
    public async Task GetById_Exists_ShouldReturnSupplier()
    {
        var result = await CreateService().GetSupplierByIdAsync(_suppId);
        result.Should().NotBeNull();
        result!.SupplierName.Should().Be("Target");
    }

    [Fact]
    public async Task GetById_NotExists_ShouldThrowKeyNotFound()
    {
        Func<Task> act = () => CreateService().GetSupplierByIdAsync(99999);
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
