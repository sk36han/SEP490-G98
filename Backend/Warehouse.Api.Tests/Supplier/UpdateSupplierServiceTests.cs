extern alias api;
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
    public async Task UpdateSupplier_ValidRequest_ShouldReturnUpdatedResponse()
    {
        // Given
        var existing = MakeExisting();
        SetupGetById(1, existing);
        SetupGetAll(existing);

        var request = new UpdateSupplierRequest
        {
            SupplierName = "New Name",
            TaxCode = "TAX-NEW",
            Phone = "0999",
            Email = "new@supplier.com",
            Address = "New Addr",
            IsActive = false
        };

        // When
        var result = await CreateService().UpdateSupplierAsync(1, request, CurrentUserId);

        // Then
        result.SupplierName.Should().Be("New Name");
        result.TaxCode.Should().Be("TAX-NEW");
        result.Phone.Should().Be("0999");
        result.Email.Should().Be("new@supplier.com");
        result.IsActive.Should().BeFalse();

        _repoMock.Verify(r => r.UpdateAsync(It.IsAny<SupplierEntity>()), Times.Once);
    }

    [Fact]
    public async Task UpdateSupplier_IdNotFound_ShouldThrowKeyNotFound()
    {
        // Given
        SetupGetById(999, null);
        var request = new UpdateSupplierRequest { SupplierName = "Any" };

        // When
        Func<Task> act = () => CreateService().UpdateSupplierAsync(999, request, CurrentUserId);

        // Then
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Không tìm thấy nhà cung cấp*999*");
    }

    [Fact]
    public async Task UpdateSupplier_DuplicateEmail_ShouldThrowInvalidOperation()
    {
        // Given
        var existing = MakeExisting(id: 1, email: "mine@test.com");
        var other = MakeExisting(id: 2, email: "taken@test.com");
        SetupGetById(1, existing);
        SetupGetAll(existing, other);

        var request = new UpdateSupplierRequest { SupplierName = "Name", Email = "taken@test.com" };

        // When
        Func<Task> act = () => CreateService().UpdateSupplierAsync(1, request, CurrentUserId);

        // Then
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Địa chỉ email đã được sử dụng*");
    }

    [Fact]
    public async Task UpdateSupplier_EmailSameAsSelf_ShouldNotThrow()
    {
        // Given
        var existing = MakeExisting(id: 1, email: "mine@test.com");
        SetupGetById(1, existing);
        SetupGetAll(existing);

        var request = new UpdateSupplierRequest { SupplierName = "Name", Email = "mine@test.com" };

        // When
        var result = await CreateService().UpdateSupplierAsync(1, request, CurrentUserId);

        // Then
        result.Email.Should().Be("mine@test.com");
    }

    [Fact]
    public async Task UpdateSupplier_EmailNullOrWhitespace_ShouldSkipDuplicateCheck()
    {
        // Given
        var existing = MakeExisting();
        SetupGetById(1, existing);

        var requestNull = new UpdateSupplierRequest { SupplierName = "N", Email = null };
        var requestEmpty = new UpdateSupplierRequest { SupplierName = "N", Email = "  " };

        // When
        await CreateService().UpdateSupplierAsync(1, requestNull, CurrentUserId);
        await CreateService().UpdateSupplierAsync(1, requestEmpty, CurrentUserId);

        // Then
        _repoMock.Verify(r => r.GetAllAsync(), Times.Never);
    }

    [Fact]
    public async Task UpdateSupplier_AuditLog_ShouldBeCalled()
    {
        // Given
        var existing = MakeExisting();
        SetupGetById(1, existing);
        SetupGetAll(existing);

        var request = new UpdateSupplierRequest { SupplierName = "Updated" };

        // When
        await CreateService().UpdateSupplierAsync(1, request, CurrentUserId);

        // Then
        _auditMock.Verify(a => a.LogAsync(
            CurrentUserId,
            AuditAction.Update,
            AuditEntity.Supplier,
            1,
            It.Is<string>(s => s.Contains("Cập nhật nhà cung cấp")),
            It.IsAny<string>(), // oldValues
            It.IsAny<string>()  // newValues
        ), Times.Once);
    }

    [Fact]
    public async Task UpdateSupplier_Notification_ShouldBeCalled()
    {
        // Given
        var existing = MakeExisting();
        SetupGetById(1, existing);
        SetupGetAll(existing);

        var request = new UpdateSupplierRequest { SupplierName = "Updated" };

        // When
        await CreateService().UpdateSupplierAsync(1, request, CurrentUserId);

        // Then
        _notifMock.Verify(n => n.CreateForRolesAsync(
            It.IsAny<string[]>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            "SUPPLIER",
            1,
            CurrentUserId,
            null,
            0,
            null
        ), Times.Once);
    }

    [Fact]
    public async Task UpdateSupplier_FullUpdate_ShouldMapAllFieldsAndKeepMetadata()
    {
        // Given
        var createdAt = DateTime.UtcNow.AddDays(-10);
        var existing = MakeExisting();
         existing.CreatedAt = createdAt;
         existing.SupplierCode = "ORIGINAL_CODE";

        SetupGetById(1, existing);
        SetupGetAll(existing);

        var request = new UpdateSupplierRequest
        {
            SupplierName = "Full Update",
            TaxCode = "TX99",
            Phone = "888",
            Email = "full@test.com",
            Address = "Road 1",
            City = "City 1",
            Ward = "Ward 1",
            District = "Dist 1",
            IsActive = false
        };

        // When
        var result = await CreateService().UpdateSupplierAsync(1, request, CurrentUserId);

        // Then
        result.SupplierName.Should().Be("Full Update");
        result.TaxCode.Should().Be("TX99");
        result.Phone.Should().Be("888");
        result.Email.Should().Be("full@test.com");
        result.Address.Should().Be("Road 1");
        result.City.Should().Be("City 1");
        result.Ward.Should().Be("Ward 1");
        result.District.Should().Be("Dist 1");
        result.IsActive.Should().BeFalse();

        // Metadata check
        existing.SupplierCode.Should().Be("ORIGINAL_CODE");
        existing.CreatedAt.Should().Be(createdAt);
    }
}
