using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelRequest;
using ReceiverEntity = Warehouse.Entities.Models.Receiver;
using Warehouse.DataAcces.Service.Interface;

namespace WarehouseTests.Receiver;

public class CreateReceiverServiceTests
{
    private readonly Mock<IGenericRepository<ReceiverEntity>> _repoMock = new();
    private readonly Mock<Mkiwms5Context> _contextMock = new();
    private readonly Mock<IAuditLogService> _mockAuditLogService = new();
	private ReceiverService CreateService() => new(_repoMock.Object, _contextMock.Object, _mockAuditLogService.Object);

    private CreateReceiverRequest MakeRequest(
        string code = "RCV001",
        string name = "Nguyen Van A",
        string? email = "a@test.com") => new()
    {
        ReceiverCode = code,
        ReceiverName = name,
        Email = email,
        Phone = "0909123456",
        Address = "123 Le Loi",
        City = "HCM",
        Ward = "W1",
        Notes = "Note 1"
    };

    private void SetupGetAll(params ReceiverEntity[] existing)
    {
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(existing.AsEnumerable());
    }

    [Fact]
    public async Task CreateReceiver_ValidRequest_ShouldReturnSuccessAndMapAllFields()
    {
        // Arrange
        SetupGetAll();
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<ReceiverEntity>())).ReturnsAsync((ReceiverEntity r) => r);

        var request = MakeRequest();

        // Act
        var result = await CreateService().CreateReceiverAsync(request);

        // Assert
        result.ReceiverCode.Should().Be(request.ReceiverCode);
        result.ReceiverName.Should().Be(request.ReceiverName);
        result.Email.Should().Be(request.Email);
        result.IsActive.Should().BeTrue();

        _repoMock.Verify(r => r.CreateAsync(It.Is<ReceiverEntity>(e => 
            e.ReceiverCode == request.ReceiverCode && 
            e.IsActive == true &&
            e.CreatedAt > DateTime.UtcNow.AddMinutes(-1))), Times.Once);
    }

    [Fact]
    public async Task CreateReceiver_DuplicateCode_ShouldThrowInvalidOperation()
    {
        // Arrange
        SetupGetAll(new ReceiverEntity { ReceiverCode = "DUP001" });
        var request = MakeRequest(code: "DUP001");

        // Act
        Func<Task> act = () => CreateService().CreateReceiverAsync(request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Mã người nhận đã tồn tại*");
        _repoMock.Verify(r => r.CreateAsync(It.IsAny<ReceiverEntity>()), Times.Never);
    }

    [Fact]
    public async Task CreateReceiver_OnlyRequiredFields_ShouldSucceed()
    {
        // Arrange
        SetupGetAll();
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<ReceiverEntity>())).ReturnsAsync((ReceiverEntity r) => r);

        var request = new CreateReceiverRequest
        {
            ReceiverCode = "REQ01",
            ReceiverName = "Name Only"
        };

        // Act
        var result = await CreateService().CreateReceiverAsync(request);

        // Assert
        result.ReceiverCode.Should().Be("REQ01");
        result.Phone.Should().BeNull();
    }

    [Fact]
    public async Task CreateReceiver_SpecialCharacters_ShouldBeAccepted()
    {
        // Arrange
        SetupGetAll();
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<ReceiverEntity>())).ReturnsAsync((ReceiverEntity r) => r);

        var request = MakeRequest(code: "R-@#!", name: "Receiver @ Name");

        // Act
        var result = await CreateService().CreateReceiverAsync(request);

        // Assert
        result.ReceiverCode.Should().Be("R-@#!");
        result.ReceiverName.Should().Be("Receiver @ Name");
    }

    [Fact]
    public async Task CreateReceiver_WhitespaceInput_ShouldBeStoredAsIs()
    {
        // Arrange
        SetupGetAll();
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<ReceiverEntity>())).ReturnsAsync((ReceiverEntity r) => r);

        var request = MakeRequest(code: "  RCV  ", name: "  Name  ");

        // Act
        var result = await CreateService().CreateReceiverAsync(request);

        // Assert
        // Current logic does not trim
        result.ReceiverCode.Should().Be("  RCV  ");
        result.ReceiverName.Should().Be("  Name  ");
    }

    [Fact]
    public async Task CreateReceiver_LongNotes_ShouldHandleCorrectly()
    {
        // Arrange
        SetupGetAll();
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<ReceiverEntity>())).ReturnsAsync((ReceiverEntity r) => r);

        var longNotes = new string('A', 500);
        var request = MakeRequest();
        request.Notes = longNotes;

        // Act
        var result = await CreateService().CreateReceiverAsync(request);

        // Assert
        result.Notes.Should().HaveLength(500);
    }
}
