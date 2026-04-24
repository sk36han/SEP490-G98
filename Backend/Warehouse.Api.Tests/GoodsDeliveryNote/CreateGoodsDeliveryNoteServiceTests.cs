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
    public class CreateGoodsDeliveryNoteServiceTests : IDisposable
    {
        private readonly Mkiwms5Context _context;
        private readonly Mock<IStocktakeService> _mockStocktakeService;
        private readonly Mock<IAuditLogService> _mockAuditLogService;
        private readonly Mock<IDocumentAttachmentService> _mockAttachmentService;
        private readonly Mock<INotificationService> _mockNotificationService;
        private readonly GoodsDeliveryNoteService _service;

        public CreateGoodsDeliveryNoteServiceTests()
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
            try {
                // 1. Warehouse & User
                _context.Warehouses.Add(new Warehouse.Entities.Models.Warehouse { WarehouseId = 1, WarehouseCode = "WH001", WarehouseName = "Main WH", IsActive = true });
                _context.Users.Add(new User { UserId = 1, Username = "keeper", FullName = "Store Keeper", Email = "k@example.com", PasswordHash = "h", IsActive = true });

                // 2. Company & Receiver
                _context.Companies.Add(new Company { CompanyId = 1, CompanyCode = "C01", CompanyName = "Company 01", IsActive = true });
                _context.Receivers.Add(new Receiver { ReceiverId = 1, ReceiverName = "Receiver 01", CompanyId = 1, IsActive = true, CreatedAt = DateTime.UtcNow });

                // 3. Item & UOM
                _context.UnitOfMeasures.Add(new UnitOfMeasure { UomId = 1, UomName = "Cái" });
                _context.Items.Add(new Warehouse.Entities.Models.Item { ItemId = 1, ItemCode = "I01", ItemName = "Item 01", BaseUomId = 1, IsActive = true });

                // 4. Inventory & Lots (FIFO)
                _context.InventoryOnHands.Add(new InventoryOnHand { InventoryId = 1, WarehouseId = 1, ItemId = 1, OnHandQty = 100, ReservedQty = 0, UnitCost = 10000 });
                _context.InventoryLots.Add(new InventoryLot { LotId = 1, ItemId = 1, WarehouseId = 1, Quantity = 100, UnitCost = 10000, ExpiryDate = DateTime.Today.AddYears(1), ReceiptDate = DateTime.Today.AddDays(-10), IsActive = true });

                // 5. Approved Release Request
                var rr = new Warehouse.Entities.Models.ReleaseRequest
                {
                    ReleaseRequestId = 10,
                    ReleaseRequestCode = "RR-APPROVED-001",
                    WarehouseId = 1,
                    ReceiverId = 1,
                    Status = "APPROVED",
                    LifecycleStatus = "IssuePending",
                    RequestedBy = 1,
                    CreatedAt = DateTime.UtcNow
                };
                // Dòng RR đã duyệt 50 cái, đã xuất 0
                rr.ReleaseRequestLines.Add(new ReleaseRequestLine 
                { 
                    ReleaseRequestLineId = 100, 
                    ItemId = 1, 
                    RequestedQty = 50, 
                    ApprovedQty = 50, 
                    IssuedQty = 0, 
                    AllocatedQty = 50, 
                    UomId = 1, 
                    LineStatus = "Open", 
                    UnitCostAtIssue = 12000 // Giá chốt từ RR
                });
                _context.ReleaseRequests.Add(rr);

                _context.SaveChanges();
            }
            catch (Exception ex)
            {
                var inner = ex.InnerException?.Message ?? "";
                throw new Exception($"SeedData failed: {ex.Message}. Inner: {inner}");
            }
        }

        [Fact]
        public async Task Create_Success_ShouldCreateGDNAndAdjustRR()
        {
            // Arrange
            var request = new CreateGDNRequest
            {
                ReleaseRequestId = 10,
                WarehouseId = 1,
                IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Note = "Test GDN",
                Lines = new List<CreateGDNLineRequest>
                {
                    new CreateGDNLineRequest 
                    { 
                        ItemId = 1, 
                        ReleaseRequestLineId = 100, 
                        ActualQty = 20, 
                        RequestedQty = 50,
                        UomId = 1 
                    }
                }
            };

            // Act
            var result = await _service.CreateGDNAsync(1, request);

            // Assert
            result.GdnCode.Should().NotBeNullOrEmpty();
            result.Status.Should().Be("PENDING_ISSUE");
            result.TotalDeliveredQty.Should().Be(20);
            
            var gdnInDb = _context.GoodsDeliveryNotes.Include(g => g.GoodsDeliveryNoteLines).First(g => g.Gdnid == result.GdnId);
            gdnInDb.GoodsDeliveryNoteLines.Should().HaveCount(1);
            gdnInDb.GoodsDeliveryNoteLines.First().UnitPrice.Should().Be(12000); // Lấy giá từ RR
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenRRNotApproved()
        {
            // Arrange
            var rr = _context.ReleaseRequests.Find(10L);
            rr.Status = "DRAFT";
            _context.SaveChanges();

            var request = new CreateGDNRequest 
            { 
                ReleaseRequestId = 10, 
                WarehouseId = 1, 
                IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ActualQty = 10, UomId = 1 } }
            };

            // Act
            Func<Task> act = async () => await _service.CreateGDNAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*phải ở trạng thái APPROVED*");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenQtyExceedsRemaining()
        {
            // Arrange
            var request = new CreateGDNRequest
            {
                ReleaseRequestId = 10,
                WarehouseId = 1,
                IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Lines = new List<CreateGDNLineRequest>
                {
                    new CreateGDNLineRequest { ItemId = 1, ReleaseRequestLineId = 100, ActualQty = 60, UomId = 1 } // Duyệt 50 mà xuất 60
                }
            };

            // Act
            Func<Task> act = async () => await _service.CreateGDNAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*vượt quá lượng cho phép*");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenWarehouseFrozen()
        {
            // Arrange
            _mockStocktakeService.Setup(s => s.IsWarehouseFrozenAsync(1)).ReturnsAsync(true);
            var request = new CreateGDNRequest 
            { 
                ReleaseRequestId = 10, 
                WarehouseId = 1, 
                IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ActualQty = 10, UomId = 1 } }
            };

            // Act
            Func<Task> act = async () => await _service.CreateGDNAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*đang trong quá trình kiểm kê*");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenNoLines()
        {
            // Arrange
            var request = new CreateGDNRequest 
            { 
                ReleaseRequestId = 10, 
                WarehouseId = 1, 
                IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Lines = new List<CreateGDNLineRequest>() 
            };

            // Act
            Func<Task> act = async () => await _service.CreateGDNAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("Phải có ít nhất 1 dòng sản phẩm*");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenDuplicateItems()
        {
            // Arrange
            var request = new CreateGDNRequest
            {
                ReleaseRequestId = 10,
                WarehouseId = 1,
                IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Lines = new List<CreateGDNLineRequest>
                {
                    new CreateGDNLineRequest { ItemId = 1, ReleaseRequestLineId = 100, ActualQty = 10, UomId = 1 },
                    new CreateGDNLineRequest { ItemId = 1, ReleaseRequestLineId = 100, ActualQty = 5, UomId = 1 }
                }
            };

            // Act
            Func<Task> act = async () => await _service.CreateGDNAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*vật tư bị trùng lặp*");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenWarehouseMismatch()
        {
            // Arrange
            // RR ở kho 1, nhưng yêu cầu tạo GDN ở kho 2
            var request = new CreateGDNRequest { ReleaseRequestId = 10, WarehouseId = 2, IssueDate = DateOnly.FromDateTime(DateTime.Today), Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ActualQty = 10, UomId = 1 } } };

            // Act
            Func<Task> act = async () => await _service.CreateGDNAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*không khớp với kho trong yêu cầu*");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenIssueDateInPast()
        {
            // Arrange
            var pastDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-1));
            var request = new CreateGDNRequest { ReleaseRequestId = 10, WarehouseId = 1, IssueDate = pastDate, Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ActualQty = 10, UomId = 1 } } };

            // Act
            Func<Task> act = async () => await _service.CreateGDNAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*không được ở trong quá khứ*");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenWarehouseInactive()
        {
            // Arrange
            var wh = _context.Warehouses.Find(1L);
            wh.IsActive = false;
            _context.SaveChanges();

            var request = new CreateGDNRequest { ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today), Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ActualQty = 10, UomId = 1 } } };

            // Act
            Func<Task> act = async () => await _service.CreateGDNAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*đang không hoạt động*");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenInsufficientPhysicalStock()
        {
            // Arrange
            // Tồn kho thực tế chỉ có 5
            var inv = _context.InventoryOnHands.First(i => i.WarehouseId == 1 && i.ItemId == 1);
            inv.OnHandQty = 5;
            _context.SaveChanges();

            var request = new CreateGDNRequest
            {
                ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ReleaseRequestLineId = 100, ActualQty = 10, UomId = 1 } }
            };

            // Act
            Func<Task> act = async () => await _service.CreateGDNAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*vượt khả dụng*");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenPaymentMethodMissingOnPaid()
        {
            // Arrange
            var request = new CreateGDNRequest
            {
                ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today),
                IsPaid = true, PaymentMethod = "", // Thiếu phương thức thanh toán
                Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ReleaseRequestLineId = 100, ActualQty = 10, UomId = 1 } }
            };

            // Act
            Func<Task> act = async () => await _service.CreateGDNAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*phương thức thanh toán*");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenNoteTooLong()
        {
            // Arrange
            var longNote = new string('N', 1001);
            var request = new CreateGDNRequest
            {
                ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Note = longNote,
                Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ReleaseRequestLineId = 100, ActualQty = 10, UomId = 1 } }
            };

            // Act
            Func<Task> act = async () => await _service.CreateGDNAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*vượt quá 1000 ký tự*");
        }

        [Fact]
        public async Task Create_Draft_ShouldSucceed()
        {
            // Arrange
            var request = new CreateGDNRequest
            {
                ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Status = "DRAFT",
                Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ReleaseRequestLineId = 100, ActualQty = 10, UomId = 1 } }
            };

            // Act
            var result = await _service.CreateGDNAsync(1, request);

            // Assert
            result.Status.Should().Be("DRAFT");
        }

        [Fact]
        public async Task Create_ShouldAcceptEmptyNote()
        {
            // Arrange
            var request = new CreateGDNRequest
            {
                ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Note = "",
                Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ReleaseRequestLineId = 100, ActualQty = 10, UomId = 1 } }
            };

            // Act
            var result = await _service.CreateGDNAsync(1, request);

            // Assert
            result.Note.Should().Be("[FIFO]"); // Trim() removes the trailing space
        }

        [Fact]
        public async Task Create_ShouldAcceptWhitespaceNote()
        {
            // Arrange
            var request = new CreateGDNRequest
            {
                ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Note = " ",
                Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ReleaseRequestLineId = 100, ActualQty = 10, UomId = 1 } }
            };

            // Act
            var result = await _service.CreateGDNAsync(1, request);

            // Assert
            result.Note.Should().Be("[FIFO]"); // Trim() removes multiple spaces
        }

        [Fact]
        public async Task Create_ShouldAcceptSpecialCharNote()
        {
            // Arrange
            var request = new CreateGDNRequest
            {
                ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Note = "@!!!",
                Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ReleaseRequestLineId = 100, ActualQty = 10, UomId = 1 } }
            };

            // Act
            var result = await _service.CreateGDNAsync(1, request);

            // Assert
            result.Note.Should().Be("[FIFO] @!!!");
        }

        [Fact]
        public async Task Create_WithTransportInfo_ShouldSucceed()
        {
            // Arrange
            var request = new CreateGDNRequest
            {
                ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today),
                TransportInfo = new CreateGDNTransportInfoRequest
                {
                    CarrierName = "FastShip", DriverName = "John Doe", LicensePlate = "29A-12345"
                },
                Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ReleaseRequestLineId = 100, ActualQty = 10, UomId = 1 } }
            };

            // Act
            var result = await _service.CreateGDNAsync(1, request);

            // Assert
            var transport = _context.TransportInfos.FirstOrDefault(t => t.Gdnid == result.GdnId);
            transport.Should().NotBeNull();
            transport!.CarrierName.Should().Be("FastShip");
        }

        [Fact]
        public async Task Create_MultipleLines_ShouldSucceed()
        {
            // Arrange
            _context.Items.Add(new Warehouse.Entities.Models.Item { ItemId = 2, ItemCode = "I02", ItemName = "I02", BaseUomId = 1, IsActive = true });
            _context.InventoryOnHands.Add(new InventoryOnHand { InventoryId = 2, WarehouseId = 1, ItemId = 2, OnHandQty = 100, ReservedQty = 0, UnitCost = 5000 });
            _context.InventoryLots.Add(new InventoryLot { LotId = 2, ItemId = 2, WarehouseId = 1, Quantity = 100, UnitCost = 5000, ReceiptDate = DateTime.Today, IsActive = true });
            _context.SaveChanges();

            var request = new CreateGDNRequest
            {
                ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Lines = new List<CreateGDNLineRequest>
                {
                    new CreateGDNLineRequest { ItemId = 1, ReleaseRequestLineId = 100, ActualQty = 10, UomId = 1 },
                    new CreateGDNLineRequest { ItemId = 2, ActualQty = 5, UomId = 1 } // Dòng không theo RR
                }
            };

            // Act
            var result = await _service.CreateGDNAsync(1, request);

            // Assert
            result.TotalDeliveredQty.Should().Be(15);
            _context.GoodsDeliveryNoteLines.Where(l => l.Gdnid == result.GdnId).Should().HaveCount(2);
        }

        [Fact]
        public async Task Create_PartialDelivery_MultiGDN_ShouldSucceedAndThenFail()
        {
            // Arrange: RR 100 có 50 cái.
            // Lần 1: Xuất 20 cái
            var req1 = new CreateGDNRequest
            {
                ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ReleaseRequestLineId = 100, ActualQty = 20, UomId = 1 } }
            };
            await _service.CreateGDNAsync(1, req1);

            // Lần 2: Xuất tiếp 30 cái -> OK (Vừa đủ 50)
            var req2 = new CreateGDNRequest
            {
                ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ReleaseRequestLineId = 100, ActualQty = 30, UomId = 1 } }
            };
            var result2 = await _service.CreateGDNAsync(1, req2);
            result2.Should().NotBeNull();

            // Lần 3: Xuất tiếp 1 cái -> Fail (Vượt quá 50)
            var req3 = new CreateGDNRequest
            {
                ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ReleaseRequestLineId = 100, ActualQty = 1, UomId = 1 } }
            };
            Func<Task> act = async () => await _service.CreateGDNAsync(1, req3);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*vượt quá lượng cho phép*");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenUserInactive()
        {
            // Arrange
            var user = _context.Users.Find(1L);
            user.IsActive = false;
            _context.SaveChanges();

            var request = new CreateGDNRequest { ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today), Lines = new List<CreateGDNLineRequest>() };

            // Act
            Func<Task> act = async () => await _service.CreateGDNAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*đã bị vô hiệu hóa*");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenItemInactive()
        {
            // Arrange
            var item = _context.Items.Find(1L);
            item.IsActive = false;
            _context.SaveChanges();

            var request = new CreateGDNRequest
            {
                ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ActualQty = 10, UomId = 1 } }
            };

            // Act
            Func<Task> act = async () => await _service.CreateGDNAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*đang không hoạt động*");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenUomNotFound()
        {
            // Arrange
            var request = new CreateGDNRequest
            {
                ReleaseRequestId = 10, WarehouseId = 1, IssueDate = DateOnly.FromDateTime(DateTime.Today),
                Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ActualQty = 10, UomId = 999 } }
            };

            // Act
            Func<Task> act = async () => await _service.CreateGDNAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*đơn vị tính*không tồn tại*");
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
