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
    public class ApproveReleaseRequestServiceTests : IDisposable
    {
        private readonly Mkiwms5Context _context;
        private readonly Mock<IStocktakeService> _mockStocktakeService;
        private readonly Mock<INotificationService> _mockNotificationService;
        private readonly Mock<IAuditLogService> _mockAuditLogService;
        private readonly Mock<IDocumentAttachmentService> _mockAttachmentService;
        private readonly ReleaseRequestService _service;

        public ApproveReleaseRequestServiceTests()
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
            _context.Warehouses.Add(new Warehouse.Entities.Models.Warehouse { WarehouseId = 1, WarehouseCode = "WH001", WarehouseName = "Main WH", IsActive = true });

            // Seed Roles & Users
            var accountantRole = new Role { RoleId = 1, RoleCode = UserRoleConstants.Accountant, RoleName = "Accountant" };
            _context.Roles.Add(accountantRole);
            _context.Users.Add(new User 
            { 
                UserId = 1, Username = "acc", FullName = "Acc User", Email = "acc@example.com", PasswordHash = "h", IsActive = true,
                UserRoleUser = new UserRole { RoleId = 1, Role = accountantRole }
            });
            _context.Users.Add(new User { UserId = 2, Username = "req", FullName = "Requester", Email = "req@example.com", PasswordHash = "h", IsActive = true });

            // Seed Company & Receiver
            _context.Companies.Add(new Company { CompanyId = 1, CompanyCode = "C01", CompanyName = "C01", IsActive = true });
            _context.Receivers.Add(new Receiver { ReceiverId = 1, ReceiverName = "R01", CompanyId = 1, IsActive = true });

            // Seed Item & UOM
            _context.UnitOfMeasures.Add(new UnitOfMeasure { UomId = 1, UomName = "Cái" });
            _context.Items.Add(new Warehouse.Entities.Models.Item { ItemId = 1, ItemCode = "I01", ItemName = "I01", BaseUomId = 1, IsActive = true });

            // Seed Inventory: Có 100, đang giữ 20 (cho RR 10)
            _context.InventoryOnHands.Add(new InventoryOnHand { InventoryId = 1, WarehouseId = 1, ItemId = 1, OnHandQty = 100, ReservedQty = 20 });

            // Seed Release Request (Pending Account)
            var rr = new Warehouse.Entities.Models.ReleaseRequest
            {
                ReleaseRequestId = 10,
                ReleaseRequestCode = "RR-PENDING",
                WarehouseId = 1,
                ReceiverId = 1,
                Status = "PENDING_ACC",
                LifecycleStatus = "IssuePending",
                RequestedBy = 2,
                CreatedAt = DateTime.UtcNow
            };
            rr.ReleaseRequestLines.Add(new ReleaseRequestLine { ReleaseRequestLineId = 100, ItemId = 1, RequestedQty = 20, AllocatedQty = 20, UomId = 1, LineStatus = "Open" });
            _context.ReleaseRequests.Add(rr);

            _context.SaveChanges();
        }

        [Fact]
        public async Task Approve_Success_ShouldUpdateStatusAndAdjustStock()
        {
            // Arrange
            // Thêm chứng từ bắt buộc
            _context.DocumentAttachments.Add(new DocumentAttachment { DocType = "GIR", DocId = 10, AttachmentType = "QUOTATION", FileName = "q.pdf", FileUrlOrPath = "..." });
            _context.DocumentAttachments.Add(new DocumentAttachment { DocType = "GIR", DocId = 10, AttachmentType = "CONTRACT", FileName = "c.pdf", FileUrlOrPath = "..." });
            _context.SaveChanges();

            var request = new ApproveReleaseRequest
            {
                IsApproved = true,
                Lines = new List<ApproveReleaseRequestLine>
                {
                    new ApproveReleaseRequestLine { ReleaseRequestLineId = 100, ApprovedQty = 15 } // Duyệt 15/20
                }
            };

            // Act
            var result = await _service.ApproveReleaseRequestAsync(10, 1, request);

            // Assert
            result.Status.Should().Be("APPROVED");
            var line = _context.ReleaseRequestLines.Find(100L);
            line.ApprovedQty.Should().Be(15);
            line.AllocatedQty.Should().Be(15);

            // Tồn kho: 20 (cũ) - 20 (allocated cũ) + 15 (allocated mới) = 15
            var inv = _context.InventoryOnHands.First(i => i.WarehouseId == 1 && i.ItemId == 1);
            inv.ReservedQty.Should().Be(15);
        }

        [Fact]
        public async Task Approve_Reject_ShouldReleaseStock()
        {
            // Arrange
            var request = new ApproveReleaseRequest
            {
                IsApproved = false,
                Reason = "Wrong documents"
            };

            // Act
            var result = await _service.ApproveReleaseRequestAsync(10, 1, request);

            // Assert
            result.Status.Should().Be("REJECTED");
            // Tồn kho: 20 (cũ) - 20 (giải phóng) = 0
            var inv = _context.InventoryOnHands.First(i => i.WarehouseId == 1 && i.ItemId == 1);
            inv.ReservedQty.Should().Be(0);
        }

        [Fact]
        public async Task Approve_ShouldThrow_WhenNoReasonOnReject()
        {
            // Arrange
            var request = new ApproveReleaseRequest { IsApproved = false, Reason = "" };

            // Act
            Func<Task> act = async () => await _service.ApproveReleaseRequestAsync(10, 1, request);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("Bắt buộc phải nhập lý do khi từ chối yêu cầu.");
        }

        [Fact]
        public async Task Approve_ShouldThrow_WhenMissingAttachments()
        {
            // Arrange
            var request = new ApproveReleaseRequest { IsApproved = true };

            // Act
            Func<Task> act = async () => await _service.ApproveReleaseRequestAsync(10, 1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("Không thể duyệt: Thiếu tài liệu Báo giá.");
        }

        [Fact]
        public async Task Approve_ShouldThrow_WhenStatusNotPendingAcc()
        {
            // Arrange
            var rr = _context.ReleaseRequests.Find(10L);
            rr.Status = "DRAFT";
            _context.SaveChanges();

            var request = new ApproveReleaseRequest { IsApproved = true };

            // Act
            Func<Task> act = async () => await _service.ApproveReleaseRequestAsync(10, 1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*không ở trạng thái chờ duyệt*");
        }

        [Fact]
        public async Task Approve_ShouldThrow_WhenQtyExceedsRequested()
        {
            // Arrange
            _context.DocumentAttachments.Add(new DocumentAttachment { DocType = "GIR", DocId = 10, AttachmentType = "QUOTATION", FileName = "q.pdf", FileUrlOrPath = "..." });
            _context.DocumentAttachments.Add(new DocumentAttachment { DocType = "GIR", DocId = 10, AttachmentType = "CONTRACT", FileName = "c.pdf", FileUrlOrPath = "..." });
            _context.SaveChanges();

            var request = new ApproveReleaseRequest
            {
                IsApproved = true,
                Lines = new List<ApproveReleaseRequestLine>
                {
                    new ApproveReleaseRequestLine { ReleaseRequestLineId = 100, ApprovedQty = 25 } // Yêu cầu có 20 mà duyệt 25
                }
            };

            // Act
            Func<Task> act = async () => await _service.ApproveReleaseRequestAsync(10, 1, request);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*không được vượt quá số lượng yêu cầu*");
        }

        [Fact]
        public async Task Approve_ShouldThrow_WhenRRNotFound()
        {
            // Arrange
            var request = new ApproveReleaseRequest { IsApproved = true };

            // Act
            Func<Task> act = async () => await _service.ApproveReleaseRequestAsync(999, 1, request);

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("Không tìm thấy yêu cầu xuất kho.");
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
