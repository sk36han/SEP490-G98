using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
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
        IsActive = isActive
    };

    [Fact]
    public async Task ToggleStatus_FromActiveToInactive_ShouldSucceed()
    {
        var supplier = MakeSupplier(isActive: true);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(supplier);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<SupplierEntity>())).ReturnsAsync((SupplierEntity s) => s);

        var result = await CreateService().ToggleSupplierStatusAsync(1, false);

        result.IsActive.Should().BeFalse();
        _repoMock.Verify(r => r.UpdateAsync(It.Is<SupplierEntity>(s => s.IsActive == false)), Times.Once);
    }

    [Fact]
    public async Task ToggleStatus_FromInactiveToActive_ShouldSucceed()
    {
        var supplier = MakeSupplier(isActive: false);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(supplier);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<SupplierEntity>())).ReturnsAsync((SupplierEntity s) => s);

        var result = await CreateService().ToggleSupplierStatusAsync(1, true);

        result.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task ToggleStatus_IdNotFound_ShouldThrowKeyNotFound()
    {
        _repoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((SupplierEntity)null!);

        Func<Task> act = () => CreateService().ToggleSupplierStatusAsync(999, false);

        await act.Should().ThrowAsync<KeyNotFoundException>();
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
        result.IsActive.Should().BeFalse();
    }
}
