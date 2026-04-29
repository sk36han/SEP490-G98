using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.Models;
using WarehouseModel = Warehouse.Entities.Models;

namespace Warehouse.Api.Tests.GoodsReceiptNote;

/// <summary>
/// Unit tests cho <see cref="GoodsReceiptNoteService"/> — EF InMemory, Moq audit/notification.
/// </summary>
public class GoodsReceiptNoteServiceTests : IDisposable
{
    private readonly Mkiwms5Context _context;
    private readonly GoodsReceiptNoteService _sut;
    private readonly Mock<IAuditLogService> _audit = new();
    private readonly Mock<INotificationService> _notify = new();

    public GoodsReceiptNoteServiceTests()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new Mkiwms5Context(options);

        _audit
            .Setup(a => a.LogAsync(
                It.IsAny<long>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<long?>(),
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        _notify
            .Setup(n => n.CreateAsync(
                It.IsAny<long>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<long?>(), It.IsAny<string>(), It.IsAny<byte>(), It.IsAny<DateTime?>()))
            .Returns(Task.CompletedTask);

        _sut = new GoodsReceiptNoteService(_context, _notify.Object, _audit.Object);
        SeedBaseData();
    }

    public void Dispose() => _context.Dispose();

    #region Seed & builders

    private void SeedBaseData()
    {
        _context.Users.Add(new WarehouseModel.User
        {
            UserId = 1,
            Username = "u1",
            FullName = "User One",
            Email = "u1@test.com",
            IsActive = true,
            PasswordHash = "x"
        });

        _context.Suppliers.AddRange(
            new WarehouseModel.Supplier { SupplierId = 1, SupplierCode = "SUP1", SupplierName = "Active", IsActive = true },
            new WarehouseModel.Supplier { SupplierId = 2, SupplierCode = "SUP2", SupplierName = "Inactive", IsActive = false });

        _context.Warehouses.AddRange(
            new WarehouseModel.Warehouse { WarehouseId = 1, WarehouseCode = "WH1", WarehouseName = "Kho 1", IsActive = true, CreatedAt = DateTime.UtcNow },
            new WarehouseModel.Warehouse { WarehouseId = 2, WarehouseCode = "WH2", WarehouseName = "Kho off", IsActive = false, CreatedAt = DateTime.UtcNow });

        _context.UnitOfMeasures.Add(new WarehouseModel.UnitOfMeasure { UomId = 1, UomName = "Cái" });

        _context.Items.AddRange(
            new WarehouseModel.Item { ItemId = 1, ItemCode = "IT1", ItemName = "Active item", IsActive = true, BaseUomId = 1 },
            new WarehouseModel.Item { ItemId = 2, ItemCode = "IT2", ItemName = "Inactive item", IsActive = false, BaseUomId = 1 },
            new WarehouseModel.Item { ItemId = 3, ItemCode = "IT3", ItemName = "Other item", IsActive = true, BaseUomId = 1 });

        _context.StorageLocations.AddRange(
            new WarehouseModel.StorageLocation { LocationId = 1, WarehouseId = 1, LocationCode = "A-01", IsActive = true, CreatedAt = DateTime.UtcNow },
            new WarehouseModel.StorageLocation { LocationId = 2, WarehouseId = 1, LocationCode = "A-OFF", IsActive = false, CreatedAt = DateTime.UtcNow },
            new WarehouseModel.StorageLocation { LocationId = 3, WarehouseId = 2, LocationCode = "B-01", IsActive = true, CreatedAt = DateTime.UtcNow },
            new WarehouseModel.StorageLocation { LocationId = 4, WarehouseId = 1, LocationCode = "A-02", IsActive = true, CreatedAt = DateTime.UtcNow });

        _context.PurchaseOrders.Add(new WarehouseModel.PurchaseOrder
        {
            PurchaseOrderId = 1,
            Pocode = "PO001",
            RequestedBy = 1,
            SupplierId = 1,
            WarehouseId = 1,
            Status = "APPROVED",
            CurrentStageNo = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            LifecycleStatus = "Ordered",
            TotalAmount = 1_000_000
        });

        _context.PurchaseOrderLines.Add(new WarehouseModel.PurchaseOrderLine
        {
            PurchaseOrderLineId = 1,
            PurchaseOrderId = 1,
            ItemId = 1,
            OrderedQty = 100,
            UomId = 1,
            ReceivedQty = 0,
            LineStatus = "Open",
            UnitPrice = 10_000
        });

        _context.SaveChanges();
    }

    private static CreateGRNRequest ValidRequest(Action<CreateGRNRequest>? tweak = null)
    {
        var r = new CreateGRNRequest
        {
            PurchaseOrderId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.UtcNow),
            WarehouseId = 1,
            SupplierId = 1,
            Lines =
            [
                new CreateGRNLineRequest
                {
                    ItemId = 1,
                    LocationId = 1,
                    ExpectedQty = 10,
                    ActualQty = 10,
                    UomId = 1,
                    PurchaseOrderLineId = 1,
                    UnitPrice = 10_000
                }
            ]
        };
        tweak?.Invoke(r);
        return r;
    }

    /// <summary>GRN PENDING_ACC + 1 dòng, để gọi <see cref="GoodsReceiptNoteService.ApproveGRNAsync"/> trực tiếp.</summary>
    private async Task<long> SeedPendingGrnAsync(
        long grnId,
        long grnLineId,
        decimal actualQty = 3,
        decimal unitPrice = 10_000)
    {
        _context.GoodsReceiptNotes.Add(new WarehouseModel.GoodsReceiptNote
        {
            Grnid = grnId,
            Grncode = "GRN-PEND",
            PurchaseOrderId = 1,
            SupplierId = 1,
            WarehouseId = 1,
            ReceiptDate = DateOnly.FromDateTime(DateTime.UtcNow),
            CreatedBy = 1,
            Status = "PENDING_ACC",
            ShippingFee = 0,
            IsPaid = false,
            TotalReceivedQty = actualQty,
            TotalGoodsAmount = actualQty * unitPrice
        });
        _context.GoodsReceiptNoteLines.Add(new WarehouseModel.GoodsReceiptNoteLine
        {
            GrnlineId = grnLineId,
            Grnid = grnId,
            ItemId = 1,
            ExpectedQty = actualQty,
            ActualQty = actualQty,
            UomId = 1,
            PurchaseOrderLineId = 1,
            UnitPrice = unitPrice
        });
        await _context.SaveChangesAsync();
        return grnId;
    }

    #endregion

    #region GetGoodsReceiptNotesAsync

    [Fact]
    public async Task GetGoodsReceiptNotes_Should_NormalizePaging_When_PageOrPageSizeNonPositive()
    {
        var page = await _sut.GetGoodsReceiptNotesAsync(0, 0);
        page.Page.Should().Be(1);
        page.PageSize.Should().Be(20);
    }

    [Fact]
    public async Task GetGoodsReceiptNotes_Should_ContainGrn_When_AfterCreate()
    {
        await _sut.CreateGRNAsync(1, ValidRequest());

        var page = await _sut.GetGoodsReceiptNotesAsync(1, 20);
        page.TotalItems.Should().Be(1);
        page.Items.Should().ContainSingle(i => i.GrnCode.StartsWith("GRN"));
    }

    #endregion

    #region CreateGRNAsync — success & side effects

    [Fact]
    public async Task CreateGRN_Should_ReturnPosted_And_UpdatePoInventoryLot_When_Valid()
    {
        var res = await _sut.CreateGRNAsync(1, ValidRequest());

        res.Status.Should().Be("POSTED");
        res.GrnCode.Should().StartWith("GRN");

        var poLine = await _context.PurchaseOrderLines.FindAsync(1L);
        poLine!.ReceivedQty.Should().Be(10);
        poLine.LineStatus.Should().Be("PartiallyReceived");

        (await _context.InventoryOnHands.FirstOrDefaultAsync(i => i.WarehouseId == 1 && i.ItemId == 1))!
            .OnHandQty.Should().Be(10);

        (await _context.InventoryLots.FirstAsync(l => l.GrnlineId != null)).LocationId.Should().Be(1);

        _notify.Verify(n => n.CreateAsync(
            1,
            It.Is<string>(t => t.Contains(res.GrnCode)),
            It.IsAny<string>(),
            "GoodsReceipt",
            res.GrnId,
            "ApprovalResult",
            0,
            null), Times.Once);
    }

    [Fact]
    public async Task CreateGRN_Should_ApplyPercentageDiscount_When_DiscountTypePercentage()
    {
        var res = await _sut.CreateGRNAsync(1, ValidRequest(r =>
        {
            r.DiscountType = "Percentage";
            r.DiscountValue = 10; // 10% of 100k => 90k goods
        }));

        res.Status.Should().Be("POSTED");
        res.TotalAmount.Should().Be(90_000);
    }

    #endregion

    #region CreateGRNAsync — validation

    [Fact]
    public async Task CreateGRN_Should_ThrowKeyNotFound_When_PurchaseOrderMissing()
    {
        var act = () => _sut.CreateGRNAsync(1, ValidRequest(r => r.PurchaseOrderId = 999));
        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*đơn mua hàng*");
    }

    [Fact]
    public async Task CreateGRN_Should_ThrowKeyNotFound_When_WarehouseMissing()
    {
        var act = () => _sut.CreateGRNAsync(1, ValidRequest(r => r.WarehouseId = 999));
        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*kho nhận*");
    }

    [Fact]
    public async Task CreateGRN_Should_ThrowInvalidOperation_When_WarehouseInactive()
    {
        var act = () => _sut.CreateGRNAsync(1, ValidRequest(r => r.WarehouseId = 2));
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*không hoạt động*");
    }

    [Fact]
    public async Task CreateGRN_Should_ThrowKeyNotFound_When_SupplierMissing()
    {
        var act = () => _sut.CreateGRNAsync(1, ValidRequest(r => r.SupplierId = 999));
        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*nhà cung cấp*");
    }

    [Fact]
    public async Task CreateGRN_Should_ThrowInvalidOperation_When_SupplierInactive()
    {
        var act = () => _sut.CreateGRNAsync(1, ValidRequest(r => r.SupplierId = 2));
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*nhà cung cấp*");
    }

    [Fact]
    public async Task CreateGRN_Should_ThrowKeyNotFound_When_UserMissing()
    {
        var act = () => _sut.CreateGRNAsync(999, ValidRequest());
        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*người dùng*");
    }

    [Fact]
    public async Task CreateGRN_Should_ThrowKeyNotFound_When_ItemMissing()
    {
        var req = ValidRequest();
        req.Lines[0].ItemId = 999;
        var act = () => _sut.CreateGRNAsync(1, req);
        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*vật tư*");
    }

    [Fact]
    public async Task CreateGRN_Should_ThrowInvalidOperation_When_ItemInactive()
    {
        var req = ValidRequest();
        req.Lines[0].ItemId = 2;
        var act = () => _sut.CreateGRNAsync(1, req);
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*vật tư*");
    }

    [Fact]
    public async Task CreateGRN_Should_ThrowKeyNotFound_When_UomMissing()
    {
        var req = ValidRequest();
        req.Lines[0].UomId = 999;
        var act = () => _sut.CreateGRNAsync(1, req);
        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*đơn vị tính*");
    }

    [Fact]
    public async Task CreateGRN_Should_ThrowInvalidOperation_When_DuplicateLocationAcrossLines()
    {
        var req = ValidRequest(r => r.Lines =
        [
            new CreateGRNLineRequest { ItemId = 1, LocationId = 1, ExpectedQty = 5, ActualQty = 5, UomId = 1, PurchaseOrderLineId = 1, UnitPrice = 10_000 },
            new CreateGRNLineRequest { ItemId = 1, LocationId = 1, ExpectedQty = 5, ActualQty = 5, UomId = 1, PurchaseOrderLineId = 1, UnitPrice = 10_000 }
        ]);
        var act = () => _sut.CreateGRNAsync(1, req);
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*trùng vị trí*");
    }

    [Fact]
    public async Task CreateGRN_Should_ThrowKeyNotFound_When_LocationMissing()
    {
        var req = ValidRequest();
        req.Lines[0].LocationId = 999;
        var act = () => _sut.CreateGRNAsync(1, req);
        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*vị trí*");
    }

    [Fact]
    public async Task CreateGRN_Should_ThrowInvalidOperation_When_LocationNotInReceivingWarehouse()
    {
        var req = ValidRequest();
        req.Lines[0].LocationId = 3;
        var act = () => _sut.CreateGRNAsync(1, req);
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*không thuộc kho nhận*");
    }

    [Fact]
    public async Task CreateGRN_Should_ThrowInvalidOperation_When_LocationInactive()
    {
        var req = ValidRequest();
        req.Lines[0].LocationId = 2;
        var act = () => _sut.CreateGRNAsync(1, req);
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*không hoạt động*");
    }

    [Fact]
    public async Task CreateGRN_Should_ThrowInvalidOperation_When_LocationStockIsDifferentItem()
    {
        _context.InventoryLots.Add(new WarehouseModel.InventoryLot
        {
            ItemId = 3,
            WarehouseId = 1,
            LocationId = 4,
            Quantity = 5,
            UnitCost = 1000,
            ReceiptDate = DateTime.UtcNow,
            IsActive = true
        });
        await _context.SaveChangesAsync();

        var act = () => _sut.CreateGRNAsync(1, ValidRequest(r => r.Lines[0].LocationId = 4));
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*khác loại*");
    }

    [Fact]
    public async Task CreateGRN_Should_ThrowInvalidOperation_When_DiscountGreaterThanGoodsTotal()
    {
        var act = () => _sut.CreateGRNAsync(1, ValidRequest(r =>
        {
            r.DiscountType = "Amount";
            r.DiscountValue = 999_999;
        }));
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Giảm giá*");
    }

    [Fact]
    public async Task CreateGRN_Should_ThrowInvalidOperation_When_ReceivedQtyExceedsOrdered()
    {
        var act = () => _sut.CreateGRNAsync(1, ValidRequest(r => r.Lines[0].ActualQty = 500));
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*vượt quá*");
    }

    #endregion

    #region ApproveGRNAsync

    [Fact]
    public async Task ApproveGRN_Should_PostAndUpdatePayment_When_PendingAcc()
    {
        await SeedPendingGrnAsync(50, 500);
        var before = (await _context.PurchaseOrderLines.FindAsync(1L))!.ReceivedQty;

        var res = await _sut.ApproveGRNAsync(50, 1, new ApproveGRNRequest { IsPaid = true, PaymentMethod = "cash" });

        res.Status.Should().Be("POSTED");
        res.IsPaid.Should().BeTrue();

        var grn = await _context.GoodsReceiptNotes.FindAsync(50L);
        grn!.Status.Should().Be("POSTED");
        grn.PaymentMethod.Should().Be("cash");

        (await _context.PurchaseOrderLines.FindAsync(1L))!.ReceivedQty.Should().Be(before + 3);
    }

    [Fact]
    public async Task ApproveGRN_Should_ThrowKeyNotFound_When_GrnIdInvalid()
    {
        var act = () => _sut.ApproveGRNAsync(9999, 1, new ApproveGRNRequest());
        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*phiếu nhập*");
    }

    [Fact]
    public async Task ApproveGRN_Should_ThrowInvalidOperation_When_AlreadyPosted()
    {
        await _sut.CreateGRNAsync(1, ValidRequest());
        var id = (await _context.GoodsReceiptNotes.FirstAsync()).Grnid;

        var act = () => _sut.ApproveGRNAsync(id, 1, new ApproveGRNRequest());
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*chờ duyệt*");
    }

    #endregion

    #region GetGRNDetailAsync

    [Fact]
    public async Task GetGRNDetail_Should_MapLines_And_AvailableQty_When_Posted()
    {
        var created = await _sut.CreateGRNAsync(1, ValidRequest());
        var detail = await _sut.GetGRNDetailAsync(created.GrnId);

        detail.GrnCode.Should().Be(created.GrnCode);
        detail.Lines.Should().HaveCount(1);
        detail.Lines[0].QtyCommittedForReturn.Should().Be(0);
        detail.Lines[0].QtyAvailableForReturn.Should().Be(detail.Lines[0].ActualQty);
    }

    [Fact]
    public async Task GetGRNDetail_Should_ReduceAvailableByCommittedReturn_When_ActivePrnLines()
    {
        var created = await _sut.CreateGRNAsync(1, ValidRequest());
        var line = await _context.GoodsReceiptNoteLines.FirstAsync(l => l.Grnid == created.GrnId);

        _context.PurchaseReturnNotes.Add(new WarehouseModel.PurchaseReturnNote
        {
            PurchaseReturnId = 1,
            ReturnCode = "PRN-T1",
            RelatedGrnid = created.GrnId,
            ReturnDate = DateTime.UtcNow,
            Status = "POSTED",
            CreatedBy = 1,
            CreatedAt = DateTime.UtcNow,
            RefundStatus = "NotRefunded"
        });
        _context.PurchaseReturnNoteLines.Add(new WarehouseModel.PurchaseReturnNoteLine
        {
            PurchaseReturnLineId = 1,
            PurchaseReturnId = 1,
            ItemId = 1,
            UomId = 1,
            ReturnQty = 4,
            UnitPrice = 10_000,
            RelatedGrnlineId = line.GrnlineId
        });
        await _context.SaveChangesAsync();

        var detail = await _sut.GetGRNDetailAsync(created.GrnId);
        var row = detail.Lines.Single(l => l.GrnlineId == line.GrnlineId);
        row.QtyCommittedForReturn.Should().Be(4);
        row.QtyAvailableForReturn.Should().Be(6);
    }

    [Fact]
    public async Task GetGRNDetail_Should_ThrowKeyNotFound_When_GrnMissing()
    {
        var act = () => _sut.GetGRNDetailAsync(99999);
        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("*phiếu nhập*");
    }

    #endregion

    #region ImportAndMatchItemsAsync

    [Fact]
    public async Task ImportAndMatchItems_Should_ThrowNotImplemented()
    {
        var act = () => _sut.ImportAndMatchItemsAsync(new MemoryStream());
        await act.Should().ThrowAsync<NotImplementedException>();
    }

    #endregion
}
