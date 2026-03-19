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

namespace Warehouse.Api.Tests.BrandTest
{
    public class CreateBrandServiceTests
    {
        private readonly Mock<IGenericRepository<Brand>> _mockBrandRepo;
        private readonly Mock<IAuditLogService> _mockAuditLogService;
        private readonly BrandService _brandService;

        public CreateBrandServiceTests()
        {
            _mockBrandRepo = new Mock<IGenericRepository<Brand>>();
            _mockAuditLogService = new Mock<IAuditLogService>();
            _brandService = new BrandService(_mockBrandRepo.Object, _mockAuditLogService.Object);
        }

        // =====================================================================
        // SUCCESS CASE
        // =====================================================================

        [Fact]
        public async Task CreateBrandAsync_ShouldCreateBrand_WhenRequestIsValid()
        {
            // Arrange
            var currentUserId = 123L;
            var request = new CreateBrandRequest { BrandName = "  Samsung  " }; // Test trimming
            
            _mockBrandRepo.Setup(repo => repo.GetAllAsync())
                .ReturnsAsync(new List<Brand>().AsQueryable()); // No existing brands

            // Act
            var result = await _brandService.CreateBrandAsync(request, currentUserId);

            // Assert
            result.Should().NotBeNull();
            result.BrandName.Should().Be("Samsung"); // Trimmed
            result.IsActive.Should().BeTrue();

            _mockBrandRepo.Verify(repo => repo.CreateAsync(It.Is<Brand>(b => 
                b.BrandName == "Samsung" && b.IsActive)), Times.Once);

            _mockAuditLogService.Verify(log => log.LogAsync(
                currentUserId,
                AuditAction.Create,
                AuditEntity.Brand,
                It.IsAny<long>(),
                "Tạo thương hiệu 'Samsung'",
                null,
                null
            ), Times.Once);
        }

        // =====================================================================
        // VALIDATION FAILURES (Coverage for Private Validators)
        // =====================================================================

        [Fact]
        public async Task CreateBrandAsync_ShouldThrowArgumentNullException_WhenRequestIsNull()
        {
            // Act
            Func<Task> act = async () => await _brandService.CreateBrandAsync(null!, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentNullException>()
                .WithParameterName("request")
                .WithMessage("*Dữ liệu yêu cầu không được để trống.*");
        }

        [Fact]
        public async Task CreateBrandAsync_ShouldThrowArgumentException_WhenUserIdIsZero()
        {
            // Arrange
            var request = new CreateBrandRequest { BrandName = "Sony" };

            // Act
            Func<Task> act = async () => await _brandService.CreateBrandAsync(request, 0);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("ID người dùng không hợp lệ.");
        }


        [Fact]
        public async Task CreateBrandAsync_ShouldThrowArgumentException_WhenBrandNameIsNull()
        {
            // Arrange
            var request = new CreateBrandRequest { BrandName = null! };

            // Act
            Func<Task> act = async () => await _brandService.CreateBrandAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên thương hiệu không được để trống.");
        }

        [Fact]
        public async Task CreateBrandAsync_ShouldThrowArgumentException_WhenBrandNameIsWhitespace()
        {
            // Arrange
            var request = new CreateBrandRequest { BrandName = "   " };

            // Act
            Func<Task> act = async () => await _brandService.CreateBrandAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên thương hiệu không được để trống.");
        }

        [Fact]
        public async Task CreateBrandAsync_ShouldThrowArgumentException_WhenBrandNameIsTooShort()
        {
            // Arrange
            var request = new CreateBrandRequest { BrandName = "A" };

            // Act
            Func<Task> act = async () => await _brandService.CreateBrandAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên thương hiệu phải có ít nhất 2 ký tự.");
        }

        [Fact]
        public async Task CreateBrandAsync_ShouldThrowArgumentException_WhenBrandNameIsTooLong()
        {
            // Arrange
            var request = new CreateBrandRequest { BrandName = new string('A', 256) };

            // Act
            Func<Task> act = async () => await _brandService.CreateBrandAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên thương hiệu không được vượt quá 255 ký tự.");
        }

        [Fact]
        public async Task CreateBrandAsync_ShouldThrowArgumentException_WhenBrandNameContainsAtSymbol()
        {
            // Arrange
            var request = new CreateBrandRequest { BrandName = "Sony@" };

            // Act
            Func<Task> act = async () => await _brandService.CreateBrandAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên thương hiệu chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.) và ký tự &.");
        }

        [Fact]
        public async Task CreateBrandAsync_ShouldThrowArgumentException_WhenBrandNameContainsHashSymbol()
        {
            // Arrange
            var request = new CreateBrandRequest { BrandName = "LG#" };

            // Act
            Func<Task> act = async () => await _brandService.CreateBrandAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên thương hiệu chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.) và ký tự &.");
        }

        [Fact]
        public async Task CreateBrandAsync_ShouldThrowArgumentException_WhenBrandNameContainsExclamationMark()
        {
            // Arrange
            var request = new CreateBrandRequest { BrandName = "Nike!" };

            // Act
            Func<Task> act = async () => await _brandService.CreateBrandAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<ArgumentException>()
                .WithMessage("Tên thương hiệu chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.) và ký tự &.");
        }

        // =====================================================================
        // BUSINESS LOGIC FAILURES
        // =====================================================================

        [Fact]
        public async Task CreateBrandAsync_ShouldThrowInvalidOperationException_WhenBrandNameExists()
        {
            // Arrange
            var brandName = "Nike";
            var request = new CreateBrandRequest { BrandName = brandName };
            
            var existingBrands = new List<Brand>
            {
                new Brand { BrandId = 1, BrandName = "  NIKE  ", IsActive = true } // Same name, different case/spacing
            }.AsQueryable();

            _mockBrandRepo.Setup(repo => repo.GetAllAsync()).ReturnsAsync(existingBrands);

            // Act
            Func<Task> act = async () => await _brandService.CreateBrandAsync(request, 1L);

            // Assert
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage($"Thương hiệu '{brandName}' đã tồn tại.");
        }
    }
}
