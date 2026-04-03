using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Moq;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace WarehouseTests.Stocktake;

public class StocktakeExecutionInterceptor : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context != null)
        {
            // Link AuditLog
            foreach (var entry in context.ChangeTracker.Entries<AuditLog>().Where(e => e.State == EntityState.Added))
            {
                entry.Entity.ActorUser ??= context.Set<User>().Find(entry.Entity.ActorUserId);
            }
            // Link StocktakeSession
            foreach (var entry in context.ChangeTracker.Entries<StocktakeSession>().Where(e => e.State == EntityState.Added))
            {
                entry.Entity.Warehouse ??= context.Set<Warehouse.Entities.Models.Warehouse>().Find(entry.Entity.WarehouseId);
                entry.Entity.CreatedByNavigation ??= context.Set<User>().Find(entry.Entity.CreatedBy);
            }
            // Link StocktakeLine
            foreach (var entry in context.ChangeTracker.Entries<StocktakeLine>().Where(e => e.State == EntityState.Added))
            {
                entry.Entity.Item ??= context.Set<Item>().Find(entry.Entity.ItemId);
            }
            // Link InventoryAdjustmentRequest
            foreach (var entry in context.ChangeTracker.Entries<InventoryAdjustmentRequest>().Where(e => e.State == EntityState.Added))
            {
                entry.Entity.Warehouse ??= context.Set<Warehouse.Entities.Models.Warehouse>().Find(entry.Entity.WarehouseId);
                entry.Entity.SubmittedByNavigation ??= context.Set<User>().Find(entry.Entity.SubmittedBy);
            }
            // Link DocumentApproval
            foreach (var entry in context.ChangeTracker.Entries<DocumentApproval>().Where(e => e.State == EntityState.Added))
            {
                entry.Entity.ActionByNavigation ??= context.Set<User>().Find(entry.Entity.ActionBy);
            }
        }
        return new ValueTask<InterceptionResult<int>>(result);
    }
}

public class StocktakeExecutionServiceTests
{
    private readonly Mock<IStocktakeService> _stocktakeServiceMock = new();
    private readonly Mock<INotificationService> _notificationServiceMock = new();
    
    private Mkiwms5Context GetContext()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .AddInterceptors(new StocktakeExecutionInterceptor())
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new Mkiwms5Context(options);
    }

    private StocktakeExecutionService CreateService(Mkiwms5Context context)
    {
        return new StocktakeExecutionService(context, _stocktakeServiceMock.Object, _notificationServiceMock.Object);
    }

    private async Task SeedBaseDataAsync(Mkiwms5Context context)
    {
        var wh = new Warehouse.Entities.Models.Warehouse { WarehouseId = 1, WarehouseCode = "WH001", WarehouseName = "Main WH", IsActive = true };
        var user = new User { UserId = 111, Email = "test@test.com", FullName = "Tester", PasswordHash = "hash" };
        var item = new Item { ItemId = 1, ItemCode = "ITEM001", ItemName = "Product 1", CategoryId = 1, BrandId = 1, BaseUomId = 1 };
        var inventory = new InventoryOnHand { WarehouseId = 1, ItemId = 1, OnHandQty = 100, UpdatedAt = DateTime.UtcNow };

        context.Warehouses.Add(wh);
        context.Users.Add(user);
        context.Items.Add(item);
        context.InventoryOnHands.Add(inventory);
        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task StartExecution_ShouldSnapshotInventory_AndChangeStatus()
    {
        using var context = GetContext();
        await SeedBaseDataAsync(context);
        var session = new StocktakeSession { StocktakeId = 10, Status = "APPROVED", WarehouseId = 1, StocktakeCode = "ST10", Mode = "P", CreatedBy = 111 };
        context.StocktakeSessions.Add(session);
        await context.SaveChangesAsync();

        _stocktakeServiceMock.Setup(x => x.GetStocktakeDetailAsync(10)).ReturnsAsync(new StocktakeDetailResponse { Status = "IN_PROGRESS" });

        var service = CreateService(context);
        await service.StartStocktakeExecutionAsync(10, 111);

        session.Status.Should().Be("IN_PROGRESS");
        session.StartedAt.Should().NotBeNull();
        context.StocktakeLines.Count(l => l.StocktakeId == 10).Should().Be(1);
        context.StocktakeLines.First().SystemQtySnapshot.Should().Be(100);
    }

    [Fact]
    public async Task FinalizeResults_WithDiscrepancy_ShouldCreateAdjustment_AndComplete()
    {
        using var context = GetContext();
        await SeedBaseDataAsync(context);
        var session = new StocktakeSession { StocktakeId = 20, Status = "PENDING_APPROVAL", WarehouseId = 1, StocktakeCode = "ST20", Mode = "P", CreatedBy = 111 };
        context.StocktakeSessions.Add(session);
        var line = new StocktakeLine { StocktakeId = 20, ItemId = 1, SystemQtySnapshot = 100, CountedQty = 90, VarianceQty = -10 };
        context.StocktakeLines.Add(line);
        await context.SaveChangesAsync();

        _stocktakeServiceMock.Setup(x => x.GetStocktakeDetailAsync(20)).ReturnsAsync(new StocktakeDetailResponse { Status = "COMPLETED" });

        var service = CreateService(context);
        await service.ApproveAndFinalizeResultsAsync(20, new StocktakeApprovalRequest { Decision = "APPROVE", Reason = "OK" }, 111);

        session.Status.Should().Be("COMPLETED");
        
        // Check for Adjustment Request
        var adjustment = await context.InventoryAdjustmentRequests.FirstOrDefaultAsync(a => a.StocktakeId == 20);
        adjustment.Should().NotBeNull();
        adjustment!.Status.Should().Be("POSTED");

        // Check Inventory Update
        var inventory = await context.InventoryOnHands.FirstAsync(i => i.WarehouseId == 1 && i.ItemId == 1);
        inventory.OnHandQty.Should().Be(90);
    }

    [Fact]
    public async Task FinalizeResults_RecountDecision_ShouldSetToInProgress()
    {
        using var context = GetContext();
        await SeedBaseDataAsync(context);
        var session = new StocktakeSession { StocktakeId = 30, Status = "PENDING_APPROVAL", WarehouseId = 1, StocktakeCode = "ST30", Mode = "P", CreatedBy = 111 };
        context.StocktakeSessions.Add(session);
        await context.SaveChangesAsync();

        _stocktakeServiceMock.Setup(x => x.GetStocktakeDetailAsync(30)).ReturnsAsync(new StocktakeDetailResponse { Status = "IN_PROGRESS" });

        var service = CreateService(context);
        await service.ApproveAndFinalizeResultsAsync(30, new StocktakeApprovalRequest { Decision = "RECOUNT", Reason = "Check again" }, 111);

        session.Status.Should().Be("IN_PROGRESS");
    }

    [Fact]
    public async Task CancelStocktake_ShouldSucceed_ForInProgress()
    {
        using var context = GetContext();
        await SeedBaseDataAsync(context);
        var session = new StocktakeSession { StocktakeId = 40, Status = "IN_PROGRESS", WarehouseId = 1, StocktakeCode = "ST40", Mode = "P", CreatedBy = 111 };
        context.StocktakeSessions.Add(session);
        await context.SaveChangesAsync();

        _stocktakeServiceMock.Setup(x => x.GetStocktakeDetailAsync(40)).ReturnsAsync(new StocktakeDetailResponse { Status = "CANCELLED" });

        var service = CreateService(context);
        await service.CancelStocktakeAsync(40, "Lost data", 111);

        session.Status.Should().Be("CANCELLED");
        session.EndedAt.Should().NotBeNull();
    }
}
