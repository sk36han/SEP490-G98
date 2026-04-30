using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.Models;
using WarehouseModel = Warehouse.Entities.Models;

namespace Warehouse.Api.Tests.GoodsDeliveryNote;

public class GoodsDeliveryNoteServiceTests : IDisposable
{
    private readonly Mkiwms5Context _context;
    private readonly GoodsDeliveryNoteService _sut;
    private readonly Mock<IStocktakeService> _stocktake = new();
    private readonly Mock<IAuditLogService> _audit = new();
    private readonly Mock<IDocumentAttachmentService> _attachment = new();
    private readonly Mock<INotificationService> _notify = new();

    public GoodsDeliveryNoteServiceTests()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new Mkiwms5Context(options);

        _stocktake.Setup(s => s.IsWarehouseFrozenAsync(It.IsAny<long>())).ReturnsAsync(false);
        _audit.Setup(a => a.LogAsync(
                It.IsAny<long>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<long?>(),
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);
        _notify.Setup(n => n.CreateAsync(
                It.IsAny<long>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<long?>(), It.IsAny<string>(), It.IsAny<byte>(), It.IsAny<DateTime?>()))
            .Returns(Task.CompletedTask);

        _sut = new GoodsDeliveryNoteService(_context, _stocktake.Object, _audit.Object, _attachment.Object, _notify.Object);
        SeedBaseData();
    }

    public void Dispose() => _context.Dispose();

    private void SeedBaseData()
    {
        _context.Users.Add(new WarehouseModel.User
        {
            UserId = 1,
            Username = "u1",
            FullName = "Warehouse User",
            Email = "u1@test.com",
            IsActive = true,
            PasswordHash = "x"
        });

        _context.Warehouses.Add(new WarehouseModel.Warehouse
        {
            WarehouseId = 1,
            WarehouseCode = "WH1",
            WarehouseName = "Kho 1",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });

        _context.UnitOfMeasures.Add(new WarehouseModel.UnitOfMeasure { UomId = 1, UomName = "Cai" });
        _context.Items.Add(new WarehouseModel.Item { ItemId = 1, ItemCode = "IT1", ItemName = "Item 1", IsActive = true, BaseUomId = 1 });

        _context.Companies.Add(new WarehouseModel.Company { CompanyId = 1, CompanyCode = "C1", CompanyName = "Comp 1", IsActive = true });
        _context.Receivers.Add(new WarehouseModel.Receiver { ReceiverId = 1, ReceiverCode = "R1", ReceiverName = "Receiver 1", CompanyId = 1, IsActive = true });

        _context.ReleaseRequests.Add(new WarehouseModel.ReleaseRequest
        {
            ReleaseRequestId = 1,
            ReleaseRequestCode = "RR-2026-001",
            RequestedBy = 1,
            ReceiverId = 1,
            WarehouseId = 1,
            RequestedDate = DateOnly.FromDateTime(DateTime.UtcNow),
            ExpectedDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = "APPROVED",
            LifecycleStatus = "IssuePending",
            CreatedAt = DateTime.UtcNow
        });

        _context.ReleaseRequestLines.Add(new WarehouseModel.ReleaseRequestLine
        {
            ReleaseRequestLineId = 1,
            ReleaseRequestId = 1,
            ItemId = 1,
            RequestedQty = 5,
            ApprovedQty = 5,
            AllocatedQty = 5,
            IssuedQty = 0,
            UomId = 1,
            LineStatus = "Open",
            UnitCostAtIssue = 10
        });

        _context.GoodsDeliveryNotes.Add(new WarehouseModel.GoodsDeliveryNote
        {
            Gdnid = 1,
            Gdncode = "GDN-2026-0001",
            ReleaseRequestId = 1,
            WarehouseId = 1,
            IssueDate = DateOnly.FromDateTime(DateTime.UtcNow),
            CreatedBy = 1,
            Status = "PENDING_ISSUE",
            TotalDeliveredQty = 3,
            TotalDeliveredAmount = 30
        });

        _context.GoodsDeliveryNoteLines.Add(new WarehouseModel.GoodsDeliveryNoteLine
        {
            GdnlineId = 1,
            Gdnid = 1,
            ItemId = 1,
            RequestedQty = 5,
            ActualQty = 3,
            UomId = 1,
            ReleaseRequestLineId = 1,
            UnitPrice = 10,
            LineTotal = 30
        });

        _context.InventoryOnHands.Add(new WarehouseModel.InventoryOnHand
        {
            WarehouseId = 1,
            ItemId = 1,
            OnHandQty = 100,
            ReservedQty = 5,
            UnitCost = 10,
            UpdatedAt = DateTime.UtcNow
        });

        _context.InventoryLots.Add(new WarehouseModel.InventoryLot
        {
            LotId = 1,
            ItemId = 1,
            WarehouseId = 1,
            Quantity = 100,
            UnitCost = 10,
            ReceiptDate = DateTime.UtcNow.AddDays(-1),
            IsActive = true
        });

        _context.SaveChanges();
    }

    [Fact]
    public async Task IssueGDN_ShouldNotOverridePersistedActualQty_WhenIsAllItemsFulfilledAndNoLines()
    {
        var request = new WarehouseIssueRequest
        {
            IsAllItemsFulfilled = true,
            Lines = null
        };

        var result = await _sut.IssueGDNAsync(1, 1, request);

        result.Status.Should().Be("ISSUED");
        result.TotalDeliveredQty.Should().Be(3);

        var line = await _context.GoodsDeliveryNoteLines.FirstAsync(l => l.Gdnid == 1);
        line.ActualQty.Should().Be(3);

        var rrLine = await _context.ReleaseRequestLines.FirstAsync(l => l.ReleaseRequestLineId == 1);
        rrLine.IssuedQty.Should().Be(3);
    }
}
