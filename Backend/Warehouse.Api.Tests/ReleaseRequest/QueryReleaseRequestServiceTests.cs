using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Xunit;

namespace Warehouse.Api.Tests.ReleaseRequest
{
    public class QueryReleaseRequestServiceTests : IDisposable
    {
        private readonly Mkiwms5Context _context;
        private readonly ReleaseRequestService _service;

        public QueryReleaseRequestServiceTests()
        {
            var options = new DbContextOptionsBuilder<Mkiwms5Context>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new Mkiwms5Context(options);

            // Mock dependencies not needed for simple queries
            _service = new ReleaseRequestService(
                _context, 
                null!, null!, null!, null!);

            SeedData();
        }

        private void SeedData()
        {
            _context.Warehouses.Add(new Warehouse.Entities.Models.Warehouse { WarehouseId = 1, WarehouseCode = "W1", WarehouseName = "W1", IsActive = true });
            _context.Users.Add(new User { UserId = 1, Username = "u1", FullName = "U1", Email = "u1@example.com", PasswordHash = "h", IsActive = true });
            _context.Companies.Add(new Company { CompanyId = 1, CompanyCode = "C1", CompanyName = "C1", IsActive = true });
            _context.Receivers.Add(new Receiver { ReceiverId = 1, ReceiverName = "R1", CompanyId = 1, IsActive = true });

            _context.ReleaseRequests.Add(new Warehouse.Entities.Models.ReleaseRequest
            {
                ReleaseRequestId = 1,
                ReleaseRequestCode = "RR-001",
                WarehouseId = 1,
                ReceiverId = 1,
                RequestedBy = 1,
                Status = "DRAFT",
                LifecycleStatus = "IssuePending",
                CreatedAt = DateTime.UtcNow
            });

            _context.SaveChanges();
        }

        [Fact]
        public async Task GetById_ShouldReturnDetail_WhenExists()
        {
            // Act
            var result = await _service.GetReleaseRequestByIdAsync(1);

            // Assert
            result.Should().NotBeNull();
            result!.ReleaseRequestCode.Should().Be("RR-001");
        }

        [Fact]
        public async Task GetById_ShouldReturnNull_WhenNotExists()
        {
            // Act
            var result = await _service.GetReleaseRequestByIdAsync(999);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetList_ShouldReturnPagedResponse()
        {
            // Act
            var result = await _service.GetReleaseRequestsAsync(1, 10);

            // Assert
            result.Items.Should().HaveCount(1);
            result.TotalItems.Should().Be(1);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
