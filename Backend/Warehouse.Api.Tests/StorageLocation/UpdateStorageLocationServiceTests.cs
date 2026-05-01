using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
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
	public class UpdateStorageLocationServiceTests : IDisposable
	{
		private readonly Mkiwms5Context _context;
		private readonly Mock<IAuditLogService> _mockAuditLogService;
		private readonly StorageLocationService _service;

		public UpdateStorageLocationServiceTests()
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

			// Location to update
			_context.StorageLocations.Add(new Warehouse.Entities.Models.StorageLocation
			{
				LocationId = 10,
				WarehouseId = 1,
				LocationCode = "LOC-OLD",
				LocationName = "Old Name",
				IsActive = true
			});

			// Another location to test duplicate code
			_context.StorageLocations.Add(new Warehouse.Entities.Models.StorageLocation
			{
				LocationId = 11,
				WarehouseId = 1,
				LocationCode = "LOC-EXISTING",
				LocationName = "Existing Location",
				IsActive = true
			});

			_context.SaveChanges();
		}

		[Fact]
		public async Task Update_Success_ShouldUpdateFieldsAndLogAuditWithOldNewValues()
		{
			// Arrange
			var request = new UpdateStorageLocationRequest
			{
				LocationCode = "  LOC-NEW  ",
				LocationName = "  New Name  ",
				IsActive = false
			};
			long userId = 1;

			// Act
			var result = await _service.UpdateStorageLocationAsync(10, request, userId);

			// Assert
			result.LocationCode.Should().Be("LOC-NEW");
			result.LocationName.Should().Be("New Name");
			result.IsActive.Should().BeFalse();

			var dbLocation = _context.StorageLocations.Find(10L);
			dbLocation!.UpdatedAt.Should().NotBeNull();

			// Verify Audit Log and the JSON content
			_mockAuditLogService.Verify(s => s.LogAsync(
				userId,
				AuditAction.Update,
				AuditEntity.Warehouse,
				10,
				It.IsAny<string>(),
				It.Is<string>(ov => ov.Contains("LOC-OLD") && ov.Contains("Old Name")), // Old values check
				It.Is<string>(nv => nv.Contains("LOC-NEW") && nv.Contains("New Name"))  // New values check
			), Times.Once);
		}

		[Fact]
		public async Task Update_ShouldThrow_WhenDuplicateCode()
		{
			// Arrange
			var request = new UpdateStorageLocationRequest
			{
				LocationCode = "loc-existing", // Same as location 11 but lowercase
				LocationName = "Updated Name",
				IsActive = true
			};

			// Act
			Func<Task> act = async () => await _service.UpdateStorageLocationAsync(10, request, 1);

			// Assert
			await act.Should().ThrowAsync<InvalidOperationException>()
				.WithMessage("Mã vị trí đã tồn tại trong kho này.");
		}

		[Fact]
		public async Task Update_ShouldThrow_WhenLocationNotFound()
		{
			// Arrange
			var request = new UpdateStorageLocationRequest { LocationCode = "NEW", IsActive = true };

			// Act
			Func<Task> act = async () => await _service.UpdateStorageLocationAsync(999, request, 1);

			// Assert
			await act.Should().ThrowAsync<KeyNotFoundException>()
				.WithMessage("Không tìm thấy vị trí kho.");
		}

		[Fact]
		public async Task Update_ShouldThrow_WhenUserIdInvalid()
		{
			// Arrange
			var request = new UpdateStorageLocationRequest { LocationCode = "NEW", IsActive = true };

			// Act
			Func<Task> act = async () => await _service.UpdateStorageLocationAsync(10, request, 0);

			// Assert
			await act.Should().ThrowAsync<ArgumentException>()
				.WithMessage("Người dùng không hợp lệ.");
		}

		[Fact]
		public async Task Update_Success_ShouldAllowSameCodeForCurrentLocation()
		{
			// Arrange - Updating name but keeping the same code
			var request = new UpdateStorageLocationRequest
			{
				LocationCode = "LOC-OLD",
				LocationName = "Updated Name Only",
				IsActive = true
			};

			// Act
			var result = await _service.UpdateStorageLocationAsync(10, request, 1);

			// Assert
			result.LocationCode.Should().Be("LOC-OLD");
			result.LocationName.Should().Be("Updated Name Only");
		}

		public void Dispose()
		{
			_context.Database.EnsureDeleted();
			_context.Dispose();
		}
	}
}