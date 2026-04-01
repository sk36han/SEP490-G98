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
        string name = "Nguyen Van A",
        string? email = "a@test.com") => new()
    {
        ReceiverName = name,
        Email = email,
        Phone = "0909123456",
        Address = "123 Le Loi",
        City = "HCM",
        Ward = "W1",
        Notes = "Note 1",
        CompanyId = 1
    };

    private void SetupGetAll(params ReceiverEntity[] existing)
    {
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(existing.AsEnumerable());
    }

    [Fact]
    public async Task CreateReceiver_ValidRequest_ShouldReturnSuccessAndMapAllFields()
    {
        // Arrange
        SetupGetAll(); // Không có DB, sinh ra RCV-00001
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<ReceiverEntity>())).ReturnsAsync((ReceiverEntity r) => r);

        var request = MakeRequest();

        // Act
        var result = await CreateService().CreateReceiverAsync(request);

        // Assert
        result.ReceiverCode.Should().Be("RCV-00001");
        result.ReceiverName.Should().Be(request.ReceiverName);
        result.Email.Should().Be(request.Email);
        result.IsActive.Should().BeTrue();

        _repoMock.Verify(r => r.CreateAsync(It.Is<ReceiverEntity>(e => 
            e.ReceiverCode == "RCV-00001" && 
            e.IsActive == true &&
            e.CreatedAt > DateTime.UtcNow.AddMinutes(-1))), Times.Once);
    }

    // Đã xóa test trùng vì ID hiện tại tự sinh

    [Fact]
    public async Task CreateReceiver_OnlyRequiredFields_ShouldSucceed()
    {
        // Arrange
        SetupGetAll(new ReceiverEntity { ReceiverCode = "RCV-00005" }); // RCV-00005 có sẵn
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<ReceiverEntity>())).ReturnsAsync((ReceiverEntity r) => r);

        var request = new CreateReceiverRequest
        {
            ReceiverName = "Name Only",
            CompanyId = 1
        };

        // Act
        var result = await CreateService().CreateReceiverAsync(request);

        // Assert
        result.ReceiverCode.Should().Be("RCV-00006"); // Tự sinh
        result.Phone.Should().BeNull();
    }

    // Đã xóa các Test về gán ReceiverCode lỗi/special char do frontend không gửi lên nữa

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
