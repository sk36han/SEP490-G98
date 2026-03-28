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
using Warehouse.Entities.ModelResponse;

namespace WarehouseTests.Supplier;

public class GetSupplierByIdServiceTests : IDisposable
{
    private readonly Mock<INotificationService> _notifMock = new();
    private readonly Mock<IAuditLogService> _auditMock = new();
    private readonly Mkiwms5Context _context;
    private long _existingId;

    public GetSupplierByIdServiceTests()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(databaseName: "GetByIdSupp_Refactored_" + Guid.NewGuid().ToString())
            .Options;
        _context = new Mkiwms5Context(options);
        SeedDatabase();
    }

    private void SeedDatabase()
    {
        var supp = new Warehouse.Entities.Models.Supplier 
        { 
            SupplierCode = "SUP-001", 
            SupplierName = "Target Supplier", 
            IsActive = true,
            Email = "target@test.com",
            Phone = "0987654321"
        };
        _context.Suppliers.Add(supp);
        _context.SaveChanges();
        _existingId = supp.SupplierId;
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
    public async Task GetById_ExistingId_ShouldReturnCorrectData()
    {
        // Act
        var result = await CreateService().GetSupplierByIdAsync(_existingId);

        // Assert
        result.Should().NotBeNull();
        result.SupplierId.Should().Be(_existingId);
        result.SupplierCode.Should().Be("SUP-001");
        result.SupplierName.Should().Be("Target Supplier");
        result.Email.Should().Be("target@test.com");
        result.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task GetById_NonExistingId_ShouldThrowKeyNotFoundException()
    {
        // Arrange
        long nonExId = 999999;
        var service = CreateService();

        // Act
        Func<Task> act = () => service.GetSupplierByIdAsync(nonExId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
                 .WithMessage($"*ID = {nonExId}*");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-100)]
    public async Task GetById_InvalidId_ShouldThrowKeyNotFoundException(long id)
    {
        // Act
        Func<Task> act = () => CreateService().GetSupplierByIdAsync(id);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetById_InactiveSupplier_ShouldStillReturnData()
    {
        // Arrange
        var inactive = new Warehouse.Entities.Models.Supplier { SupplierId = 500, SupplierCode = "INACTIVE", SupplierName = "Inactive", IsActive = false };
        _context.Suppliers.Add(inactive);
        await _context.SaveChangesAsync();

        // Act
        var result = await CreateService().GetSupplierByIdAsync(500);

        // Assert
        result.Should().NotBeNull();
        result.IsActive.Should().BeFalse();
        result.SupplierCode.Should().Be("INACTIVE");
    }

    [Fact]
    public async Task GetById_DatabaseError_ShouldPropagateException()
    {
        // Arrange
        var mockRepo = new Mock<IGenericRepository<Warehouse.Entities.Models.Supplier>>();
        mockRepo.Setup(r => r.GetByIdAsync(It.IsAny<long>())).ThrowsAsync(new Exception("Database connection failure"));

        var service = new SupplierService(mockRepo.Object, _notifMock.Object, _auditMock.Object, _context);

        // Act
        Func<Task> act = () => service.GetSupplierByIdAsync(1);

        // Assert
        await act.Should().ThrowAsync<Exception>().WithMessage("Database connection failure");
    }

    [Fact]
    public async Task GetById_RepositoryReturnsNull_ShouldThrowKeyNotFound()
    {
        // Arrange
        var mockRepo = new Mock<IGenericRepository<Warehouse.Entities.Models.Supplier>>();
        mockRepo.Setup(r => r.GetByIdAsync(It.IsAny<long>())).ReturnsAsync((Warehouse.Entities.Models.Supplier)null!);

        var service = new SupplierService(mockRepo.Object, _notifMock.Object, _auditMock.Object, _context);

        // Act & Assert
        await service.Invoking(s => s.GetSupplierByIdAsync(100))
                     .Should().ThrowAsync<KeyNotFoundException>();
    }
}
