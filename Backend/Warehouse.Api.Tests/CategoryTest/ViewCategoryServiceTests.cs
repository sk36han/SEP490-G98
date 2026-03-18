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
    public class ViewCategoryServiceTests
    {
        private readonly Mock<IGenericRepository<ItemCategory>> _mockCategoryRepo;
        private readonly Mock<IAuditLogService> _mockAuditLogService;
        private readonly CategoryService _categoryService;

        public ViewCategoryServiceTests()
        {
            _mockCategoryRepo = new Mock<IGenericRepository<ItemCategory>>();
            _mockAuditLogService = new Mock<IAuditLogService>();
            _categoryService = new CategoryService(_mockCategoryRepo.Object, _mockAuditLogService.Object);
        }

        // =====================================================================
        // GET ALL (PAGED + FILTER) TESTS
        // =====================================================================

        [Fact]
        public async Task GetCategoriesAsync_ShouldNormalizePageAndPageSize_WhenLessThanOrEqualToZero()
        {
            // Arrange
            var categories = new List<ItemCategory>
            {
                new ItemCategory { CategoryId = 1, CategoryCode = "C1", CategoryName = "Cat1", IsActive = true }
            }.AsQueryable();

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(categories);

            // Act
            var result = await _categoryService.GetCategoriesAsync(0, 0, null, null);

            // Assert
            result.Should().NotBeNull();
            result.Page.Should().Be(1); // default
            result.PageSize.Should().Be(20); // default
            result.TotalItems.Should().Be(1);
            result.Items.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetCategoriesAsync_ShouldThrowArgumentException_WhenPageSizeExceeds100()
        {
            // Act
            Func<Task> act = async () => await _categoryService.GetCategoriesAsync(1, 101, null, null);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                     .WithMessage("Số lượng item mỗi trang không được vượt quá 100.");
        }

        [Fact]
        public async Task GetCategoriesAsync_ShouldThrowArgumentException_WhenCategoryNameExceeds255Chars()
        {
            // Arrange
            var longName = new string('A', 256);
            
            // Act
            Func<Task> act = async () => await _categoryService.GetCategoriesAsync(1, 10, longName, null);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                     .WithMessage("Từ khoá tìm kiếm không được vượt quá 255 ký tự.");
        }

        [Fact]
        public async Task GetCategoriesAsync_ShouldFilterByCategoryName_PartialCaseInsensitive()
        {
            // Arrange
            var categories = new List<ItemCategory>
            {
                new ItemCategory { CategoryId = 1, CategoryCode = "ELEC", CategoryName = "Electronics", IsActive = true },
                new ItemCategory { CategoryId = 2, CategoryCode = "LAP", CategoryName = "Laptops", IsActive = true },
                new ItemCategory { CategoryId = 3, CategoryCode = "COM-ELEC", CategoryName = "Computers", IsActive = true }
            }.AsQueryable();

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(categories);

            // Act
            // Searching for "elec" should match CategoryName of ID=1 and CategoryCode of ID=3
            var result = await _categoryService.GetCategoriesAsync(1, 10, "  elec  ", null);

            // Assert
            result.TotalItems.Should().Be(2);
            result.Items.Select(i => i.CategoryId).Should().BeEquivalentTo(new[] { 1L, 3L });
        }

        [Theory]
        [InlineData(true, "ELEC", "LAP")]
        [InlineData(false, "OLD")]
        public async Task GetCategoriesAsync_ShouldFilterByIsActive(bool isActiveFilter, params string[] expectedCodes)
        {
            // Arrange
            var categories = new List<ItemCategory>
            {
                new ItemCategory { CategoryId = 1, CategoryCode = "ELEC", CategoryName = "Electronics", IsActive = true },
                new ItemCategory { CategoryId = 2, CategoryCode = "OLD", CategoryName = "Old", IsActive = false },
                new ItemCategory { CategoryId = 3, CategoryCode = "LAP", CategoryName = "Laptops", IsActive = true }
            }.AsQueryable();

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(categories);

            // Act
            var result = await _categoryService.GetCategoriesAsync(1, 10, null, isActiveFilter);

            // Assert
            result.TotalItems.Should().Be(expectedCodes.Length);
            result.Items.Select(i => i.CategoryCode).Should().BeEquivalentTo(expectedCodes);
        }

        [Fact]
        public async Task GetCategoriesAsync_ShouldReturnPagedResults_CorrectlyCalculated()
        {
            // Arrange
            var categories = new List<ItemCategory>
            {
                new ItemCategory { CategoryId = 1, CategoryCode = "A1", CategoryName = "A1" },
                new ItemCategory { CategoryId = 2, CategoryCode = "B1", CategoryName = "B1" },
                new ItemCategory { CategoryId = 3, CategoryCode = "C1", CategoryName = "C1" },
                new ItemCategory { CategoryId = 4, CategoryCode = "D1", CategoryName = "D1" },
                new ItemCategory { CategoryId = 5, CategoryCode = "E1", CategoryName = "E1" }
            }.AsQueryable();

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(categories);

            // Act
            var result = await _categoryService.GetCategoriesAsync(2, 2, null, null); // Skip 2, Take 2

            // Assert
            result.Page.Should().Be(2);
            result.PageSize.Should().Be(2);
            result.TotalItems.Should().Be(5);
            result.Items.Should().HaveCount(2);
            // After order by CategoryCode
            result.Items[0].CategoryCode.Should().Be("C1");
            result.Items[1].CategoryCode.Should().Be("D1");
        }

        [Fact]
        public async Task GetCategoriesAsync_ShouldPopulateParentName_WhenParentExists()
        {
            // Arrange
            var parentId = 10L;
            var categories = new List<ItemCategory>
            {
                new ItemCategory { CategoryId = parentId, CategoryCode = "PARENT", CategoryName = "Computers" },
                new ItemCategory { CategoryId = 2L, CategoryCode = "CHILD", CategoryName = "Laptops", ParentId = parentId },
                new ItemCategory { CategoryId = 3L, CategoryCode = "ORPHAN", CategoryName = "Orphan", ParentId = 99L } // Missing parent
            }.AsQueryable();

            _mockCategoryRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(categories);

            // Act
            var result = await _categoryService.GetCategoriesAsync(1, 10, null, null);

            // Assert
            var child = result.Items.FirstOrDefault(c => c.CategoryCode == "CHILD");
            child.Should().NotBeNull();
            child!.ParentName.Should().Be("Computers");

            var orphan = result.Items.FirstOrDefault(c => c.CategoryCode == "ORPHAN");
            orphan.Should().NotBeNull();
            orphan!.ParentName.Should().BeNull(); // Lookup should fail gracefully
        }
    }
}
