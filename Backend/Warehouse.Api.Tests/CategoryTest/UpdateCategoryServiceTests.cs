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
        private readonly Mock<IGenericRepository<Item>> _mockItemRepo;
        private readonly Mock<IAuditLogService> _mockAuditLogService;
        private readonly CategoryService _categoryService;

        public UpdateCategoryServiceTests()
        {
            _mockCategoryRepo = new Mock<IGenericRepository<ItemCategory>>();
            _mockItemRepo = new Mock<IGenericRepository<Item>>();
            _mockItemRepo.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<Item>());
            _mockAuditLogService = new Mock<IAuditLogService>();
            _mockAuditLogService.Setup(s => s.LogAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<long?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            _categoryService = new CategoryService(_mockCategoryRepo.Object, _mockItemRepo.Object, _mockAuditLogService.Object);
        }

        // 1. Success Case
        [Fact]
        public async Task UpdateCategoryAsync_ShouldUpdateSuccessfully_WhenRequestIsValid()
        {
            var categoryId = 1L;
            var currentUserId = 123L;
            var request = new UpdateCategoryRequest { CategoryCode = "LAPTOP-01", CategoryName = "Gaming Laptops", ParentId = 5L, IsActive = false };
            var existingCategory = new ItemCategory { CategoryId = categoryId, CategoryCode = "OLD", CategoryName = "Old Name", ParentId = 10L, IsActive = true };
            var parentCategory = new ItemCategory { CategoryId = 5L, CategoryCode = "PARENT", CategoryName = "Electronics" };

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory> { existingCategory, parentCategory }.AsQueryable());
            _mockCategoryRepo.Setup(repo => repo.UpdateAsync(It.IsAny<ItemCategory>())).ReturnsAsync((ItemCategory c) => c);

            var result = await _categoryService.UpdateCategoryAsync(categoryId, request, currentUserId);

            result.CategoryCode.Should().Be("LAPTOP-01");
            result.CategoryName.Should().Be("Gaming Laptops");
            result.ParentId.Should().Be(5L);
            result.IsActive.Should().BeFalse();
        }

        // 2. Success Case (Identical fields)
        [Fact]
        public async Task UpdateCategoryAsync_ShouldUpdateSuccessfully_WhenUniqueFieldsUnchanged()
        {
            var categoryId = 1L;
            var sameCode = "SAME-CODE";
            var sameName = "Same Name";
            var existingCategory = new ItemCategory { CategoryId = categoryId, CategoryCode = sameCode, CategoryName = sameName, ParentId = null };
            
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory> { existingCategory }.AsQueryable());
            _mockCategoryRepo.Setup(repo => repo.UpdateAsync(It.IsAny<ItemCategory>())).ReturnsAsync((ItemCategory c) => c);

            var request = new UpdateCategoryRequest { CategoryCode = sameCode, CategoryName = sameName, ParentId = null, IsActive = true };
            var result = await _categoryService.UpdateCategoryAsync(categoryId, request, 123L);

            result.Should().NotBeNull();
            result.CategoryCode.Should().Be(sameCode);
            result.CategoryName.Should().Be(sameName);
        }

        // 3. Validation: Invalid CategoryId
        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowArgumentException_WhenCategoryIdIsInvalid()
        {
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(0, new UpdateCategoryRequest { CategoryCode = "@", CategoryName = "N1" }, 123L);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("ID danh mục phải là số nguyên dương.");
        }

        // 4. Validation: Invalid UserId
        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowArgumentException_WhenUserIdIsInvalid()
        {
            var existing = new ItemCategory { CategoryId = 1L, CategoryCode = "EXISTING", CategoryName = "Existing" };
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory> { existing }.AsQueryable());

            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(1L, new UpdateCategoryRequest { CategoryCode = "@", CategoryName = "N1" }, 0);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("ID người dùng không hợp lệ.");
        }

        // 5. Validation: Null Request
        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowArgumentNullException_WhenRequestIsNull()
        {
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(1L, null!, 123L);
            await act.Should().ThrowAsync<ArgumentNullException>();
        }

        // 6. Validation: Code Invalid Length
        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowArgumentException_WhenCategoryCodeIsInvalidLength()
        {
            var existing = new ItemCategory { CategoryId = 1L, CategoryCode = "EXISTING", CategoryName = "Existing" };
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory> { existing }.AsQueryable());

            var request = new UpdateCategoryRequest { CategoryCode = "A", CategoryName = "Valid Name" };
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(1L, request, 1L);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("Mã danh mục phải có ít nhất 2 ký tự.");
        }

        // 7. Validation: Code Invalid Pattern
        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowArgumentException_WhenCategoryCodeHasInvalidPattern()
        {
            var existing = new ItemCategory { CategoryId = 1L, CategoryCode = "EXISTING", CategoryName = "Existing" };
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory> { existing }.AsQueryable());

            var request = new UpdateCategoryRequest { CategoryCode = "CODE 12", CategoryName = "Valid Name" };
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(1L, request, 1L);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("Mã danh mục chỉ được chứa chữ cái, chữ số, dấu gạch dưới (_) và dấu gạch ngang (-).");
        }

        // 8. Validation: Name Invalid Length
        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowArgumentException_WhenCategoryNameIsInvalidLength()
        {
            var existing = new ItemCategory { CategoryId = 1L, CategoryCode = "EXISTING", CategoryName = "Existing" };
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory> { existing }.AsQueryable());

            var request = new UpdateCategoryRequest { CategoryCode = "VALID_CODE", CategoryName = "" };
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(1L, request, 1L);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("Tên danh mục không được để trống.");
        }

        // 9. Business Logic: Not found
        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowKeyNotFoundException_WhenCategoryDoesNotExist()
        {
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory>().AsQueryable());
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(99L, new UpdateCategoryRequest { CategoryCode = " ", CategoryName = "NAME" }, 1L);
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("Không tìm thấy danh mục với ID = 99.");
        }

        // 10. Business Logic: Duplicate code
        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowInvalidOperationException_WhenCategoryCodeExistsForOtherCategory()
        {
            var categoryId = 1L;
            var duplicateCode = "EXISTING";
            var categories = new List<ItemCategory>
            {
                new ItemCategory { CategoryId = categoryId, CategoryCode = "OLD", CategoryName = "N1" },
                new ItemCategory { CategoryId = 2L, CategoryCode = duplicateCode, CategoryName = "N2" }
            }.AsQueryable();

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(categories);
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(categoryId, new UpdateCategoryRequest { CategoryCode = duplicateCode, CategoryName = "N1" }, 1L);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage($"Mã danh mục '{duplicateCode}' đã tồn tại.");
        }

        // 11. Business Logic: Duplicate name in same parent
        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowInvalidOperationException_WhenCategoryNameExistsInSameParent()
        {
            var categoryId = 1L;
            var parentId = 5L;
            var duplicateName = "Existing Name";
            var categories = new List<ItemCategory>
            {
                new ItemCategory { CategoryId = categoryId, CategoryCode = "@", CategoryName = "Old", ParentId = parentId },
                new ItemCategory { CategoryId = 2L, CategoryCode = "C2", CategoryName = duplicateName, ParentId = parentId }
            }.AsQueryable();

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(categories);
            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(categoryId, new UpdateCategoryRequest { CategoryCode = "@", CategoryName = duplicateName, ParentId = parentId }, 1L);
            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage($"Tên danh mục '{duplicateName}' đã tồn tại trong cùng cấp cha.");
        }

        // 12. Business Logic: Parent Not Found
        [Fact]
        public async Task UpdateCategoryAsync_ShouldThrowKeyNotFoundException_WhenParentIdDoesNotExist()
        {
            var categoryId = 1L;
            var existing = new ItemCategory { CategoryId = categoryId, CategoryCode = "@", CategoryName = "N1" };
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory> { existing }.AsQueryable());

            Func<Task> act = async () => await _categoryService.UpdateCategoryAsync(categoryId, new UpdateCategoryRequest { CategoryCode = "@", CategoryName = "N1", ParentId = 99L }, 1L);
            await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("Không tìm thấy danh mục cha với ID = 99.");
        }
    }
}
