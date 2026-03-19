using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.Models;
using Xunit;

namespace Warehouse.Api.Tests.BrandTest
{
    public class UpdateBrandServiceTests
    {
        private readonly Mock<IGenericRepository<Brand>> _mockBrandRepo;
        private readonly Mock<IAuditLogService> _mockAuditLogService;
        private readonly BrandService _brandService;

        public UpdateBrandServiceTests()
        {
            _mockBrandRepo = new Mock<IGenericRepository<Brand>>();
            _mockAuditLogService = new Mock<IAuditLogService>();
            _brandService = new BrandService(_mockBrandRepo.Object, _mockAuditLogService.Object);
        }

        // =====================================================================
        // SUCCESS CASE
        // =====================================================================

        [Fact]
        public async Task UpdateBrandAsync_ShouldUpdateBrand_WhenRequestIsValid()
        {
            // Arrange
            var brandId = 1L;
            var currentUserId = 123L;
            var request = new UpdateBrandRequest { BrandName = "  Apple  ", IsActive = false };
            
            var existingBrand = new Brand { BrandId = brandId, BrandName = "Old Name", IsActive = true };
            var oldValues = JsonSerializer.Serialize(new { existingBrand.BrandName, existingBrand.IsActive });

            _mockBrandRepo.Setup(repo => repo.GetByIdAsync(brandId)).ReturnsAsync(existingBrand);
            _mockBrandRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<Brand> { existingBrand }.AsQueryable());
            _mockBrandRepo.Setup(repo => repo.UpdateAsync(It.IsAny<Brand>())).ReturnsAsync((Brand b) => b);

            // Act
            var result = await _brandService.UpdateBrandAsync(brandId, request, currentUserId);

            // Assert
            result.Should().NotBeNull();
            result.BrandName.Should().Be("Apple");
            result.IsActive.Should().BeFalse();

            _mockBrandRepo.Verify(repo => repo.UpdateAsync(It.Is<Brand>(b => 
                b.BrandId == brandId && b.BrandName == "Apple" && !b.IsActive)), Times.Once);

            var newValues = JsonSerializer.Serialize(new { BrandName = "Apple", IsActive = false });
            _mockAuditLogService.Verify(log => log.LogAsync(
                currentUserId,
                AuditAction.Update,
                AuditEntity.Brand,
                brandId,
                "Cập nhật thương hiệu 'Apple'",
                oldValues,
                newValues
            ), Times.Once);
        }

        // =====================================================================
        // VALIDATION FAILURES
        // =====================================================================

        [Fact]
        public async Task UpdateBrandAsync_ShouldThrowArgumentException_WhenBrandIdIsZero()
        {
            // Act
            Func<Task> act = async () => await _brandService.UpdateBrandAsync(0, new UpdateBrandRequest(), 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("ID thương hiệu phải là số nguyên dương.");
        }

        [Fact]
        public async Task UpdateBrandAsync_ShouldThrowArgumentNullException_WhenRequestIsNull()
        {
            // Act
            Func<Task> act = async () => await _brandService.UpdateBrandAsync(1L, null!, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentNullException>()
                .WithParameterName("request")
                .WithMessage("*Dữ liệu yêu cầu không được để trống.*");
        }

        [Fact]
        public async Task UpdateBrandAsync_ShouldThrowArgumentException_WhenUserIdIsInvalid()
        {
            // Act
            Func<Task> act = async () => await _brandService.UpdateBrandAsync(1L, new UpdateBrandRequest { BrandName = "LG" }, 0);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("ID người dùng không hợp lệ.");
        }

        [Fact]
        public async Task UpdateBrandAsync_ShouldThrowArgumentException_WhenBrandNameIsEmpty()
        {
            // Act
            Func<Task> act = async () => await _brandService.UpdateBrandAsync(1L, new UpdateBrandRequest { BrandName = "" }, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên thương hiệu không được để trống.");
        }

        [Fact]
        public async Task UpdateBrandAsync_ShouldThrowArgumentException_WhenBrandNameIsTooShort()
        {
            // Act
            Func<Task> act = async () => await _brandService.UpdateBrandAsync(1L, new UpdateBrandRequest { BrandName = "A" }, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên thương hiệu phải có ít nhất 2 ký tự.");
        }

        [Fact]
        public async Task UpdateBrandAsync_ShouldThrowArgumentException_WhenBrandNameContainsInvalidChars()
        {
            // Act
            Func<Task> act = async () => await _brandService.UpdateBrandAsync(1L, new UpdateBrandRequest { BrandName = "Sony!" }, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên thương hiệu chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.) và ký tự &.");
        }

        // =====================================================================
        // BUSINESS LOGIC FAILURES
        // =====================================================================

        [Fact]
        public async Task UpdateBrandAsync_ShouldThrowKeyNotFoundException_WhenBrandDoesNotExist()
        {
            // Arrange
            var brandId = 99L;
            _mockBrandRepo.Setup(repo => repo.GetByIdAsync(brandId)).ReturnsAsync((Brand)null!);

            // Act
            Func<Task> act = async () => await _brandService.UpdateBrandAsync(brandId, new UpdateBrandRequest { BrandName = "Nike" }, 1L);

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage($"Không tìm thấy thương hiệu với ID = {brandId}.");
        }

        [Fact]
        public async Task UpdateBrandAsync_ShouldThrowInvalidOperationException_WhenBrandNameExistsForOtherBrand()
        {
            // Arrange
            var brandId = 1L;
            var duplicateName = "Adidas";
            var existingBrand = new Brand { BrandId = brandId, BrandName = "Nike", IsActive = true };
            
            var otherBrands = new List<Brand>
            {
                existingBrand,
                new Brand { BrandId = 2, BrandName = "  ADIDAS  ", IsActive = true }
            }.AsQueryable();

            _mockBrandRepo.Setup(repo => repo.GetByIdAsync(brandId)).ReturnsAsync(existingBrand);
            _mockBrandRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(otherBrands);

            // Act
            Func<Task> act = async () => await _brandService.UpdateBrandAsync(brandId, new UpdateBrandRequest { BrandName = duplicateName }, 1L);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage($"Thương hiệu '{duplicateName}' đã tồn tại.");
        }
    }
}
