using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Xunit;

namespace Warehouse.Api.Tests.CategoryTest
{
    public class ToggleCategoryStatusServiceTests
    {
        private readonly Mock<IGenericRepository<ItemCategory>> _mockCategoryRepo;
        private readonly Mock<IAuditLogService> _mockAuditLogService;
        private readonly CategoryService _categoryService;

        public ToggleCategoryStatusServiceTests()
        {
            _mockCategoryRepo = new Mock<IGenericRepository<ItemCategory>>();
            _mockAuditLogService = new Mock<IAuditLogService>();
            _categoryService = new CategoryService(_mockCategoryRepo.Object, _mockAuditLogService.Object);
        }

        // =====================================================================
        // SUCCESS CASES
        // =====================================================================

        [Fact]
        public async Task ToggleCategoryStatusAsync_ShouldUpdateStatus_WhenActivating()
        {
            // Arrange
            var categoryId = 1L;
            var currentUserId = 1L;
            var existingCategory = new ItemCategory { CategoryId = categoryId, CategoryCode = "C1", CategoryName = "Cat", IsActive = false };

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory> { existingCategory }.AsQueryable());
            _mockCategoryRepo.Setup(repo => repo.UpdateAsync(It.IsAny<ItemCategory>())).ReturnsAsync((ItemCategory c) => c);

            // Act
            var result = await _categoryService.ToggleCategoryStatusAsync(categoryId, true, currentUserId);

            // Assert
            result.Should().NotBeNull();
            result.IsActive.Should().BeTrue();
            _mockCategoryRepo.Verify(repo => repo.UpdateAsync(It.Is<ItemCategory>(c => c.CategoryId == categoryId && c.IsActive)), Times.Once);
        }

        [Fact]
        public async Task ToggleCategoryStatusAsync_ShouldUpdateStatus_WhenDeactivating()
        {
            // Arrange
            var categoryId = 1L;
            var currentUserId = 1L;
            var existingCategory = new ItemCategory { CategoryId = categoryId, CategoryCode = "C1", CategoryName = "Cat", IsActive = true };

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory> { existingCategory }.AsQueryable());
            _mockCategoryRepo.Setup(repo => repo.UpdateAsync(It.IsAny<ItemCategory>())).ReturnsAsync((ItemCategory c) => c);

            // Act
            var result = await _categoryService.ToggleCategoryStatusAsync(categoryId, false, currentUserId);

            // Assert
            result.Should().NotBeNull();
            result.IsActive.Should().BeFalse();
            _mockCategoryRepo.Verify(repo => repo.UpdateAsync(It.Is<ItemCategory>(c => c.CategoryId == categoryId && !c.IsActive)), Times.Once);
        }

        // =====================================================================
        // VALIDATION FAILURES
        // =====================================================================

        [Fact]
        public async Task ToggleCategoryStatusAsync_ShouldThrowArgumentException_WhenCategoryIdIsZero()
        {
            // Act
            Func<Task> act = async () => await _categoryService.ToggleCategoryStatusAsync(0, true, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("ID danh mục phải là số nguyên dương.");
        }

        [Fact]
        public async Task ToggleCategoryStatusAsync_ShouldThrowArgumentException_WhenUserIdIsInvalid()
        {
            // Act
            Func<Task> act = async () => await _categoryService.ToggleCategoryStatusAsync(1L, true, 0);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("ID người dùng không hợp lệ.");
        }

        // =====================================================================
        // BUSINESS LOGIC FAILURES
        // =====================================================================

        [Fact]
        public async Task ToggleCategoryStatusAsync_ShouldThrowKeyNotFoundException_WhenCategoryDoesNotExist()
        {
            // Arrange
            var categoryId = 99L;
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory>().AsQueryable());

            // Act
            Func<Task> act = async () => await _categoryService.ToggleCategoryStatusAsync(categoryId, true, 1L);

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage($"Không tìm thấy danh mục với ID = {categoryId}.");
        }

        [Fact]
        public async Task ToggleCategoryStatusAsync_ShouldThrowInvalidOperationException_WhenAlreadyInTargetStatus_Ative()
        {
            // Arrange
            var categoryId = 1L;
            var existingCategory = new ItemCategory { CategoryId = categoryId, CategoryCode = "C1", CategoryName = "Cat", IsActive = true };
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory> { existingCategory }.AsQueryable());

            // Act
            Func<Task> act = async () => await _categoryService.ToggleCategoryStatusAsync(categoryId, true, 1L);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage($"Danh mục 'Cat' hiện tại đang hoạt động. Không cần thay đổi.");
        }

        [Fact]
        public async Task ToggleCategoryStatusAsync_ShouldThrowInvalidOperationException_WhenAlreadyInTargetStatus_Inactive()
        {
            // Arrange
            var categoryId = 1L;
            var existingCategory = new ItemCategory { CategoryId = categoryId, CategoryCode = "C1", CategoryName = "Cat", IsActive = false };
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory> { existingCategory }.AsQueryable());

            // Act
            Func<Task> act = async () => await _categoryService.ToggleCategoryStatusAsync(categoryId, false, 1L);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage($"Danh mục 'Cat' hiện tại đã bị vô hiệu hóa. Không cần thay đổi.");
        }
    }
}
