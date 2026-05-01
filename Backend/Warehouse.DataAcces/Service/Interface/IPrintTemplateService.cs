using System.Collections.Generic;
using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IPrintTemplateService
    {
        /// <summary>
        /// Lấy tất cả mẫu in, có thể lọc theo loại chứng từ.
        /// </summary>
        Task<List<PrintTemplateResponse>> GetAllTemplatesAsync(string? documentType = null);

        /// <summary>
        /// Lấy chi tiết mẫu in theo ID.
        /// </summary>
        Task<PrintTemplateResponse> GetTemplateByIdAsync(long id);

        /// <summary>
        /// Lấy mẫu in mặc định theo loại chứng từ.
        /// </summary>
        Task<PrintTemplateResponse?> GetDefaultTemplateAsync(string documentType);

        /// <summary>
        /// Tạo mẫu in mới.
        /// </summary>
        Task<PrintTemplateResponse> CreateTemplateAsync(CreatePrintTemplateRequest request);

        /// <summary>
        /// Cập nhật mẫu in.
        /// </summary>
        Task<PrintTemplateResponse> UpdateTemplateAsync(long id, UpdatePrintTemplateRequest request);

        /// <summary>
        /// Xoá mẫu in.
        /// </summary>
        Task<bool> DeleteTemplateAsync(long id);

        /// <summary>
        /// Đặt mẫu in làm mặc định cho loại chứng từ tương ứng.
        /// </summary>
        Task<PrintTemplateResponse> SetDefaultTemplateAsync(long id);
    }
}
