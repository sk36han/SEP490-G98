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

public class CreateSupplierServiceTests : IDisposable
{
    private readonly Mock<INotificationService> _notifMock = new();
    private readonly Mock<IAuditLogService> _auditMock = new();
    private readonly Mkiwms5Context _context;
    private const long CurrentUserId = 1;

    public CreateSupplierServiceTests()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(databaseName: "CreateSupp_" + Guid.NewGuid().ToString())
            .Options;
        _context = new Mkiwms5Context(options);
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
    public async Task CreateSupplier_FullData_ShouldSucceed()
    {
        var request = new CreateSupplierRequest
        {
            SupplierCode = "SUP002",
            SupplierName = "Supplier 02",
            TaxCode = "123",
            Phone = "0123",
            Email = "a@a.com",
            Address = "HN"
        };

        var result = await CreateService().CreateSupplierAsync(request, CurrentUserId);

        result.Should().NotBeNull();
        result.SupplierCode.Should().Be("SUP002");
        _context.Suppliers.Should().Contain(s => s.SupplierCode == "SUP002");
    }

    [Fact]
    public async Task CreateSupplier_DuplicateCode_ShouldThrowException()
    {
        var existing = new Warehouse.Entities.Models.Supplier { SupplierCode = "DUP001", SupplierName = "Old", IsActive = true };
        _context.Suppliers.Add(existing);
        await _context.SaveChangesAsync();

        var request = new CreateSupplierRequest { SupplierCode = "DUP001", SupplierName = "New" };

        Func<Task> act = () => CreateService().CreateSupplierAsync(request, CurrentUserId);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*đã tồn tại*");
    }

    [Fact]
    public async Task CreateSupplier_DuplicateEmail_ShouldThrowException()
    {
        var existing = new Warehouse.Entities.Models.Supplier { SupplierCode = "S1", SupplierName = "O1", Email = "dup@e.com", IsActive = true };
        _context.Suppliers.Add(existing);
        await _context.SaveChangesAsync();

        var request = new CreateSupplierRequest { SupplierCode = "S2", SupplierName = "O2", Email = "dup@e.com" };

        Func<Task> act = () => CreateService().CreateSupplierAsync(request, CurrentUserId);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*địa chỉ email đã được sử dụng*");
    }

    [Fact]
    public async Task CreateSupplier_SpecialChars_ShouldBeSaved()
    {
        var request = new CreateSupplierRequest 
        { 
            SupplierCode = "SUP,#! ", 
            SupplierName = "Name With , and #"
        };

        var result = await CreateService().CreateSupplierAsync(request, CurrentUserId);

        result.SupplierCode.Should().Be("SUP,#! ");
    }

    [Fact]
    public async Task CreateSupplier_NullName_ShouldThrowException()
    {
        var request = new CreateSupplierRequest { SupplierCode = "S99", SupplierName = null! };
        
        // Since the service doesn't validate Name null (relies on DB or Validator), 
        // we expect a DB update exception or similar if we use a real repo without validation logic.
        Func<Task> act = () => CreateService().CreateSupplierAsync(request, CurrentUserId);
        await act.Should().ThrowAsync<Exception>();
    }

    [Fact]
    public async Task CreateSupplier_NullCode_ShouldThrowException()
    {
        var request = new CreateSupplierRequest { SupplierCode = null!, SupplierName = "Test" };
        Func<Task> act = () => CreateService().CreateSupplierAsync(request, CurrentUserId);
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*bắt buộc*");
    }

    [Fact]
    public async Task CreateSupplier_EmptyCode_ShouldThrowException()
    {
        var request = new CreateSupplierRequest { SupplierCode = "", SupplierName = "Test" };
        Func<Task> act = () => CreateService().CreateSupplierAsync(request, CurrentUserId);
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*bắt buộc*");
    }

    [Fact]
    public async Task CreateSupplier_WhitespaceCode_ShouldThrowException()
    {
        var request = new CreateSupplierRequest { SupplierCode = "   ", SupplierName = "Test" };
        Func<Task> act = () => CreateService().CreateSupplierAsync(request, CurrentUserId);
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*bắt buộc*");
    }

    [Fact]
    public async Task CreateSupplier_CommaOnly_ShouldBeSaved()
    {
        var request = new CreateSupplierRequest { SupplierCode = ",", SupplierName = "," };
        
        var result = await CreateService().CreateSupplierAsync(request, CurrentUserId);

        result.SupplierCode.Should().Be(",");
        result.SupplierName.Should().Be(",");
    }

    [Fact]
    public async Task CreateSupplier_DatabaseError_ShouldThrowException()
    {
        var request = new CreateSupplierRequest { SupplierCode = "ERR01", SupplierName = "Error" };
        
        // Mock a repository that throws on Create
        var mockRepo = new Mock<IGenericRepository<Warehouse.Entities.Models.Supplier>>();
        mockRepo.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<Warehouse.Entities.Models.Supplier>());
        mockRepo.Setup(r => r.CreateAsync(It.IsAny<Warehouse.Entities.Models.Supplier>()))
                .ThrowsAsync(new Exception("Database error"));
        
        var service = new SupplierService(mockRepo.Object, _notifMock.Object, _auditMock.Object, _context);

        Func<Task> act = () => service.CreateSupplierAsync(request, CurrentUserId);
        await act.Should().ThrowAsync<Exception>().WithMessage("*Database error*");
    }
}
