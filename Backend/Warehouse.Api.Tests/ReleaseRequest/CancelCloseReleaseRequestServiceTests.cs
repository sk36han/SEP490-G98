using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.Models;
using Xunit;

namespace Warehouse.Api.Tests.ReleaseRequest
{
    public class CancelCloseReleaseRequestServiceTests : IDisposable
    {
        private readonly Mkiwms5Context _context;
        private readonly Mock<IStocktakeService> _mockStocktakeService;
        private readonly Mock<INotificationService> _mockNotificationService;
        private readonly Mock<IAuditLogService> _mockAuditLogService;
        private readonly Mock<IDocumentAttachmentService> _mockAttachmentService;
        private readonly ReleaseRequestService _service;

        public CancelCloseReleaseRequestServiceTests()
        {
            var options = new DbContextOptionsBuilder<Mkiwms5Context>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new Mkiwms5Context(options);

            _mockStocktakeService = new Mock<IStocktakeService>();
            _mockNotificationService = new Mock<INotificationService>();
            _mockAuditLogService = new Mock<IAuditLogService>();
            _mockAttachmentService = new Mock<IDocumentAttachmentService>();

            _service = new ReleaseRequestService(
                _context, 
                _mockStocktakeService.Object, 
                _mockNotificationService.Object, 
                _mockAuditLogService.Object, 
                _mockAttachmentService.Object);

            SeedData();
        }

        private void SeedData()
        {
            // Warehouse
            _context.Warehouses.Add(new Warehouse.Entities.Models.Warehouse { WarehouseId = 1, WarehouseCode = "WH001", WarehouseName = "WH001", IsActive = true });
            
            // User
            _context.Users.Add(new User { UserId = 1, Username = "u1", FullName = "U1", Email = "u1@example.com", PasswordHash = "h", IsActive = true });

            // Receiver
            _context.Companies.Add(new Company { CompanyId = 1, CompanyCode = "C1", CompanyName = "C1", IsActive = true });
            _context.Receivers.Add(new Receiver { ReceiverId = 1, ReceiverName = "R1", CompanyId = 1, IsActive = true });

            // Item & Inventory
            _context.Items.Add(new Warehouse.Entities.Models.Item { ItemId = 1, ItemCode = "I01", ItemName = "I01", IsActive = true });
            _context.InventoryOnHands.Add(new InventoryOnHand { InventoryId = 1, WarehouseId = 1, ItemId = 1, OnHandQty = 100, ReservedQty = 50 });

            // RR 1: PENDING_ACC
            var rr1 = new Warehouse.Entities.Models.ReleaseRequest
            {
                ReleaseRequestId = 1,
                ReleaseRequestCode = "RR-001",
                WarehouseId = 1,
                ReceiverId = 1,
                Status = "PENDING_ACC",
                LifecycleStatus = "IssuePending",
                RequestedBy = 1,
                CreatedAt = DateTime.UtcNow
            };
            rr1.ReleaseRequestLines.Add(new ReleaseRequestLine { ReleaseRequestLineId = 1, ItemId = 1, RequestedQty = 50, AllocatedQty = 50, IssuedQty = 0, UomId = 1, LineStatus = "Open" });
            _context.ReleaseRequests.Add(rr1);

            // RR 2: APPROVED
            var rr2 = new Warehouse.Entities.Models.ReleaseRequest
            {
                ReleaseRequestId = 2,
                ReleaseRequestCode = "RR-002",
                WarehouseId = 1,
                ReceiverId = 1,
                Status = "APPROVED",
                LifecycleStatus = "IssuePartial",
                RequestedBy = 1,
                CreatedAt = DateTime.UtcNow
            };
            rr2.ReleaseRequestLines.Add(new ReleaseRequestLine { ReleaseRequestLineId = 2, ItemId = 1, RequestedQty = 50, AllocatedQty = 50, IssuedQty = 30, UomId = 1, LineStatus = "Open" });
            _context.ReleaseRequests.Add(rr2);

            try
            {
                _context.SaveChanges();
            }
            catch (Exception ex)
            {
                throw new Exception($"SeedData failed: {ex.InnerException?.Message ?? ex.Message}");
            }
        }

        [Fact]
        public async Task Cancel_ShouldReleaseAllReservedQty()
        {
            // Act
            var result = await _service.CancelReleaseRequestAsync(1, 1);

            // Assert
            result.Should().BeTrue();
            var rr = _context.ReleaseRequests.Find(1L);
            rr.Status.Should().Be("CANCELLED");

            var inv = _context.InventoryOnHands.First(i => i.WarehouseId == 1 && i.ItemId == 1);
            inv.ReservedQty.Should().Be(0);
        }

        [Fact]
        public async Task Close_ShouldReleaseRemainingReservedQty()
        {
            // Act
            var result = await _service.CloseReleaseRequestAsync(2, 1);

            // Assert
            result.Should().BeTrue();
            var rr = _context.ReleaseRequests.Find(2L);
            rr.Status.Should().Be("CLOSED");

            var inv = _context.InventoryOnHands.First(i => i.WarehouseId == 1 && i.ItemId == 1);
            inv.ReservedQty.Should().Be(30); 
        }

        [Fact]
        public async Task Close_ShouldThrow_WhenStatusNotApproved()
        {
            // Act
            Func<Task> act = async () => await _service.CloseReleaseRequestAsync(1, 1);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("Chỉ có thể đóng yêu cầu xuất kho đang ở trạng thái đã duyệt (APPROVED).");
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
