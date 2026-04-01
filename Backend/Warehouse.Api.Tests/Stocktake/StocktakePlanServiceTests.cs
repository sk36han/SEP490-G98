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

// Interceptor to fix NullabilityError in InMemoryDatabase by auto-linking navigation properties
public class StocktakeTestInterceptor : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context != null)
        {
            foreach (var entry in context.ChangeTracker.Entries<AuditLog>())
            {
                if (entry.State == EntityState.Added && entry.Entity.ActorUser == null)
                {
                    entry.Entity.ActorUser = context.Set<User>().Find(entry.Entity.ActorUserId)!;
                }
            }
            foreach (var entry in context.ChangeTracker.Entries<StocktakeSession>())
            {
                if (entry.State == EntityState.Added)
                {
                    if (entry.Entity.Warehouse == null) 
                        entry.Entity.Warehouse = context.Set<Warehouse.Entities.Models.Warehouse>().Find(entry.Entity.WarehouseId)!;
                    if (entry.Entity.CreatedByNavigation == null) 
                        entry.Entity.CreatedByNavigation = context.Set<User>().Find(entry.Entity.CreatedBy)!;
                }
            }
            foreach (var entry in context.ChangeTracker.Entries<DocumentApproval>())
            {
                if (entry.State == EntityState.Added && entry.Entity.ActionByNavigation == null)
                {
                    entry.Entity.ActionByNavigation = context.Set<User>().Find(entry.Entity.ActionBy)!;
                }
            }
        }
        return new ValueTask<InterceptionResult<int>>(result);
    }
}

public class StocktakePlanServiceTests
{
    private readonly Mock<IStocktakeService> _stocktakeServiceMock = new();
    
    private Mkiwms5Context GetContext()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .AddInterceptors(new StocktakeTestInterceptor())
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new Mkiwms5Context(options);
    }

    private StocktakePlanService CreateService(Mkiwms5Context context)
    {
        return new StocktakePlanService(context, _stocktakeServiceMock.Object);
    }

    private async Task SeedBaseDataAsync(Mkiwms5Context context)
    {
        var wh = new Warehouse.Entities.Models.Warehouse 
        { 
            WarehouseId = 1, 
            WarehouseCode = "WH001",
            WarehouseName = "Main WH", 
            IsActive = true 
        };
        var user = new User 
        { 
            UserId = 111, Email = "test@test.com", FullName = "Tester", PasswordHash = "hash" 
        };
        
        context.Warehouses.Add(wh);
        context.Users.Add(user);
        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task CreatePlan_ShouldSucceed()
    {
        using var context = GetContext();
        await SeedBaseDataAsync(context);
        
        _stocktakeServiceMock.Setup(x => x.GetStocktakeDetailAsync(It.IsAny<long>()))
            .ReturnsAsync(new StocktakeDetailResponse { StocktakeId = 1, StocktakeCode = "ST-1" });

        var service = CreateService(context);
        var result = await service.CreateStocktakePlanAsync(new CreateStocktakeDraftRequest 
        { 
            WarehouseId = 1, 
            Mode = "PERIODIC", 
            PlannedAt = DateTime.UtcNow.AddDays(1) 
        }, 111);

        result.Should().NotBeNull();
        context.StocktakeSessions.Count().Should().Be(1);
    }

    [Fact]
    public async Task CreatePlan_TwoDraftsSameWarehouse_ShouldBothSucceed()
    {
        // DRAFT không bị chặn khi tạo cùng kho → tạo 2 cái đều thành công
        using var context = GetContext();
        await SeedBaseDataAsync(context);

        _stocktakeServiceMock.Setup(x => x.GetStocktakeDetailAsync(It.IsAny<long>()))
            .ReturnsAsync(new StocktakeDetailResponse { StocktakeId = 1, StocktakeCode = "ST-X" });

        var service = CreateService(context);
        var request = new CreateStocktakeDraftRequest
        {
            WarehouseId = 1,
            Mode = "PERIODIC",
            PlannedAt = DateTime.UtcNow.AddDays(1)
        };

        // Tạo phiếu thứ nhất
        var result1 = await service.CreateStocktakePlanAsync(request, 111);

        // Tạo phiếu thứ hai trên cùng kho (không được ném exception)
        var result2 = await service.CreateStocktakePlanAsync(request, 111);

        result1.Should().NotBeNull();
        result2.Should().NotBeNull();
        // Cả 2 đều được lưu vào DB
        context.StocktakeSessions.Count().Should().Be(2);
        context.StocktakeSessions.All(s => s.Status == "DRAFT").Should().BeTrue();
    }

    [Fact]
    public async Task SubmitPlan_ShouldChangeStatus()
    {
        using var context = GetContext();
        await SeedBaseDataAsync(context);
        var session = new StocktakeSession 
        { 
            StocktakeId = 10, Status = "DRAFT", WarehouseId = 1, StocktakeCode = "ST10", Mode = "P", CreatedBy = 111 
        };
        context.StocktakeSessions.Add(session);
        await context.SaveChangesAsync();

        _stocktakeServiceMock.Setup(x => x.GetStocktakeDetailAsync(10))
            .ReturnsAsync(new StocktakeDetailResponse { Status = "PENDING_APPROVAL" });

        var service = CreateService(context);
        await service.SubmitStocktakePlanAsync(10, 111);

        session.Status.Should().Be("PENDING_APPROVAL");
        context.AuditLogs.Any(a => a.Action == "SUBMIT_STOCKTAKE_PLAN").Should().BeTrue();
    }

    [Fact]
    public async Task ApprovePlan_ShouldSucceed()
    {
        using var context = GetContext();
        await SeedBaseDataAsync(context);
        var session = new StocktakeSession 
        { 
            StocktakeId = 20, Status = "PENDING_APPROVAL", WarehouseId = 1, StocktakeCode = "ST20", Mode = "P", CreatedBy = 111 
        };
        context.StocktakeSessions.Add(session);
        await context.SaveChangesAsync();

        _stocktakeServiceMock.Setup(x => x.GetStocktakeDetailAsync(20))
            .ReturnsAsync(new StocktakeDetailResponse { Status = "APPROVED" });

        var service = CreateService(context);
        await service.ApproveStocktakePlanAsync(20, new StocktakeApprovalRequest { Decision = "APPROVE" }, 111);

        session.Status.Should().Be("APPROVED");
        context.DocumentApprovals.Any(d => d.DocId == 20 && d.Decision == "APPROVE").Should().BeTrue();
    }

    [Fact]
    public async Task CancelPlan_ShouldSucceed()
    {
        using var context = GetContext();
        await SeedBaseDataAsync(context);
        var session = new StocktakeSession 
        { 
            StocktakeId = 50, Status = "APPROVED", WarehouseId = 1, StocktakeCode = "ST50", Mode = "P", CreatedBy = 111 
        };
        context.StocktakeSessions.Add(session);
        await context.SaveChangesAsync();

        _stocktakeServiceMock.Setup(x => x.GetStocktakeDetailAsync(50))
            .ReturnsAsync(new StocktakeDetailResponse { Status = "CANCELLED" });

        var service = CreateService(context);
        await service.CancelStocktakeAsync(50, "reason", 111);

        session.Status.Should().Be("CANCELLED");
        session.EndedAt.Should().NotBeNull();
    }
}
