using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelRequest;
using ReceiverEntity = Warehouse.Entities.Models.Receiver;

namespace WarehouseTests.ReceiverServiceTests;

public class CreateReceiverServiceTests
{
    private readonly Mock<IGenericRepository<ReceiverEntity>> _repoMock = new();
    private readonly Mock<Mkiwms5Context> _contextMock = new();

    private ReceiverService CreateService() => new(_repoMock.Object, _contextMock.Object);

    // ─── Helpers ────────────────────────────────────────────────
    private CreateReceiverRequest MakeRequest(
        string code = "RCV001",
        string name = "Nguyen Van A",
        string? phone = "0909123456",
        string? email = "a@test.com",
        string? address = "123 Le Loi",
        string? city = "Ho Chi Minh",
        string? ward = "Phuong 1",
        string? notes = "Ghi chu") => new()
    {
        ReceiverCode = code,
        ReceiverName = name,
        Phone = phone,
        Email = email,
        Address = address,
        City = city,
        Ward = ward,
        Notes = notes
    };

    private void SetupGetAll(params ReceiverEntity[] existing)
    {
        _repoMock.Setup(r => r.GetAllAsync())
            .ReturnsAsync(existing.AsEnumerable());
    }

    private void SetupCreatePassThrough()
    {
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<ReceiverEntity>()))
            .ReturnsAsync((ReceiverEntity r) => r);
    }

    // ═══════════════════════════════════════════════════════════
    // 1. Happy path – tạo thành công với đầy đủ thông tin
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateReceiver_WithFullInfo_ShouldReturnSuccess()
    {
        SetupGetAll();
        SetupCreatePassThrough();

        var request = MakeRequest();
        var result = await CreateService().CreateReceiverAsync(request);

        result.ReceiverCode.Should().Be("RCV001");
        result.ReceiverName.Should().Be("Nguyen Van A");
        result.Phone.Should().Be("0909123456");
        result.Email.Should().Be("a@test.com");
        result.Address.Should().Be("123 Le Loi");
        result.City.Should().Be("Ho Chi Minh");
        result.Ward.Should().Be("Phuong 1");
        result.Notes.Should().Be("Ghi chu");
        result.IsActive.Should().BeTrue();
    }

    // ═══════════════════════════════════════════════════════════
    // 2. Tạo thành công chỉ với required fields (Code + Name)
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateReceiver_WithOnlyRequiredFields_ShouldReturnSuccess()
    {
        SetupGetAll();
        SetupCreatePassThrough();

        var request = MakeRequest(phone: null, email: null, address: null, city: null, ward: null, notes: null);
        var result = await CreateService().CreateReceiverAsync(request);

        result.ReceiverCode.Should().Be("RCV001");
        result.ReceiverName.Should().Be("Nguyen Van A");
        result.Phone.Should().BeNull();
        result.Email.Should().BeNull();
        result.Address.Should().BeNull();
        result.City.Should().BeNull();
        result.Ward.Should().BeNull();
        result.Notes.Should().BeNull();
    }

    // ═══════════════════════════════════════════════════════════
    // 3. ReceiverCode trùng → throw InvalidOperationException
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateReceiver_DuplicateCode_ShouldThrowInvalidOperation()
    {
        SetupGetAll(new ReceiverEntity { ReceiverId = 1, ReceiverCode = "RCV001", ReceiverName = "Existing" });

        var request = MakeRequest(code: "RCV001");

        Func<Task> act = () => CreateService().CreateReceiverAsync(request);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Mã người nhận đã tồn tại*");
    }

    // ═══════════════════════════════════════════════════════════
    // 4. ReceiverCode chỉ có space "   "
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateReceiver_CodeIsOnlySpaces_ShouldCreateSuccessfully()
    {
        // Service hiện tại không trim/validate space → nó vẫn tạo được
        SetupGetAll();
        SetupCreatePassThrough();

        var request = MakeRequest(code: "   ");
        var result = await CreateService().CreateReceiverAsync(request);

        result.ReceiverCode.Should().Be("   ");
    }

    // ═══════════════════════════════════════════════════════════
    // 5. ReceiverName chỉ có space "   "
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateReceiver_NameIsOnlySpaces_ShouldCreateSuccessfully()
    {
        SetupGetAll();
        SetupCreatePassThrough();

        var request = MakeRequest(name: "   ");
        var result = await CreateService().CreateReceiverAsync(request);

        result.ReceiverName.Should().Be("   ");
    }

    // ═══════════════════════════════════════════════════════════
    // 6. ReceiverCode chứa dấu phẩy ","
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateReceiver_CodeContainsComma_ShouldCreateSuccessfully()
    {
        SetupGetAll();
        SetupCreatePassThrough();

        var request = MakeRequest(code: "RCV,001");
        var result = await CreateService().CreateReceiverAsync(request);

        result.ReceiverCode.Should().Be("RCV,001");
    }

    // ═══════════════════════════════════════════════════════════
    // 7. Email chứa space
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateReceiver_EmailWithSpaces_ShouldCreateSuccessfully()
    {
        SetupGetAll();
        SetupCreatePassThrough();

        var request = MakeRequest(email: " a@ test .com ");
        var result = await CreateService().CreateReceiverAsync(request);

        result.Email.Should().Be(" a@ test .com ");
    }

    // ═══════════════════════════════════════════════════════════
    // 8. Phone chứa ký tự đặc biệt
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateReceiver_PhoneWithSpecialChars_ShouldCreateSuccessfully()
    {
        SetupGetAll();
        SetupCreatePassThrough();

        var request = MakeRequest(phone: "+84(909)123-456");
        var result = await CreateService().CreateReceiverAsync(request);

        result.Phone.Should().Be("+84(909)123-456");
    }

    // ═══════════════════════════════════════════════════════════
    // 9. IsActive luôn = true khi tạo mới
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateReceiver_ShouldAlwaysSetIsActiveTrue()
    {
        SetupGetAll();
        SetupCreatePassThrough();

        var request = MakeRequest();
        var result = await CreateService().CreateReceiverAsync(request);

        result.IsActive.Should().BeTrue();

        // Verify entity passed to repo had IsActive = true
        _repoMock.Verify(r => r.CreateAsync(
            It.Is<ReceiverEntity>(e => e.IsActive == true)),
            Times.Once);
    }

    // ═══════════════════════════════════════════════════════════
    // 10. CreatedAt được set tự động (≈ UtcNow)
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateReceiver_ShouldSetCreatedAtToUtcNow()
    {
        SetupGetAll();
        SetupCreatePassThrough();

        var before = DateTime.UtcNow;
        var request = MakeRequest();
        await CreateService().CreateReceiverAsync(request);
        var after = DateTime.UtcNow;

        _repoMock.Verify(r => r.CreateAsync(
            It.Is<ReceiverEntity>(e =>
                e.CreatedAt >= before && e.CreatedAt <= after)),
            Times.Once);
    }

    // ═══════════════════════════════════════════════════════════
    // 11. Notes rất dài (boundary)
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateReceiver_WithVeryLongNotes_ShouldCreateSuccessfully()
    {
        SetupGetAll();
        SetupCreatePassThrough();

        var longNotes = new string('A', 1000);
        var request = MakeRequest(notes: longNotes);
        var result = await CreateService().CreateReceiverAsync(request);

        result.Notes.Should().HaveLength(1000);
    }

    // ═══════════════════════════════════════════════════════════
    // 12. Tất cả optional fields = null (minimal creation)
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateReceiver_AllOptionalFieldsNull_ShouldCreateSuccessfully()
    {
        SetupGetAll();
        SetupCreatePassThrough();

        var request = new CreateReceiverRequest
        {
            ReceiverCode = "RCV999",
            ReceiverName = "Minimal"
        };

        var result = await CreateService().CreateReceiverAsync(request);

        result.ReceiverCode.Should().Be("RCV999");
        result.ReceiverName.Should().Be("Minimal");
        result.Phone.Should().BeNull();
        result.Email.Should().BeNull();
        result.Address.Should().BeNull();
        result.City.Should().BeNull();
        result.Ward.Should().BeNull();
        result.Notes.Should().BeNull();
        result.IsActive.Should().BeTrue();
    }
}
