using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.Models;
using Xunit;

namespace Warehouse.Api.Tests.GoodsDeliveryNote
{
    public class ConfirmDeliveryGoodsDeliveryNoteServiceTests : IDisposable
    {
        private readonly Mkiwms5Context _context;
        private readonly Mock<IStocktakeService> _mockStocktakeService;
        private readonly Mock<IAuditLogService> _mockAuditLogService;
        private readonly Mock<IDocumentAttachmentService> _mockAttachmentService;
        private readonly Mock<INotificationService> _mockNotificationService;
        private readonly GoodsDeliveryNoteService _service;

        public ConfirmDeliveryGoodsDeliveryNoteServiceTests()
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
            _context.Users.Add(new User { UserId = 1, Username = "accountant", FullName = "Accountant User", Email = "a@example.com", PasswordHash = "h", IsActive = true });
            _context.Companies.Add(new Company { CompanyId = 1, CompanyCode = "C01", CompanyName = "Company 01", IsActive = true });
            _context.Receivers.Add(new Receiver { ReceiverId = 1, ReceiverName = "Receiver 01", CompanyId = 1, IsActive = true, CreatedAt = DateTime.UtcNow });

            // 2. Approved RR
            var rr = new Warehouse.Entities.Models.ReleaseRequest
            {
                ReleaseRequestId = 10,
                ReleaseRequestCode = "RR01",
                Status = "APPROVED",
                LifecycleStatus = "Issued",
                WarehouseId = 1,
                ReceiverId = 1
            };
            _context.ReleaseRequests.Add(rr);

            // 3. GDN in ISSUED status (ready for confirm delivery)
            var gdn = new Warehouse.Entities.Models.GoodsDeliveryNote
            {
                Gdnid = 50,
                Gdncode = "GDN01",
                ReleaseRequestId = 10,
                WarehouseId = 1,
                Status = "ISSUED",
                CreatedBy = 1,
                Note = "Initial note"
            };
            _context.GoodsDeliveryNotes.Add(gdn);

            _context.SaveChanges();
        }

        private IFormFile CreateMockFile(string fileName, long length = 100)
        {
            var fileMock = new Mock<IFormFile>();
            var content = "fake file content";
            var ms = new MemoryStream();
            var writer = new StreamWriter(ms);
            writer.Write(content);
            writer.Flush();
            ms.Position = 0;

            fileMock.Setup(_ => _.FileName).Returns(fileName);
            fileMock.Setup(_ => _.Length).Returns(length > 0 ? length : ms.Length);
            fileMock.Setup(_ => _.OpenReadStream()).Returns(ms);
            fileMock.Setup(_ => _.ContentType).Returns("image/png");
            return fileMock.Object;
        }

        [Fact]
        public async Task ConfirmDelivery_Success_ShouldUpdateStatusAndUploadFile()
        {
            // Arrange
            var file = CreateMockFile("evidence.png");
            _mockAttachmentService.Setup(s => s.UploadAttachmentAsync(
                "GDN", 50, file, 1, "EVIDENCE"
            )).ReturnsAsync("http://storage.com/evidence.png");

            // Act
            var result = await _service.ConfirmDeliveryAsync(50, 1, file, "Signed by customer");

            // Assert
            result.Status.Should().Be("POSTED");
            result.Note.Should().Contain("Minh chứng: Signed by customer");
            result.PostedAt.Should().NotBeNull();

            // Verify secondary services
            _mockAttachmentService.Verify(s => s.UploadAttachmentAsync("GDN", 50, file, 1, "EVIDENCE"), Times.Once);
            _mockAuditLogService.Verify(s => s.LogAsync(
                1, 
                AuditAction.Close, 
                AuditEntity.GoodsDeliveryNote, 
                50, 
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>()
            ), Times.Once);

            _mockNotificationService.Verify(s => s.CreateAsync(
                It.IsAny<long>(), 
                It.IsAny<string>(), 
                It.IsAny<string>(), 
                "GoodsDelivery", 
                50, 
                It.IsAny<string>(), 
                It.IsAny<byte>(),
                It.IsAny<DateTime?>()
            ), Times.Once);

            // Check Document Approval record
            var approval = _context.DocumentApprovals.FirstOrDefault(a => a.DocId == 50 && a.Decision == "POSTED");
            approval.Should().NotBeNull();
            approval!.StageNo.Should().Be(4);
        }

        [Fact]
        public async Task ConfirmDelivery_ShouldThrow_WhenInvalidStatus()
        {
            // Arrange
            var gdn = _context.GoodsDeliveryNotes.Find(50L);
            gdn.Status = "PENDING_ISSUE"; // Not issued yet
            _context.SaveChanges();

            // Act
            Func<Task> act = async () => await _service.ConfirmDeliveryAsync(50, 1, CreateMockFile("test.png"), "note");

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Cần phải ở trạng thái ISSUED*");
        }

        [Fact]
        public async Task ConfirmDelivery_ShouldThrow_WhenFileIsNull()
        {
            // Act
            Func<Task> act = async () => await _service.ConfirmDeliveryAsync(50, 1, null, "note");

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Bắt buộc phải tải lên ảnh chụp*");
        }

        [Fact]
        public async Task ConfirmDelivery_ShouldThrow_WhenGDNNotFound()
        {
            // Act
            Func<Task> act = async () => await _service.ConfirmDeliveryAsync(999, 1, CreateMockFile("test.png"), "note");

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*Không tìm thấy phiếu xuất kho*");
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
