using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface ICompanyService
    {
        /// <summary>
        /// Lấy danh sách công ty có phân trang + filter
        /// </summary>
        Task<PagedResponse<CompanyResponse>> GetCompaniesAsync(
            int page,
            int pageSize,
            string? companyName,
            bool? isActive);

        /// <summary>
        /// Lấy chi tiết công ty theo ID
        /// </summary>
        Task<CompanyResponse> GetCompanyByIdAsync(long id);

        /// <summary>
        /// Tạo công ty mới
        /// </summary>
        Task<CompanyResponse> CreateCompanyAsync(CreateCompanyRequest request, long currentUserId);

        /// <summary>
        /// Cập nhật công ty
        /// </summary>
        Task<CompanyResponse> UpdateCompanyAsync(long id, UpdateCompanyRequest request, long currentUserId);

        /// <summary>
        /// Bật / Tắt trạng thái công ty
        /// </summary>
        Task<CompanyResponse> ToggleCompanyStatusAsync(long id, bool isActive, long currentUserId);
    }
}
