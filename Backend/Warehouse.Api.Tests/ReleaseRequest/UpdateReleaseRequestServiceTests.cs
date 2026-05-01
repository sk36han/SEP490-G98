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
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Hosting;
using Xunit;

namespace Warehouse.Api.Tests.ReleaseRequest
{
	public class UpdateReleaseRequestServiceTests : IDisposable
	{
		private readonly Mkiwms5Context _context;
		private readonly Mock<IStocktakeService> _mockStocktakeService;
		private readonly Mock<INotificationService> _mockNotificationService;
		private readonly Mock<IAuditLogService> _mockAuditLogService;
		private readonly Mock<IDocumentAttachmentService> _mockAttachmentService;
		private readonly Mock<IConfiguration> _mockConfiguration;
		private readonly Mock<IWebHostEnvironment> _mockHostEnvironment;
		private readonly ReleaseRequestService _service;

		public UpdateReleaseRequestServiceTests()
		{
			var options = new DbContextOptionsBuilder<Mkiwms5Context>()
				.UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
				.Options;
			_context = new Mkiwms5Context(options);

			_mockStocktakeService = new Mock<IStocktakeService>();
			_mockNotificationService = new Mock<INotificationService>();
			_mockAuditLogService = new Mock<IAuditLogService>();
			_mockAttachmentService = new Mock<IDocumentAttachmentService>();
			_mockConfiguration = new Mock<IConfiguration>();
			_mockHostEnvironment = new Mock<IWebHostEnvironment>();

			_service = new ReleaseRequestService(
				_context,
				_mockStocktakeService.Object,
				_mockNotificationService.Object,
				_mockAuditLogService.Object,
				_mockAttachmentService.Object,
				_mockConfiguration.Object,
				_mockHostEnvironment.Object);

			SeedData();
		}

		private void SeedData()
		{
			// Seed Warehouses
			var wh1 = new Warehouse.Entities.Models.Warehouse { WarehouseId = 1, WarehouseCode = "WH001", WarehouseName = "Main WH", IsActive = true };
			_context.Warehouses.Add(wh1);
			_context.Warehouses.Add(new Warehouse.Entities.Models.Warehouse { WarehouseId = 2, WarehouseCode = "WH002", WarehouseName = "Second WH", IsActive = true });

			// Seed User
			_context.Users.Add(new User { UserId = 1, Username = "admin", FullName = "Admin User", Email = "admin@example.com", PasswordHash = "hash", IsActive = true });

			// Seed Company & Receiver
			_context.Companies.Add(new Company { CompanyId = 1, CompanyCode = "C01", CompanyName = "Company 01", IsActive = true });
			_context.Receivers.Add(new Receiver { ReceiverId = 1, ReceiverName = "Receiver 01", CompanyId = 1, IsActive = true });

			// Seed Item & UOM
			_context.UnitOfMeasures.Add(new UnitOfMeasure { UomId = 1, UomName = "Cái" });
			_context.Items.Add(new Warehouse.Entities.Models.Item { ItemId = 1, ItemCode = "I01", ItemName = "Item 01", BaseUomId = 1, IsActive = true });
			_context.Items.Add(new Warehouse.Entities.Models.Item { ItemId = 2, ItemCode = "I02", ItemName = "Item 02", BaseUomId = 1, IsActive = true });

			// Seed Inventory
			var inv1 = new InventoryOnHand { InventoryId = 1, WarehouseId = 1, ItemId = 1, OnHandQty = 100, ReservedQty = 10 };
			_context.InventoryOnHands.Add(inv1);
			_context.InventoryOnHands.Add(new InventoryOnHand { InventoryId = 2, WarehouseId = 1, ItemId = 2, OnHandQty = 50, ReservedQty = 0 });
			_context.InventoryOnHands.Add(new InventoryOnHand { InventoryId = 3, WarehouseId = 2, ItemId = 1, OnHandQty = 200, ReservedQty = 0 });

			// Seed Existing Release Request (Status: DRAFT)
			var rr1 = new Warehouse.Entities.Models.ReleaseRequest
			{
				ReleaseRequestId = 1,
				ReleaseRequestCode = "RR-001",
				WarehouseId = 1,
				ReceiverId = 1,
				Status = "DRAFT",
				LifecycleStatus = "IssuePending",
				RequestedBy = 1,
				CreatedAt = DateTime.UtcNow
			};
			rr1.ReleaseRequestLines.Add(new ReleaseRequestLine { ReleaseRequestLineId = 1, ItemId = 1, RequestedQty = 10, AllocatedQty = 0, UomId = 1, LineStatus = "Open" });
			_context.ReleaseRequests.Add(rr1);

			// Seed Existing Release Request (Status: PENDING_ACC)
			var rr2 = new Warehouse.Entities.Models.ReleaseRequest
			{
				ReleaseRequestId = 2,
				ReleaseRequestCode = "RR-002",
				WarehouseId = 1,
				ReceiverId = 1,
				Status = "PENDING_ACC",
				LifecycleStatus = "IssuePending",
				RequestedBy = 1,
				CreatedAt = DateTime.UtcNow
			};
			rr2.ReleaseRequestLines.Add(new ReleaseRequestLine { ReleaseRequestLineId = 2, ItemId = 1, RequestedQty = 20, AllocatedQty = 20, UomId = 1, LineStatus = "Open" });
			_context.ReleaseRequests.Add(rr2);

			// Cập nhật ReservedQty cho RR2
			inv1.ReservedQty += 20;

			_context.SaveChanges();
		}

		[Fact]
		public async Task Update_BasicInfo_InDraft_ShouldSucceed()
		{
			// Arrange
			var request = new UpdateReleaseRequestRequest
			{
				Purpose = "Updated Purpose",
				ExpectedDate = DateOnly.FromDateTime(DateTime.Today.AddDays(7))
			};

			// Act
			var result = await _service.UpdateReleaseRequestAsync(1, 1, request);

			// Assert
			result.Purpose.Should().Be("Updated Purpose");
			var rr = _context.ReleaseRequests.Find(1L);
			rr.Purpose.Should().Be("Updated Purpose");
		}

		[Fact]
		public async Task Update_ShouldThrow_WhenStatusNotEditable()
		{
			// Arrange
			var rr = _context.ReleaseRequests.Find(1L);
			rr.Status = "APPROVED";
			_context.SaveChanges();

			var request = new UpdateReleaseRequestRequest { Purpose = "Try to update" };

			// Act
			Func<Task> act = async () => await _service.UpdateReleaseRequestAsync(1, 1, request);

			// Assert
			await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("Chỉ có thể sửa yêu cầu xuất kho đang ở trạng thái chờ duyệt hoặc nháp.");
		}

		[Fact]
		public async Task Update_ChangeLines_ShouldAdjustReservedQty()
		{
			// Arrange
			var request = new UpdateReleaseRequestRequest
			{
				Lines = new List<UpdateReleaseRequestLineRequest>
				{
					new UpdateReleaseRequestLineRequest { ReleaseRequestLineId = 2, ItemId = 1, RequestedQty = 5, UomId = 1 },
					new UpdateReleaseRequestLineRequest { ItemId = 2, RequestedQty = 10, UomId = 1 }
				}
			};

			// Act
			await _service.UpdateReleaseRequestAsync(2, 1, request);

			// Assert
			var invItem1 = _context.InventoryOnHands.First(i => i.WarehouseId == 1 && i.ItemId == 1);
			var invItem2 = _context.InventoryOnHands.First(i => i.WarehouseId == 1 && i.ItemId == 2);

			invItem1.ReservedQty.Should().Be(15); // 30 - 20 + 5
			invItem2.ReservedQty.Should().Be(10);
		}

		[Fact]
		public async Task Update_ChangeWarehouse_ShouldTransferReservedQty()
		{
			// Arrange
			var request = new UpdateReleaseRequestRequest
			{
				WarehouseId = 2,
				Lines = new List<UpdateReleaseRequestLineRequest>
				{
					new UpdateReleaseRequestLineRequest { ReleaseRequestLineId = 2, ItemId = 1, RequestedQty = 20, UomId = 1 }
				}
			};

			// Act
			await _service.UpdateReleaseRequestAsync(2, 1, request);

			// Assert
			var invWh1 = _context.InventoryOnHands.First(i => i.WarehouseId == 1 && i.ItemId == 1);
			var invWh2 = _context.InventoryOnHands.First(i => i.WarehouseId == 2 && i.ItemId == 1);

			invWh1.ReservedQty.Should().Be(10); // 30 - 20
			invWh2.ReservedQty.Should().Be(20);
		}

		[Fact]
		public async Task Update_SubmitForApproval_ShouldCheckAttachments()
		{
			// Arrange
			var request = new UpdateReleaseRequestRequest { Status = "PENDING_ACC" };

			// Act
			Func<Task> act = async () => await _service.UpdateReleaseRequestAsync(1, 1, request);

			// Assert
			await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("Vui lòng tải lên tài liệu Báo giá trước khi gửi duyệt.");

			_context.DocumentAttachments.Add(new DocumentAttachment { DocType = "GIR", DocId = 1, AttachmentType = "QUOTATION", FileName = "q.pdf", FileUrlOrPath = "..." });
			_context.SaveChanges();

			await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("Vui lòng tải lên tài liệu Hợp đồng trước khi gửi duyệt.");
		}

		[Fact]
		public async Task Update_ShouldThrow_WhenInsufficientStock()
		{
			// Arrange
			var request = new UpdateReleaseRequestRequest
			{
				IsPartialDeliveryAllowed = false,
				Lines = new List<UpdateReleaseRequestLineRequest>
				{
					new UpdateReleaseRequestLineRequest { ReleaseRequestLineId = 2, ItemId = 1, RequestedQty = 150, UomId = 1 }
				}
			};

			// Act
			Func<Task> act = async () => await _service.UpdateReleaseRequestAsync(2, 1, request);

			// Assert
			await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*không đủ số lượng khả dụng*");
		}

		[Fact]
		public async Task Update_ShouldThrow_WhenRRNotFound()
		{
			// Arrange
			var request = new UpdateReleaseRequestRequest { Purpose = "Update" };

			// Act
			Func<Task> act = async () => await _service.UpdateReleaseRequestAsync(999, 1, request);

			// Assert
			await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("Không tìm thấy yêu cầu xuất kho.");
		}

		[Fact]
		public async Task Update_ShouldThrow_WhenWarehouseFrozen()
		{
			// Arrange
			_mockStocktakeService.Setup(s => s.IsWarehouseFrozenAsync(1)).ReturnsAsync(true);
			var request = new UpdateReleaseRequestRequest { Purpose = "Update" };

			// Act
			Func<Task> act = async () => await _service.UpdateReleaseRequestAsync(1, 1, request);

			// Assert
			await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*đang trong quá trình kiểm kê*");
		}

		[Fact]
		public async Task Update_ShouldThrow_WhenDuplicateItems()
		{
			// Arrange
			var request = new UpdateReleaseRequestRequest
			{
				Lines = new List<UpdateReleaseRequestLineRequest>
				{
					new UpdateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 10, UomId = 1 },
					new UpdateReleaseRequestLineRequest { ItemId = 1, RequestedQty = 5, UomId = 1 }
				}
			};

			// Act
			Func<Task> act = async () => await _service.UpdateReleaseRequestAsync(1, 1, request);

			// Assert
			await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("Một vật tư không được xuất hiện nhiều hơn 1 lần.");
		}

		[Fact]
		public async Task Update_ShouldThrow_WhenItemNotFound()
		{
			// Arrange
			var request = new UpdateReleaseRequestRequest
			{
				Lines = new List<UpdateReleaseRequestLineRequest>
				{
					new UpdateReleaseRequestLineRequest { ItemId = 999, RequestedQty = 10, UomId = 1 }
				}
			};

			// Act
			Func<Task> act = async () => await _service.UpdateReleaseRequestAsync(1, 1, request);

			// Assert
			await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("Có vật tư không tồn tại trong hệ thống.");
		}

		[Fact]
		public async Task Update_ShouldAcceptEmptyPurpose()
		{
			// Arrange
			var request = new UpdateReleaseRequestRequest { Purpose = "" };

			// Act
			var result = await _service.UpdateReleaseRequestAsync(1, 1, request);

			// Assert
			result.Purpose.Should().Be("");
		}

		[Fact]
		public async Task Update_ShouldAcceptWhitespacePurpose()
		{
			// Arrange
			var request = new UpdateReleaseRequestRequest { Purpose = " " };

			// Act
			var result = await _service.UpdateReleaseRequestAsync(1, 1, request);

			// Assert
			result.Purpose.Should().Be(" ");
		}

		[Fact]
		public async Task Update_ShouldAcceptAtSymbolPurpose()
		{
			// Arrange
			var request = new UpdateReleaseRequestRequest { Purpose = " @" };

			// Act
			var result = await _service.UpdateReleaseRequestAsync(1, 1, request);

			// Assert
			result.Purpose.Should().Be(" @");
		}

		public void Dispose()
		{
			_context.Database.EnsureDeleted();
			_context.Dispose();
		}
	}
}