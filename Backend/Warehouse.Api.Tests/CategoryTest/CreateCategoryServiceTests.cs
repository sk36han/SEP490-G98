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
        // 1. SUCCESS CASES (Kiểm tra sinh mã tự động)
        // =====================================================================

        [Fact]
        public async Task CreateCategory_Success_ShouldGenerateCorrectCode()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryName = "Electronics" };
            _mockCategoryRepo.Setup(repo => repo.GetAllAsync())
                .ReturnsAsync(new List<ItemCategory> { 
                    new ItemCategory { CategoryCode = "CTG-001", CategoryName = "Old" } 
                }.AsQueryable());

            // Act
            var result = await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            result.CategoryCode.Should().Be("CTG-002"); // Logic tự tăng: 001 -> 002
            result.CategoryName.Should().Be("Electronics");
            _mockCategoryRepo.Verify(repo => repo.CreateAsync(It.IsAny<ItemCategory>()), Times.Once);
        }

        // =====================================================================
        // 2. VALIDATION FAILURES
        // =====================================================================

        [Fact]
        public async Task CreateCategory_RequestNull_ShouldThrowException()
        {
            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(null!, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentNullException>()
                .WithMessage("*Dữ liệu yêu cầu không được để trống.*");
        }

        [Theory]
        [InlineData(null, "Tên danh mục không được để trống.")]
        [InlineData("", "Tên danh mục không được để trống.")]
        [InlineData("   ", "Tên danh mục không được để trống.")]
        [InlineData("A", "Tên danh mục phải có ít nhất 2 ký tự.")]
        [InlineData("Name@123", "Tên danh mục chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.), ký tự & và /.")]
        public async Task CreateCategory_InvalidName_ShouldThrowArgumentException(string invalidName, string expectedMessage)
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryName = invalidName };

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>().WithMessage(expectedMessage);
        }

        [Fact]
        public async Task CreateCategory_InvalidUser_ShouldThrowArgumentException()
        {
            var request = new CreateCategoryRequest { CategoryName = "Valid Name" };
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 0);
            await act.Should().ThrowAsync<ArgumentException>().WithMessage("ID người dùng không hợp lệ.");
        }

        // =====================================================================
        // 3. BUSINESS LOGIC FAILURES
        // =====================================================================

        [Fact]
        public async Task CreateCategory_DuplicateNameInSameLevel_ShouldThrowException()
        {
            // Arrange
            var parentId = 5L;
            var request = new CreateCategoryRequest { CategoryName = "Electronics", ParentId = parentId };
            var existing = new List<ItemCategory> { 
                new ItemCategory { CategoryName = "Electronics", ParentId = parentId } 
            }.AsQueryable();

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(existing);

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("Tên danh mục 'Electronics' đã tồn tại trong cùng cấp cha.");
        }

        [Fact]
        public async Task CreateCategory_ParentNotFound_ShouldThrowKeyNotFoundException()
        {
            // Arrange
            var request = new CreateCategoryRequest { CategoryName = "Child", ParentId = 999L };
            _mockCategoryRepo.Setup(repo => repo.GetByIdAsync(999L)).ReturnsAsync((ItemCategory)null!);

            // Act
            Func<Task> act = async () => await _categoryService.CreateCategoryAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<KeyNotFoundException>()
                .WithMessage("Không tìm thấy danh mục cha với ID = 999.");
        }
    }
}
