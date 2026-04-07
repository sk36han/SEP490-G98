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
               
                CategoryName = "Laptops",
                ParentId = parentId
            };
            
            var parentCategory = new ItemCategory { CategoryId = parentId, CategoryCode = "CODE", CategoryName = "Computers" };
            
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
            var request = new CreateCategoryRequest { CategoryName = "Name" };

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
            var request = new CreateCategoryRequest { CategoryName = "Name" };

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, -1);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("ID người dùng không hợp lệ.");
        }

        // --- CategoryCode Validation ---

        private async Task AssertCreateCategoryCodeThrowsAsync(string code, string expectedMessage)
        {
            var request = new CreateCategoryRequest { CategoryName = "Name" };
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage(expectedMessage);
        }

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryCodeIsNull() =>
            AssertCreateCategoryCodeThrowsAsync(null!, "Mã danh mục không được để trống.");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryCodeIsEmpty() =>
            AssertCreateCategoryCodeThrowsAsync("", "Mã danh mục không được để trống.");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryCodeIsOnlySpace() =>
            AssertCreateCategoryCodeThrowsAsync(" ", "Mã danh mục không được để trống.");
        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryCodeIsTooShort() =>
            AssertCreateCategoryCodeThrowsAsync("A", "Mã danh mục phải có ít nhất 2 ký tự.");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryCodeIsTooShortAfterTrim() =>
            AssertCreateCategoryCodeThrowsAsync(" a ", "Mã danh mục phải có ít nhất 2 ký tự.");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryCodeIsTooLong() =>
            AssertCreateCategoryCodeThrowsAsync(new string('A', 51), "Mã danh mục không được vượt quá 50 ký tự.");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryCodeContainsSpaceInBetween() =>
            AssertCreateCategoryCodeThrowsAsync("CODE 1", "Mã danh mục chỉ được chứa chữ cái, chữ số, dấu gạch dưới (_) và dấu gạch ngang (-).");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryCodeContainsAtSymbol() =>
            AssertCreateCategoryCodeThrowsAsync("CODE@1", "Mã danh mục chỉ được chứa chữ cái, chữ số, dấu gạch dưới (_) và dấu gạch ngang (-).");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryCodeContainsSpaceAndAtSymbol() =>
            AssertCreateCategoryCodeThrowsAsync("bad @", "Mã danh mục chỉ được chứa chữ cái, chữ số, dấu gạch dưới (_) và dấu gạch ngang (-).");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryCodeContainsExclamationMark() =>
            AssertCreateCategoryCodeThrowsAsync("CODE!", "Mã danh mục chỉ được chứa chữ cái, chữ số, dấu gạch dưới (_) và dấu gạch ngang (-).");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryCodeContainsUnicodeCharacters() =>
            AssertCreateCategoryCodeThrowsAsync("MãMới", "Mã danh mục chỉ được chứa chữ cái, chữ số, dấu gạch dưới (_) và dấu gạch ngang (-).");

        // --- CategoryName Validation ---

        private async Task AssertCreateCategoryNameThrowsAsync(string name, string expectedMessage)
        {
            var request = new CreateCategoryRequest { CategoryName = name };
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage(expectedMessage);
        }

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryNameIsNull() =>
            AssertCreateCategoryNameThrowsAsync(null!, "Tên danh mục không được để trống.");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryNameIsEmpty() =>
            AssertCreateCategoryNameThrowsAsync("", "Tên danh mục không được để trống.");
        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryNameIsWhitespace() =>
            AssertCreateCategoryNameThrowsAsync("   ", "Tên danh mục không được để trống.");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryNameIsTooShort() =>
            AssertCreateCategoryNameThrowsAsync("A", "Tên danh mục phải có ít nhất 2 ký tự.");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryNameIsTooShortAfterTrim() =>
            AssertCreateCategoryNameThrowsAsync(" a ", "Tên danh mục phải có ít nhất 2 ký tự.");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryNameIsTooLong() =>
            AssertCreateCategoryNameThrowsAsync(new string('A', 256), "Tên danh mục không được vượt quá 255 ký tự.");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryNameContainsAtSymbol() =>
            AssertCreateCategoryNameThrowsAsync("Name@1", "Tên danh mục chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.), ký tự & và /.");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryNameContainsSpaceAndAtSymbol() =>
            AssertCreateCategoryNameThrowsAsync("bad @", "Tên danh mục chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.), ký tự & và /.");

        [Fact]
        public Task CreateCategoryAsync_ShouldThrow_WhenCategoryNameContainsHashMark() =>
            AssertCreateCategoryNameThrowsAsync("Name#", "Tên danh mục chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.), ký tự & và /.");

        // =====================================================================
        // BUSINESS LOGIC FAILURES
        // =====================================================================

        [Fact]
        public async Task CreateCategoryAsync_ShouldThrowInvalidOperationException_WhenCategoryCodeExists()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryName = "New Electronics" };
            
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
            var request = new CreateCategoryRequest { CategoryName = "Electronics", ParentId = parentId };
            
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
            var request = new CreateCategoryRequest { CategoryName = "Electronics", ParentId = 1L };
            
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
            var request = new CreateCategoryRequest { 
                CategoryName = "Cat 1", ParentId = parentId };
            
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
