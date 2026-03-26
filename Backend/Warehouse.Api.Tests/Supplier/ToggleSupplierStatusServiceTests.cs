using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.Models;
using SupplierEntity = Warehouse.Entities.Models.Supplier;

namespace WarehouseTests.Supplier;

public class ToggleSupplierStatusServiceTests
{
    private readonly Mock<IGenericRepository<SupplierEntity>> _repoMock = new();
    private readonly Mock<INotificationService> _notifMock = new();
    private readonly Mock<IAuditLogService> _auditMock = new();

    private SupplierService CreateService() => new(
        _repoMock.Object, 
        _notifMock.Object, 
        _auditMock.Object,
        null!);

    private SupplierEntity MakeSupplier(long id = 1, bool isActive = true) => new()
    {
        SupplierId = id,
        SupplierCode = "SUP001",
        SupplierName = "Test Supplier",
        TaxCode = "TAX001",
        Phone = "0123",
        Email = "test@supp.com",
        Address = "Addr 1",
        City = "City 1",
        Ward = "Ward 1",
        District = "Dist 1",
        IsActive = isActive
    };

    [Fact]
    public async Task ToggleStatus_FromActiveToInactive_ShouldSucceedAndLogNotif()
    {
        // Given
        var supplier = MakeSupplier(isActive: true);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(supplier);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<SupplierEntity>())).ReturnsAsync((SupplierEntity s) => s);

        // When
        var result = await CreateService().ToggleSupplierStatusAsync(1, false);

        // Then
        result.IsActive.Should().BeFalse();
        
        // Verify Repository Update
        _repoMock.Verify(r => r.UpdateAsync(It.Is<SupplierEntity>(s => s.IsActive == false)), Times.Once);

        // Verify Notification
        _notifMock.Verify(n => n.CreateForRolesAsync(
            It.IsAny<string[]>(),
            It.Is<string>(s => s.Contains("Vô hiệu hóa")),
            It.IsAny<string>(),
            "SUPPLIER",
            1,
            null, // excludeUserId
            null, // type
            0,    // severity
            null  // expiresAt
        ), Times.Once);

        // Verify Audit Log
        _auditMock.Verify(a => a.LogAsync(
            0,
            AuditAction.Update,
            AuditEntity.Supplier,
            1,
            It.Is<string>(s => s.Contains("Vô hiệu hóa")),
            It.Is<string>(s => s.Contains("\"IsActive\":true")),
            It.Is<string>(s => s.Contains("\"IsActive\":false"))
        ), Times.Once);
    }

    [Fact]
    public async Task ToggleStatus_FromInactiveToActive_ShouldSucceedAndLogNotif()
    {
        // Given
        var supplier = MakeSupplier(isActive: false);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(supplier);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<SupplierEntity>())).ReturnsAsync((SupplierEntity s) => s);

        // When
        var result = await CreateService().ToggleSupplierStatusAsync(1, true);

        // Then
        result.IsActive.Should().BeTrue();
        
        // Verify Audit Log for Activation
        _auditMock.Verify(a => a.LogAsync(
            0,
            AuditAction.Update,
            AuditEntity.Supplier,
            1,
            It.Is<string>(s => s.Contains("Kích hoạt")),
            It.IsAny<string>(),
            It.IsAny<string>()
        ), Times.Once);
    }

    [Fact]
    public async Task ToggleStatus_IdNotFound_ShouldThrowKeyNotFound()
    {
        _repoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((SupplierEntity)null!);

        Func<Task> act = () => CreateService().ToggleSupplierStatusAsync(999, false);

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Không tìm thấy nhà cung cấp*999*");
    }

    [Fact]
    public async Task ToggleStatus_AlreadyActive_ShouldThrowInvalidOperation()
    {
        var supplier = MakeSupplier(isActive: true);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(supplier);

        Func<Task> act = () => CreateService().ToggleSupplierStatusAsync(1, true);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*đang hoạt động*Không cần thay đổi*");
    }

    [Fact]
    public async Task ToggleStatus_AlreadyInactive_ShouldThrowInvalidOperation()
    {
        var supplier = MakeSupplier(isActive: false);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(supplier);

        Func<Task> act = () => CreateService().ToggleSupplierStatusAsync(1, false);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*đã bị vô hiệu hóa*Không cần thay đổi*");
    }

    [Fact]
    public async Task ToggleStatus_ShouldReturnCorrectMapping()
    {
        var supplier = MakeSupplier(isActive: true);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(supplier);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<SupplierEntity>())).ReturnsAsync((SupplierEntity s) => s);

        var result = await CreateService().ToggleSupplierStatusAsync(1, false);

        result.SupplierId.Should().Be(1);
        result.SupplierCode.Should().Be("SUP001");
        result.SupplierName.Should().Be("Test Supplier");
        result.TaxCode.Should().Be("TAX001");
        result.Phone.Should().Be("0123");
        result.Email.Should().Be("test@supp.com");
        result.Address.Should().Be("Addr 1");
        result.City.Should().Be("City 1");
        result.Ward.Should().Be("Ward 1");
        result.District.Should().Be("Dist 1");
        result.IsActive.Should().BeFalse();
    }
}
