using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.Models;
using Xunit;

namespace Warehouse.Api.Tests.GoodsDeliveryNote
{
	public class UpdateGoodsDeliveryNoteServiceTests : IDisposable
	{
		private readonly Mkiwms5Context _context;
		private readonly Mock<IStocktakeService> _mockStocktakeService;
		private readonly Mock<IAuditLogService> _mockAuditLogService;
		private readonly Mock<IDocumentAttachmentService> _mockAttachmentService;
		private readonly Mock<INotificationService> _mockNotificationService;
		private readonly GoodsDeliveryNoteService _service;

		public UpdateGoodsDeliveryNoteServiceTests()
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
			// 1. Setup basic entities
			_context.Warehouses.Add(new Warehouse.Entities.Models.Warehouse { WarehouseId = 1, WarehouseCode = "WH001", WarehouseName = "Main WH", IsActive = true });
			_context.Users.Add(new User { UserId = 1, Username = "admin", FullName = "Admin User", Email = "admin@example.com", PasswordHash = "hash", IsActive = true });
			_context.UnitOfMeasures.Add(new UnitOfMeasure { UomId = 1, UomName = "Cái" });
			_context.Items.Add(new Warehouse.Entities.Models.Item { ItemId = 1, ItemCode = "I01", ItemName = "Item 01", BaseUomId = 1, IsActive = true });

			// 1b. Company & Receiver
			_context.Companies.Add(new Company { CompanyId = 1, CompanyCode = "C01", CompanyName = "Company 01", IsActive = true });
			_context.Receivers.Add(new Receiver { ReceiverId = 1, ReceiverName = "Receiver 01", CompanyId = 1, IsActive = true, CreatedAt = DateTime.UtcNow });

			// 2. Approved RR
			var rr = new Warehouse.Entities.Models.ReleaseRequest
			{
				ReleaseRequestId = 10,
				ReleaseRequestCode = "RR001",
				Status = "APPROVED",
				LifecycleStatus = "IssuePending",
				WarehouseId = 1,
				ReceiverId = 1,
				ReleaseRequestLines = new List<ReleaseRequestLine>
				{
					new ReleaseRequestLine
					{
						ReleaseRequestLineId = 100,
						ItemId = 1,
						ApprovedQty = 100,
						IssuedQty = 0,
						UomId = 1,
						LineStatus = "Open",
						UnitCostAtIssue = 15000
					}
				}
			};
			_context.ReleaseRequests.Add(rr);

			// 3. Existing GDN in PENDING_ACC status
			var gdn = new Warehouse.Entities.Models.GoodsDeliveryNote
			{
				Gdnid = 50,
				Gdncode = "GDN-2024-0001",
				ReleaseRequestId = 10,
				WarehouseId = 1,
				Status = "DRAFT",
				IssueDate = DateOnly.FromDateTime(DateTime.Today),
				CreatedBy = 1,
				GoodsDeliveryNoteLines = new List<GoodsDeliveryNoteLine>
				{
					new GoodsDeliveryNoteLine { GdnlineId = 500, ItemId = 1, ActualQty = 10, UomId = 1, UnitPrice = 15000, ReleaseRequestLineId = 100 }
				}
			};
			_context.GoodsDeliveryNotes.Add(gdn);

			_context.SaveChanges();
		}

		[Fact]
		public async Task Update_Success_ShouldUpdateAllFieldsAndRecalculate()
		{
			// Arrange
			var request = new CreateGDNRequest
			{
				IssueDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1)),
				Note = "Updated note",
				ShippingFee = 5000,
				Lines = new List<CreateGDNLineRequest>
				{
					new CreateGDNLineRequest { ItemId = 1, ActualQty = 25, UomId = 1, ReleaseRequestLineId = 100 }
				}
			};

			// Act
			var result = await _service.UpdateGDNAsync(50, 1, request);

			// Assert
			result.Status.Should().Be("DRAFT");
			result.TotalDeliveredQty.Should().Be(25);
			result.TotalDeliveredAmount.Should().Be(25 * 15000);
			result.ShippingFee.Should().Be(5000);

			var gdnInDb = _context.GoodsDeliveryNotes.Include(g => g.GoodsDeliveryNoteLines).First(g => g.Gdnid == 50);
			gdnInDb.Note.Should().Be("Updated note");
			gdnInDb.GoodsDeliveryNoteLines.Should().HaveCount(1);
			gdnInDb.GoodsDeliveryNoteLines.First().ActualQty.Should().Be(25);
		}

		[Fact]
		public async Task Update_ShouldThrow_WhenGDNNotFound()
		{
			// Act
			Func<Task> act = async () => await _service.UpdateGDNAsync(999, 1, new CreateGDNRequest());

			// Assert
			await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*Không tìm thấy*");
		}

		[Fact]
		public async Task Update_ShouldThrow_WhenInvalidStatus()
		{
			// Arrange
			var gdn = _context.GoodsDeliveryNotes.Find(50L);
			gdn.Status = "APPROVED";
			_context.SaveChanges();

			// Act
			Func<Task> act = async () => await _service.UpdateGDNAsync(50, 1, new CreateGDNRequest());

			// Assert
			await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Không thể cập nhật phiếu ở trạng thái APPROVED*");
		}

		[Fact]
		public async Task Update_ShouldThrow_WhenWarehouseFrozen()
		{
			// Arrange
			_mockStocktakeService.Setup(s => s.IsWarehouseFrozenAsync(1)).ReturnsAsync(true);

			// Act
			Func<Task> act = async () => await _service.UpdateGDNAsync(50, 1, new CreateGDNRequest());

			// Assert
			await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Kho đang trong quá trình kiểm kê*");
		}

		[Fact]
		public async Task Update_ShouldThrow_WhenDateInPast()
		{
			// Arrange
			var request = new CreateGDNRequest { IssueDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-1)) };

			// Act
			Func<Task> act = async () => await _service.UpdateGDNAsync(50, 1, request);

			// Assert
			await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*không được ở trong quá khứ*");
		}

		[Fact]
		public async Task Update_EmptyNote_ShouldSucceed()
		{
			// Arrange
			var request = new CreateGDNRequest
			{
				IssueDate = DateOnly.FromDateTime(DateTime.Today),
				Note = "",
				Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ActualQty = 10, UomId = 1, ReleaseRequestLineId = 100 } }
			};

			// Act
			var result = await _service.UpdateGDNAsync(50, 1, request);

			// Assert
			result.Note.Should().Be("");
		}

		[Fact]
		public async Task Update_WhitespaceNote_ShouldSucceed()
		{
			// Arrange
			var request = new CreateGDNRequest
			{
				IssueDate = DateOnly.FromDateTime(DateTime.Today),
				Note = " ",
				Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ActualQty = 10, UomId = 1, ReleaseRequestLineId = 100 } }
			};

			// Act
			var result = await _service.UpdateGDNAsync(50, 1, request);

			// Assert
			result.Note.Should().Be(" ");
		}

		[Fact]
		public async Task Update_SpecialCharNote_ShouldSucceed()
		{
			// Arrange
			var request = new CreateGDNRequest
			{
				IssueDate = DateOnly.FromDateTime(DateTime.Today),
				Note = "@#$",
				Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ActualQty = 10, UomId = 1, ReleaseRequestLineId = 100 } }
			};

			// Act
			var result = await _service.UpdateGDNAsync(50, 1, request);

			// Assert
			result.Note.Should().Be("@#$");
		}

		[Fact]
		public async Task Update_FIFOPricingFallback_ShouldUseLotsWhenRRLinkMissing()
		{
			// Arrange
			// 1. Thêm lô hàng với giá 20,000
			_context.InventoryLots.Add(new InventoryLot
			{
				LotId = 1,
				ItemId = 1,
				WarehouseId = 1,
				Quantity = 100,
				UnitCost = 20000,
				ReceiptDate = DateTime.Today,
				IsActive = true
			});
			_context.SaveChanges();

			var request = new CreateGDNRequest
			{
				IssueDate = DateOnly.FromDateTime(DateTime.Today),
				Lines = new List<CreateGDNLineRequest>
				{
                    // Dòng này KHÔNG có ReleaseRequestLineId -> sẽ dùng giá FIFO
                    new CreateGDNLineRequest { ItemId = 1, ActualQty = 10, UomId = 1, ReleaseRequestLineId = null }
				}
			};

			// Act
			var result = await _service.UpdateGDNAsync(50, 1, request);

			// Assert
			result.TotalDeliveredAmount.Should().Be(10 * 20000);
			var lineInDb = _context.GoodsDeliveryNoteLines.First(l => l.Gdnid == 50);
			lineInDb.UnitPrice.Should().Be(20000);
		}

		[Fact]
		public async Task Update_MixedLines_ShouldCalculateCorrectly()
		{
			// Arrange
			_context.InventoryLots.Add(new InventoryLot { LotId = 2, ItemId = 1, WarehouseId = 1, Quantity = 100, UnitCost = 10000, ReceiptDate = DateTime.Today, IsActive = true });
			_context.SaveChanges();

			var request = new CreateGDNRequest
			{
				IssueDate = DateOnly.FromDateTime(DateTime.Today),
				Lines = new List<CreateGDNLineRequest>
				{
					new CreateGDNLineRequest { ItemId = 1, ActualQty = 10, UomId = 1, ReleaseRequestLineId = 100 }, // Giá RR = 15000
                    new CreateGDNLineRequest { ItemId = 1, ActualQty = 5, UomId = 1, ReleaseRequestLineId = null }    // Giá FIFO = 10000
                }
			};

			// Act
			var result = await _service.UpdateGDNAsync(50, 1, request);

			// Assert
			decimal expectedAmount = (10 * 15000) + (5 * 10000);
			result.TotalDeliveredAmount.Should().Be(expectedAmount);
			result.TotalDeliveredQty.Should().Be(15);
		}

		[Fact]
		public async Task Update_AddressSelection_ShouldPrioritizeDefaultAndActive()
		{
			// Arrange
			var companyId = _context.Companies.First().CompanyId;
			_context.Addresses.AddRange(new List<Address>
			{
				new Address { AddressDetail = "Address 1", City = "HN", District = "CG", Ward = "D", IsDefault = false, IsActive = true, CompanyId = companyId },
				new Address { AddressDetail = "Default Address", City = "HN", District = "CG", Ward = "D", IsDefault = true, IsActive = true, CompanyId = companyId },
				new Address { AddressDetail = "Address 3", City = "HN", District = "CG", Ward = "D", IsDefault = false, IsActive = true, CompanyId = companyId }
			});
			_context.SaveChanges();

			var request = new CreateGDNRequest
			{
				IssueDate = DateOnly.FromDateTime(DateTime.Today),
				Lines = new List<CreateGDNLineRequest> { new CreateGDNLineRequest { ItemId = 1, ActualQty = 10, UomId = 1, ReleaseRequestLineId = 100 } }
			};

			// Act
			var result = await _service.UpdateGDNAsync(50, 1, request);

			// Assert
			result.ReceiverAddress.Should().Be("Default Address");
		}

		public void Dispose()
		{
			_context.Database.EnsureDeleted();
			_context.Dispose();
		}
	}
}