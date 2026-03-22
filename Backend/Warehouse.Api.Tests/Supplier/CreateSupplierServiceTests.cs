using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelRequest;
using SupplierEntity = Warehouse.Entities.Models.Supplier;

namespace Warehouse.Api.Tests.SupplierServiceTests;

public class CreateSupplierServiceTests
{
    private readonly Mock<IGenericRepository<SupplierEntity>> _repoMock = new();
    private readonly Mock<INotificationService> _notifMock = new();
    private readonly Mock<IAuditLogService> _auditMock = new();

    private SupplierService CreateService() => new(_repoMock.Object, _notifMock.Object, _auditMock.Object);

    // ─── Helpers ────────────────────────────────────────────────
    private CreateSupplierRequest MakeRequest(
        string code = "SUP001",
        string name = "Supplier One",
        string? taxCode = "1234567890",
        string? phone = "0909123456",
        string? email = "one@test.com",
        string? address = "123 Street",
        string? city = "HCM",
        string? ward = "Ward 1",
        string? district = "Dist 1") => new()
    {
        SupplierCode = code,
        SupplierName = name,
        TaxCode = taxCode,
        Phone = phone,
        Email = email,
        Address = address,
        City = city,
        Ward = ward,
        District = district
    };

    private void SetupGetAll(params SupplierEntity[] existing)
    {
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(existing.AsEnumerable());
    }

    private void SetupCreatePassThrough()
    {
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<SupplierEntity>()))
            .ReturnsAsync((SupplierEntity s) => s);
    }

    // ═══════════════════════════════════════════════════════════
    // 1. Happy Path - UTCID01
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateSupplier_WithFullInfo_ShouldSucceed()
    {
        // Arrange
        SetupGetAll();
        SetupCreatePassThrough();
        var request = MakeRequest();
        var currentUserId = 100L;

        // Act
        var result = await CreateService().CreateSupplierAsync(request, currentUserId);

        // Assert
        result.SupplierCode.Should().Be(request.SupplierCode);
        _repoMock.Verify(r => r.CreateAsync(It.IsAny<SupplierEntity>()), Times.Once);
        _notifMock.Verify(n => n.CreateForRolesAsync(
            It.IsAny<IEnumerable<string>>(), 
            It.IsAny<string>(), 
            It.IsAny<string>(), 
            "SUPPLIER", 
            It.IsAny<long>(), 
            currentUserId,
            null, 0, null), Times.Once);
        
        _auditMock.Verify(a => a.LogAsync(
            currentUserId, 
            AuditAction.Create, 
            AuditEntity.Supplier, 
            It.IsAny<long>(), 
            It.IsAny<string>(), 
            null, 
            null), Times.Once);
    }

    // ═══════════════════════════════════════════════════════════
    // 2. Duplicate SupplierCode - UTCID03
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateSupplier_DuplicateCode_ShouldThrowInvalidOperation()
    {
        SetupGetAll(new SupplierEntity { SupplierCode = "SUP001", SupplierName = "Exists" });
        var request = MakeRequest(code: "SUP001");

        Func<Task> act = () => CreateService().CreateSupplierAsync(request, 1);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Mã nhà cung cấp đã tồn tại*");
    }

    // ═══════════════════════════════════════════════════════════
    // 3. Duplicate Email - UTCID_CUSTOM_01
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateSupplier_DuplicateEmail_ShouldThrowInvalidOperation()
    {
        SetupGetAll(new SupplierEntity { SupplierCode = "SUP_OLD", SupplierName = "Old", Email = "dupe@test.com" });
        var request = MakeRequest(code: "SUP002", email: "DUPE@test.com"); // Case insensitive check

        Func<Task> act = () => CreateService().CreateSupplierAsync(request, 1);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Địa chỉ email đã được sử dụng*");
    }

    // ═══════════════════════════════════════════════════════════
    // 4. Email null/empty - UTCID_CUSTOM_02
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateSupplier_EmailNullOrEmpty_ShouldSucceed()
    {
        SetupGetAll();
        SetupCreatePassThrough();
        var request = MakeRequest(email: "");

        var result = await CreateService().CreateSupplierAsync(request, 1);

        result.Email.Should().Be("");
        _repoMock.Verify(r => r.CreateAsync(It.IsAny<SupplierEntity>()), Times.Once);
    }

    // ═══════════════════════════════════════════════════════════
    // 5. Minimal Data - UTCID_CUSTOM_03
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateSupplier_MinimalRequiredData_ShouldSucceed()
    {
        SetupGetAll();
        SetupCreatePassThrough();
        var request = new CreateSupplierRequest { SupplierCode = "SUP_MIN", SupplierName = "Minimal" };

        var result = await CreateService().CreateSupplierAsync(request, 1);

        result.SupplierCode.Should().Be("SUP_MIN");
        result.SupplierName.Should().Be("Minimal");
        result.Phone.Should().BeNull();
    }

    // ═══════════════════════════════════════════════════════════
    // 6. Fields with spaces - UTCID_CUSTOM_04
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateSupplier_FieldsWithSpaces_ShouldSucceed()
    {
        SetupGetAll();
        SetupCreatePassThrough();
        var request = MakeRequest(name: "  Spaced Name  ", taxCode: " 1234567890 ");

        var result = await CreateService().CreateSupplierAsync(request, 1);

        result.SupplierName.Should().Be("  Spaced Name  "); // Currently no trim in service logic
    }

    // ═══════════════════════════════════════════════════════════
    // 7. Fields with commas - UTCID_CUSTOM_05
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateSupplier_AddressWithCommas_ShouldSucceed()
    {
        SetupGetAll();
        SetupCreatePassThrough();
        var request = MakeRequest(address: "123, ABC, Floor 4");

        var result = await CreateService().CreateSupplierAsync(request, 1);

        result.Address.Should().Be("123, ABC, Floor 4");
    }

    // ═══════════════════════════════════════════════════════════
    // 8. Verify Default Values - UTCID_CUSTOM_06
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateSupplier_ShouldSetDefaultValues()
    {
        SetupGetAll();
        SetupCreatePassThrough();
        var beforeTime = DateTime.UtcNow;
        var request = MakeRequest();

        await CreateService().CreateSupplierAsync(request, 1);
        var afterTime = DateTime.UtcNow;

        _repoMock.Verify(r => r.CreateAsync(It.Is<SupplierEntity>(s =>
            s.IsActive == true &&
            s.CreatedAt >= beforeTime &&
            s.CreatedAt <= afterTime)), Times.Once);
    }

    // ═══════════════════════════════════════════════════════════
    // 9. Database Error - UTCID06
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateSupplier_DatabaseError_ShouldThrowException()
    {
        SetupGetAll();
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<SupplierEntity>()))
            .ThrowsAsync(new Exception("DB Failure"));

        var request = MakeRequest();
        Func<Task> act = () => CreateService().CreateSupplierAsync(request, 1);

        await act.Should().ThrowAsync<Exception>().WithMessage("DB Failure");
    }

    // ═══════════════════════════════════════════════════════════
    // 10. Audit Log verify content
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateSupplier_ShouldLogProperAuditMessage()
    {
        SetupGetAll();
        SetupCreatePassThrough();
        var request = MakeRequest(name: "LogTest", code: "LT01");

        await CreateService().CreateSupplierAsync(request, 50);

        _auditMock.Verify(a => a.LogAsync(
            50,
            AuditAction.Create,
            AuditEntity.Supplier,
            It.IsAny<long>(),
            It.Is<string>(msg => msg.Contains("LogTest") && msg.Contains("LT01")),
            null,
            null), Times.Once);
    }

    // ═══════════════════════════════════════════════════════════
    // 11. Notification Role Verify
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateSupplier_ShouldNotifyCorrectRoles()
    {
        SetupGetAll();
        SetupCreatePassThrough();
        var request = MakeRequest();

        await CreateService().CreateSupplierAsync(request, 1);

        _notifMock.Verify(n => n.CreateForRolesAsync(
            It.Is<IEnumerable<string>>(roles => roles.Contains("ADMIN") && roles.Contains("GD") && roles.Contains("SALE SP")),
            It.IsAny<string>(),
            It.IsAny<string>(),
            "SUPPLIER",
            It.IsAny<long>(),
            1,
            null, 0, null), Times.Once);
    }

    // ═══════════════════════════════════════════════════════════
    // 12. SupplierCode with special chars
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateSupplier_CodeWithSpecialChars_ShouldSucceed()
    {
        SetupGetAll();
        SetupCreatePassThrough();
        var request = MakeRequest(code: "SUP-@#$!*");

        var result = await CreateService().CreateSupplierAsync(request, 1);

        result.SupplierCode.Should().Be("SUP-@#$!*");
    }

    // ═══════════════════════════════════════════════════════════
    // 13. Large data check
    // ═══════════════════════════════════════════════════════════
    [Fact]
    public async Task CreateSupplier_WithVeryLongName_ShouldSucceed()
    {
        SetupGetAll();
        SetupCreatePassThrough();
        var longName = new string('A', 255);
        var request = MakeRequest(name: longName);

        var result = await CreateService().CreateSupplierAsync(request, 1);

        result.SupplierName.Should().Be(longName);
    }
}
