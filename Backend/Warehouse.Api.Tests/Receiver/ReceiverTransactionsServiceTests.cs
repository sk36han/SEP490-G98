using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelResponse;
using Warehouse.DataAcces.Service.Interface;

namespace WarehouseTests.Receiver;

public class ReceiverTransactionsServiceTests
{
    private readonly Mock<IGenericRepository<Warehouse.Entities.Models.Receiver>> _repoMock = new();
	private readonly Mock<IAuditLogService> _auditLogMock = new();
	private Mkiwms5Context GetContext()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new Mkiwms5Context(options);
    }

    private async Task SeedDataAsync(Mkiwms5Context context, long receiverId)
    {
        var uom = new UnitOfMeasure { UomId = 1, UomName = "Pieces" };
        context.UnitOfMeasures.Add(uom);
        var item = new Item { ItemId = 1, ItemCode = "ITM01", ItemName = "Item 01", BaseUomId = 1 };
        context.Items.Add(item);
        var warehouse = new Warehouse.Entities.Models.Warehouse { WarehouseId = 1, WarehouseName = "Main WH", WarehouseCode = "WH01" };
        
        // Required fields: Email, FullName, PasswordHash (based on User.cs view)
        var user = new User { UserId = 111, Email = "a@test.com", FullName = "Staff A", PasswordHash = "hash" };
        context.Warehouses.Add(warehouse);
        context.Users.Add(user);

        var rr = new ReleaseRequest
        {
            ReleaseRequestId = 10,
            ReceiverId = receiverId,
            ReleaseRequestCode = "RR01",
            Status = "Draft",
            WarehouseId = 1,
            RequestedBy = 111,
            RequestedDate = new DateOnly(2026, 1, 1),
            CreatedAt = new DateTime(2026, 1, 1),
            Purpose = "Test RR",
            LifecycleStatus = "IssuePending"
        };
        context.ReleaseRequests.Add(rr);
        context.ReleaseRequestLines.Add(new ReleaseRequestLine 
        { 
            ReleaseRequestLineId = 1, 
            ReleaseRequestId = 10, 
            ItemId = 1, 
            RequestedQty = 100, 
            UomId = 1,
            LineStatus = "Open"
        });

        var gdn = new GoodsDeliveryNote
        {
            Gdnid = 20,
            ReleaseRequestId = 10,
            Gdncode = "GDN01",
            Status = "Completed",
            WarehouseId = 1,
            CreatedBy = 111,
            IssueDate = new DateOnly(2026, 2, 1),
            SubmittedAt = new DateTime(2026, 2, 1),
            Note = "Test GDN"
        };
        context.GoodsDeliveryNotes.Add(gdn);
        context.GoodsDeliveryNoteLines.Add(new GoodsDeliveryNoteLine 
        { 
            GdnlineId = 1, 
            Gdnid = 20, 
            ItemId = 1, 
            ActualQty = 90, 
            UomId = 1 
        });
        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task GetTransactions_FullSummary_ShouldCalculateCorrectly()
    {
        using var context = GetContext();
        await SeedDataAsync(context, 1);
        var service = new ReceiverService(_repoMock.Object, context,_auditLogMock.Object);
        var result = await service.GetReceiverTransactionsAsync(1, 1, 10, null, null, null, null, null, null);
        result.Summary.Should().NotBeNull();
        result.Summary!.TotalReleaseRequests.Should().Be(1);
    }

    [Fact]
    public async Task GetTransactions_History_ShouldReturnMergedMergedList()
    {
        using var context = GetContext();
        await SeedDataAsync(context, 1);
        var service = new ReceiverService(_repoMock.Object, context, _auditLogMock.Object);
        var result = await service.GetReceiverTransactionsAsync(1, 1, 10, null, null, null, null, null, null);
        result.History.TotalItems.Should().Be(2);
    }
}
