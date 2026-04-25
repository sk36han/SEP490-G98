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
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.Models;
using Xunit;

namespace Warehouse.Api.Tests.GoodsDeliveryNote
{
    public class IssueGoodsDeliveryNoteServiceTests : IDisposable
    {
        private readonly Mkiwms5Context _context;
        private readonly Mock<IStocktakeService> _mockStocktakeService;
        private readonly Mock<IAuditLogService> _mockAuditLogService;
        private readonly Mock<IDocumentAttachmentService> _mockAttachmentService;
        private readonly Mock<INotificationService> _mockNotificationService;
        private readonly GoodsDeliveryNoteService _service;

        public IssueGoodsDeliveryNoteServiceTests()
        {
            var options = new DbContextOptionsBuilder<Mkiwms5Context>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new Mkiwms5Context(options);

            _mockStocktakeService = new Mock<IStocktakeService>();
            _mockAuditLogService = new Mock<IAuditLogService>();
            _mockAttachmentService = new Mock<IDocumentAttachmentService>();
            _mockNotificationService = new Mock<INotificationService>();

            _service = new GoodsDeliveryNoteService(
                _context,
                _mockStocktakeService.Object,
                _mockAuditLogService.Object,
                _mockAttachmentService.Object,
                _mockNotificationService.Object
            );

            SeedData();
        }

        private void SeedData()
        {
            // 1. Core entities
            _context.Warehouses.Add(new Warehouse.Entities.Models.Warehouse { WarehouseId = 1, WarehouseCode = "WH01", WarehouseName = "Main WH", IsActive = true });
            _context.Users.Add(new User { UserId = 1, Username = "keeper", FullName = "Store Keeper", Email = "k@example.com", PasswordHash = "h", IsActive = true });
            _context.UnitOfMeasures.Add(new UnitOfMeasure { UomId = 1, UomName = "Cái" });
            _context.Items.Add(new Warehouse.Entities.Models.Item { ItemId = 1, ItemCode = "I01", ItemName = "Item 01", BaseUomId = 1, IsActive = true });

            // 1b. Company & Receiver
            _context.Companies.Add(new Company { CompanyId = 1, CompanyCode = "C01", CompanyName = "Company 01", IsActive = true });
            _context.Receivers.Add(new Receiver { ReceiverId = 1, ReceiverName = "Receiver 01", CompanyId = 1, IsActive = true, CreatedAt = DateTime.UtcNow });

            // 2. Inventory (Stock 100, Reserved 50)
            _context.InventoryOnHands.Add(new InventoryOnHand { InventoryId = 1, WarehouseId = 1, ItemId = 1, OnHandQty = 100, ReservedQty = 50, UnitCost = 10000 });
            
            // 2 Lots for FIFO check: Lot 1 (Oldest, 30 qty), Lot 2 (Newer, 70 qty)
            _context.InventoryLots.Add(new InventoryLot { LotId = 1, ItemId = 1, WarehouseId = 1, Quantity = 30, UnitCost = 10000, ReceiptDate = DateTime.Today.AddDays(-10), IsActive = true });
            _context.InventoryLots.Add(new InventoryLot { LotId = 2, ItemId = 1, WarehouseId = 1, Quantity = 70, UnitCost = 10000, ReceiptDate = DateTime.Today.AddDays(-5), IsActive = true });

            // 3. Approved RR
            var rr = new Warehouse.Entities.Models.ReleaseRequest
            {
                ReleaseRequestId = 10,
                ReleaseRequestCode = "RR01",
                Status = "APPROVED",
                LifecycleStatus = "IssuePending",
                WarehouseId = 1,
                ReceiverId = 1,
                ReleaseRequestLines = new List<ReleaseRequestLine>
                {
                    new ReleaseRequestLine { ReleaseRequestLineId = 100, ItemId = 1, ApprovedQty = 50, IssuedQty = 0, UomId = 1, LineStatus = "Open" }
                }
            };
            _context.ReleaseRequests.Add(rr);

            // 4. GDN in PENDING_ISSUE
            var gdn = new Warehouse.Entities.Models.GoodsDeliveryNote
            {
                Gdnid = 50,
                Gdncode = "GDN01",
                ReleaseRequestId = 10,
                WarehouseId = 1,
                Status = "PENDING_ISSUE",
                CreatedBy = 1,
                GoodsDeliveryNoteLines = new List<GoodsDeliveryNoteLine>
                {
                    new GoodsDeliveryNoteLine { GdnlineId = 500, ItemId = 1, RequestedQty = 50, ActualQty = 0, UomId = 1, ReleaseRequestLineId = 100, UnitPrice = 10000 }
                }
            };
            _context.GoodsDeliveryNotes.Add(gdn);

            _context.SaveChanges();
        }

        [Fact]
        public async Task Issue_Full_ShouldSucceedAndDeductStockCorrectly()
        {
            // Arrange
            var request = new WarehouseIssueRequest { IsAllItemsFulfilled = true, Note = "Full issue confirm" };

            // Act
            var result = await _service.IssueGDNAsync(50, 1, request);

            // Assert
            result.Status.Should().Be("ISSUED");
            
            // Check Stock Reduction
            var inv = _context.InventoryOnHands.First(i => i.ItemId == 1);
            inv.OnHandQty.Should().Be(50); // 100 - 50
            inv.ReservedQty.Should().Be(0);   // 50 - 50

            // Check FIFO Lot reduction
            var lot1 = _context.InventoryLots.Find(1L);
            var lot2 = _context.InventoryLots.Find(2L);
            lot1!.Quantity.Should().Be(0);
            lot1.IsActive.Should().BeFalse();
            lot2!.Quantity.Should().Be(50); // Lot 1 (30) + Lot 2 (20) = 50

            // Check RR Update
            var rrLine = _context.ReleaseRequestLines.Find(100L);
            rrLine!.IssuedQty.Should().Be(50);
            rrLine.LineStatus.Should().Be("IssueFull");

            // Check Transactions
            _context.InventoryTransactions.Should().Contain(t => t.ReferenceId == 50 && t.TxnType == "OUTBOUND");
            _context.InventoryTransactionLines.Should().HaveCount(2); // 2 lots used
        }

        [Fact]
        public async Task Issue_Partial_ShouldSucceedAndAddNote()
        {
            // Arrange
            var request = new WarehouseIssueRequest
            {
                Lines = new List<WarehouseIssueLineRequest>
                {
                    new WarehouseIssueLineRequest { GdnLineId = 500, ActualQty = 30 } // Only issue 30/50
                },
                Note = "Partial supply"
            };

            // Act
            var result = await _service.IssueGDNAsync(50, 1, request);

            // Assert
            result.Status.Should().Be("ISSUED");
            result.Note.Should().Contain("Xuất thiếu 20");
            result.TotalDeliveredQty.Should().Be(30);

            // Check Stock
            var inv = _context.InventoryOnHands.First(i => i.ItemId == 1);
            inv.OnHandQty.Should().Be(70); // 100 - 30
            inv.ReservedQty.Should().Be(20); // 50 - 30 (Remaining 20 reserved for future GDNs)

            // Check RR
            var rrLine = _context.ReleaseRequestLines.Find(100L);
            rrLine!.IssuedQty.Should().Be(30);
            rrLine.LineStatus.Should().Be("IssuePartial");
        }

        [Fact]
        public async Task Issue_ShouldThrow_WhenQtyExceedsRequested()
        {
            // Arrange
            var request = new WarehouseIssueRequest
            {
                Lines = new List<WarehouseIssueLineRequest>
                {
                    new WarehouseIssueLineRequest { GdnLineId = 500, ActualQty = 60 } // Approved 50, trying to issue 60
                }
            };

            // Act
            Func<Task> act = async () => await _service.IssueGDNAsync(50, 1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*không được vượt quá số lượng ban đầu*");
        }

        [Fact]
        public async Task Issue_ShouldThrow_WhenInvalidStatus()
        {
            // Arrange
            var gdn = _context.GoodsDeliveryNotes.Find(50L);
            gdn.Status = "ISSUED";
            _context.SaveChanges();

            // Act
            Func<Task> act = async () => await _service.IssueGDNAsync(50, 1, new WarehouseIssueRequest { IsAllItemsFulfilled = true });

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*không ở trạng thái chờ xuất hàng*");
        }

        [Fact]
        public async Task Issue_ShouldThrow_WhenWarehouseFrozen()
        {
            // Arrange
            _mockStocktakeService.Setup(s => s.IsWarehouseFrozenAsync(1)).ReturnsAsync(true);

            // Act
            Func<Task> act = async () => await _service.IssueGDNAsync(50, 1, new WarehouseIssueRequest { IsAllItemsFulfilled = true });

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*đang trong quá trình kiểm kê*");
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
