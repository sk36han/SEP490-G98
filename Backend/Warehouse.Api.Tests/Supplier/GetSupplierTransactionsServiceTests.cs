extern alias api;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelResponse;

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
            .UseInMemoryDatabase(databaseName: "ST_Refactored_" + Guid.NewGuid().ToString())
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
        var user = new User { Username = "admin", FullName = "Admin User", Email = "admin@test.com", PasswordHash = "hash", IsActive = true };
        var uom = new UnitOfMeasure { UomName = "Pcs", IsActive = true };
        var wh = new Warehouse.Entities.Models.Warehouse { WarehouseCode = "WH01", WarehouseName = "Main Warehouse", IsActive = true };
        var supplier = new Warehouse.Entities.Models.Supplier { SupplierCode = "SUP-TRAN", SupplierName = "Transaction Supplier", IsActive = true };

        var item = new Item { ItemCode = "IT01", ItemName = "Item 01", BaseUom = uom, IsActive = true };
        
        // PO 1: Approved - 100 qty
        var po1 = new PurchaseOrder
        {
            Pocode = "PO-001", Supplier = supplier, RequestedByNavigation = user, Warehouse = wh,
            RequestedDate = new DateOnly(2026, 3, 1), Status = "APPROVED", CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow, LifecycleStatus = "Closed",
            TotalAmount = 1000, DiscountAmount = 0
        };
        po1.PurchaseOrderLines.Add(new PurchaseOrderLine { OrderedQty = 100, Item = item, Uom = uom, UnitPrice = 10, LineStatus = "Open" });

        // GRN 1: Posted - 80 qty
        var grn1 = new GoodsReceiptNote
        {
            Grncode = "GRN-001", Supplier = supplier, CreatedByNavigation = user, Warehouse = wh,
            ReceiptDate = new DateOnly(2026, 3, 5), Status = "POSTED", SubmittedAt = DateTime.UtcNow,
            TotalReceivedQty = 80, TotalGoodsAmount = 800
        };
        grn1.GoodsReceiptNoteLines.Add(new GoodsReceiptNoteLine { ActualQty = 80, Item = item, Uom = uom });

        _context.Add(po1);
        _context.Add(grn1);
        _context.SaveChanges();
        
        _suppId = supplier.SupplierId;
        _poId = po1.PurchaseOrderId;
        _grnId = grn1.Grnid;
    }

    [Fact]
    public async Task GetTransactions_Summary_ShouldCalculateCorrectStats()
    {
        // Act
        var result = await CreateService().GetSupplierTransactionsAsync(_suppId, 1, 10, null, null, null, null, null, null);

        // Assert
        result.Summary.Should().NotBeNull();
        result.Summary!.TotalPurchaseOrders.Should().Be(1);
        result.Summary.TotalGoodsReceiptNotes.Should().Be(1);
        result.Summary.TotalQuantityOrdered.Should().Be(100);
        result.Summary.TotalQuantityReceived.Should().Be(80);
    }

    [Fact]
    public async Task GetTransactions_History_ShouldReturnAllTransactionsMerged()
    {
        // Act
        var result = await CreateService().GetSupplierTransactionsAsync(_suppId, 1, 20, null, null, null, null, null, null);

        // Assert
        result.History.Should().NotBeNull();
        result.History!.Items.Should().HaveCount(2); 
        result.History.Items.Should().Contain(x => x.TransactionCode == "PO-001");
        result.History.Items.Should().Contain(x => x.TransactionCode == "GRN-001");
    }

    [Fact]
    public async Task GetTransactions_FilterByPO_ShouldReturnOnlyPurchaseOrders()
    {
        // Act
        var result = await CreateService().GetSupplierTransactionsAsync(_suppId, 1, 20, "PO", null, null, null, null, null);

        // Assert
        result.History!.Items.Should().OnlyContain(x => x.TransactionType == "PO");
        result.History.Items.Should().HaveCount(1);
        result.History.Items[0].TransactionCode.Should().Be("PO-001");
    }

    [Fact]
    public async Task GetTransactions_FilterByGRN_ShouldReturnOnlyGoodsReceiptNotes()
    {
        // Act
        var result = await CreateService().GetSupplierTransactionsAsync(_suppId, 1, 20, "GRN", null, null, null, null, null);

        // Assert
        result.History!.Items.Should().OnlyContain(x => x.TransactionType == "GRN");
        result.History.Items.Should().HaveCount(1);
        result.History.Items[0].TransactionCode.Should().Be("GRN-001");
    }

    [Fact]
    public async Task GetTransactions_InvalidType_ShouldThrowArgumentException()
    {
        // Act
        Func<Task> act = () => CreateService().GetSupplierTransactionsAsync(_suppId, 1, 20, "INVALID-TYPE", null, null, null, null, null);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("*không hợp lệ*");
    }

    [Fact]
    public async Task GetTransactions_ViewPODetail_ShouldReturnHeaderAndLines()
    {
        // Act
        var result = await CreateService().GetSupplierTransactionsAsync(_suppId, 1, 10, null, null, null, null, "PO", _poId);

        // Assert
        result.Detail.Should().NotBeNull();
        // Since result.Detail is dynamic/object, we check the structure if possible or just existence
        var detailStr = Newtonsoft.Json.JsonConvert.SerializeObject(result.Detail);
        detailStr.Should().Contain("PO-001");
        detailStr.Should().Contain("Lines");
    }

    [Fact]
    public async Task GetTransactions_EmptySupplier_ShouldReturnZeroStatsAndEmptyHistory()
    {
        // Arrange
        var newSupp = new Warehouse.Entities.Models.Supplier { SupplierId = 99, SupplierCode = "EMPTY", SupplierName = "Empty", IsActive = true };
        _context.Suppliers.Add(newSupp);
        await _context.SaveChangesAsync();

        // Act
        var result = await CreateService().GetSupplierTransactionsAsync(99, 1, 10, null, null, null, null, null, null);

        // Assert
        result.Summary!.TotalPurchaseOrders.Should().Be(0);
        result.Summary.TotalQuantityOrdered.Should().Be(0);
        result.History!.Items.Should().BeEmpty();
    }

    [Fact]
    public async Task GetTransactions_Pagination_ShouldApplyPageAndSize()
    {
        // Arrange: Seed 3 POs
        for(int i=2; i<=4; i++) {
             _context.PurchaseOrders.Add(new PurchaseOrder { 
                 Pocode = $"PO-P{i}", SupplierId = _suppId, Status = "DRAFT", CreatedAt = DateTime.UtcNow,
                 UpdatedAt = DateTime.UtcNow, LifecycleStatus = "Open",
                 RequestedByNavigation = _context.Users.First(), Warehouse = _context.Warehouses.First()
             });
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await CreateService().GetSupplierTransactionsAsync(_suppId, 2, 2, null, null, null, null, null, null);

        // Assert
        result.History!.Items.Should().HaveCount(2);
        result.History.Page.Should().Be(2);
        result.History.TotalItems.Should().Be(5); // 1 original + 3 new + 1 GRN = 5
    }
}
