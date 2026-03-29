using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelRequest;
using ReceiverEntity = Warehouse.Entities.Models.Receiver;

namespace WarehouseTests.ReceiverServiceTests;

public class UpdateReceiverServiceTests
{
    private readonly Mock<IGenericRepository<ReceiverEntity>> _repoMock = new();
    private readonly Mock<Mkiwms5Context> _contextMock = new();

    private ReceiverService CreateService() => new(_repoMock.Object, _contextMock.Object, _mockAuditLogService.Object);

    // ─── Helpers ────────────────────────────────────────────────
    private ReceiverEntity MakeExisting(
        long id = 1,
        string code = "RCV001",
        string name = "Old Name",
        string? email = "old@test.com") => new()
    {
        ReceiverId = id,
        ReceiverCode = code,
        ReceiverName = name,
        Email = email,
        Phone = "0909000000",
        Address = "Old Address",
        City = "Old City",
        Ward = "Old Ward",
        Notes = "Old Notes",
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };

    private UpdateReceiverRequest MakeUpdateRequest(
        string name = "New Name",
        string? phone = "0909111111",
        string? email = "new@test.com",
        string? address = "New Address",
        string? city = "New City",
        string? ward = "New Ward",
        string? notes = "New Notes",
        bool isActive = true) => new()
    {
        ReceiverName = name,
        Phone = phone,
        Email = email,
        Address = address,
        City = city,
        Ward = ward,
        Notes = notes,
        IsActive = isActive
    };

    private void SetupGetById(long id, ReceiverEntity? entity)
    {
        _repoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(entity!);
    }

    private void SetupGetAll(params ReceiverEntity[] items)
    {
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(items.AsEnumerable());
    }

    private void SetupUpdatePassThrough()
    {
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<ReceiverEntity>()))
            .ReturnsAsync((ReceiverEntity r) => r);
    }

    // ═══════════════════════════════════════════════════════════
    // 1. Cập nhật thành công (happy path)
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task UpdateReceiver_ValidRequest_ShouldReturnUpdatedResponse()
    {
        var existing = MakeExisting();
        SetupGetById(1, existing);
        SetupGetAll(existing);
        SetupUpdatePassThrough();

        var request = MakeUpdateRequest();
        var result = await CreateService().UpdateReceiverAsync(1, request);

        result.ReceiverName.Should().Be("New Name");
        result.Phone.Should().Be("0909111111");
        result.Email.Should().Be("new@test.com");
        result.Address.Should().Be("New Address");
        result.City.Should().Be("New City");
        result.Ward.Should().Be("New Ward");
        result.Notes.Should().Be("New Notes");
    }

    // ═══════════════════════════════════════════════════════════
    // 2. ID không tồn tại → throw KeyNotFoundException
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task UpdateReceiver_IdNotFound_ShouldThrowKeyNotFound()
    {
        SetupGetById(999, null);

        var request = MakeUpdateRequest();

        Func<Task> act = () => CreateService().UpdateReceiverAsync(999, request);

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Không tìm thấy người nhận*999*");
    }

    // ═══════════════════════════════════════════════════════════
    // 3. Email trùng với receiver khác → throw InvalidOperation
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task UpdateReceiver_DuplicateEmail_ShouldThrowInvalidOperation()
    {
        var existing = MakeExisting(id: 1, email: "old@test.com");
        var other = MakeExisting(id: 2, email: "taken@test.com");

        SetupGetById(1, existing);
        SetupGetAll(existing, other);

        var request = MakeUpdateRequest(email: "taken@test.com");

        Func<Task> act = () => CreateService().UpdateReceiverAsync(1, request);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Email đã được sử dụng bởi người nhận khác*");
    }

    // ═══════════════════════════════════════════════════════════
    // 4. Email = null → bỏ qua check duplicate
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task UpdateReceiver_EmailNull_ShouldSkipDuplicateCheck()
    {
        var existing = MakeExisting();
        SetupGetById(1, existing);
        SetupUpdatePassThrough();

        var request = MakeUpdateRequest(email: null);
        var result = await CreateService().UpdateReceiverAsync(1, request);

        result.Email.Should().BeNull();
        // GetAllAsync should NOT be called when email is null
        _repoMock.Verify(r => r.GetAllAsync(), Times.Never);
    }

    // ═══════════════════════════════════════════════════════════
    // 5. Email = whitespace "   " → bỏ qua check duplicate
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task UpdateReceiver_EmailWhitespace_ShouldSkipDuplicateCheck()
    {
        var existing = MakeExisting();
        SetupGetById(1, existing);
        SetupUpdatePassThrough();

        var request = MakeUpdateRequest(email: "   ");
        var result = await CreateService().UpdateReceiverAsync(1, request);

        result.Email.Should().Be("   ");
        _repoMock.Verify(r => r.GetAllAsync(), Times.Never);
    }

    // ═══════════════════════════════════════════════════════════
    // 6. ReceiverName = space "   "
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task UpdateReceiver_NameIsOnlySpaces_ShouldUpdateSuccessfully()
    {
        var existing = MakeExisting();
        SetupGetById(1, existing);
        SetupGetAll(existing);
        SetupUpdatePassThrough();

        var request = MakeUpdateRequest(name: "   ");
        var result = await CreateService().UpdateReceiverAsync(1, request);

        result.ReceiverName.Should().Be("   ");
    }

    // ═══════════════════════════════════════════════════════════
    // 7. Phone = "," dấu phẩy
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task UpdateReceiver_PhoneWithComma_ShouldUpdateSuccessfully()
    {
        var existing = MakeExisting();
        SetupGetById(1, existing);
        SetupGetAll(existing);
        SetupUpdatePassThrough();

        var request = MakeUpdateRequest(phone: ",");
        var result = await CreateService().UpdateReceiverAsync(1, request);

        result.Phone.Should().Be(",");
    }

    // ═══════════════════════════════════════════════════════════
    // 8. Cập nhật IsActive từ true → false
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task UpdateReceiver_ChangeIsActiveToFalse_ShouldUpdate()
    {
        var existing = MakeExisting();
        existing.IsActive = true;
        SetupGetById(1, existing);
        SetupGetAll(existing);
        SetupUpdatePassThrough();

        var request = MakeUpdateRequest(isActive: false);
        var result = await CreateService().UpdateReceiverAsync(1, request);

        result.IsActive.Should().BeFalse();
    }

    // ═══════════════════════════════════════════════════════════
    // 9. Email giống chính mình (same ID) → không bị lỗi
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task UpdateReceiver_SameEmailAsSelf_ShouldNotThrow()
    {
        var existing = MakeExisting(id: 1, email: "self@test.com");
        SetupGetById(1, existing);
        SetupGetAll(existing);
        SetupUpdatePassThrough();

        var request = MakeUpdateRequest(email: "self@test.com");
        var result = await CreateService().UpdateReceiverAsync(1, request);

        result.Email.Should().Be("self@test.com");
    }

    // ═══════════════════════════════════════════════════════════
    // 10. Email case insensitive duplicate check
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task UpdateReceiver_DuplicateEmailCaseInsensitive_ShouldThrow()
    {
        var existing = MakeExisting(id: 1, email: "old@test.com");
        var other = MakeExisting(id: 2, email: "TAKEN@TEST.COM");

        SetupGetById(1, existing);
        SetupGetAll(existing, other);

        var request = MakeUpdateRequest(email: "taken@test.com");

        Func<Task> act = () => CreateService().UpdateReceiverAsync(1, request);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Email đã được sử dụng bởi người nhận khác*");
    }

    // ═══════════════════════════════════════════════════════════
    // 11. Address = empty string
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task UpdateReceiver_AddressEmptyString_ShouldUpdateSuccessfully()
    {
        var existing = MakeExisting();
        SetupGetById(1, existing);
        SetupGetAll(existing);
        SetupUpdatePassThrough();

        var request = MakeUpdateRequest(address: "");
        var result = await CreateService().UpdateReceiverAsync(1, request);

        result.Address.Should().BeEmpty();
    }

    // ═══════════════════════════════════════════════════════════
    // 12. Cập nhật tất cả fields cùng lúc (full update)
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task UpdateReceiver_FullUpdate_ShouldMapAllFieldsCorrectly()
    {
        var existing = MakeExisting();
        SetupGetById(1, existing);
        SetupGetAll(existing);
        SetupUpdatePassThrough();

        var request = new UpdateReceiverRequest
        {
            ReceiverName = "Complete Update",
            Phone = "+84-999",
            Email = "complete@update.com",
            Address = "456 Tran Hung Dao",
            City = "Ha Noi",
            Ward = "Hoan Kiem",
            Notes = "Full update test",
            IsActive = false
        };

        var result = await CreateService().UpdateReceiverAsync(1, request);

        result.ReceiverName.Should().Be("Complete Update");
        result.Phone.Should().Be("+84-999");
        result.Email.Should().Be("complete@update.com");
        result.Address.Should().Be("456 Tran Hung Dao");
        result.City.Should().Be("Ha Noi");
        result.Ward.Should().Be("Hoan Kiem");
        result.Notes.Should().Be("Full update test");
        result.IsActive.Should().BeFalse();

        // ReceiverCode must NOT change
        result.ReceiverCode.Should().Be("RCV001");
    }
}
