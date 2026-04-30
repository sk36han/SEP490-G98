using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.Models;

namespace Warehouse.Api.Tests.ReleaseRequest;

public class ReleaseRequestServiceQuotationFlowTests : IDisposable
{
    private readonly Mkiwms5Context _context;
    private readonly ReleaseRequestService _sut;
    private readonly Mock<IStocktakeService> _stocktake = new();
    private readonly Mock<INotificationService> _notify = new();
    private readonly Mock<IAuditLogService> _audit = new();
    private readonly Mock<IDocumentAttachmentService> _attachment = new();
    private readonly Mock<IWebHostEnvironment> _env = new();

    public ReleaseRequestServiceQuotationFlowTests()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new Mkiwms5Context(options);

        _stocktake.Setup(s => s.IsWarehouseFrozenAsync(It.IsAny<long>())).ReturnsAsync(false);
        _notify.Setup(n => n.CreateAsync(
                It.IsAny<long>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<long?>(), It.IsAny<string>(), It.IsAny<byte>(), It.IsAny<DateTime?>()))
            .Returns(Task.CompletedTask);
        _notify.Setup(n => n.CreateForRolesAsync(
                It.IsAny<IEnumerable<string>>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<long?>(), It.IsAny<long?>(), It.IsAny<string>(), It.IsAny<byte>(), It.IsAny<DateTime?>()))
            .Returns(Task.CompletedTask);
        _audit.Setup(a => a.LogAsync(
                It.IsAny<long>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<long?>(),
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var configuration = new ConfigurationBuilder().Build();
        _sut = new ReleaseRequestService(
            _context,
            _stocktake.Object,
            _notify.Object,
            _audit.Object,
            _attachment.Object,
            configuration,
            _env.Object);
    }

    public void Dispose() => _context.Dispose();

    private async Task SeedBaseAsync()
    {
        _context.Warehouses.Add(new Warehouse.Entities.Models.Warehouse
        {
            WarehouseId = 1,
            WarehouseCode = "WH1",
            WarehouseName = "Main WH",
            IsActive = true
        });

        _context.Companies.Add(new Company
        {
            CompanyId = 1,
            CompanyCode = "C1",
            CompanyName = "Company 1",
            IsActive = true
        });

        _context.Receivers.Add(new Receiver
        {
            ReceiverId = 1,
            ReceiverCode = "R1",
            ReceiverName = "Receiver 1",
            CompanyId = 1,
            IsActive = true
        });

        _context.Users.Add(new User
        {
            UserId = 1,
            Username = "u1",
            FullName = "Sale User",
            Email = "sale@test.com",
            PasswordHash = "x",
            IsActive = true
        });

        _context.Users.Add(new User
        {
            UserId = 2,
            Username = "u2",
            FullName = "Accountant User",
            Email = "acc@test.com",
            PasswordHash = "x",
            IsActive = true
        });

        _context.ReleaseRequests.Add(new Warehouse.Entities.Models.ReleaseRequest
        {
            ReleaseRequestId = 100,
            ReleaseRequestCode = "RR-2026-100",
            RequestedBy = 1,
            ReceiverId = 1,
            WarehouseId = 1,
            RequestedDate = DateOnly.FromDateTime(DateTime.UtcNow),
            ExpectedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)),
            Purpose = "Test flow",
            Status = "DRAFT",
            LifecycleStatus = "IssuePending",
            IsQuotationFlow = true,
            QuotationStatus = "CONFIRMED",
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
    }

    [Fact]
    public async Task UpdateReleaseRequest_ToPendingAcc_ShouldAcceptContractTypeCO()
    {
        await SeedBaseAsync();
        _context.DocumentAttachments.AddRange(
            new DocumentAttachment
            {
                DocType = "GIR",
                DocId = 100,
                AttachmentType = "QUOTATION",
                FileName = "q.xlsx",
                FileUrlOrPath = "/uploads/evidence/q.xlsx",
                UploadedBy = 1,
                UploadedAt = DateTime.UtcNow
            },
            new DocumentAttachment
            {
                DocType = "GIR",
                DocId = 100,
                AttachmentType = "CO",
                FileName = "contract.pdf",
                FileUrlOrPath = "/uploads/evidence/c.pdf",
                UploadedBy = 1,
                UploadedAt = DateTime.UtcNow
            });
        await _context.SaveChangesAsync();

        var result = await _sut.UpdateReleaseRequestAsync(100, 1, new UpdateReleaseRequestRequest
        {
            Status = "PENDING_ACC"
        });

        result.Status.Should().Be("PENDING_ACC");
    }

    [Fact]
    public async Task ApproveReleaseRequest_ShouldAcceptContractTypeCO()
    {
        await SeedBaseAsync();

        var rr = await _context.ReleaseRequests.FirstAsync(x => x.ReleaseRequestId == 100);
        rr.Status = "PENDING_ACC";
        await _context.SaveChangesAsync();

        _context.DocumentAttachments.AddRange(
            new DocumentAttachment
            {
                DocType = "GIR",
                DocId = 100,
                AttachmentType = "QUOTATION",
                FileName = "q.xlsx",
                FileUrlOrPath = "/uploads/evidence/q.xlsx",
                UploadedBy = 1,
                UploadedAt = DateTime.UtcNow
            },
            new DocumentAttachment
            {
                DocType = "GIR",
                DocId = 100,
                AttachmentType = "CO",
                FileName = "contract.pdf",
                FileUrlOrPath = "/uploads/evidence/c.pdf",
                UploadedBy = 1,
                UploadedAt = DateTime.UtcNow
            });
        await _context.SaveChangesAsync();

        var result = await _sut.ApproveReleaseRequestAsync(100, 2, new ApproveReleaseRequest
        {
            IsApproved = true
        });

        result.Status.Should().Be("APPROVED");
    }
}
