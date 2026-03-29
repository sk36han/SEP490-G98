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

namespace WarehouseTests.Receiver;

public class UpdateReceiverServiceTests
{
    private readonly Mock<IGenericRepository<ReceiverEntity>> _repoMock = new();
    private readonly Mock<Mkiwms5Context> _contextMock = new();

    private ReceiverService CreateService() => new(_repoMock.Object, _contextMock.Object, _mockAuditLogService.Object);

    [Fact]
    public async Task UpdateReceiver_ShouldSucceed_AndMapAllFields()
    {
        // Arrange
        var existing = new ReceiverEntity { ReceiverId = 1, ReceiverCode = "RCV01", ReceiverName = "Old Name", IsActive = true };
        var request = new UpdateReceiverRequest
        {
            ReceiverName = "New Name",
            Phone = "0123456789",
            Email = "new@test.com",
            Address = "123 St",
            City = "HCM",
            Ward = "Ward 1",
            Notes = "Updated Notes",
            IsActive = false
        };

        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<ReceiverEntity> { existing });

        // Act
        var result = await CreateService().UpdateReceiverAsync(1, request);

        // Assert
        result.ReceiverName.Should().Be("New Name");
        result.Email.Should().Be("new@test.com");
        result.City.Should().Be("HCM");
        result.IsActive.Should().BeFalse();
        
        _repoMock.Verify(r => r.UpdateAsync(It.Is<ReceiverEntity>(e => 
            e.ReceiverName == "New Name" && 
            e.Email == "new@test.com" &&
            e.City == "HCM" &&
            e.IsActive == false)), Times.Once);
    }

    [Fact]
    public async Task UpdateReceiver_DuplicateEmail_ShouldThrowInvalidOperation()
    {
        // Arrange
        var receiver1 = new ReceiverEntity { ReceiverId = 1, Email = "r1@test.com" };
        var receiver2 = new ReceiverEntity { ReceiverId = 2, Email = "r2@test.com" };
        
        var request = new UpdateReceiverRequest { Email = "r2@test.com", ReceiverName = "Update R1" };

        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(receiver1);
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<ReceiverEntity> { receiver1, receiver2 });

        // Act
        Func<Task> act = () => CreateService().UpdateReceiverAsync(1, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Email đã được sử dụng*");
    }

    [Fact]
    public async Task UpdateReceiver_SameEmailAsCurrent_ShouldSucceed()
    {
        // Arrange
        var existing = new ReceiverEntity { ReceiverId = 1, Email = "same@test.com" };
        var request = new UpdateReceiverRequest { Email = "same@test.com", ReceiverName = "New Name" };

        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<ReceiverEntity> { existing });

        // Act
        var result = await CreateService().UpdateReceiverAsync(1, request);

        // Assert
        result.Email.Should().Be("same@test.com");
    }

    [Fact]
    public async Task UpdateReceiver_NonExistingId_ShouldThrowKeyNotFound()
    {
        // Arrange
        _repoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((ReceiverEntity?)null);

        // Act
        Func<Task> act = () => CreateService().UpdateReceiverAsync(99, new UpdateReceiverRequest());

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*ID = 99*");
    }

    [Fact]
    public async Task UpdateReceiver_SpecialCharactersAndWhitespace_ShouldPreserveData()
    {
        // Arrange
        var existing = new ReceiverEntity { ReceiverId = 1, ReceiverName = "Old" };
        var request = new UpdateReceiverRequest
        {
            ReceiverName = "  Name with @#$% & Emojis \ud83d\ude80  ",
            Address = "Line 1\nLine 2\tTabbed",
            Notes = "!@#$%^&*()_+{}|:\"<>?",
            IsActive = true
        };

        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<ReceiverEntity> { existing });

        // Act
        var result = await CreateService().UpdateReceiverAsync(1, request);

        // Assert
        result.ReceiverName.Should().Be(request.ReceiverName); // Whitespace should be preserved if not trimmed in service
        result.Address.Should().Be(request.Address);
        result.Notes.Should().Be(request.Notes);
    }
}
