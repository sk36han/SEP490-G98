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

// Resuing the interceptor to fix NullabilityError
public class StocktakeServiceInterceptor : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context != null)
        {
            foreach (var entry in context.ChangeTracker.Entries<StocktakeSession>().Where(e => e.State == EntityState.Added))
            {
                entry.Entity.Warehouse ??= context.Set<Warehouse.Entities.Models.Warehouse>().Find(entry.Entity.WarehouseId);
                entry.Entity.CreatedByNavigation ??= context.Set<User>().Find(entry.Entity.CreatedBy);
            }
        }
        return new ValueTask<InterceptionResult<int>>(result);
    }
}

public class StocktakeServiceTests
{
    private readonly Mock<INotificationService> _notificationServiceMock = new();

    private Mkiwms5Context GetContext()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .AddInterceptors(new StocktakeServiceInterceptor())
            .Options;
        return new Mkiwms5Context(options);
    }

    private async Task SeedDataAsync(Mkiwms5Context context)
    {
        var wh = new Warehouse.Entities.Models.Warehouse { WarehouseId = 1, WarehouseCode = "WH001", WarehouseName = "Main WH", IsActive = true };
        var user = new User { UserId = 111, FullName = "Tester", Email = "a@b.com", PasswordHash = "x" };
        context.Warehouses.Add(wh);
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var sessions = new List<StocktakeSession>
        {
            new() { StocktakeId = 1, StocktakeCode = "ST001", WarehouseId = 1, Status = "COMPLETED", Mode = "PERIODIC", CreatedBy = 111, PlannedAt = DateTime.UtcNow.AddDays(-5) },
            new() { StocktakeId = 2, StocktakeCode = "ST002", WarehouseId = 1, Status = "IN_PROGRESS", Mode = "ADHOC", CreatedBy = 111, PlannedAt = DateTime.UtcNow.AddDays(-1) }
        };
        context.StocktakeSessions.AddRange(sessions);

        var lines = new List<StocktakeLine>
        {
            new() { StocktakeId = 1, ItemId = 1, SystemQtySnapshot = 10, CountedQty = 10, VarianceQty = 0 },
            new() { StocktakeId = 1, ItemId = 2, SystemQtySnapshot = 10, CountedQty = 8, VarianceQty = -2 }
        };
        context.StocktakeLines.AddRange(lines);

        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task GetStocktakes_WithFilters_ShouldReturnCorrectData()
    {
        using var context = GetContext();
        await SeedDataAsync(context);
        var service = new StocktakeService(context, _notificationServiceMock.Object);

        // Filter by Status=COMPLETED
        var result = await service.GetStocktakesAsync(new StocktakeListRequest { Status = "COMPLETED" });
        result.Items.Count().Should().Be(1);
        result.Items.First().StocktakeCode.Should().Be("ST001");
        
        // Progress Percent check
        result.Items.First().ProgressPercent.Should().Be(100);
    }

    [Fact]
    public async Task GetStocktakeDetail_ShouldReturnFullInfo()
    {
        using var context = GetContext();
        await SeedDataAsync(context);
        var service = new StocktakeService(context, _notificationServiceMock.Object);

        var detail = await service.GetStocktakeDetailAsync(1);
        detail.Should().NotBeNull();
        detail!.WarehouseName.Should().Be("Main WH");
        detail.CountedLines.Should().Be(2);
        detail.VarianceLines.Should().Be(1);
    }
}
