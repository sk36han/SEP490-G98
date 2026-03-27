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

    private SupplierEntity MakeSupplier(long id = 1, bool isActive = true, string code = "SUP-001", string name = "Test Supplier") => new()
    {
        SupplierId = id,
        SupplierCode = code,
        SupplierName = name,
        IsActive = isActive
    };

    [Fact]
    public async Task ToggleStatus_Deactivate_ShouldLogCorrectStrings()
    {
        // Arrange
        var supplier = MakeSupplier(id: 1, isActive: true, code: "S01", name: "Supp A");
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(supplier);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<SupplierEntity>())).ReturnsAsync((SupplierEntity s) => s);

        // Act
        var result = await CreateService().ToggleSupplierStatusAsync(1, false);

        // Assert
        result.IsActive.Should().BeFalse();

        // Verify Notification (Exact strings from code)
        _notifMock.Verify(n => n.CreateForRolesAsync(
            It.IsAny<string[]>(),
            "Vô hiệu hóa nhà cung cấp",
            "Nhà cung cấp 'Supp A' (Mã: S01) đã được vô hiệu hóa.",
            "SUPPLIER",
            1,
            null, // excludeUserId
            null, // type
            0,    // severity (byte)
            null  // expiresAt
        ), Times.Once);

        // Verify Audit Log (Exact strings from code)
        _auditMock.Verify(a => a.LogAsync(
            0,
            AuditAction.Update,
            AuditEntity.Supplier,
            1,
            "Vô hiệu hóa nhà cung cấp 'Supp A' (Mã: S01)",
            It.Is<string>(s => s.Contains("\"IsActive\":true")),
            It.Is<string>(s => s.Contains("\"IsActive\":false"))
        ), Times.Once);
    }

    [Fact]
    public async Task ToggleStatus_Activate_ShouldLogCorrectStrings()
    {
        // Arrange
        var supplier = MakeSupplier(id: 1, isActive: false, code: "S01", name: "Supp A");
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(supplier);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<SupplierEntity>())).ReturnsAsync((SupplierEntity s) => s);

        // Act
        var result = await CreateService().ToggleSupplierStatusAsync(1, true);

        // Assert
        result.IsActive.Should().BeTrue();

        // Verify Notification
        _notifMock.Verify(n => n.CreateForRolesAsync(
            It.IsAny<string[]>(),
            "Kích hoạt nhà cung cấp",
            "Nhà cung cấp 'Supp A' (Mã: S01) đã được hoạt động.",
            "SUPPLIER",
            1,
            null, // excludeUserId
            null, // type
            0,    // severity (byte)
            null  // expiresAt
        ), Times.Once);

        // Verify Audit Log
        _auditMock.Verify(a => a.LogAsync(
            0,
            AuditAction.Update,
            AuditEntity.Supplier,
            1,
            "Kích hoạt nhà cung cấp 'Supp A' (Mã: S01)",
            It.Is<string>(s => s.Contains("\"IsActive\":false")),
            It.Is<string>(s => s.Contains("\"IsActive\":true"))
        ), Times.Once);
    }

    [Fact]
    public async Task ToggleStatus_AlreadyAtRequestedStatus_ShouldThrowInvalidOperation()
    {
        // Arrange
        var supplier = MakeSupplier(id: 1, isActive: true, name: "Supp A");
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(supplier);

        // Act
        Func<Task> act = () => CreateService().ToggleSupplierStatusAsync(1, true);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*'Supp A' hiện tại đang hoạt động. Không cần thay đổi.*");
    }

    [Fact]
    public async Task ToggleStatus_IdNotFound_ShouldThrowKeyNotFound()
    {
        // Arrange
        _repoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((SupplierEntity)null!);

        // Act
        Func<Task> act = () => CreateService().ToggleSupplierStatusAsync(99, true);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*ID = 99*");
    }
}
