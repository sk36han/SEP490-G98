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

    namespace Warehouse.Api.Tests.BrandTest
    {
        public class ViewBrandServiceTests
        {
            private readonly Mock<IGenericRepository<Brand>> _mockBrandRepo;
            private readonly Mock<IAuditLogService> _mockAuditLogService;
            private readonly BrandService _brandService;

            public ViewBrandServiceTests()
            {
                _mockBrandRepo = new Mock<IGenericRepository<Brand>>();
                _mockAuditLogService = new Mock<IAuditLogService>();
                _brandService = new BrandService(_mockBrandRepo.Object, _mockAuditLogService.Object);
            }

            // =====================================================================
            // GET BY ID TESTS
            // =====================================================================

            [Fact]
            public async Task GetBrandByIdAsync_ShouldReturnBrand_WhenIdIsValidAndExists()
            {
                // Arrange
                var brandId = 1L;
                var brand = new Brand { BrandId = brandId, BrandName = "Nike", IsActive = true };
                _mockBrandRepo.Setup(repo => repo.GetByIdAsync(brandId)).ReturnsAsync(brand);

                // Act
                var result = await _brandService.GetBrandByIdAsync(brandId);

                // Assert
                result.Should().NotBeNull();
                result.BrandId.Should().Be(brandId);
                result.BrandName.Should().Be("Nike");
                result.IsActive.Should().BeTrue();
                _mockBrandRepo.Verify(repo => repo.GetByIdAsync(brandId), Times.Once);
            }

            [Theory]
            [InlineData(0)]
            [InlineData(-1)]
            public async Task GetBrandByIdAsync_ShouldThrowArgumentException_WhenIdIsInvalid(long id)
            {
                // Act
                Func<Task> act = async () => await _brandService.GetBrandByIdAsync(id);

                // Assert
                await act.Should().ThrowAsync<ArgumentException>()
                         .WithMessage("ID thương hiệu phải là số nguyên dương.");
                _mockBrandRepo.Verify(repo => repo.GetByIdAsync(It.IsAny<long>()), Times.Never);
            }

            [Fact]
            public async Task GetBrandByIdAsync_ShouldThrowKeyNotFoundException_WhenBrandDoesNotExist()
            {
                // Arrange
                var brandId = 99L;
                _mockBrandRepo.Setup(repo => repo.GetByIdAsync(brandId)).ReturnsAsync((Brand)null);

                // Act
                Func<Task> act = async () => await _brandService.GetBrandByIdAsync(brandId);

                // Assert
                await act.Should().ThrowAsync<KeyNotFoundException>()
                         .WithMessage($"Không tìm thấy thương hiệu với ID = {brandId}.");
                _mockBrandRepo.Verify(repo => repo.GetByIdAsync(brandId), Times.Once);
            }

            // =====================================================================
            // GET ALL (PAGED + FILTER) TESTS
            // =====================================================================

            [Fact]
            public async Task GetBrandsAsync_ShouldNormalizePageAndPageSize_WhenLessThanOrEqualToZero()
            {
                // Arrange
                var brands = new List<Brand>
                {
                    new Brand { BrandId = 1, BrandName = "Adidas", IsActive = true }
                }.AsQueryable();

                _mockBrandRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(brands);

                // Act
                var result = await _brandService.GetBrandsAsync(0, 0, null, null);

                // Assert
                result.Should().NotBeNull();
                result.Page.Should().Be(1); // default page
                result.PageSize.Should().Be(20); // default page size
                result.TotalItems.Should().Be(1);
                result.Items.Should().HaveCount(1);
            }

            [Fact]
            public async Task GetBrandsAsync_ShouldThrowArgumentException_WhenPageSizeExceeds100()
            {
                // Act
                Func<Task> act = async () => await _brandService.GetBrandsAsync(1, 101, null, null);

                // Assert
                await act.Should().ThrowAsync<ArgumentException>()
                         .WithMessage("Số lượng item mỗi trang không được vượt quá 100.");
            }

            [Fact]
            public async Task GetBrandsAsync_ShouldThrowArgumentException_WhenBrandNameExceeds255CharsAfterTrim()
            {
                // Arrange
                var longName = new string('A', 256);
                var longNameWithSpaces = "   " + longName + "   "; // ensure trims before length check

                // Act
                Func<Task> act = async () => await _brandService.GetBrandsAsync(1, 10, longNameWithSpaces, null);

                // Assert
                await act.Should().ThrowAsync<ArgumentException>()
                         .WithMessage("Từ khoá tìm kiếm không được vượt quá 255 ký tự.");
            }

            [Fact]
            public async Task GetBrandsAsync_ShouldFilterByBrandName_PartialCaseInsensitive()
            {
                // Arrange
                var brands = new List<Brand>
                {
                    new Brand { BrandId = 1, BrandName = "Adidas Original", IsActive = true },
                    new Brand { BrandId = 2, BrandName = "Nike", IsActive = true },
                    new Brand { BrandId = 3, BrandName = "Puma", IsActive = true }
                }.AsQueryable();

                _mockBrandRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(brands);

                // Act
                var result = await _brandService.GetBrandsAsync(1, 10, "  adi  ", null); // checking space trim as well

                // Assert
                result.TotalItems.Should().Be(1);
                result.Items.Should().ContainSingle();
                result.Items.First().BrandName.Should().Be("Adidas Original");
            }

            [Theory]
            [InlineData(true, "Adidas", "Puma")]
            [InlineData(false, "Nike")]
            public async Task GetBrandsAsync_ShouldFilterByIsActive(bool isActiveFilter, params string[] expectedBrands)
            {
                // Arrange
                var brands = new List<Brand>
                {
                    new Brand { BrandId = 1, BrandName = "Adidas", IsActive = true },
                    new Brand { BrandId = 2, BrandName = "Nike", IsActive = false },
                    new Brand { BrandId = 3, BrandName = "Puma", IsActive = true }
                }.AsQueryable();

                _mockBrandRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(brands);

                // Act
                var result = await _brandService.GetBrandsAsync(1, 10, null, isActiveFilter);

                // Assert
                result.TotalItems.Should().Be(expectedBrands.Length);
                // Result is sorted alphabetically by BrandName
                result.Items.Select(i => i.BrandName).Should().BeEquivalentTo(expectedBrands);
            }

            [Fact]
            public async Task GetBrandsAsync_ShouldReturnEmpty_WhenNoMatch()
            {
                // Arrange
                var brands = new List<Brand>
                {
                    new Brand { BrandId = 1, BrandName = "Adidas", IsActive = true }
                }.AsQueryable();

                _mockBrandRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(brands);

                // Act
                var result = await _brandService.GetBrandsAsync(1, 10, "XYZ", null);

                // Assert
                result.TotalItems.Should().Be(0);
                result.Items.Should().BeEmpty();
            }

            [Fact]
            public async Task GetBrandsAsync_ShouldReturnPagedResults_CorrectlyCalculated()
            {
                // Arrange
                var brands = new List<Brand>
                {
                    new Brand { BrandId = 1, BrandName = "Adidas", IsActive = true },
                    new Brand { BrandId = 2, BrandName = "Asics", IsActive = true },
                    new Brand { BrandId = 3, BrandName = "Nike", IsActive = true },
                    new Brand { BrandId = 4, BrandName = "Puma", IsActive = true },
                    new Brand { BrandId = 5, BrandName = "Reebok", IsActive = true }
                }.AsQueryable(); // Ordered by BrandName

                _mockBrandRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(brands);

                // Act
                var result = await _brandService.GetBrandsAsync(2, 2, null, null); // page 2, pageSize 2 => should skip 2, take 2

                // Assert
                result.Page.Should().Be(2);
                result.PageSize.Should().Be(2);
                result.TotalItems.Should().Be(5);
                result.Items.Should().HaveCount(2);
                result.Items[0].BrandName.Should().Be("Nike");
                result.Items[1].BrandName.Should().Be("Puma");
            }

            [Fact]
            public async Task GetBrandsAsync_ShouldNotFilterByBrandName_WhenBrandNameIsWhitespace()
            {
                // Arrange
                var brands = new List<Brand>
                {
                    new Brand { BrandId = 1, BrandName = "Adidas", IsActive = true },
                    new Brand { BrandId = 2, BrandName = "Nike", IsActive = true }
                }.AsQueryable();

                _mockBrandRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(brands);

                // Act
                // Empty spaces should be treated as IsNullOrWhiteSpace => no filter
                var result = await _brandService.GetBrandsAsync(1, 10, "   ", null);

                // Assert
                result.TotalItems.Should().Be(2);
                result.Items.Should().HaveCount(2);
            }
        }
    }
