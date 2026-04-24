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

namespace Warehouse.Api.Tests.ReleaseRequest
{
    public class CreateReleaseRequestServiceTests : IDisposable
    {
        private readonly Mkiwms5Context _context;
        private readonly Mock<IStocktakeService> _mockStocktakeService;
        private readonly Mock<INotificationService> _mockNotificationService;
        private readonly Mock<IAuditLogService> _mockAuditLogService;
        private readonly Mock<IDocumentAttachmentService> _mockAttachmentService;
        private readonly ReleaseRequestService _service;

        public CreateReleaseRequestServiceTests()
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
            // Seed Warehouse
            _context.Warehouses.Add(new Warehouse.Entities.Models.Warehouse 
            { 
                WarehouseId = 1, 
                WarehouseCode = "WH001",
                WarehouseName = "Main Warehouse", 
                IsActive = true 
            });
            _context.Warehouses.Add(new Warehouse.Entities.Models.Warehouse 
            { 
                WarehouseId = 2, 
                WarehouseCode = "WH002",
                WarehouseName = "Inactive Warehouse", 
                IsActive = false 
            });
            
            // Seed Company & Receiver
            _context.Companies.Add(new Company { CompanyId = 1, CompanyCode = "COMP01", CompanyName = "Test Corp 1", IsActive = true });
            _context.Companies.Add(new Company { CompanyId = 2, CompanyCode = "COMP02", CompanyName = "Test Corp 2", IsActive = true });

            _context.Receivers.Add(new Receiver { ReceiverId = 1, ReceiverName = "Active Receiver C1", CompanyId = 1, IsActive = true });
            _context.Receivers.Add(new Receiver { ReceiverId = 2, ReceiverName = "Inactive Receiver C1", CompanyId = 1, IsActive = false });
            _context.Receivers.Add(new Receiver { ReceiverId = 3, ReceiverName = "Active Receiver C2", CompanyId = 2, IsActive = true });
            
            // Seed Address
            _context.Addresses.Add(new Address { AddressId = 1, AddressName = "Addr C1", AddressDetail = "123 St", CompanyId = 1, IsActive = true });
            _context.Addresses.Add(new Address { AddressId = 2, AddressName = "Addr C2", AddressDetail = "456 St", CompanyId = 2, IsActive = true });

            // Seed User
            _context.Users.Add(new User 
            { 
                UserId = 1, 
                Username = "admin",
                PasswordHash = "hash",
                Email = "admin@example.com",
                FullName = "Admin User",
                IsActive = true
            });

            // Seed UOM & Packaging
            _context.UnitOfMeasures.Add(new UnitOfMeasure { UomId = 1, UomName = "Cái" });
            _context.PackagingSpecs.Add(new PackagingSpec { PackagingSpecId = 1, SpecName = "Box" });

            // Seed Item
            _context.Items.Add(new Warehouse.Entities.Models.Item 
            { 
                ItemId = 1, 
                ItemCode = "ITEM01", 
                ItemName = "Active Item", 
                IsActive = true, 
                PackagingSpecId = 1,
                BaseUomId = 1
            });
            _context.Items.Add(new Warehouse.Entities.Models.Item 
            { 
                ItemId = 2, 
                ItemCode = "ITEM02", 
                ItemName = "Inactive Item", 
                IsActive = false, 
                PackagingSpecId = 1,
                BaseUomId = 1
            });

            // Seed Inventory
            _context.InventoryOnHands.Add(new InventoryOnHand 
            { 
                InventoryId = 1,
                WarehouseId = 1, 
                ItemId = 1, 
                OnHandQty = 100, 
                ReservedQty = 0, 
                UnitCost = 1000 
            });

            _context.SaveChanges();
        }

        [Fact]
        public async Task Create_Draft_ShouldSucceed_WithoutReservingStock()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1,
                ReceiverId = 1,
                CompanyId = 1,
                Status = "DRAFT",
                Lines = new List<CreateReleaseRequestLineRequest>
                {
                    new CreateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 10, UomId = 1 }
                }
            };

            // Act
            var result = await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            result.Should().NotBeNull();
            result.Status.Should().Be("DRAFT");
            
            var inventory = _context.InventoryOnHands.First(i => i.ItemId == 1 && i.WarehouseId == 1);
            inventory.ReservedQty.Should().Be(0); // DRAFT không giữ hàng
        }

        [Fact]
        public async Task Create_Pending_ShouldSucceed_AndReserveStock()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1,
                ReceiverId = 1,
                CompanyId = 1,
                Status = "PENDING_ACC",
                IsPartialDeliveryAllowed = false,
                Lines = new List<CreateReleaseRequestLineRequest>
                {
                    new CreateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 15, UomId = 1 }
                }
            };

            // Act
            var result = await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            result.Status.Should().Be("PENDING_ACC");
            var inventory = _context.InventoryOnHands.First(i => i.ItemId == 1 && i.WarehouseId == 1);
            inventory.ReservedQty.Should().Be(15); // Đã giữ 15
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenWarehouseNotFound()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest { WarehouseId = 99, ReceiverId = 1 };

            // Act
            Func<Task> act = async () => await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("Không tìm thấy kho xuất.");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenWarehouseInactive()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest { WarehouseId = 2, ReceiverId = 1 };

            // Act
            Func<Task> act = async () => await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("Kho xuất đang không hoạt động.");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenReceiverInactive()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest { WarehouseId = 1, ReceiverId = 2, CompanyId = 1 };

            // Act
            Func<Task> act = async () => await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("Người nhận đang không hoạt động.");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenItemInactive()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1,
                ReceiverId = 1,
                CompanyId = 1,
                Lines = new List<CreateReleaseRequestLineRequest>
                {
                    new CreateReleaseRequestLineRequest { ItemId = 2, RequestedQty = 10, UomId = 1 }
                }
            };

            // Act
            Func<Task> act = async () => await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("Có vật tư đang không hoạt động.");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenDuplicateItems()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1,
                ReceiverId = 1,
                CompanyId = 1,
                Lines = new List<CreateReleaseRequestLineRequest>
                {
                    new CreateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 10, UomId = 1 },
                    new CreateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 5, UomId = 1 }
                }
            };

            // Act
            Func<Task> act = async () => await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("Một vật tư không được xuất hiện nhiều hơn 1 lần.");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenInsufficientStock_AndNoPartialAllowed()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1,
                ReceiverId = 1,
                CompanyId = 1,
                Status = "PENDING_ACC",
                IsPartialDeliveryAllowed = false,
                Lines = new List<CreateReleaseRequestLineRequest>
                {
                    new CreateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 200, UomId = 1 } // Vượt quá 100 trong kho
                }
            };

            // Act
            Func<Task> act = async () => await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*không đủ số lượng khả dụng*");
        }

        [Fact]
        public async Task Create_PartialAllowed_ShouldReserveAvailableOnly()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1,
                ReceiverId = 1,
                CompanyId = 1,
                Status = "PENDING_ACC",
                IsPartialDeliveryAllowed = true, // Cho phép giao từng phần
                Lines = new List<CreateReleaseRequestLineRequest>
                {
                    new CreateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 150, UomId = 1 } // Kho chỉ có 100
                }
            };

            // Act
            var result = await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            result.Status.Should().Be("PENDING_ACC");
            var inventory = _context.InventoryOnHands.First(i => i.ItemId == 1 && i.WarehouseId == 1);
            inventory.ReservedQty.Should().Be(100); // Chỉ giữ tối đa 100
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenWarehouseFrozen()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest { WarehouseId = 1, ReceiverId = 1 };
            _mockStocktakeService.Setup(s => s.IsWarehouseFrozenAsync(1)).ReturnsAsync(true);

            // Act
            Func<Task> act = async () => await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*đang trong quá trình kiểm kê*");
        }

        [Fact]
        public async Task Create_ShouldAcceptEmptyPurpose()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1, ReceiverId = 1, CompanyId = 1, Status = "DRAFT",
                Purpose = "",
                Lines = new List<CreateReleaseRequestLineRequest> { new CreateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 10, UomId = 1 } }
            };

            // Act
            var result = await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            result.Purpose.Should().Be("");
        }

        [Fact]
        public async Task Create_ShouldAcceptWhitespacePurpose()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1, ReceiverId = 1, CompanyId = 1, Status = "DRAFT",
                Purpose = " ",
                Lines = new List<CreateReleaseRequestLineRequest> { new CreateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 10, UomId = 1 } }
            };

            // Act
            var result = await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            result.Purpose.Should().Be(" ");
        }

        [Fact]
        public async Task Create_ShouldAcceptAtSymbolPurpose()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1, ReceiverId = 1, CompanyId = 1, Status = "DRAFT",
                Purpose = " @",
                Lines = new List<CreateReleaseRequestLineRequest> { new CreateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 10, UomId = 1 } }
            };

            // Act
            var result = await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            result.Purpose.Should().Be(" @");
        }

        [Fact]
        public async Task Create_ShouldAcceptExclamationPurpose()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1, ReceiverId = 1, CompanyId = 1, Status = "DRAFT",
                Purpose = "!!!",
                Lines = new List<CreateReleaseRequestLineRequest> { new CreateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 10, UomId = 1 } }
            };

            // Act
            var result = await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            result.Purpose.Should().Be("!!!");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenReceiverDoesNotBelongToCompany()
        {
            // Arrange
            // Receiver 1 thuộc Company 1. Chúng ta truyền CompanyId = 2
            var request = new CreateReleaseRequestRequest { WarehouseId = 1, ReceiverId = 1, CompanyId = 2 };

            // Act
            Func<Task> act = async () => await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("Người nhận không thuộc công ty đã chọn.");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenAddressNotFound()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest { WarehouseId = 1, ReceiverId = 1, AddressId = 99 };

            // Act
            Func<Task> act = async () => await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("Không tìm thấy địa chỉ đã chọn.");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenAddressDoesNotBelongToCompany()
        {
            // Arrange
            // Receiver 3 thuộc Company 2. Address 1 thuộc Company 1. Truyền CompanyId = 2
            var request = new CreateReleaseRequestRequest { WarehouseId = 1, ReceiverId = 3, CompanyId = 2, AddressId = 1 };

            // Act
            Func<Task> act = async () => await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("Địa chỉ không thuộc công ty đã chọn.");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenRequestedUserNotFound()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest { WarehouseId = 1, ReceiverId = 1 };

            // Act
            Func<Task> act = async () => await _service.CreateReleaseRequestAsync(99, request); // UserId 99 không tồn tại

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("Không tìm thấy người tạo yêu cầu.");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenItemNotFound()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1, ReceiverId = 1, CompanyId = 1,
                Lines = new List<CreateReleaseRequestLineRequest> { new CreateReleaseRequestLineRequest { ItemId = 99, RequestedQty = 10, UomId = 1 } }
            };

            // Act
            Func<Task> act = async () => await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("Có vật tư không tồn tại trong hệ thống.");
        }

        [Fact]
        public async Task Create_ShouldThrow_WhenUomNotFound()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1, ReceiverId = 1, CompanyId = 1,
                Lines = new List<CreateReleaseRequestLineRequest> { new CreateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 10, UomId = 99 } }
            };

            // Act
            Func<Task> act = async () => await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("Có đơn vị tính không tồn tại trong hệ thống.");
        }

        [Fact]
        public async Task Create_ShouldDefaultToPendingAcc_WhenStatusIsNull()
        {
            // Arrange
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1, ReceiverId = 1, CompanyId = 1,
                Status = null, // Không truyền status
                Lines = new List<CreateReleaseRequestLineRequest> { new CreateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 5, UomId = 1 } }
            };

            // Act
            var result = await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            result.Status.Should().Be("PENDING_ACC");
        }

        [Fact]
        public async Task Create_ShouldAcceptPurposeExceedingMaxLength()
        {
            // Arrange
            // Purpose có MaxLength(250) ở Entity/Model. Ta nhồi 300 ký tự.
            string exceedinglyLongPurpose = new string('A', 300); 
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1, ReceiverId = 1, CompanyId = 1, Status = "DRAFT",
                Purpose = exceedinglyLongPurpose,
                Lines = new List<CreateReleaseRequestLineRequest> { new CreateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 10, UomId = 1 } }
            };

            // Act
            var result = await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            // Do InMemoryDatabase không tự chặn MaxLength, nó vẫn sẽ lưu thành công ở mức Service
            result.Purpose.Should().Be(exceedinglyLongPurpose);
        }

        [Fact]
        public async Task Create_ShouldAcceptLineNoteExceedingMaxLengthAndSpecialChars()
        {
            // Arrange
            // Note có MaxLength(500). Ta nhồi 600 ký tự với @ và khoảng trắng
            string specialLongNote = new string('@', 300) + " " + new string('X', 299); 
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1, ReceiverId = 1, CompanyId = 1, Status = "DRAFT",
                Lines = new List<CreateReleaseRequestLineRequest> 
                { 
                    new CreateReleaseRequestLineRequest 
                    { 
                        ItemId = 1, 
                        RequestedQty = 10, 
                        UomId = 1,
                        Note = specialLongNote
                    } 
                }
            };

            // Act
            var result = await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            var line = _context.ReleaseRequestLines.First(l => l.ReleaseRequestId == result.ReleaseRequestId);
            line.Note.Should().Be(specialLongNote);
        }

        [Fact]
        public async Task Create_ShouldAcceptStatusExceedingMaxLength()
        {
            // Arrange
            // Status có MaxLength(30). Ta nhồi 50 ký tự
            string exceedinglyLongStatus = new string('S', 50); 
            var request = new CreateReleaseRequestRequest
            {
                WarehouseId = 1, ReceiverId = 1, CompanyId = 1,
                Status = exceedinglyLongStatus,
                Lines = new List<CreateReleaseRequestLineRequest> { new CreateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 10, UomId = 1 } }
            };

            // Act
            var result = await _service.CreateReleaseRequestAsync(1, request);

            // Assert
            result.Status.Should().Be(exceedinglyLongStatus);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
