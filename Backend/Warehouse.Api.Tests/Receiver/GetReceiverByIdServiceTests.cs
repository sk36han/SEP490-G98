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

public class GetReceiverByIdServiceTests
{
    private readonly Mock<IGenericRepository<ReceiverEntity>> _repoMock = new();
    private readonly Mock<Mkiwms5Context> _contextMock = new();
	private readonly Mock<IAuditLogService> _mockAuditLogService = new();
	private ReceiverService CreateService() => new(_repoMock.Object, _contextMock.Object, _mockAuditLogService.Object);

    private ReceiverEntity MakeReceiver(long id = 1) => new()
    {
        ReceiverId = id,
        ReceiverCode = "RCV-001",
        ReceiverName = "Test Receiver",
        Phone = "0909123",
        Email = "rcv@test.com",
        Address = "123 Street",
        City = "HCM",
        Ward = "W1",
        District = "D1", // Entity has District
        Notes = "Notes",
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };

    private void SetupGetById(long id, ReceiverEntity? entity)
    {
        _repoMock.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(entity!);
    }

    [Fact]
    public async Task GetById_ValidId_ShouldReturnMappedResponse()
    {
        // Arrange
        var receiver = MakeReceiver(1);
        SetupGetById(1, receiver);

        // Act
        var result = await CreateService().GetReceiverByIdAsync(1);

        // Assert
        result.Should().NotBeNull();
        result.ReceiverId.Should().Be(1);
        result.ReceiverCode.Should().Be("RCV-001");
        result.ReceiverName.Should().Be("Test Receiver");
        result.Phone.Should().Be("0909123");
        result.Email.Should().Be("rcv@test.com");
        result.Address.Should().Be("123 Street");
        result.City.Should().Be("HCM");
        result.Ward.Should().Be("W1");
        result.Notes.Should().Be("Notes");
        result.IsActive.Should().BeTrue();
        // District is NOT in ReceiverResponse, so no assertion here.
    }

    [Fact]
    public async Task GetById_NonExistingId_ShouldThrowKeyNotFound()
    {
        // Arrange
        SetupGetById(99, null);

        // Act
        Func<Task> act = () => CreateService().GetReceiverByIdAsync(99);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*ID = 99*");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(long.MaxValue)]
    public async Task GetById_BoundaryIds_ShouldRequestRepoAndHandleNullCorrectly(long testId)
    {
        // Arrange
        SetupGetById(testId, null);

        // Act
        Func<Task> act = () => CreateService().GetReceiverByIdAsync(testId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
        _repoMock.Verify(r => r.GetByIdAsync(testId), Times.Once);
    }
}
