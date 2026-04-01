using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using ReceiverEntity = Warehouse.Entities.Models.Receiver;

namespace WarehouseTests.Receiver;

public class ToggleReceiverStatusServiceTests
{
    private readonly Mock<IGenericRepository<ReceiverEntity>> _repoMock = new();
    private readonly Mock<Mkiwms5Context> _contextMock = new();
	private readonly Mock<IAuditLogService> _mockAuditLogService = new();   

	private ReceiverService CreateService() => new(_repoMock.Object, _contextMock.Object, _mockAuditLogService.Object);

    [Fact]
    public async Task ToggleStatus_Activate_ShouldSucceed_WhenCurrentIsDeactivated()
    {
        // Arrange
        var receiver = new ReceiverEntity { ReceiverId = 1, ReceiverName = "Test R", IsActive = false };
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(receiver);

        // Act
        var result = await CreateService().ToggleReceiverStatusAsync(1, true);

        // Assert
        result.IsActive.Should().BeTrue();
        receiver.IsActive.Should().BeTrue();
        _repoMock.Verify(r => r.UpdateAsync(receiver), Times.Once);
    }

    [Fact]
    public async Task ToggleStatus_Deactivate_ShouldSucceed_WhenCurrentIsActive()
    {
        // Arrange
        var receiver = new ReceiverEntity { ReceiverId = 1, ReceiverName = "Test R", IsActive = true };
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(receiver);

        // Act
        var result = await CreateService().ToggleReceiverStatusAsync(1, false);

        // Assert
        result.IsActive.Should().BeFalse();
        receiver.IsActive.Should().BeFalse();
        _repoMock.Verify(r => r.UpdateAsync(receiver), Times.Once);
    }

    [Fact]
    public async Task ToggleStatus_NonExistingId_ShouldThrowKeyNotFound()
    {
        // Arrange
        _repoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((ReceiverEntity?)null);

        // Act
        Func<Task> act = () => CreateService().ToggleReceiverStatusAsync(99, true);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*ID = 99*");
    }

    [Theory]
    [InlineData(true, "đang hoạt động")]
    [InlineData(false, "đã bị vô hiệu hóa")]
    public async Task ToggleStatus_SameStatus_ShouldThrowInvalidOperation(bool currentStatus, string expectedStatusText)
    {
        // Arrange
        var receiver = new ReceiverEntity { ReceiverId = 1, ReceiverName = "Test R", IsActive = currentStatus };
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(receiver);

        // Act
        Func<Task> act = () => CreateService().ToggleReceiverStatusAsync(1, currentStatus);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage($"*'{receiver.ReceiverName}' hiện tại {expectedStatusText}*");
    }
}
