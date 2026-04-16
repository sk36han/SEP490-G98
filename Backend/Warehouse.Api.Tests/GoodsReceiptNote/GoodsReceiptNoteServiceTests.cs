using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;
using WarehouseModel = Warehouse.Entities.Models;

namespace Warehouse.Api.Tests.GoodsReceiptNote;

public class GoodsReceiptNoteServiceTests : IDisposable
{
    private readonly Mkiwms5Context _context;
    private readonly GoodsReceiptNoteService _service;

    public GoodsReceiptNoteServiceTests()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new Mkiwms5Context(options);
        var mockAiService = new Mock<IAIService>();
        _service = new GoodsReceiptNoteService(_context, mockAiService.Object);

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
            ItemName = "Vật tư 2",
            IsActive = true,
            BaseUomId = 1
        });
        _context.Items.Add(new WarehouseModel.Item
        {
            ItemId = 3,
            ItemCode = "ITEM003",
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
        _context.UnitOfMeasures.Add(new WarehouseModel.UnitOfMeasure
        {
            UomId = 2,
            UomName = "Kg"
        });

        // PurchaseOrder hợp lệ
        var po = new WarehouseModel.PurchaseOrder
        {
            PurchaseOrderId = 1,
            Pocode = "PO001",
            RequestedBy = 1,
            SupplierId = 1,
            WarehouseId = 1,
            Status = "APPROVED",
            LifecycleStatus = "Approved",
            TotalAmount = 10000000,
            DiscountAmount = 0,
            NetAmount = 10000000,
            CurrentStageNo = 1,
            CreatedAt = DateTime.UtcNow
        };
        _context.PurchaseOrders.Add(po);

        // PurchaseOrder lines
        _context.PurchaseOrderLines.Add(new WarehouseModel.PurchaseOrderLine
        {
            PurchaseOrderLineId = 1,
            PurchaseOrderId = 1,
            ItemId = 1,
            OrderedQty = 100,
            ReceivedQty = 0,
            UnitPrice = 100000,
            LineTotal = 10000000,
            LineStatus = "Pending"
        });
        _context.PurchaseOrderLines.Add(new WarehouseModel.PurchaseOrderLine
        {
            PurchaseOrderLineId = 2,
            PurchaseOrderId = 1,
            ItemId = 2,
            OrderedQty = 50,
            ReceivedQty = 0,
            UnitPrice = 200000,
            LineTotal = 10000000,
            LineStatus = "Pending"
        });

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    // =========================================================
    // CreateGRNAsync Tests
    // =========================================================

    [Fact]
    public async Task CreateGRN_ThanhCong()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    PurchaseOrderLineId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act
        var result = await _service.CreateGRNAsync(1, request);

        // Assert
        result.Should().NotBeNull();
        result.GrnCode.Should().StartWith("GRN");
        result.Status.Should().Be("PENDING_ACC");
        result.SupplierId.Should().Be(1);
        result.WarehouseId.Should().Be(1);
        result.PurchaseOrderId.Should().Be(1);
        result.TotalReceivedQty.Should().Be(50);
    }

    [Fact]
    public async Task CreateGRN_PurchaseOrderKhongTonTai_ThrowKeyNotFoundException()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 999,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreateGRNAsync(1, request);
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*đơn mua hàng*");
    }

    [Fact]
    public async Task CreateGRN_WarehouseKhongTonTai_ThrowKeyNotFoundException()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 999,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreateGRNAsync(1, request);
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*kho nhận*");
    }

    [Fact]
    public async Task CreateGRN_WarehouseKhongActive_ThrowInvalidOperationException()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 2,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreateGRNAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*không hoạt động*");
    }

    [Fact]
    public async Task CreateGRN_SupplierKhongTonTai_ThrowKeyNotFoundException()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 999,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreateGRNAsync(1, request);
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*nhà cung cấp*");
    }

    [Fact]
    public async Task CreateGRN_SupplierKhongActive_ThrowInvalidOperationException()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 2,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreateGRNAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*không hoạt động*");
    }

    [Fact]
    public async Task CreateGRN_UserKhongTonTai_ThrowKeyNotFoundException()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreateGRNAsync(999, request);
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*người dùng*");
    }

    [Fact]
    public async Task CreateGRN_ItemKhongTonTai_ThrowKeyNotFoundException()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 999,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreateGRNAsync(1, request);
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*vật tư không tồn tại*");
    }

    [Fact]
    public async Task CreateGRN_ItemKhongActive_ThrowInvalidOperationException()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 3,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreateGRNAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*vật tư đang không hoạt động*");
    }

    [Fact]
    public async Task CreateGRN_UomKhongTonTai_ThrowKeyNotFoundException()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 999,
                    UnitPrice = 100000
                }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreateGRNAsync(1, request);
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*đơn vị tính không tồn tại*");
    }

    [Fact]
    public async Task CreateGRN_DiscountPercentage_TinhGiamGiaDung()
    {
        // Arrange - 1 item: 50 * 100000 = 5,000,000 → giảm 10% = 500,000
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            DiscountType = "Percentage",
            DiscountValue = 10,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act
        var result = await _service.CreateGRNAsync(1, request);

        // Assert
        // TotalGoodsAmount = 50 * 100000 = 5,000,000 - 10% = 4,500,000
        result.TotalAmount.Should().Be(4500000);
    }

    [Fact]
    public async Task CreateGRN_DiscountAmount_TinhGiamGiaDung()
    {
        // Arrange - 1 item: 50 * 100000 = 5,000,000 → giảm 500,000
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            DiscountType = "Amount",
            DiscountValue = 500000,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act
        var result = await _service.CreateGRNAsync(1, request);

        // Assert
        // TotalGoodsAmount = 5,000,000 - 500,000 = 4,500,000
        result.TotalAmount.Should().Be(4500000);
    }

    [Fact]
    public async Task CreateGRN_DiscountLonHonTotal_ThrowException()
    {
        // Arrange - 1 item: 50 * 100000 = 5,000,000 → giảm 10,000,000 > total
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            DiscountType = "Amount",
            DiscountValue = 10000000,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act & Assert
        var act = async () => await _service.CreateGRNAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Giảm giá không được lớn hơn tổng giá trị hàng hóa*");
    }

    [Fact]
    public async Task CreateGRN_KhongCoDiscount_TinhTongBinhThuong()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act
        var result = await _service.CreateGRNAsync(1, request);

        // Assert
        // TotalGoodsAmount = 50 * 100000 = 5,000,000
        result.TotalAmount.Should().Be(5000000);
    }

    [Fact]
    public async Task CreateGRN_ShippingFee_NetAmountTinhDung()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            ShippingFee = 200000,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act
        var result = await _service.CreateGRNAsync(1, request);

        // Assert
        // NetAmount = 5,000,000 + 200,000 = 5,200,000
        result.NetAmount.Should().Be(5200000);
        result.ShippingFee.Should().Be(200000);
    }

    [Fact]
    public async Task CreateGRN_TaoInventoryTransaction()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act
        var result = await _service.CreateGRNAsync(1, request);

        // Assert
        var txn = await _context.InventoryTransactions
            .FirstOrDefaultAsync(t => t.ReferenceType == "GRN" && t.ReferenceId == result.GrnId);
        txn.Should().NotBeNull();
        txn!.TxnType.Should().Be("INBOUND");
        txn.Status.Should().Be("POSTED");
    }

    [Fact]
    public async Task CreateGRN_TaoInventoryTransactionLine()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act
        var result = await _service.CreateGRNAsync(1, request);

        // Assert
        var txnId = await _context.InventoryTransactions
            .Where(t => t.ReferenceId == result.GrnId).Select(t => t.InventoryTxnId).FirstAsync();

        var txnLine = await _context.InventoryTransactionLines
            .FirstOrDefaultAsync(l => l.InventoryTxnId == txnId && l.ItemId == 1);
        txnLine.Should().NotBeNull();
        txnLine!.QtyChange.Should().Be(50);
    }

    [Fact]
    public async Task CreateGRN_TaoAuditLog()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act
        var result = await _service.CreateGRNAsync(1, request);

        // Assert
        var auditLog = await _context.AuditLogs
            .FirstOrDefaultAsync(a => a.EntityType == "GoodsReceiptNote" && a.EntityId == result.GrnId);
        auditLog.Should().NotBeNull();
        auditLog!.Action.Should().Be("CREATE");
        auditLog.ActorUserId.Should().Be(1);
    }

    [Fact]
    public async Task CreateGRN_SubmittedAtDuocSet()
    {
        // Arrange
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 50,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act
        var result = await _service.CreateGRNAsync(1, request);

        // Assert
        var grn = await _context.GoodsReceiptNotes.FindAsync(result.GrnId);
        grn!.SubmittedAt.Should().NotBeNull();
        grn.SubmittedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task CreateGRN_MaKhongTrungLap()
    {
        // Arrange
        var request1 = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 10,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        var request2 = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 20,
                    UomId = 1,
                    UnitPrice = 100000
                }
            }
        };

        // Act
        var result1 = await _service.CreateGRNAsync(1, request1);
        var result2 = await _service.CreateGRNAsync(1, request2);

        // Assert
        result1.GrnCode.Should().NotBe(result2.GrnCode);
    }

    // =========================================================
    // ApproveGRNAsync Tests
    // =========================================================

    private async Task<GoodsReceiptNoteResponse> CreateSampleGRNAsync(decimal actualQty = 50)
    {
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            ShippingFee = 100000,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = actualQty,
                    UomId = 1,
                    PurchaseOrderLineId = 1,
                    UnitPrice = 100000
                }
            }
        };
        return await _service.CreateGRNAsync(1, request);
    }

    [Fact]
    public async Task ApproveGRN_ThanhCong()
    {
        // Arrange
        var grn = await CreateSampleGRNAsync();

        // Act
        var result = await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be("POSTED");
        result.GrnId.Should().Be(grn.GrnId);
    }

    [Fact]
    public async Task ApproveGRN_KhongTonTai_ThrowKeyNotFoundException()
    {
        // Act & Assert
        var act = async () => await _service.ApproveGRNAsync(999, 1, new ApproveGRNRequest());
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*phiếu nhập kho*");
    }

    [Fact]
    public async Task ApproveGRN_DaPosted_ThrowInvalidOperationException()
    {
        // Arrange
        var grn = await CreateSampleGRNAsync();
        await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());

        // Act & Assert
        var act = async () => await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*chỉ có thể duyệt phiếu nhập kho đang chờ duyệt*");
    }

    [Fact]
    public async Task ApproveGRN_SoLuongNhapVuotOrderedQty_ThrowInvalidOperationException()
    {
        // Arrange - Tạo PO line với OrderedQty = 100, ReceivedQty = 0
        // Tạo GRN nhập 150 > 100
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 150, // Vượt OrderedQty = 100
                    UomId = 1,
                    PurchaseOrderLineId = 1,
                    UnitPrice = 100000
                }
            }
        };
        var grn = await _service.CreateGRNAsync(1, request);

        // Act & Assert
        var act = async () => await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Số lượng nhập vượt quá số lượng đặt*");
    }

    [Fact]
    public async Task ApproveGRN_ReceivedQtyPOlineTangDung()
    {
        // Arrange
        var grn = await CreateSampleGRNAsync(30);

        // Act
        await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());

        // Assert
        var poLine = await _context.PurchaseOrderLines.FindAsync(1L);
        poLine!.ReceivedQty.Should().Be(30);
    }

    [Fact]
    public async Task ApproveGRN_POLineChuyenFullyReceived_KhiNhanDu()
    {
        // Arrange - PO line OrderedQty = 100, nhập đủ 100
        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 100,
                    UomId = 1,
                    PurchaseOrderLineId = 1,
                    UnitPrice = 100000
                }
            }
        };
        var grn = await _service.CreateGRNAsync(1, request);

        // Act
        await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());

        // Assert
        var poLine = await _context.PurchaseOrderLines.FindAsync(1L);
        poLine!.LineStatus.Should().Be("FullyReceived");
    }

    [Fact]
    public async Task ApproveGRN_POLineChuyenPartiallyReceived_KhiNhanMotPhan()
    {
        // Arrange
        var grn = await CreateSampleGRNAsync(50); // Nhận 50/100

        // Act
        await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());

        // Assert
        var poLine = await _context.PurchaseOrderLines.FindAsync(1L);
        poLine!.LineStatus.Should().Be("PartiallyReceived");
    }

    [Fact]
    public async Task ApproveGRN_POLifecycleFullRcv_KhiTatCaDu()
    {
        // Arrange - Reset cả 2 PO lines để received = ordered (100 và 50 = 150/150)
        var poLine1 = await _context.PurchaseOrderLines.FindAsync(1L);
        poLine1!.ReceivedQty = 100;
        poLine1.LineStatus = "FullyReceived";

        var poLine2 = await _context.PurchaseOrderLines.FindAsync(2L);
        poLine2!.ReceivedQty = 50;
        poLine2.LineStatus = "FullyReceived";

        await _context.SaveChangesAsync();

        var request = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.Today),
            WarehouseId = 1,
            SupplierId = 1,
            Lines = new List<CreateGRNLineRequest>
            {
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    ExpectedQty = 100,
                    ActualQty = 0,
                    UomId = 1,
                    PurchaseOrderLineId = 1,
                    UnitPrice = 100000
                }
            }
        };
        var grn = await _service.CreateGRNAsync(1, request);

        // Act
        await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());

        // Assert
        var po = await _context.PurchaseOrders.FindAsync(1L);
        po!.LifecycleStatus.Should().Be("FullRcv");
    }

    [Fact]
    public async Task ApproveGRN_POLifecyclePartRcv_KhiNhanMotPhan()
    {
        // Arrange
        var grn = await CreateSampleGRNAsync(50); // 50/100

        // Act
        await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());

        // Assert
        var po = await _context.PurchaseOrders.FindAsync(1L);
        po!.LifecycleStatus.Should().Be("PartRcv");
    }

    [Fact]
    public async Task ApproveGRN_TaoInventoryOnHandMoi_KhiChuaCoTonKho()
    {
        // Arrange
        var grn = await CreateSampleGRNAsync(50);

        // Act
        await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());

        // Assert
        var inventory = await _context.InventoryOnHands
            .FirstOrDefaultAsync(i => i.WarehouseId == 1 && i.ItemId == 1);
        inventory.Should().NotBeNull();
        inventory!.OnHandQty.Should().Be(50);
    }

    [Fact]
    public async Task ApproveGRN_CongDonOnHandQty_KhiDaCoTonKho()
    {
        // Arrange - Tạo tồn kho ban đầu
        _context.InventoryOnHands.Add(new WarehouseModel.InventoryOnHand
        {
            WarehouseId = 1,
            ItemId = 1,
            OnHandQty = 100,
            ReservedQty = 0,
            UnitCost = 90000,
            UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var grn = await CreateSampleGRNAsync(50);

        // Act
        await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());

        // Assert
        var inventory = await _context.InventoryOnHands
            .FirstOrDefaultAsync(i => i.WarehouseId == 1 && i.ItemId == 1);
        inventory!.OnHandQty.Should().Be(150); // 100 + 50
    }

    [Fact]
    public async Task ApproveGRN_UnitCostBinhQuanGiaQuyenDung()
    {
        // Arrange - Tồn kho ban đầu: qty=100, cost=90000
        _context.InventoryOnHands.Add(new WarehouseModel.InventoryOnHand
        {
            WarehouseId = 1,
            ItemId = 1,
            OnHandQty = 100,
            ReservedQty = 0,
            UnitCost = 90000,
            UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        // GRN: actualQty=50, unitPrice=100000, shippingFee=100000
        // lineAmount = 50 * 100000 = 5,000,000
        // totalGrnAmount = 5,000,000
        // shippingRatio = 5,000,000 / 5,000,000 = 1
        // shippingForLine = 100,000 * 1 = 100,000
        // shippingPerUnit = 100,000 / 50 = 2,000
        // costPrice = 100,000 + 2,000 = 102,000
        // newCost = (100 * 90,000 + 50 * 102,000) / (100 + 50)
        //          = (9,000,000 + 5,100,000) / 150
        //          = 14,100,000 / 150 = 94,000
        var grn = await CreateSampleGRNAsync(50);

        // Act
        await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());

        // Assert
        var inventory = await _context.InventoryOnHands
            .FirstOrDefaultAsync(i => i.WarehouseId == 1 && i.ItemId == 1);
        inventory!.UnitCost.Should().Be(94000);
    }

    [Fact]
    public async Task ApproveGRN_UnitCostDung_KhiChuaCoTonKho()
    {
        // Arrange
        var grn = await CreateSampleGRNAsync(50);
        // GRN: actualQty=50, unitPrice=100000, shippingFee=100000
        // shippingPerUnit = 100000 / 50 = 2000
        // costPrice = 100000 + 2000 = 102000

        // Act
        await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());

        // Assert
        var inventory = await _context.InventoryOnHands
            .FirstOrDefaultAsync(i => i.WarehouseId == 1 && i.ItemId == 1);
        inventory!.UnitCost.Should().Be(102000);
    }

    [Fact]
    public async Task ApproveGRN_TaoItemPriceMoi()
    {
        // Arrange
        var grn = await CreateSampleGRNAsync(50);

        // Act
        await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());

        // Assert
        var itemPrice = await _context.ItemPrices
            .FirstOrDefaultAsync(p => p.ItemId == 1 && p.PriceType == "Purchase" && p.IsActive);
        itemPrice.Should().NotBeNull();
        itemPrice!.Amount.Should().Be(100000);
        itemPrice.EffectiveTo.Should().BeNull();
        itemPrice.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task ApproveGRN_ItemPriceCuBiDeactive()
    {
        // Arrange - Tạo ItemPrice cũ
        _context.ItemPrices.Add(new WarehouseModel.ItemPrice
        {
            ItemId = 1,
            PriceType = "Purchase",
            Amount = 90000,
            Currency = "VND",
            EffectiveFrom = DateOnly.FromDateTime(DateTime.Today.AddDays(-30)),
            EffectiveTo = null,
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddDays(-30)
        });
        await _context.SaveChangesAsync();

        var grn = await CreateSampleGRNAsync(50);

        // Act
        await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());

        // Assert
        var oldPrice = await _context.ItemPrices
            .FirstOrDefaultAsync(p => p.ItemId == 1 && p.PriceType == "Purchase" && p.Amount == 90000);
        oldPrice!.IsActive.Should().BeFalse();
        oldPrice.EffectiveTo.Should().NotBeNull();
        oldPrice.EffectiveTo.Should().Be(DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)));
    }

    [Fact]
    public async Task ApproveGRN_TaoAuditLog()
    {
        // Arrange
        var grn = await CreateSampleGRNAsync(50);

        // Act
        await _service.ApproveGRNAsync(grn.GrnId, 1, new ApproveGRNRequest());

        // Assert
        var auditLog = await _context.AuditLogs
            .FirstOrDefaultAsync(a => a.EntityType == "GoodsReceiptNote" && a.EntityId == grn.GrnId && a.Action == "APPROVE");
        auditLog.Should().NotBeNull();
        auditLog!.ActorUserId.Should().Be(1);
    }
}
