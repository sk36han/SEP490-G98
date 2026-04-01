using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using SupplierEntity = Warehouse.Entities.Models.Supplier;

namespace WarehouseTests.Supplier;

public class UpdateSupplierServiceTests
{
    private readonly Mock<IGenericRepository<SupplierEntity>> _repoMock = new();
    private readonly Mock<INotificationService> _notifMock = new();
    private readonly Mock<IAuditLogService> _auditMock = new();
    
    private const long CurrentUserId = 1;

    private SupplierService CreateService() => new(
        _repoMock.Object, 
        _notifMock.Object, 
        _auditMock.Object,
        null!); // context is not used in the repo-mocked version of duplicate check

    private SupplierEntity MakeExisting(long id = 1, string code = "SUP001", string name = "Old Supplier", string? email = "old@supplier.com") => new()
    {
        SupplierId = id,
        SupplierCode = code,
        SupplierName = name,
        Email = email,
        Phone = "0123456",
        TaxCode = "TAX-OLD",
        Address = "Old Addr",
        IsActive = true,
        CreatedAt = DateTime.UtcNow.AddDays(-1)
    };

    private void SetupGetById(long id, SupplierEntity? entity)
    {
        _repoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(entity!);
    }

    private void SetupGetAll(params SupplierEntity[] items)
    {
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(items.AsEnumerable());
    }

    [Fact]
    public async Task UpdateSupplier_ValidRequest_ShouldReturnUpdatedResponseAndSave()
    {
        // Arrange
        var existing = MakeExisting();
        SetupGetById(1, existing);
        SetupGetAll(existing);

        var request = new UpdateSupplierRequest
        {
            SupplierName = "New Name",
            TaxCode = "TAX-NEW",
            Phone = "0999000888",
            Email = "new@supplier.com",
            Address = "New Addr",
            IsActive = false
        };

        // Act
        var result = await CreateService().UpdateSupplierAsync(1, request, CurrentUserId);

        // Assert
        result.SupplierName.Should().Be("New Name");
        result.Email.Should().Be("new@supplier.com");
        result.IsActive.Should().BeFalse();

        _repoMock.Verify(r => r.UpdateAsync(It.Is<SupplierEntity>(s => s.SupplierName == "New Name" && s.SupplierId == 1)), Times.Once);
        _auditMock.Verify(a => a.LogAsync(CurrentUserId, AuditAction.Update, AuditEntity.Supplier, 1, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        _notifMock.Verify(n => n.CreateForRolesAsync(It.IsAny<string[]>(), It.IsAny<string>(), It.IsAny<string>(), "SUPPLIER", 1, CurrentUserId, null, 0, null), Times.Once);
    }

    [Fact]
    public async Task UpdateSupplier_NonExistingId_ShouldThrowKeyNotFound()
    {
        // Arrange
        SetupGetById(99, null);
        var request = new UpdateSupplierRequest { SupplierName = "Any" };

        // Act
        Func<Task> act = () => CreateService().UpdateSupplierAsync(99, request, CurrentUserId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*ID = 99*");
        _repoMock.Verify(r => r.UpdateAsync(It.IsAny<SupplierEntity>()), Times.Never);
    }

    [Fact]
    public async Task UpdateSupplier_DuplicateEmailForAnotherId_ShouldThrowInvalidOperation()
    {
        // Arrange
        var existing = MakeExisting(id: 1, email: "mine@test.com");
        var other = MakeExisting(id: 2, email: "other@test.com");
        SetupGetById(1, existing);
        SetupGetAll(existing, other);

        var request = new UpdateSupplierRequest { SupplierName = "Name", Email = "other@test.com" };

        // Act
        Func<Task> act = () => CreateService().UpdateSupplierAsync(1, request, CurrentUserId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*đã được sử dụng*");
    }

    [Fact]
    public async Task UpdateSupplier_SameEmailAsBefore_ShouldNotThrowDuplicate()
    {
        // Arrange
        var existing = MakeExisting(id: 1, email: "mine@test.com");
        SetupGetById(1, existing);
        SetupGetAll(existing);

        var request = new UpdateSupplierRequest { SupplierName = "Name", Email = "mine@test.com" };

        // Act
        var result = await CreateService().UpdateSupplierAsync(1, request, CurrentUserId);

        // Assert
        result.Email.Should().Be("mine@test.com");
    }

    [Fact]
    public async Task UpdateSupplier_SpecialCharactersInName_ShouldBeAcceptedByService()
    {
        // Arrange
        var existing = MakeExisting();
        SetupGetById(1, existing);
        SetupGetAll(existing);

        var request = new UpdateSupplierRequest { SupplierName = "Supplier @#! 123" };

        // Act
        var result = await CreateService().UpdateSupplierAsync(1, request, CurrentUserId);

        // Assert
        result.SupplierName.Should().Be("Supplier @#! 123");
    }

    [Fact]
    public async Task UpdateSupplier_EmailNullOrBlank_ShouldSkipDuplicateCheck()
    {
        // Arrange
        var existing = MakeExisting();
        SetupGetById(1, existing);

        var request = new UpdateSupplierRequest { SupplierName = "Any", Email = "" };

        // Act
        await CreateService().UpdateSupplierAsync(1, request, CurrentUserId);

        // Assert
        _repoMock.Verify(r => r.GetAllAsync(), Times.Never);
    }

    [Fact]
    public async Task UpdateSupplier_AuditLog_ShouldContainSerializedValues()
    {
        // Arrange
        var existing = MakeExisting(name: "Old");
        SetupGetById(1, existing);
        SetupGetAll(existing);

        var request = new UpdateSupplierRequest { SupplierName = "New" };

        // Act
        await CreateService().UpdateSupplierAsync(1, request, CurrentUserId);

        // Assert
        _auditMock.Verify(a => a.LogAsync(
            It.IsAny<long>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<long>(),
            It.IsAny<string>(),
            It.Is<string>(json => json.Contains("Old")),
            It.Is<string>(json => json.Contains("New"))
        ), Times.Once);
    }

    [Fact]
    public async Task UpdateSupplier_ShouldKeepSupplierCodeAndCreatedAtUnchanged()
    {
        // Arrange
        var originalCreatedAt = new DateTime(2025, 1, 1);
        var existing = MakeExisting();
        existing.CreatedAt = originalCreatedAt;
        existing.SupplierCode = "KEEP-ME";
        
        SetupGetById(1, existing);
        SetupGetAll(existing);

        var request = new UpdateSupplierRequest { SupplierName = "Changed" };

        // Act
        await CreateService().UpdateSupplierAsync(1, request, CurrentUserId);

        // Assert
        existing.SupplierCode.Should().Be("KEEP-ME");
        existing.CreatedAt.Should().Be(originalCreatedAt);
    }
}
