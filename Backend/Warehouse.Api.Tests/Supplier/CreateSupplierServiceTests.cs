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
using Warehouse.Entities.Constants;
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
            .UseInMemoryDatabase(databaseName: "CreateSupp_Refactored_" + Guid.NewGuid().ToString())
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

    private CreateSupplierRequest CreateValidRequest(string code = "SUP001") => new()
    {
        SupplierCode = code,
        SupplierName = "Test Supplier",
        TaxCode = "TX123",
        Phone = "0123456789",
        Email = "test@supplier.com",
        Address = "123 Test St"
    };

    [Fact]
    public async Task CreateSupplier_FullData_ShouldSucceedAndLogsEverything()
    {
        // Arrange
        var request = CreateValidRequest("SUP-NEW");
        var service = CreateService();

        // Act
        var result = await service.CreateSupplierAsync(request, CurrentUserId);

        // Assert
        result.Should().NotBeNull();
        result.SupplierCode.Should().Be("SUP-NEW");
        result.SupplierName.Should().Be(request.SupplierName);
        result.Email.Should().Be(request.Email);
        result.IsActive.Should().BeTrue();

        // Database Side Effect
        _context.Suppliers.Should().ContainSingle(s => s.SupplierCode == "SUP-NEW");
        var persisted = _context.Suppliers.Single(s => s.SupplierCode == "SUP-NEW");
        persisted.SupplierName.Should().Be(request.SupplierName);
        persisted.TaxCode.Should().Be(request.TaxCode);
        persisted.Phone.Should().Be(request.Phone);
        persisted.Email.Should().Be(request.Email);
        persisted.Address.Should().Be(request.Address);
        persisted.IsActive.Should().BeTrue();
        persisted.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

        // Dependency Verification
        _notifMock.Verify(n => n.CreateForRolesAsync(
            It.IsAny<string[]>(),
            It.Is<string>(s => s.Contains("Nhà cung cấp mới")),
            It.Is<string>(s => s.Contains("SUP-NEW")),
            "SUPPLIER",
            persisted.SupplierId,
            CurrentUserId,
            null, 0, null
        ), Times.Once);

        _auditMock.Verify(a => a.LogAsync(
            CurrentUserId,
            AuditAction.Create,
            AuditEntity.Supplier,
            persisted.SupplierId,
            It.Is<string>(s => s.Contains("Tạo nhà cung cấp") && s.Contains("SUP-NEW")),
            null,
            null
        ), Times.Once);
    }

    [Fact]
    public async Task CreateSupplier_DuplicateCode_ShouldThrowAndNotPersist()
    {
        // Arrange
        var existing = new Warehouse.Entities.Models.Supplier { SupplierCode = "DUP01", SupplierName = "Existing", IsActive = true };
        _context.Suppliers.Add(existing);
        await _context.SaveChangesAsync();
        
        var request = CreateValidRequest("DUP01");
        var service = CreateService();

        // Act
        Func<Task> act = () => service.CreateSupplierAsync(request, CurrentUserId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*đã tồn tại*");
        _context.Suppliers.Count().Should().Be(1); // No new record
        _notifMock.Verify(n => n.CreateForRolesAsync(It.IsAny<string[]>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<long>(), It.IsAny<long?>(), It.IsAny<string>(), It.IsAny<byte>(), It.IsAny<DateTime?>()), Times.Never);
    }

    [Fact]
    public async Task CreateSupplier_DuplicateEmail_CaseInsensitive_ShouldThrow()
    {
        // Arrange
        var existing = new Warehouse.Entities.Models.Supplier { SupplierId = 10, SupplierCode = "OTHER", SupplierName = "Other", Email = "UNIQUE@test.com", IsActive = true };
        _context.Suppliers.Add(existing);
        await _context.SaveChangesAsync();

        var request = CreateValidRequest("NEWCODE");
        request.Email = "unique@test.com"; // Different case

        // Act
        Func<Task> act = () => CreateService().CreateSupplierAsync(request, CurrentUserId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*email đã được sử dụng*");
        _context.Suppliers.Count().Should().Be(1);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateSupplier_InvalidCode_ShouldThrow(string code)
    {
        var request = CreateValidRequest(code);
        
        Func<Task> act = () => CreateService().CreateSupplierAsync(request, CurrentUserId);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Mã nhà cung cấp là bắt buộc*");
        _context.Suppliers.Should().BeEmpty();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateSupplier_InvalidName_ShouldThrow(string name)
    {
        var request = CreateValidRequest();
        request.SupplierName = name!;
        
        Func<Task> act = () => CreateService().CreateSupplierAsync(request, CurrentUserId);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Tên nhà cung cấp là bắt buộc*");
        _context.Suppliers.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateSupplier_NullRequest_ShouldThrow()
    {
        Func<Task> act = () => CreateService().CreateSupplierAsync(null!, CurrentUserId);

        // Current implementation will throw NullReferenceException because it tries to access request.SupplierCode first
        await act.Should().ThrowAsync<NullReferenceException>();
    }

    [Fact]
    public async Task CreateSupplier_DatabaseError_ShouldPropagateException()
    {
        // Arrange
        var request = CreateValidRequest("DBERR");
        
        var mockRepo = new Mock<IGenericRepository<Warehouse.Entities.Models.Supplier>>();
        mockRepo.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<Warehouse.Entities.Models.Supplier>());
        mockRepo.Setup(r => r.CreateAsync(It.IsAny<Warehouse.Entities.Models.Supplier>()))
                .ThrowsAsync(new Exception("Physical DB Error"));

        var service = new SupplierService(mockRepo.Object, _notifMock.Object, _auditMock.Object, _context);

        // Act
        Func<Task> act = () => service.CreateSupplierAsync(request, CurrentUserId);

        // Assert
        await act.Should().ThrowAsync<Exception>().WithMessage("Physical DB Error");
        
        // Side effects: Should NOT log notification if save fails
        _notifMock.Verify(n => n.CreateForRolesAsync(It.IsAny<string[]>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<long>(), It.IsAny<long?>(), It.IsAny<string>(), It.IsAny<byte>(), It.IsAny<DateTime?>()), Times.Never);
    }

    [Fact]
    public async Task CreateSupplier_EmailNull_ShouldSucceed()
    {
        var request = CreateValidRequest("NULL-EMAIL");
        request.Email = null;

        var result = await CreateService().CreateSupplierAsync(request, CurrentUserId);

        result.Email.Should().BeNull();
        _context.Suppliers.Should().Contain(s => s.SupplierCode == "NULL-EMAIL" && s.Email == null);
    }
}
