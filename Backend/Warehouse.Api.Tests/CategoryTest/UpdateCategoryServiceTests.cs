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

namespace Warehouse.Api.Tests.CategoryTest
{
    public class UpdateCategoryServiceTests
    {
        private readonly Mock<IGenericRepository<ItemCategory>> _mockCategoryRepo;
        private readonly Mock<IAuditLogService> _mockAuditLogService;
        private readonly CategoryService _categoryService;

        public UpdateCategoryServiceTests()
        {
            _mockCategoryRepo = new Mock<IGenericRepository<ItemCategory>>();
            _mockAuditLogService = new Mock<IAuditLogService>();
            _categoryService = new CategoryService(_mockCategoryRepo.Object, _mockAuditLogService.Object);
        }

        // =====================================================================
        // SUCCESS CASES
        // =====================================================================

        [Fact]
        public async Task UpdateCategoryAsync_ShouldUpdateCategory_WhenRequestIsValid()
        {
            // Arrange
            var categoryId = 1L;
            var currentUserId = 123L;
            var request = new UpdateCategoryRequest 
            { 
                CategoryCode = "  LAPTOP-01  ", 
                CategoryName = "  Gaming Laptops  ",
                ParentId = null,
                IsActive = false
            };
            
            var existingCategory = new ItemCategory 
            { 
                CategoryId = categoryId, 
                CategoryCode = "OLD", 
                CategoryName = "Old Name", 
                ParentId = 5L,
                IsActive = true 
            };
            
            var oldValues = JsonSerializer.Serialize(new { 
                existingCategory.CategoryCode, 
                existingCategory.CategoryName, 
                existingCategory.ParentId, 
                existingCategory.IsActive 
            });

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory> { existingCategory }.AsQueryable());
            _mockCategoryRepo.Setup(repo => repo.UpdateAsync(It.IsAny<ItemCategory>())).ReturnsAsync((ItemCategory c) => c);

            // Act
            var result = await _categoryService.UpdateCategoryAsync(categoryId, request, currentUserId);

            // Assert
            result.Should().NotBeNull();
            result.CategoryCode.Should().Be("LAPTOP-01");
            result.CategoryName.Should().Be("Gaming Laptops");
            result.ParentId.Should().BeNull();
            result.IsActive.Should().BeFalse();

            _mockCategoryRepo.Verify(repo => repo.UpdateAsync(It.Is<ItemCategory>(c => 
                c.CategoryId == categoryId && 
                c.CategoryCode == "LAPTOP-01" &&
                c.CategoryName == "Gaming Laptops" &&
                c.ParentId == null &&
                !c.IsActive)), Times.Once);

            var newValues = JsonSerializer.Serialize(new { 
                CategoryCode = "LAPTOP-01", 
                CategoryName = "Gaming Laptops", 
                ParentId = (long?)null, 
                IsActive = false 
            });
            
            _mockAuditLogService.Verify(log => log.LogAsync(
                currentUserId,
                AuditAction.Update,
                AuditEntity.Category,
                categoryId,
                "Cập nhật danh mục 'Gaming Laptops' (mã: LAPTOP-01)",
                oldValues,
                newValues
            ), Times.Once);
        }

        // =====================================================================
        // VALIDATION FAILURES
        // =====================================================================

        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowArgumentException_WhenCategoryIdIsZero()
        {
            // Act
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(0, new UpdateCategoryRequest(), 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("ID danh mục phải là số nguyên dương.");
        }

        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowArgumentNullException_WhenRequestIsNull()
        {
            // Act
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(1L, null!, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentNullException>()
                .WithParameterName("request")
                .WithMessage("*Dữ liệu yêu cầu không được để trống.*");
        }

        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowArgumentException_WhenUserIdIsInvalid()
        {
            // Act
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(1L, new UpdateCategoryRequest { CategoryCode = "C", CategoryName = "N" }, 0);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("ID người dùng không hợp lệ.");
        }

        // Include partial validation checks for CategoryCode/Name 
        // (Assuming validators work same as Create, we just test the entry points)

        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowArgumentException_WhenCategoryCodeIsEmpty()
        {
            // Act
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(1L, new UpdateCategoryRequest { CategoryCode = "", CategoryName = "Name" }, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Mã danh mục không được để trống.");
        }

        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowArgumentException_WhenCategoryNameIsTooShort()
        {
            // Act
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(1L, new UpdateCategoryRequest { CategoryCode = "CODE", CategoryName = "A" }, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên danh mục phải có ít nhất 2 ký tự.");
        }

        // =====================================================================
        // BUSINESS LOGIC FAILURES
        // =====================================================================

        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowKeyNotFoundException_WhenCategoryDoesNotExist()
        {
            // Arrange
            var categoryId = 99L;
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory>().AsQueryable());

            // Act
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(categoryId, new UpdateCategoryRequest { CategoryCode = "C", CategoryName = "N" }, 1L);

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage($"Không tìm thấy danh mục với ID = {categoryId}.");
        }

        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowInvalidOperationException_WhenCategoryCodeExistsForOtherCategory()
        {
            // Arrange
            var categoryId = 1L;
            var duplicateCode = "EXISTING";
            
            var existingCategory = new ItemCategory { CategoryId = categoryId, CategoryCode = "OLD", CategoryName = "N1" };
            var otherCategories = new List<ItemCategory>
            {
                existingCategory,
                new ItemCategory { CategoryId = 2L, CategoryCode = duplicateCode, CategoryName = "N2" }
            }.AsQueryable();

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(otherCategories);

            // Act
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(categoryId, new UpdateCategoryRequest { CategoryCode = duplicateCode, CategoryName = "N1" }, 1L);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage($"Mã danh mục '{duplicateCode}' đã tồn tại.");
        }

        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowInvalidOperationException_WhenCategoryNameExistsInSameParentForOtherCategory()
        {
            // Arrange
            var categoryId = 1L;
            var parentId = 5L;
            var duplicateName = "Existing Name";
            
            var existingCategory = new ItemCategory { CategoryId = categoryId, CategoryCode = "C1", CategoryName = "Old Name", ParentId = parentId };
            var otherCategories = new List<ItemCategory>
            {
                existingCategory,
                new ItemCategory { CategoryId = 2L, CategoryCode = "C2", CategoryName = duplicateName, ParentId = parentId }
            }.AsQueryable();

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(otherCategories);

            // Act
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(categoryId, new UpdateCategoryRequest { CategoryCode = "C1", CategoryName = duplicateName, ParentId = parentId }, 1L);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage($"Tên danh mục '{duplicateName}' đã tồn tại trong cùng cấp cha.");
        }

        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowInvalidOperationException_WhenParentIdIsSelf()
        {
            // Arrange
            var categoryId = 1L;
            var existingCategory = new ItemCategory { CategoryId = categoryId, CategoryCode = "C1", CategoryName = "N1" };
            
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory> { existingCategory }.AsQueryable());

            // Act
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(categoryId, new UpdateCategoryRequest { CategoryCode = "C1", CategoryName = "N1", ParentId = categoryId }, 1L);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("Danh mục không thể là cha của chính nó.");
        }

        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowKeyNotFoundException_WhenParentIdDoesNotExist()
        {
            // Arrange
            var categoryId = 1L;
            var parentId = 99L;
            var existingCategory = new ItemCategory { CategoryId = categoryId, CategoryCode = "C1", CategoryName = "N1" };
            
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory> { existingCategory }.AsQueryable());

            // Act
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(categoryId, new UpdateCategoryRequest { CategoryCode = "C1", CategoryName = "N1", ParentId = parentId }, 1L);

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage($"Không tìm thấy danh mục cha với ID = {parentId}.");
        }
    }
}
