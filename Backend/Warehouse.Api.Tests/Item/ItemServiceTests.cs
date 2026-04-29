using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.Models;
using WarehouseModel = Warehouse.Entities.Models;

namespace Warehouse.Api.Tests.Item;

public class ItemServiceTests : IDisposable
{
    private readonly Mkiwms5Context _context;
    private readonly ItemService _service;
    private readonly Mock<ILogger<ItemService>> _loggerMock;
    private readonly Mock<Warehouse.DataAcces.Service.Interface.IAuditLogService> _auditLogServiceMock;
    private readonly Mock<IDateTimeProvider> _dateTimeProviderMock;

    public ItemServiceTests()
    {
        var options = new DbContextOptionsBuilder<Mkiwms5Context>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new Mkiwms5Context(options);
        _loggerMock = new Mock<ILogger<ItemService>>();
        _auditLogServiceMock = new Mock<Warehouse.DataAcces.Service.Interface.IAuditLogService>();
        _dateTimeProviderMock = new Mock<IDateTimeProvider>();
        _dateTimeProviderMock.Setup(x => x.BusinessNow()).Returns(DateTime.UtcNow);
        _dateTimeProviderMock.Setup(x => x.BusinessToday()).Returns(DateOnly.FromDateTime(DateTime.UtcNow));
        _dateTimeProviderMock.Setup(x => x.UtcNow()).Returns(DateTime.UtcNow);
        _service = new ItemService(_context, _loggerMock.Object, _auditLogServiceMock.Object, _dateTimeProviderMock.Object);

        SeedData();
    }

    private void SeedData()
    {
        _context.ItemCategories.Add(new WarehouseModel.ItemCategory { CategoryId = 1, CategoryCode = "CAT001", CategoryName = "Dien tu", IsActive = true });
        _context.ItemCategories.Add(new WarehouseModel.ItemCategory { CategoryId = 2, CategoryCode = "CAT002", CategoryName = "Thuc pham", IsActive = false });
        _context.Brands.Add(new WarehouseModel.Brand { BrandId = 1, BrandName = "Samsung", IsActive = true });
        _context.UnitOfMeasures.Add(new WarehouseModel.UnitOfMeasure { UomId = 1, UomName = "Cai", IsActive = true });
        _context.UnitOfMeasures.Add(new WarehouseModel.UnitOfMeasure { UomId = 2, UomName = "Chiec", IsActive = false });
        _context.PackagingSpecs.Add(new WarehouseModel.PackagingSpec { PackagingSpecId = 1, SpecName = "Hop 24 cai", IsActive = true });
        _context.PackagingSpecs.Add(new WarehouseModel.PackagingSpec { PackagingSpecId = 2, SpecName = "Hop 12 cai", IsActive = false });
        _context.Warehouses.Add(new WarehouseModel.Warehouse { WarehouseId = 1, WarehouseCode = "WH-HCM", WarehouseName = "Kho Ho Chi Minh", IsActive = true });
        _context.Warehouses.Add(new WarehouseModel.Warehouse { WarehouseId = 2, WarehouseCode = "WH-HN", WarehouseName = "Kho Ha Noi", IsActive = false });
        _context.Items.Add(new WarehouseModel.Item { ItemId = 1, ItemCode = "ITEM001", ItemName = "Dien thoai Samsung", CategoryId = 1, BaseUomId = 1, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.SaveChanges();
    }

    public void Dispose() { _context.Dispose(); }

    // =========================================================
    // CreateItemAsync Tests
    // =========================================================

    [Fact]
    public async Task CreateItem_ThanhCong_DayDu()
    {
        var request = new CreateItemRequest
        {
            ItemCode = "PHONE001",
            ItemName = "iPhone 15 Pro",
            ItemType = "Smartphone",
            Description = "Dien thoai cao cap Apple 2024",
            CategoryId = 1,
            BrandId = 1,
            BaseUomId = 1,
            PackagingSpecId = 1,
            RequiresCo = true,
            RequiresCq = true,
            IsActive = true,
            DefaultWarehouseId = 1,
            InventoryAccount = "INV-001",
            RevenueAccount = "REV-001",
            InitialPurchasePrice = 25000000,
            PriceEffectiveFrom = DateOnly.FromDateTime(DateTime.Today)
        };

        var result = await _service.CreateItemAsync(request);

        result.Should().NotBeNull();
        result.ItemCode.Should().Be("PHONE001");
        result.ItemName.Should().Be("iPhone 15 Pro");
        result.Description.Should().Be("Dien thoai cao cap Apple 2024");
        result.ItemType.Should().Be("Smartphone");
        result.CategoryId.Should().Be(1);
        result.BrandId.Should().Be(1);
        _loggerMock.Verify(
            x => x.Log(LogLevel.Information, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Tao item thanh cong")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateItem_KhongCoItemCode_AutoGen()
    {
        var request = new CreateItemRequest { ItemName = "Macbook Pro", CategoryId = 1, BaseUomId = 1 };
        var result = await _service.CreateItemAsync(request);
        result.ItemCode.Should().StartWith("ITM");
        _loggerMock.Verify(
            x => x.Log(LogLevel.Information, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Tao item thanh cong")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateItem_CoDescription_ThanhCong()
    {
        var request = new CreateItemRequest { ItemName = "San pham", Description = "Mo ta san pham", CategoryId = 1, BaseUomId = 1 };
        var result = await _service.CreateItemAsync(request);
        result.Description.Should().Be("Mo ta san pham");
    }

    [Fact]
    public async Task CreateItem_KhongCoDescription_ThanhCong()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1 };
        var result = await _service.CreateItemAsync(request);
        result.Description.Should().BeNull();
    }

    [Fact]
    public async Task CreateItem_CoItemType_ThanhCong()
    {
        var request = new CreateItemRequest { ItemName = "San pham", ItemType = "Smartphone", CategoryId = 1, BaseUomId = 1 };
        var result = await _service.CreateItemAsync(request);
        result.ItemType.Should().Be("Smartphone");
    }

    [Fact]
    public async Task CreateItem_CategoryTonTai_ThanhCong()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1 };
        var result = await _service.CreateItemAsync(request);
        result.CategoryId.Should().Be(1);
    }

    [Fact]
    public async Task CreateItem_CategoryInactive_ThrowException()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 2, BaseUomId = 1 };
        var act = async () => await _service.CreateItemAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>();
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Category khong ton tai hoac inactive")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateItem_CategoryKhongTonTai_ThrowException()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 999, BaseUomId = 1 };
        var act = async () => await _service.CreateItemAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>();
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Category khong ton tai hoac inactive")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateItem_BaseUomTonTai_ThanhCong()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1 };
        var result = await _service.CreateItemAsync(request);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateItem_BaseUomInactive_ThrowException()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 2 };
        var act = async () => await _service.CreateItemAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>();
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("BaseUom khong ton tai hoac inactive")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateItem_BaseUomKhongTonTai_ThrowException()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 999 };
        var act = async () => await _service.CreateItemAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>();
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("BaseUom khong ton tai hoac inactive")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateItem_BrandTonTai_ThanhCong()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BrandId = 1, BaseUomId = 1 };
        var result = await _service.CreateItemAsync(request);
        result.BrandId.Should().Be(1);
    }

    [Fact]
    public async Task CreateItem_BrandKhongTonTai_ThrowException()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BrandId = 999, BaseUomId = 1 };
        var act = async () => await _service.CreateItemAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>();
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Brand khong ton tai hoac inactive")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateItem_PackagingSpecTonTai_ThanhCong()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, PackagingSpecId = 1 };
        var result = await _service.CreateItemAsync(request);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateItem_PackagingSpecInactive_ThrowException()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, PackagingSpecId = 2 };
        var act = async () => await _service.CreateItemAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>();
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("PackagingSpec khong ton tai hoac inactive")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateItem_PackagingSpecKhongTonTai_ThrowException()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, PackagingSpecId = 999 };
        var act = async () => await _service.CreateItemAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>();
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("PackagingSpec khong ton tai hoac inactive")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateItem_DefaultWarehouseTonTai_ThanhCong()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, DefaultWarehouseId = 1 };
        var result = await _service.CreateItemAsync(request);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateItem_DefaultWarehouseInactive_ThrowException()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, DefaultWarehouseId = 2 };
        var act = async () => await _service.CreateItemAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>();
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("DefaultWarehouse khong ton tai hoac inactive")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateItem_DefaultWarehouseKhongTonTai_ThrowException()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, DefaultWarehouseId = 999 };
        var act = async () => await _service.CreateItemAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>();
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("DefaultWarehouse khong ton tai hoac inactive")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateItem_InitialPurchasePriceCoGiaTri_ThanhCong()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, InitialPurchasePrice = 1500000 };
        var result = await _service.CreateItemAsync(request);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateItem_RequiresCoTrue_ThanhCong()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, RequiresCo = true };
        var result = await _service.CreateItemAsync(request);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateItem_RequiresCqTrue_ThanhCong()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, RequiresCq = true };
        var result = await _service.CreateItemAsync(request);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateItem_IsActiveTrue_ThanhCong()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, IsActive = true };
        var result = await _service.CreateItemAsync(request);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateItem_IsActiveFalse_ThanhCong()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, IsActive = false };
        var result = await _service.CreateItemAsync(request);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateItem_ItemNameNull_ThrowException()
    {
        var request = new CreateItemRequest { ItemName = null, CategoryId = 1, BaseUomId = 1 };
        var act = async () => await _service.CreateItemAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ItemName khong duoc de trong*");
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("ItemName khong duoc de trong")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateItem_ItemNameEmpty_ThrowException()
    {
        var request = new CreateItemRequest { ItemName = "", CategoryId = 1, BaseUomId = 1 };
        var act = async () => await _service.CreateItemAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ItemName khong duoc de trong*");
    }

    [Fact]
    public async Task CreateItem_ItemNameWhitespace_ThrowException()
    {
        var request = new CreateItemRequest { ItemName = "   ", CategoryId = 1, BaseUomId = 1 };
        var act = async () => await _service.CreateItemAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ItemName khong duoc de trong*");
    }

    [Fact]
    public async Task CreateItem_InitialPurchasePriceAm_ThrowException()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, InitialPurchasePrice = -1000 };
        var act = async () => await _service.CreateItemAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*InitialPurchasePrice khong duoc am*");
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("InitialPurchasePrice khong duoc am")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateItem_InitialPurchasePriceBang0_ThanhCong()
    {
        var request = new CreateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, InitialPurchasePrice = 0 };
        var result = await _service.CreateItemAsync(request);
        result.Should().NotBeNull();
    }

    // =========================================================
    // UpdateItemAsync Tests
    // =========================================================

    [Fact]
    public async Task UpdateItem_ThanhCong_DayDu()
    {
        var request = new UpdateItemRequest
        {
            ItemName = "iPhone 15 Pro Max",
            ItemType = "Smartphone",
            Description = "Dien thoai cao cap moi nhat Apple 2024",
            CategoryId = 1,
            BrandId = 1,
            BaseUomId = 1,
            PackagingSpecId = 1,
            RequiresCo = true,
            RequiresCq = false,
            IsActive = true,
            DefaultWarehouseId = 1,
            InventoryAccount = "INV-002",
            RevenueAccount = "REV-002",
            PurchasePrice = 28000000,
            SalePrice = 35000000,
            PriceEffectiveFrom = DateOnly.FromDateTime(DateTime.Today)
        };

        var result = await _service.UpdateItemAsync(1, request);

        result.Should().NotBeNull();
        result.ItemName.Should().Be("iPhone 15 Pro Max");
        result.Description.Should().Be("Dien thoai cao cap moi nhat Apple 2024");
        result.ItemType.Should().Be("Smartphone");
        _loggerMock.Verify(
            x => x.Log(LogLevel.Information, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Cap nhat item thanh cong")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateItem_KhongTonTai_ThrowException()
    {
        var request = new UpdateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1 };
        var act = async () => await _service.UpdateItemAsync(999, request);
        await act.Should().ThrowAsync<KeyNotFoundException>();
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Khong tim thay item")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateItem_CoDescription_ThanhCong()
    {
        var request = new UpdateItemRequest { ItemName = "San pham", Description = "Mo ta san pham moi", CategoryId = 1, BaseUomId = 1 };
        var result = await _service.UpdateItemAsync(1, request);
        result.Description.Should().Be("Mo ta san pham moi");
    }

    [Fact]
    public async Task UpdateItem_KhongCoDescription_ThanhCong()
    {
        var request = new UpdateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1 };
        var result = await _service.UpdateItemAsync(1, request);
        result.Description.Should().BeNull();
    }

    [Fact]
    public async Task UpdateItem_CoItemType_ThanhCong()
    {
        var request = new UpdateItemRequest { ItemName = "San pham", ItemType = "Tablet", CategoryId = 1, BaseUomId = 1 };
        var result = await _service.UpdateItemAsync(1, request);
        result.ItemType.Should().Be("Tablet");
    }

    [Fact]
    public async Task UpdateItem_CategoryInactive_ThrowException()
    {
        var request = new UpdateItemRequest { ItemName = "San pham", CategoryId = 2, BaseUomId = 1 };
        var act = async () => await _service.UpdateItemAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>();
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Category khong ton tai hoac inactive")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateItem_BaseUomInactive_ThrowException()
    {
        var request = new UpdateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 2 };
        var act = async () => await _service.UpdateItemAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>();
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("BaseUom khong ton tai hoac inactive")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateItem_BrandKhongTonTai_ThrowException()
    {
        var request = new UpdateItemRequest { ItemName = "San pham", CategoryId = 1, BrandId = 999, BaseUomId = 1 };
        var act = async () => await _service.UpdateItemAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>();
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Brand khong ton tai hoac inactive")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateItem_PackagingSpecKhongTonTai_ThrowException()
    {
        var request = new UpdateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, PackagingSpecId = 999 };
        var act = async () => await _service.UpdateItemAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>();
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("PackagingSpec khong ton tai hoac inactive")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateItem_DefaultWarehouseKhongTonTai_ThrowException()
    {
        var request = new UpdateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, DefaultWarehouseId = 999 };
        var act = async () => await _service.UpdateItemAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>();
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("DefaultWarehouse khong ton tai hoac inactive")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateItem_PurchasePriceCoGiaTri_ThanhCong()
    {
        var request = new UpdateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, PurchasePrice = 20000000 };
        var result = await _service.UpdateItemAsync(1, request);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateItem_SalePriceCoGiaTri_ThanhCong()
    {
        var request = new UpdateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, SalePrice = 25000000 };
        var result = await _service.UpdateItemAsync(1, request);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateItem_RequiresCqTrue_ThanhCong()
    {
        var request = new UpdateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, RequiresCq = true };
        var result = await _service.UpdateItemAsync(1, request);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateItem_RequiresCoTrue_ThanhCong()
    {
        var request = new UpdateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, RequiresCo = true };
        var result = await _service.UpdateItemAsync(1, request);
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateItem_ItemNameNull_ThrowException()
    {
        var request = new UpdateItemRequest { ItemName = null, CategoryId = 1, BaseUomId = 1 };
        var act = async () => await _service.UpdateItemAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ItemName khong duoc de trong*");
    }

    [Fact]
    public async Task UpdateItem_ItemNameEmpty_ThrowException()
    {
        var request = new UpdateItemRequest { ItemName = "", CategoryId = 1, BaseUomId = 1 };
        var act = async () => await _service.UpdateItemAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ItemName khong duoc de trong*");
    }

    [Fact]
    public async Task UpdateItem_ItemNameWhitespace_ThrowException()
    {
        var request = new UpdateItemRequest { ItemName = "   ", CategoryId = 1, BaseUomId = 1 };
        var act = async () => await _service.UpdateItemAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ItemName khong duoc de trong*");
    }

    [Fact]
    public async Task UpdateItem_PurchasePriceAm_ThrowException()
    {
        var request = new UpdateItemRequest { ItemName = "San pham", CategoryId = 1, BaseUomId = 1, PurchasePrice = -1000 };
        var act = async () => await _service.UpdateItemAsync(1, request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*PurchasePrice khong duoc am*");
        _loggerMock.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("PurchasePrice khong duoc am")),
                It.IsAny<Exception>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }
}
