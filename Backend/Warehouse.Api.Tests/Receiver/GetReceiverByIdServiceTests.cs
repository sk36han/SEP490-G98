using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using ReceiverEntity = Warehouse.Entities.Models.Receiver;

namespace WarehouseTests.ReceiverServiceTests;

public class GetReceiverByIdServiceTests
{
    private readonly Mock<IGenericRepository<ReceiverEntity>> _repoMock = new();
    private readonly Mock<Mkiwms5Context> _contextMock = new();
	private readonly Mock<IAuditLogService> _mockAuditLogService = new();
	private ReceiverService CreateService() => new(_repoMock.Object, _contextMock.Object, _mockAuditLogService.Object);

    // ─── Helpers ────────────────────────────────────────────────
    private ReceiverEntity MakeReceiver(long id = 1) => new()
    {
        ReceiverId = id,
        ReceiverCode = "RCV001",
        ReceiverName = "Test Receiver",
        Phone = "0909123456",
        Email = "test@example.com",
        Address = "123 ABC Street",
        City = "Ho Chi Minh",
        Ward = "Phuong 1",
        District = "Quan 1",
        Notes = "Important notes",
        IsActive = true,
        CreatedAt = new DateTime(2026, 1, 15)
    };

    private void SetupGetById(long id, ReceiverEntity? entity)
    {
        _repoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(entity!);
    }

    // ═══════════════════════════════════════════════════════════
    // 1. Tìm thấy receiver → trả về response (happy path)
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetById_ExistingId_ShouldReturnReceiverResponse()
    {
        SetupGetById(1, MakeReceiver());

        var result = await CreateService().GetReceiverByIdAsync(1);

        result.Should().NotBeNull();
        result.ReceiverId.Should().Be(1);
        result.ReceiverCode.Should().Be("RCV001");
        result.ReceiverName.Should().Be("Test Receiver");
    }

    // ═══════════════════════════════════════════════════════════
    // 2. ID không tồn tại → throw KeyNotFoundException
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetById_NonExistingId_ShouldThrowKeyNotFound()
    {
        SetupGetById(999, null);

        Func<Task> act = () => CreateService().GetReceiverByIdAsync(999);

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Không tìm thấy người nhận*999*");
    }

    // ═══════════════════════════════════════════════════════════
    // 3. Verify tất cả fields được map đúng
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetById_ShouldMapAllFieldsCorrectly()
    {
        var receiver = MakeReceiver();
        SetupGetById(1, receiver);

        var result = await CreateService().GetReceiverByIdAsync(1);

        result.ReceiverId.Should().Be(receiver.ReceiverId);
        result.ReceiverCode.Should().Be(receiver.ReceiverCode);
        result.ReceiverName.Should().Be(receiver.ReceiverName);
        result.Phone.Should().Be(receiver.Phone);
        result.Email.Should().Be(receiver.Email);
        result.Address.Should().Be(receiver.Address);
        result.City.Should().Be(receiver.City);
        result.Ward.Should().Be(receiver.Ward);
        result.Notes.Should().Be(receiver.Notes);
        result.IsActive.Should().Be(receiver.IsActive);
    }

    // ═══════════════════════════════════════════════════════════
    // 4. ID = 0 → receiver null → throw
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetById_IdZero_ShouldThrowKeyNotFound()
    {
        SetupGetById(0, null);

        Func<Task> act = () => CreateService().GetReceiverByIdAsync(0);

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Không tìm thấy người nhận*0*");
    }

    // ═══════════════════════════════════════════════════════════
    // 5. ID = số âm -1 → receiver null → throw
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task GetById_NegativeId_ShouldThrowKeyNotFound()
    {
        SetupGetById(-1, null);

        Func<Task> act = () => CreateService().GetReceiverByIdAsync(-1);

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Không tìm thấy người nhận*-1*");
    }
}
