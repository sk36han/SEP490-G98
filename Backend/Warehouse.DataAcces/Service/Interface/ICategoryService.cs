using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface ICategoryService
    {
        /// <summary>
        /// Lấy danh sách danh mục có phân trang + filter
        /// </summary>
        Task<PagedResponse<CategoryResponse>> GetCategoriesAsync(
            int page,
            int pageSize,
            string? categoryName,
            bool? isActive);

        /// <summary>
        /// Lấy chi tiết danh mục theo ID
        /// </summary>
        Task<CategoryResponse> GetCategoryByIdAsync(long id);

        /// <summary>
        /// Tạo danh mục mới
        /// </summary>
        Task<CategoryResponse> CreateCategoryAsync(CreateCategoryRequest request, long currentUserId);

        /// <summary>
        /// Cập nhật danh mục
        /// </summary>
        Task<CategoryResponse> UpdateCategoryAsync(long id, UpdateCategoryRequest request, long currentUserId);

        /// <summary>
        /// Bật / Tắt trạng thái danh mục
        /// </summary>
        Task<CategoryResponse> ToggleCategoryStatusAsync(long id, bool isActive, long currentUserId);
    }
}
