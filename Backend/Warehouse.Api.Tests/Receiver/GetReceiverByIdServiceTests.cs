using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
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
    private readonly Mkiwms5Context _context;
    private readonly Mock<IAuditLogService> _mockAuditLogService = new();

    public GetReceiverByIdServiceTests()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new Mkiwms5Context(options);
    }

    private ReceiverService CreateService() => new(_repoMock.Object, _context, _mockAuditLogService.Object);

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
        District = "D1",
        Notes = "Notes",
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };

    [Fact]
    public async Task GetById_ValidId_ShouldReturnMappedResponse()
    {
        // Arrange
        var receiver = MakeReceiver(1);
        _context.Receivers.Add(receiver);
        _context.SaveChanges();

        // Act
        var result = await CreateService().GetReceiverByIdAsync(1);

        // Assert
        result.Should().NotBeNull();
        result.ReceiverId.Should().Be(1);
        result.ReceiverCode.Should().Be("RCV-001");
        result.ReceiverName.Should().Be("Test Receiver");
        result.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task GetById_NonExistingId_ShouldThrowKeyNotFound()
    {
        // Act
        Func<Task> act = () => CreateService().GetReceiverByIdAsync(99);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*ID = 99*");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(long.MaxValue)]
    public async Task GetById_BoundaryIds_ShouldHandleNullCorrectly(long testId)
    {
        // Act
        Func<Task> act = () => CreateService().GetReceiverByIdAsync(testId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
