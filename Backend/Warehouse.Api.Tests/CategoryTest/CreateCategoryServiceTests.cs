using System;
using System.Collections.Generic;
using System.Linq;
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
    public class CreateCategoryServiceTests
    {
        private readonly Mock<IGenericRepository<ItemCategory>> _mockCategoryRepo;
        private readonly Mock<IAuditLogService> _mockAuditLogService;
        private readonly CategoryService _categoryService;

        public CreateCategoryServiceTests()
        {
            _mockCategoryRepo = new Mock<IGenericRepository<ItemCategory>>();
            _mockAuditLogService = new Mock<IAuditLogService>();
            _categoryService = new CategoryService(_mockCategoryRepo.Object, _mockAuditLogService.Object);
        }

        // =====================================================================
        // SUCCESS CASES
        // =====================================================================

        [Fact]
        public async Task CreateCategoryAsync_ShouldCreateRootCategory_WhenRequestIsValidAndNoParent()
        {
            // Arrange
            var currentUserId = 1L;
            var request = new CreateCategoryRequest 
            { 
                CategoryCode = "  ELEC-01  ", 
                CategoryName = "  Electronics  ",
                ParentId = null
            };
            
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync())
                .ReturnsAsync(new List<ItemCategory>().AsQueryable());

            // Act
            var result = await _categoryService.CreateCategoryAsync(request, currentUserId);

            // Assert
            result.Should().NotBeNull();
            result.CategoryCode.Should().Be("ELEC-01"); // Trimmed
            result.CategoryName.Should().Be("Electronics"); // Trimmed
            result.ParentId.Should().BeNull();
            result.ParentName.Should().BeNull();
            result.IsActive.Should().BeTrue();

            _mockCategoryRepo.Verify(repo => repo.CreateAsync(It.Is<ItemCategory>(c => 
                c.CategoryCode == "ELEC-01" && 
                c.CategoryName == "Electronics" && 
                c.ParentId == null && 
                c.IsActive)), Times.Once);

            _mockAuditLogService.Verify(log => log.LogAsync(
                currentUserId,
                AuditAction.Create,
                AuditEntity.Category,
                It.IsAny<long>(),
                "Tạo danh mục 'Electronics' (mã: ELEC-01)",
                null,
                null
            ), Times.Once);
        }

        [Fact]
        public async Task CreateCategoryAsync_ShouldCreateChildCategory_WhenRequestIsValidAndParentExists()
        {
            // Arrange
            var currentUserId = 1L;
            var parentId = 10L;
            var request = new CreateCategoryRequest 
            { 
                CategoryCode = "LAPTOP", 
                CategoryName = "Laptops",
                ParentId = parentId
            };
            
            var parentCategory = new ItemCategory { CategoryId = parentId, CategoryName = "Computers" };
            
            // GetAllAsync is called twice: once for duplicate check, once at the end to map ParentName
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync())
                .ReturnsAsync(new List<ItemCategory> { parentCategory }.AsQueryable());
                
            _mockCategoryRepo.Setup(repo => repo.GetByIdAsync(parentId)).ReturnsAsync(parentCategory);

            // Act
            var result = await _categoryService.CreateCategoryAsync(request, currentUserId);

            // Assert
            result.Should().NotBeNull();
            result.CategoryCode.Should().Be("LAPTOP");
            result.CategoryName.Should().Be("Laptops");
            result.ParentId.Should().Be(parentId);
            result.ParentName.Should().Be("Computers");

            _mockCategoryRepo.Verify(repo => repo.CreateAsync(It.Is<ItemCategory>(c => 
                c.CategoryCode == "LAPTOP" && 
                c.ParentId == parentId)), Times.Once);
        }

        // =====================================================================
        // VALIDATION FAILURES
        // =====================================================================

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowArgumentNullException_WhenRequestIsNull()
        {
            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(null!, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentNullException>()
                .WithParameterName("request")
                .WithMessage("*Dữ liệu yêu cầu không được để trống.*");
        }

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowArgumentException_WhenUserIdIsZero()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryCode = "CODE", CategoryName = "Name" };

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 0);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("ID người dùng không hợp lệ.");
        }

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowArgumentException_WhenUserIdIsNegative()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryCode = "CODE", CategoryName = "Name" };

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, -1);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("ID người dùng không hợp lệ.");
        }

        // --- CategoryCode Validation ---

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowArgumentException_WhenCategoryCodeIsNull()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryCode = null!, CategoryName = "Name" };

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Mã danh mục không được để trống.");
        }

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowArgumentException_WhenCategoryCodeIsEmpty()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryCode = "", CategoryName = "Name" };

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Mã danh mục không được để trống.");
        }

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowArgumentException_WhenCategoryCodeIsTooShort()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryCode = "A", CategoryName = "Name" };

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Mã danh mục phải có ít nhất 2 ký tự.");
        }

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowArgumentException_WhenCategoryCodeIsTooLong()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryCode = new string('A', 51), CategoryName = "Name" };

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Mã danh mục không được vượt quá 50 ký tự.");
        }

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowArgumentException_WhenCategoryCodeContainsInvalidChars_Space()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryCode = "CODE 1", CategoryName = "Name" };

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Mã danh mục chỉ được chứa chữ cái, chữ số, dấu gạch dưới (_) và dấu gạch ngang (-).");
        }

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowArgumentException_WhenCategoryCodeContainsInvalidChars_Special()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryCode = "CODE@1", CategoryName = "Name" };

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Mã danh mục chỉ được chứa chữ cái, chữ số, dấu gạch dưới (_) và dấu gạch ngang (-).");
        }

        // --- CategoryName Validation ---

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowArgumentException_WhenCategoryNameIsNull()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryCode = "CODE", CategoryName = null! };

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên danh mục không được để trống.");
        }

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowArgumentException_WhenCategoryNameIsEmpty()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryCode = "CODE", CategoryName = "   " };

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên danh mục không được để trống.");
        }

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowArgumentException_WhenCategoryNameIsTooShort()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryCode = "CODE", CategoryName = "A" };

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên danh mục phải có ít nhất 2 ký tự.");
        }

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowArgumentException_WhenCategoryNameIsTooLong()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryCode = "CODE", CategoryName = new string('A', 256) };

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên danh mục không được vượt quá 255 ký tự.");
        }

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowArgumentException_WhenCategoryNameContainsInvalidChars()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryCode = "CODE", CategoryName = "Name@1" };

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên danh mục chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.), ký tự & và /.");
        }

        // =====================================================================
        // BUSINESS LOGIC FAILURES
        // =====================================================================

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowInvalidOperationException_WhenCategoryCodeExists()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryCode = "ELEC", CategoryName = "New Electronics" };
            
            var existingCategories = new List<ItemCategory>
            {
                new ItemCategory { CategoryCode = "  elec  ", CategoryName = "Old Electronics" } // case-insensitive match
            }.AsQueryable();

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(existingCategories);

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("Mã danh mục 'ELEC' đã tồn tại.");
        }

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowInvalidOperationException_WhenCategoryNameExistsInSameParent()
        {
            // Arrange
            var parentId = 5L;
            var request = new CreateCategoryRequest { CategoryCode = "NEW-ELEC", CategoryName = "Electronics", ParentId = parentId };
            
            var existingCategories = new List<ItemCategory>
            {
                new ItemCategory { CategoryCode = "OLD-ELEC", CategoryName = "  electronics  ", ParentId = parentId }
            }.AsQueryable();

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(existingCategories);

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("Tên danh mục 'Electronics' đã tồn tại trong cùng cấp cha.");
        }

        [Fact]
        public async Task CreateCategoryAsync_ShouldNotThrowException_WhenCategoryNameExistsInDifferentParent()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryCode = "NEW-ELEC", CategoryName = "Electronics", ParentId = 1L };
            
            var existingCategories = new List<ItemCategory>
            {
                new ItemCategory { CategoryCode = "OLD-ELEC", CategoryName = "Electronics", ParentId = 2L }, // Different parent
                new ItemCategory { CategoryId = 1L, CategoryCode = "PARENT", CategoryName = "Parent", ParentId = null } // The parent
            }.AsQueryable();

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(existingCategories);
            _mockCategoryRepo.Setup(repo => repo.GetByIdAsync(1L)).ReturnsAsync(existingCategories.FirstOrDefault(c => c.CategoryId == 1L)!);

            // Act
            var result = await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            result.Should().NotBeNull();
            result.CategoryName.Should().Be("Electronics");
        }

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowKeyNotFoundException_WhenParentIdDoesNotExist()
        {
            // Arrange
            var parentId = 99L;
            var request = new CreateCategoryRequest { CategoryCode = "C1", CategoryName = "Cat 1", ParentId = parentId };
            
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(new List<ItemCategory>().AsQueryable());
            _mockCategoryRepo.Setup(repo => repo.GetByIdAsync(parentId)).ReturnsAsync((ItemCategory)null!);

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage($"Không tìm thấy danh mục cha với ID = {parentId}.");
        }
    }
}
