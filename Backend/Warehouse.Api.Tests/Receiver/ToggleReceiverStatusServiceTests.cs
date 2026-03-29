using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using ReceiverEntity = Warehouse.Entities.Models.Receiver;

namespace WarehouseTests.ReceiverServiceTests;

public class ToggleReceiverStatusServiceTests
{
    private readonly Mock<IGenericRepository<ReceiverEntity>> _repoMock = new();
    private readonly Mock<Mkiwms5Context> _contextMock = new();
	private readonly Mock<IAuditLogService> _mockAuditLogService = new();   

	private ReceiverService CreateService() => new(_repoMock.Object, _contextMock.Object, _mockAuditLogService.Object);

    // ─── Helpers ────────────────────────────────────────────────
    private ReceiverEntity MakeReceiver(long id = 1, bool isActive = true) => new()
    {
        ReceiverId = id,
        ReceiverCode = "RCV001",
        ReceiverName = "Test Receiver",
        Phone = "0909000000",
        Email = "test@test.com",
        Address = "Test Address",
        City = "HCM",
        Ward = "P1",
        Notes = "Notes",
        IsActive = isActive,
        CreatedAt = DateTime.UtcNow
    };

    private void SetupGetById(long id, ReceiverEntity? entity)
    {
        _repoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(entity!);
    }

    private void SetupUpdatePassThrough()
    {
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<ReceiverEntity>()))
            .ReturnsAsync((ReceiverEntity r) => r);
    }

    // ═══════════════════════════════════════════════════════════
    // 1. Toggle từ true → false (deactivate)
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task ToggleStatus_FromActiveToInactive_ShouldSucceed()
    {
        var receiver = MakeReceiver(isActive: true);
        SetupGetById(1, receiver);
        SetupUpdatePassThrough();

        var result = await CreateService().ToggleReceiverStatusAsync(1, false);

        result.IsActive.Should().BeFalse();
        _repoMock.Verify(r => r.UpdateAsync(It.Is<ReceiverEntity>(
            e => e.IsActive == false)), Times.Once);
    }

    // ═══════════════════════════════════════════════════════════
    // 2. Toggle từ false → true (activate)
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task ToggleStatus_FromInactiveToActive_ShouldSucceed()
    {
        var receiver = MakeReceiver(isActive: false);
        SetupGetById(1, receiver);
        SetupUpdatePassThrough();

        var result = await CreateService().ToggleReceiverStatusAsync(1, true);

        result.IsActive.Should().BeTrue();
    }

    // ═══════════════════════════════════════════════════════════
    // 3. ID không tồn tại → throw KeyNotFoundException
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task ToggleStatus_IdNotFound_ShouldThrowKeyNotFound()
    {
        SetupGetById(999, null);

        Func<Task> act = () => CreateService().ToggleReceiverStatusAsync(999, false);

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Không tìm thấy người nhận*999*");
    }

    // ═══════════════════════════════════════════════════════════
    // 4. Status giống hiện tại (true → true) → throw
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task ToggleStatus_AlreadyActive_ShouldThrowInvalidOperation()
    {
        var receiver = MakeReceiver(isActive: true);
        SetupGetById(1, receiver);

        Func<Task> act = () => CreateService().ToggleReceiverStatusAsync(1, true);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*đang hoạt động*Không cần thay đổi*");
    }

    // ═══════════════════════════════════════════════════════════
    // 5. Status giống hiện tại (false → false) → throw
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task ToggleStatus_AlreadyInactive_ShouldThrowInvalidOperation()
    {
        var receiver = MakeReceiver(isActive: false);
        SetupGetById(1, receiver);

        Func<Task> act = () => CreateService().ToggleReceiverStatusAsync(1, false);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*đã bị vô hiệu hóa*Không cần thay đổi*");
    }

    // ═══════════════════════════════════════════════════════════
    // 6. Verify response trả về đúng tất cả fields
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task ToggleStatus_ShouldReturnFullReceiverResponse()
    {
        var receiver = MakeReceiver(isActive: true);
        SetupGetById(1, receiver);
        SetupUpdatePassThrough();

        var result = await CreateService().ToggleReceiverStatusAsync(1, false);

        result.ReceiverId.Should().Be(1);
        result.ReceiverCode.Should().Be("RCV001");
        result.ReceiverName.Should().Be("Test Receiver");
        result.Phone.Should().Be("0909000000");
        result.Email.Should().Be("test@test.com");
        result.Address.Should().Be("Test Address");
        result.City.Should().Be("HCM");
        result.Ward.Should().Be("P1");
        result.Notes.Should().Be("Notes");
        result.IsActive.Should().BeFalse();
    }
}
