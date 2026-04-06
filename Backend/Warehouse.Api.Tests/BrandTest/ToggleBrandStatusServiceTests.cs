using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Xunit;

namespace Warehouse.Api.Tests.BrandTest
{
    public class ToggleBrandStatusServiceTests
    {
        private readonly Mock<IGenericRepository<Brand>> _mockBrandRepo;
        private readonly Mock<IAuditLogService> _mockAuditLogService;
        private readonly BrandService _brandService;

        public ToggleBrandStatusServiceTests()
        {
            _mockBrandRepo = new Mock<IGenericRepository<Brand>>();
            _mockAuditLogService = new Mock<IAuditLogService>();
            _brandService = new BrandService(_mockBrandRepo.Object, _mockAuditLogService.Object);
        }

        // =====================================================================
        // SUCCESS CASES
        // =====================================================================

        [Fact]
        public async Task ToggleBrandStatusAsync_ShouldUpdateStatus_WhenActivating()
        {
            // Arrange
            var brandId = 1L;
            var existingBrand = new Brand { BrandId = brandId, BrandName = "Nike", IsActive = false };

            _mockBrandRepo.Setup(repo => repo.GetByIdAsync(brandId)).ReturnsAsync(existingBrand);
            _mockBrandRepo.Setup(repo => repo.UpdateAsync(It.IsAny<Brand>())).ReturnsAsync((Brand b) => b);

            // Act
            var result = await _brandService.ToggleBrandStatusAsync(brandId, true, 1L);

            // Assert
            result.Should().NotBeNull();
            result.IsActive.Should().BeTrue();
            _mockBrandRepo.Verify(repo => repo.UpdateAsync(It.Is<Brand>(b => b.BrandId == brandId && b.IsActive)), Times.Once);
        }

        [Fact]
        public async Task ToggleBrandStatusAsync_ShouldUpdateStatus_WhenDeactivating()
        {
            // Arrange
            var brandId = 1L;
            var existingBrand = new Brand { BrandId = brandId, BrandName = "Nike", IsActive = true };

            _mockBrandRepo.Setup(repo => repo.GetByIdAsync(brandId)).ReturnsAsync(existingBrand);
            _mockBrandRepo.Setup(repo => repo.UpdateAsync(It.IsAny<Brand>())).ReturnsAsync((Brand b) => b);

            // Act
            var result = await _brandService.ToggleBrandStatusAsync(brandId, false, 1L);

            // Assert
            result.Should().NotBeNull();
            result.IsActive.Should().BeFalse();
            _mockBrandRepo.Verify(repo => repo.UpdateAsync(It.Is<Brand>(b => b.BrandId == brandId && !b.IsActive)), Times.Once);
        }

        // =====================================================================
        // VALIDATION FAILURES
        // =====================================================================

        [Fact]
        public async Task ToggleBrandStatusAsync_ShouldThrowArgumentException_WhenBrandIdIsZero()
        {
            // Act
            Func<Task> act = async () => await _brandService.ToggleBrandStatusAsync(0, true, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("ID thương hiệu phải là số nguyên dương.");
        }

        [Fact]
        public async Task ToggleBrandStatusAsync_ShouldThrowArgumentException_WhenBrandIdIsNegative()
        {
            // Act
            Func<Task> act = async () => await _brandService.ToggleBrandStatusAsync(-1, true, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("ID thương hiệu phải là số nguyên dương.");
        }

        // =====================================================================
        // BUSINESS LOGIC FAILURES
        // =====================================================================

        [Fact]
        public async Task ToggleBrandStatusAsync_ShouldThrowKeyNotFoundException_WhenBrandDoesNotExist()
        {
            // Arrange
            var brandId = 99L;
            _mockBrandRepo.Setup(repo => repo.GetByIdAsync(brandId)).ReturnsAsync((Brand)null!);

            // Act
            Func<Task> act = async () => await _brandService.ToggleBrandStatusAsync(brandId, true, 1L);

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage($"Không tìm thấy thương hiệu với ID = {brandId}.");
        }

        [Fact]
        public async Task ToggleBrandStatusAsync_ShouldThrowInvalidOperationException_WhenAlreadyInTargetStatus_Ative()
        {
            // Arrange
            var brandId = 1L;
            var existingBrand = new Brand { BrandId = brandId, BrandName = "Nike", IsActive = true };
            _mockBrandRepo.Setup(repo => repo.GetByIdAsync(brandId)).ReturnsAsync(existingBrand);

            // Act
            Func<Task> act = async () => await _brandService.ToggleBrandStatusAsync(brandId, true, 1L);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage($"Thương hiệu 'Nike' hiện tại đang hoạt động. Không cần thay đổi.");
        }

        [Fact]
        public async Task ToggleBrandStatusAsync_ShouldThrowInvalidOperationException_WhenAlreadyInTargetStatus_Inactive()
        {
            // Arrange
            var brandId = 1L;
            var existingBrand = new Brand { BrandId = brandId, BrandName = "Nike", IsActive = false };
            _mockBrandRepo.Setup(repo => repo.GetByIdAsync(brandId)).ReturnsAsync(existingBrand);

            // Act
            Func<Task> act = async () => await _brandService.ToggleBrandStatusAsync(brandId, false, 1L);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage($"Thương hiệu 'Nike' hiện tại đã bị vô hiệu hóa. Không cần thay đổi.");
        }
    }
}
