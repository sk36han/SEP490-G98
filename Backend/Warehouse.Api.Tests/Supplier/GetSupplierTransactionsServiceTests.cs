extern alias api;
using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;

namespace WarehouseTests.Supplier;

public class GetSupplierTransactionsServiceTests : IDisposable
{
    private readonly Mock<INotificationService> _notifMock = new();
    private readonly Mock<IAuditLogService> _auditMock = new();
    private readonly Mkiwms5Context _context;
    
    private long _suppId;
    private long _poId;
    private long _grnId;

    public GetSupplierTransactionsServiceTests()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(databaseName: "ST_" + Guid.NewGuid().ToString())
            .Options;
        _context = new Mkiwms5Context(options);
        SeedDatabase();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    private SupplierService CreateService() 
    {
        var repo = new GenericRepository<Warehouse.Entities.Models.Supplier>(_context);
        return new SupplierService(repo, _notifMock.Object, _auditMock.Object, _context);
    }

    private void SeedDatabase()
    {
        var user = new User { Username = "u_" + Guid.NewGuid(), FullName = "Admin", Email = "e_" + Guid.NewGuid() + "@t.com", PasswordHash = "h", IsActive = true };
        var uom = new UnitOfMeasure { UomName = "Pieces", IsActive = true };
        var wh = new Warehouse.Entities.Models.Warehouse { WarehouseCode = "WH_" + Guid.NewGuid().ToString().Substring(0,8), WarehouseName = "Main WH", IsActive = true };
        var supplier = new Warehouse.Entities.Models.Supplier { SupplierCode = "SUP_" + Guid.NewGuid().ToString().Substring(0,8), SupplierName = "Supplier 1", IsActive = true };

        var item = new Item { ItemCode = "ITEM_" + Guid.NewGuid().ToString().Substring(0,8), ItemName = "Item 01", BaseUom = uom, IsActive = true };
        
        var po1 = new PurchaseOrder
        {
            Pocode = "PO_" + Guid.NewGuid().ToString().Substring(0,8), Supplier = supplier, RequestedByNavigation = user, Warehouse = wh,
            RequestedDate = new DateOnly(2026, 3, 1), Status = "APPROVED", CreatedAt = DateTime.UtcNow,
            TotalAmount = 100, DiscountAmount = 0,
            LifecycleStatus = "Open"
        };
        po1.PurchaseOrderLines.Add(new PurchaseOrderLine { OrderedQty = 10, Item = item, Uom = uom, UnitPrice = 10, LineStatus = "Open" });

        var grn1 = new GoodsReceiptNote
        {
            Grncode = "GRN_" + Guid.NewGuid().ToString().Substring(0,8), Supplier = supplier, CreatedByNavigation = user, Warehouse = wh,
            ReceiptDate = new DateOnly(2026, 3, 5), Status = "POSTED", SubmittedAt = DateTime.UtcNow
        };
        grn1.GoodsReceiptNoteLines.Add(new GoodsReceiptNoteLine { ActualQty = 8, Item = item, Uom = uom });

        _context.Add(po1);
        _context.Add(grn1);
        _context.SaveChanges();
        
        _suppId = supplier.SupplierId;
        _poId = po1.PurchaseOrderId;
        _grnId = grn1.Grnid;
    }

    [Fact]
    public async Task GetTransactions_Summary_ShouldReturnStats()
    {
        var result = await CreateService().GetSupplierTransactionsAsync(
            _suppId, 1, 20, null, null, null, null, null, null);

        result.Summary.Should().NotBeNull();
        result.Summary!.TotalPurchaseOrders.Should().Be(1);
        result.Summary.TotalGoodsReceiptNotes.Should().Be(1);
    }

    [Fact]
    public async Task GetTransactions_History_ShouldReturnMergedList()
    {
        var result = await CreateService().GetSupplierTransactionsAsync(
            _suppId, 1, 20, null, null, null, null, null, null);

        result.History.Should().NotBeNull();
        result.History!.Items.Should().HaveCount(2); 
    }

    [Fact]
    public async Task GetTransactions_FilterByTypePO_ShouldReturnOnlyPO()
    {
        var result = await CreateService().GetSupplierTransactionsAsync(
            _suppId, 1, 20, "PO", null, null, null, null, null);

        result.History!.Items.Should().OnlyContain(x => x.TransactionType == "PO");
    }

    [Fact]
    public async Task GetTransactions_FilterByTypeGRN_ShouldReturnOnlyGRN()
    {
        var result = await CreateService().GetSupplierTransactionsAsync(
            _suppId, 1, 20, "GRN", null, null, null, null, null);

        result.History!.Items.Should().OnlyContain(x => x.TransactionType == "GRN");
    }

    [Fact]
    public async Task GetTransactions_FilterByStatus_ShouldReturnMatching()
    {
        var result = await CreateService().GetSupplierTransactionsAsync(
            _suppId, 1, 20, null, "APPROVED", null, null, null, null);

        result.History!.Items.Should().OnlyContain(x => x.Status == "APPROVED");
    }

    [Fact]
    public async Task GetTransactions_DetailModePO_ShouldReturnDetail()
    {
        var result = await CreateService().GetSupplierTransactionsAsync(
            _suppId, 1, 20, null, null, null, null, "PO", _poId);

        result.Detail.Should().NotBeNull();
    }

    [Fact]
    public async Task GetTransactions_DetailModeGRN_ShouldReturnDetail()
    {
        var result = await CreateService().GetSupplierTransactionsAsync(
            _suppId, 1, 20, null, null, null, null, "GRN", _grnId);

        result.Detail.Should().NotBeNull();
    }

    [Fact]
    public async Task GetTransactions_Paging_ShouldWork()
    {
        var result = await CreateService().GetSupplierTransactionsAsync(
            _suppId, 1, 1, null, null, null, null, null, null);

        result.History!.Items.Should().HaveCount(1);
        result.History.TotalItems.Should().Be(2);
    }

    [Fact]
    public async Task GetTransactions_InvalidType_ShouldThrowArgumentException()
    {
        Func<Task> act = () => CreateService().GetSupplierTransactionsAsync(
            _suppId, 1, 20, "INVALID", null, null, null, null, null);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task GetTransactions_PageZero_ShouldDefaultToOne()
    {
        var result = await CreateService().GetSupplierTransactionsAsync(
            _suppId, 0, 20, null, null, null, null, null, null);

        result.History!.Page.Should().Be(1);
    }
}
