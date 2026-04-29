using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.Models;
using WarehouseModel = Warehouse.Entities.Models;
using Moq;
using Warehouse.DataAcces.Service.Interface;

namespace Warehouse.Api.Tests.PurchaseOrder;

public class PurchaseOrderServiceTests : IDisposable
{
    private readonly Mkiwms5Context _context;
    private readonly PurchaseOrderService _service;
    private readonly Mock<IAuditLogService> _mockAuditLogService;
    private readonly Mock<INotificationService> _mockNotificationService;
    private readonly Mock<IDocumentAttachmentService> _mockDocumentAttachmentService;
    private readonly Mock<IDateTimeProvider> _mockDateTimeProvider;

    public PurchaseOrderServiceTests()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new Mkiwms5Context(options);
        
        // Mock dependencies
        _mockAuditLogService = new Mock<IAuditLogService>();
        _mockNotificationService = new Mock<INotificationService>();
        _mockDocumentAttachmentService = new Mock<IDocumentAttachmentService>();
        _mockDateTimeProvider = new Mock<IDateTimeProvider>();
        _mockDocumentAttachmentService
            .Setup(x => x.UploadAttachmentAsync(
                It.IsAny<string>(),
                It.IsAny<long>(),
                It.IsAny<IFormFile>(),
                It.IsAny<long>(),
                It.IsAny<string>()))
            .ReturnsAsync((string docType, long docId, IFormFile file, long userId, string attachmentType)
                => $"https://files.test/{docType}/{docId}/{attachmentType}/{file.FileName}");

        _mockDateTimeProvider.Setup(x => x.BusinessNow()).Returns(DateTime.UtcNow);
        _mockDateTimeProvider.Setup(x => x.BusinessToday()).Returns(DateOnly.FromDateTime(DateTime.UtcNow));
        _mockDateTimeProvider.Setup(x => x.UtcNow()).Returns(DateTime.UtcNow);
        
        _service = new PurchaseOrderService(
            _context,
            _mockAuditLogService.Object,
            _mockNotificationService.Object,
            _mockDocumentAttachmentService.Object,
            _mockDateTimeProvider.Object);

        SeedData();
    }

    private void SeedData()
    {
        // Supplier
        _context.Suppliers.Add(new WarehouseModel.Supplier
        {
            SupplierId = 1,
            SupplierCode = "SUP001",
            SupplierName = "Nhà cung cấp 1",
            IsActive = true
        });
        _context.Suppliers.Add(new WarehouseModel.Supplier
        {
            SupplierId = 2,
            SupplierCode = "SUP002",
            SupplierName = "Nhà cung cấp không hoạt động",
            IsActive = false
        });

        // Warehouse
        _context.Warehouses.Add(new WarehouseModel.Warehouse
        {
            WarehouseId = 1,
            WarehouseCode = "WH001",
            WarehouseName = "Kho 1",
            IsActive = true
        });
        _context.Warehouses.Add(new WarehouseModel.Warehouse
        {
            WarehouseId = 2,
            WarehouseCode = "WH002",
            WarehouseName = "Kho không hoạt động",
            IsActive = false
        });

        // User
        _context.Users.Add(new WarehouseModel.User
        {
            UserId = 1,
            Username = "user1",
            FullName = "Người dùng 1",
            Email = "user1@test.com",
            IsActive = true,
            PasswordHash = "hash123"
        });
        _context.Users.Add(new WarehouseModel.User
        {
            UserId = 3,
            Username = "user3",
            FullName = "Người dùng không hoạt động",
            Email = "user3@test.com",
            IsActive = false,
            PasswordHash = "hash123"
        });

        // Item
        _context.Items.Add(new WarehouseModel.Item
        {
            ItemId = 1,
            ItemCode = "ITEM001",
            ItemName = "Vật tư 1",
            IsActive = true,
            BaseUomId = 1
        });
        _context.Items.Add(new WarehouseModel.Item
        {
            ItemId = 2,
            ItemCode = "ITEM002",
            ItemName = "Vật tư không hoạt động",
            IsActive = false,
            BaseUomId = 1
        });

        // UOM
        _context.UnitOfMeasures.Add(new WarehouseModel.UnitOfMeasure
        {
            UomId = 1,
            UomName = "Cái"
        });

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private static IFormFile BuildFile(string fileName, string content = "dummy")
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(content);
        var stream = new MemoryStream(bytes);
        return new FormFile(stream, 0, bytes.Length, "file", fileName);
    }

    // =========================================================
    // CreatePurchaseOrderAsync Tests
    // =========================================================

    [Fact]
    public async Task CreatePO_ThanhCong()
    {
        // Arrange
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            ExpectedDeliveryDate = DateOnly.FromDateTime(DateTime.Today.AddDays(7)),
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest
                {
                    ItemId = 1,
                    OrderedQty = 10,
                    UnitPrice = 100000
                }
            }
        };

        // Act
        var result = await _service.CreatePurchaseOrderAsync(1, request);

        // Assert
        result.Should().NotBeNull();
        result.POCode.Should().StartWith("PO");
        result.Status.Should().Be("PENDING");
        result.SupplierId.Should().Be(1);
        result.WarehouseId.Should().Be(1);
        result.Lines.Should().HaveCount(1);
    }

    [Fact]
    public async Task CreatePO_LinesRong_ThrowException()
    {
        // Arrange
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>()
        };

        // Act & Assert
        var act = async () => await _service.CreatePurchaseOrderAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ít nhất 1 vật tư*");
    }

    [Fact]
    public async Task CreatePO_SupplierKhongTonTai_ThrowException()
    {
        // Arrange
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 999,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreatePurchaseOrderAsync(1, request);
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*nhà cung cấp*");
    }

    [Fact]
    public async Task CreatePO_SupplierKhongActive_ThrowException()
    {
        // Arrange
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 2,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreatePurchaseOrderAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*không hoạt động*");
    }

    [Fact]
    public async Task CreatePO_WarehouseKhongTonTai_ThrowException()
    {
        // Arrange
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 999,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreatePurchaseOrderAsync(1, request);
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*kho nhập*");
    }

    [Fact]
    public async Task CreatePO_WarehouseKhongActive_ThrowException()
    {
        // Arrange
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 2,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreatePurchaseOrderAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*không hoạt động*");
    }

    [Fact]
    public async Task CreatePO_ItemKhongTonTai_ThrowException()
    {
        // Arrange
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 999, OrderedQty = 10, UnitPrice = 100000 }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreatePurchaseOrderAsync(1, request);
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*vật tư*");
    }

    [Fact]
    public async Task CreatePO_ItemKhongActive_ThrowException()
    {
        // Arrange
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 2, OrderedQty = 10, UnitPrice = 100000 }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreatePurchaseOrderAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*vật tư*");
    }

    [Fact]
    public async Task CreatePO_TrungItemTrongLines_ThrowException()
    {
        // Arrange
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 },
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 5, UnitPrice = 100000 }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreatePurchaseOrderAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*không được xuất hiện nhiều hơn 1 lần*");
    }

    [Fact]
    public async Task CreatePO_OrderedQtyBang0_ThrowException()
    {
        // Arrange
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 0, UnitPrice = 100000 }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreatePurchaseOrderAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*lớn hơn 0*");
    }

    [Fact]
    public async Task CreatePO_UnitPriceAm_ThrowException()
    {
        // Arrange
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = -1000 }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreatePurchaseOrderAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*không được âm*");
    }

    [Fact]
    public async Task CreatePO_DiscountLonHonTotal_ThrowException()
    {
        // Arrange
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            DiscountAmount = 10000000,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 1000 }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreatePurchaseOrderAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Giảm giá*");
    }

    // =========================================================
    // UpdatePurchaseOrderAsync Tests
    // =========================================================

    [Fact]
    public async Task UpdatePO_ThanhCong()
    {
        // Arrange - Tạo PO trước
        var createRequest = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        };
        var po = await _service.CreatePurchaseOrderAsync(1, createRequest);

        var updateRequest = new UpdatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            ExpectedDeliveryDate = DateOnly.FromDateTime(DateTime.Today.AddDays(30)),
            Justification = "Cập nhật lý do"
        };

        // Act
        var result = await _service.UpdatePurchaseOrderAsync(po.PurchaseOrderId, 1, updateRequest);

        // Assert
        result.Should().NotBeNull();
        result.ExpectedDeliveryDate.Should().Be(DateOnly.FromDateTime(DateTime.Today.AddDays(30)));
        result.Justification.Should().Be("Cập nhật lý do");
    }

    [Fact]
    public async Task UpdatePO_KhongTonTai_ThrowException()
    {
        // Arrange
        var request = new UpdatePurchaseOrderRequest { Justification = "Test" };

        // Act & Assert
        var act = async () => await _service.UpdatePurchaseOrderAsync(999, 1, request);
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Không tìm thấy đơn mua hàng*");
    }

    [Fact]
    public async Task UpdatePO_DaCoGRN_ThrowException()
    {
        // Arrange - Tạo PO và GRN
        var createRequest = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        };
        var po = await _service.CreatePurchaseOrderAsync(1, createRequest);

        // Tạo GRN đã POSTED
        _context.GoodsReceiptNotes.Add(new WarehouseModel.GoodsReceiptNote
        {
            Grncode = "GRN001",
            PurchaseOrderId = po.PurchaseOrderId,
            SupplierId = 1,
            WarehouseId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            Status = "POSTED",
            TotalReceivedQty = 10,
            TotalGoodsAmount = 1000000,
            ShippingFee = 0,
            CreatedBy = 1
        });
        await _context.SaveChangesAsync();

        var updateRequest = new UpdatePurchaseOrderRequest { Justification = "Test" };

        // Act & Assert
        var act = async () => await _service.UpdatePurchaseOrderAsync(po.PurchaseOrderId, 1, updateRequest);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*đã có đơn nhập kho*");
    }

    [Fact]
    public async Task UpdatePO_DaDuyet_ThrowException()
    {
        // Arrange - Tạo PO đã duyệt
        var po = new WarehouseModel.PurchaseOrder
        {
            Pocode = "PO-APPROVED",
            RequestedBy = 1,
            SupplierId = 1,
            WarehouseId = 1,
            Status = "APPROVED",
            LifecycleStatus = "Approved",
            TotalAmount = 1000000,
            DiscountAmount = 0,
            NetAmount = 1000000,
            CurrentStageNo = 1,
            CreatedAt = DateTime.UtcNow
        };
        _context.PurchaseOrders.Add(po);
        await _context.SaveChangesAsync();

        var updateRequest = new UpdatePurchaseOrderRequest { Justification = "Test" };

        // Act & Assert
        var act = async () => await _service.UpdatePurchaseOrderAsync(po.PurchaseOrderId, 1, updateRequest);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*chờ duyệt*");
    }

    [Fact]
    public async Task UpdatePO_LineKhongTonTai_ThrowException()
    {
        // Arrange - Tạo PO
        var createRequest = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        };
        var po = await _service.CreatePurchaseOrderAsync(1, createRequest);

        var updateRequest = new UpdatePurchaseOrderRequest
        {
            Lines = new List<UpdatePurchaseOrderLineRequest>
            {
                new UpdatePurchaseOrderLineRequest { LineId = 999, OrderedQty = 20, UnitPrice = 150000 }
            }
        };

        // Act & Assert
        var act = async () => await _service.UpdatePurchaseOrderAsync(po.PurchaseOrderId, 1, updateRequest);
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Không tìm thấy dòng đơn*");
    }

    [Fact]
    public async Task UpdatePO_TinhLaiTotalAmount()
    {
        // Arrange - Tạo PO
        var createRequest = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        };
        var po = await _service.CreatePurchaseOrderAsync(1, createRequest);

        var lineId = po.Lines.First().PurchaseOrderLineId;

        var updateRequest = new UpdatePurchaseOrderRequest
        {
            Lines = new List<UpdatePurchaseOrderLineRequest>
            {
                new UpdatePurchaseOrderLineRequest { LineId = lineId, OrderedQty = 20, UnitPrice = 150000 }
            }
        };

        // Act
        var result = await _service.UpdatePurchaseOrderAsync(po.PurchaseOrderId, 1, updateRequest);

        // Assert
        result.Lines.First().OrderedQty.Should().Be(20);
        result.Lines.First().UnitPrice.Should().Be(150000);
        result.TotalAmount.Should().Be(3000000); // 20 * 150000
    }

    [Fact]
    public async Task UpdatePO_DiscountLonHonTotalAmount_NetAmountBang0()
    {
        // Arrange - Tạo PO với TotalAmount=1000000
        var createRequest = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        };
        var po = await _service.CreatePurchaseOrderAsync(1, createRequest);

        var updateRequest = new UpdatePurchaseOrderRequest
        {
            DiscountAmount = 2000000 // > TotalAmount
        };

        // Act
        var result = await _service.UpdatePurchaseOrderAsync(po.PurchaseOrderId, 1, updateRequest);

        // Assert
        result.DiscountAmount.Should().Be(2000000);
        result.NetAmount.Should().Be(0); // max(0, 1000000 - 2000000) = 0
    }

    [Fact]
    public async Task UpdatePO_DaHuy_ThrowException()
    {
        // Arrange - Tạo PO đã hủy
        var po = new WarehouseModel.PurchaseOrder
        {
            Pocode = "PO-CANCELLED",
            RequestedBy = 1,
            SupplierId = 1,
            WarehouseId = 1,
            Status = "CANCELLED",
            LifecycleStatus = "Cancelled",
            TotalAmount = 1000000,
            DiscountAmount = 0,
            NetAmount = 1000000,
            CurrentStageNo = 1,
            CreatedAt = DateTime.UtcNow
        };
        _context.PurchaseOrders.Add(po);
        await _context.SaveChangesAsync();

        var updateRequest = new UpdatePurchaseOrderRequest { Justification = "Test" };

        // Act & Assert
        var act = async () => await _service.UpdatePurchaseOrderAsync(po.PurchaseOrderId, 1, updateRequest);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*chờ duyệt*");
    }

    [Fact]
    public async Task UpdatePO_DangDuyet_ThrowException()
    {
        // Arrange - Tạo PO đang duyệt
        var po = new WarehouseModel.PurchaseOrder
        {
            Pocode = "PO-APPROVING",
            RequestedBy = 1,
            SupplierId = 1,
            WarehouseId = 1,
            Status = "APPROVING",
            LifecycleStatus = "Approving",
            TotalAmount = 1000000,
            DiscountAmount = 0,
            NetAmount = 1000000,
            CurrentStageNo = 1,
            CreatedAt = DateTime.UtcNow
        };
        _context.PurchaseOrders.Add(po);
        await _context.SaveChangesAsync();

        var updateRequest = new UpdatePurchaseOrderRequest { Justification = "Test" };

        // Act & Assert
        var act = async () => await _service.UpdatePurchaseOrderAsync(po.PurchaseOrderId, 1, updateRequest);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*chờ duyệt*");
    }

    // =========================================================
    // CreatePurchaseOrderAsync - Bổ sung test cases
    // =========================================================

    [Fact]
    public async Task CreatePO_ResponsibleUserKhongTonTai_ThrowException()
    {
        // Arrange
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            ResponsibleUserId = 999,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreatePurchaseOrderAsync(1, request);
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*nhân viên phụ trách*");
    }

    [Fact]
    public async Task CreatePO_ResponsibleUserKhongActive_ThrowException()
    {
        // Arrange
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            ResponsibleUserId = 3, // UserId = 3, IsActive = false
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreatePurchaseOrderAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*không hoạt động*");
    }

    [Fact]
    public async Task CreatePO_OrderedQtyAm_ThrowException()
    {
        // Arrange
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = -10, UnitPrice = 100000 }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreatePurchaseOrderAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*lớn hơn 0*");
    }

    [Fact]
    public async Task CreatePO_ExpectedDeliveryDateQuaKhu_ThrowException()
    {
        // Arrange - ExpectedDeliveryDate trong quá khứ
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            ExpectedDeliveryDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-1)),
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreatePurchaseOrderAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Ngày giao hàng dự kiến không được trong quá khứ*");
    }

    [Fact]
    public async Task CreatePO_ExpectedDeliveryDateNull_ThanhCong()
    {
        // Arrange - ExpectedDeliveryDate = null
        var request = new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            ExpectedDeliveryDate = null,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        };

        // Act
        var result = await _service.CreatePurchaseOrderAsync(1, request);

        // Assert
        result.Should().NotBeNull();
        result.ExpectedDeliveryDate.Should().BeNull();
    }

    // =========================================================
    // UploadPurchaseOrderAttachmentsAsync Tests
    // =========================================================

    [Fact]
    public async Task UploadAttachments_POKhongTonTai_ThrowException()
    {
        var quotation = BuildFile("quotation.pdf");
        var act = async () => await _service.UploadPurchaseOrderAttachmentsAsync(999, 1, quotation, null);

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Không tìm thấy đơn mua hàng*");
    }

    [Fact]
    public async Task UploadAttachments_KhongCoFile_ThrowException()
    {
        var po = await _service.CreatePurchaseOrderAsync(1, new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        });

        var act = async () => await _service.UploadPurchaseOrderAttachmentsAsync(po.PurchaseOrderId, 1, null, null);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ít nhất 1 tệp*");
    }

    [Fact]
    public async Task UploadAttachments_PendingAcc_ThieuMotFile_ThrowException()
    {
        var poEntity = new WarehouseModel.PurchaseOrder
        {
            Pocode = "PO-PENDING-ACC",
            RequestedBy = 1,
            SupplierId = 1,
            WarehouseId = 1,
            Status = "PENDING_ACC",
            LifecycleStatus = "PendingRcv",
            TotalAmount = 1000000,
            DiscountAmount = 0,
            NetAmount = 1000000,
            CurrentStageNo = 1,
            CreatedAt = DateTime.UtcNow
        };
        _context.PurchaseOrders.Add(poEntity);
        await _context.SaveChangesAsync();

        var quotation = BuildFile("quotation.pdf");
        var act = async () => await _service.UploadPurchaseOrderAttachmentsAsync(poEntity.PurchaseOrderId, 1, quotation, null);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*bắt buộc phải có đủ*");
    }

    [Fact]
    public async Task UploadAttachments_ThanhCong_TraVeUrl()
    {
        var po = await _service.CreatePurchaseOrderAsync(1, new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        });

        var quotation = BuildFile("quotation.pdf");
        var contract = BuildFile("contract.pdf");

        var result = await _service.UploadPurchaseOrderAttachmentsAsync(po.PurchaseOrderId, 1, quotation, contract);

        result.Message.Should().Be("Tải tệp đính kèm thành công.");
        result.QuotationFileUrl.Should().NotBeNull();
        result.ContractAppendixFileUrl.Should().NotBeNull();

        _mockAuditLogService.Verify(a => a.LogAsync(
            1,
            It.IsAny<string>(),
            It.IsAny<string>(),
            po.PurchaseOrderId,
            It.Is<string>(m => m.Contains("Tải tệp đính kèm cho đơn mua hàng") && m.Contains("quotation=yes") && m.Contains("contractAppendix=yes")),
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task UploadAttachments_Draft_ChiQuotation_ThanhCong()
    {
        var po = await _service.CreatePurchaseOrderAsync(1, new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        });

        var quotation = BuildFile("quotation-only.pdf");

        var result = await _service.UploadPurchaseOrderAttachmentsAsync(po.PurchaseOrderId, 1, quotation, null);

        result.Message.Should().Be("Tải tệp đính kèm thành công.");
        result.QuotationFileUrl.Should().NotBeNull();
        result.ContractAppendixFileUrl.Should().BeNull();

        _mockAuditLogService.Verify(a => a.LogAsync(
            1,
            It.IsAny<string>(),
            It.IsAny<string>(),
            po.PurchaseOrderId,
            It.Is<string>(m => m.Contains("quotation=yes") && m.Contains("contractAppendix=no")),
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task UploadAttachments_PendingAcc_DuHaiFile_ThanhCong()
    {
        var poEntity = new WarehouseModel.PurchaseOrder
        {
            Pocode = "PO-PENDING-ACC-OK",
            RequestedBy = 1,
            SupplierId = 1,
            WarehouseId = 1,
            Status = "PENDING_ACC",
            LifecycleStatus = "PendingRcv",
            TotalAmount = 1000000,
            DiscountAmount = 0,
            NetAmount = 1000000,
            CurrentStageNo = 1,
            CreatedAt = DateTime.UtcNow
        };
        _context.PurchaseOrders.Add(poEntity);
        await _context.SaveChangesAsync();

        var quotation = BuildFile("quotation.pdf");
        var contract = BuildFile("contract.pdf");

        var result = await _service.UploadPurchaseOrderAttachmentsAsync(poEntity.PurchaseOrderId, 1, quotation, contract);

        result.QuotationFileUrl.Should().NotBeNull();
        result.ContractAppendixFileUrl.Should().NotBeNull();

        _mockDocumentAttachmentService.Verify(s => s.UploadAttachmentAsync("PR", poEntity.PurchaseOrderId, quotation, 1, "QUOTATION"), Times.Once);
        _mockDocumentAttachmentService.Verify(s => s.UploadAttachmentAsync("PR", poEntity.PurchaseOrderId, contract, 1, "CONTRACT_APPENDIX"), Times.Once);
    }

    [Fact]
    public async Task UploadAttachments_PendingAcc_ThieuFile_KhongGhiAuditLog()
    {
        var poEntity = new WarehouseModel.PurchaseOrder
        {
            Pocode = "PO-PENDING-ACC-NOLOG",
            RequestedBy = 1,
            SupplierId = 1,
            WarehouseId = 1,
            Status = "PENDING_ACC",
            LifecycleStatus = "PendingRcv",
            TotalAmount = 1000000,
            DiscountAmount = 0,
            NetAmount = 1000000,
            CurrentStageNo = 1,
            CreatedAt = DateTime.UtcNow
        };
        _context.PurchaseOrders.Add(poEntity);
        await _context.SaveChangesAsync();

        var quotation = BuildFile("quotation.pdf");
        var act = async () => await _service.UploadPurchaseOrderAttachmentsAsync(poEntity.PurchaseOrderId, 1, quotation, null);
        await act.Should().ThrowAsync<InvalidOperationException>();

        _mockAuditLogService.Verify(a => a.LogAsync(
            It.IsAny<long>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            poEntity.PurchaseOrderId,
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UploadAttachments_DocumentServiceThrowArgumentException_Propagate()
    {
        var po = await _service.CreatePurchaseOrderAsync(1, new CreatePurchaseOrderRequest
        {
            SupplierId = 1,
            WarehouseId = 1,
            Lines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UnitPrice = 100000 }
            }
        });

        var quotation = BuildFile("quotation.pdf");
        _mockDocumentAttachmentService
            .Setup(s => s.UploadAttachmentAsync("PR", po.PurchaseOrderId, quotation, 1, "QUOTATION"))
            .ThrowsAsync(new ArgumentException("File không hợp lệ"));

        var act = async () => await _service.UploadPurchaseOrderAttachmentsAsync(po.PurchaseOrderId, 1, quotation, null);
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*không hợp lệ*");
    }
}
