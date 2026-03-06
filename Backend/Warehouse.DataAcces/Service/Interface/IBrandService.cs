using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IBrandService
    {
        /// <summary>
        /// Lấy danh sách thương hiệu có phân trang + filter
        /// </summary>
        Task<PagedResponse<BrandResponse>> GetBrandsAsync(
            int page,
            int pageSize,
            string? brandName,
            bool? isActive);

        /// <summary>
        /// Lấy chi tiết thương hiệu theo ID
        /// </summary>
        Task<BrandResponse> GetBrandByIdAsync(long id);

        /// <summary>
        /// Tạo thương hiệu mới
        /// </summary>
        Task<BrandResponse> CreateBrandAsync(CreateBrandRequest request, long currentUserId);

        /// <summary>
        /// Cập nhật thương hiệu
        /// </summary>
        Task<BrandResponse> UpdateBrandAsync(long id, UpdateBrandRequest request, long currentUserId);

        /// <summary>
        /// Bật / Tắt trạng thái thương hiệu
        /// </summary>
        Task<BrandResponse> ToggleBrandStatusAsync(long id, bool isActive);
    }
}
