using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.Models;
using Xunit;

namespace Warehouse.Api.Tests.StorageLocation
{
	public class CreateStorageLocationServiceTests : IDisposable
	{
		private readonly Mkiwms5Context _context;
		private readonly Mock<IAuditLogService> _mockAuditLogService;
		private readonly StorageLocationService _service;

		public CreateStorageLocationServiceTests()
		{
			var options = new DbContextOptionsBuilder<Mkiwms5Context>()
				.UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
				.Options;
			_context = new Mkiwms5Context(options);

			_mockAuditLogService = new Mock<IAuditLogService>();

			_service = new StorageLocationService(_context, _mockAuditLogService.Object);

			SeedData();
		}

		private void SeedData()
		{
			_context.Warehouses.Add(new Warehouse.Entities.Models.Warehouse
			{
				WarehouseId = 1,
				WarehouseCode = "WH01",
				WarehouseName = "Main Warehouse",
				IsActive = true
			});

			_context.StorageLocations.Add(new Warehouse.Entities.Models.StorageLocation
			{
				LocationId = 10,
				WarehouseId = 1,
				LocationCode = "LOC-01",
				LocationName = "Initial Location",
				IsActive = true
			});

			_context.SaveChanges();
		}

		[Fact]
		public async Task Create_Success_ShouldCreateLocationAndLogAudit()
		{
			// Arrange
			var request = new CreateStorageLocationRequest
			{
				WarehouseId = 1,
				LocationCode = "  LOC-02  ",
				LocationName = "  New Location  "
			};
			long userId = 1;

			// Act
			var result = await _service.CreateStorageLocationAsync(request, userId);

			// Assert
			result.Should().NotBeNull();
			result.LocationCode.Should().Be("LOC-02"); // Trimmed
			result.LocationName.Should().Be("New Location"); // Trimmed
			result.WarehouseName.Should().Be("Main Warehouse");
			result.IsActive.Should().BeTrue();

			var dbLocation = _context.StorageLocations.FirstOrDefault(x => x.LocationCode == "LOC-02");
			dbLocation.Should().NotBeNull();
			dbLocation!.WarehouseId.Should().Be(1);

			// Verify Audit Log
			_mockAuditLogService.Verify(s => s.LogAsync(
				userId,
				AuditAction.Create,
				AuditEntity.Warehouse,
				It.IsAny<long>(),
				It.Is<string>(d => d.Contains("LOC-02")),
				null,
				null
			), Times.Once);
		}

		[Fact]
		public async Task Create_ShouldThrow_WhenDuplicateCodeInSameWarehouse()
		{
			// Arrange
			var request = new CreateStorageLocationRequest
			{
				WarehouseId = 1,
				LocationCode = "loc-01" // Same as seeded but lowercase
			};

			// Act
			Func<Task> act = async () => await _service.CreateStorageLocationAsync(request, 1);

			// Assert
			await act.Should().ThrowAsync<InvalidOperationException>()
				.WithMessage("Mã vị trí đã tồn tại trong kho này.");
		}

		[Fact]
		public async Task Create_ShouldThrow_WhenWarehouseNotFound()
		{
			// Arrange
			var request = new CreateStorageLocationRequest
			{
				WarehouseId = 999,
				LocationCode = "LOC-NEW"
			};

			// Act
			Func<Task> act = async () => await _service.CreateStorageLocationAsync(request, 1);

			// Assert
			await act.Should().ThrowAsync<KeyNotFoundException>()
				.WithMessage("Không tìm thấy kho.");
		}

		[Fact]
		public async Task Create_ShouldThrow_WhenUserIdInvalid()
		{
			// Arrange
			var request = new CreateStorageLocationRequest { WarehouseId = 1, LocationCode = "LOC" };

			// Act
			Func<Task> act = async () => await _service.CreateStorageLocationAsync(request, 0);

			// Assert
			await act.Should().ThrowAsync<ArgumentException>()
				.WithMessage("Người dùng không hợp lệ.");
		}

		[Fact]
		public async Task Create_ShouldThrow_WhenRequestIsNull()
		{
			// Act
			Func<Task> act = async () => await _service.CreateStorageLocationAsync(null!, 1);

			// Assert
			await act.Should().ThrowAsync<ArgumentNullException>();
		}

		public void Dispose()
		{
			_context.Database.EnsureDeleted();
			_context.Dispose();
		}
	}
}