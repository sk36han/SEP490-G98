using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service
{
    public class PrintTemplateService : GenericRepository<PrintTemplate>, IPrintTemplateService
    {
        private readonly ILogger<PrintTemplateService> _logger;

        // Các loại chứng từ hợp lệ
        private static readonly HashSet<string> ValidDocumentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "GRN",  // Phiếu nhập kho (Goods Receipt Note)
            "GDN"   // Phiếu xuất kho (Goods Delivery Note)
        };

        public PrintTemplateService(
            Mkiwms5Context context,
            ILogger<PrintTemplateService> logger) : base(context)
        {
            _logger = logger;
        }

        // =====================================================================
        // LẤY TẤT CẢ (có thể lọc theo DocumentType)
        // =====================================================================
        public async Task<List<PrintTemplateResponse>> GetAllTemplatesAsync(string? documentType = null)
        {
            _logger.LogInformation("[PrintTemplateService] Lấy danh sách mẫu in. DocumentType={DocumentType}", documentType);

            var query = _context.PrintTemplates.AsQueryable();

            if (!string.IsNullOrWhiteSpace(documentType))
            {
                var dt = documentType.Trim().ToUpperInvariant();
                query = query.Where(t => t.DocumentType == dt);
            }

            var templates = await query
                .OrderBy(t => t.DocumentType)
                .ThenByDescending(t => t.IsDefault)
                .ThenBy(t => t.TemplateName)
                .ToListAsync();

            _logger.LogInformation("[PrintTemplateService] Tìm thấy {Count} mẫu in", templates.Count);
            return templates.Select(ToResponse).ToList();
        }

        // =====================================================================
        // LẤY THEO ID
        // =====================================================================
        public async Task<PrintTemplateResponse> GetTemplateByIdAsync(long id)
        {
            _logger.LogInformation("[PrintTemplateService] Lấy mẫu in theo ID={Id}", id);

            if (id <= 0)
                throw new ArgumentException("ID mẫu in phải là số nguyên dương.");

            var template = await GetByIdAsync(id);
            if (template == null)
                throw new KeyNotFoundException($"Không tìm thấy mẫu in với ID = {id}.");

            return ToResponse(template);
        }

        // =====================================================================
        // LẤY MẪU MẶC ĐỊNH THEO LOẠI CHỨNG TỪ
        // =====================================================================
        public async Task<PrintTemplateResponse?> GetDefaultTemplateAsync(string documentType)
        {
            _logger.LogInformation("[PrintTemplateService] Lấy mẫu in mặc định cho DocumentType={DocumentType}", documentType);

            if (string.IsNullOrWhiteSpace(documentType))
                throw new ArgumentException("Loại chứng từ không được để trống.");

            var dt = documentType.Trim().ToUpperInvariant();

            var template = await _context.PrintTemplates
                .Where(t => t.DocumentType == dt && t.IsDefault)
                .FirstOrDefaultAsync();

            if (template == null)
            {
                _logger.LogWarning("[PrintTemplateService] Không tìm thấy mẫu in mặc định cho DocumentType={DocumentType}", dt);
                return null;
            }

            return ToResponse(template);
        }

        // =====================================================================
        // TẠO MỚI
        // =====================================================================
        public async Task<PrintTemplateResponse> CreateTemplateAsync(CreatePrintTemplateRequest request)
        {
            _logger.LogInformation("[PrintTemplateService] Bắt đầu tạo mẫu in mới.");

            // 1️⃣ Validate
            ValidateCreateRequest(request);

            var dt = request.DocumentType.Trim().ToUpperInvariant();
            var trimmedName = request.TemplateName.Trim();

            // 2️⃣ Kiểm tra trùng tên trong cùng DocumentType
            var duplicateName = await _context.PrintTemplates
                .AnyAsync(t => t.DocumentType == dt
                            && t.TemplateName == trimmedName);
            if (duplicateName)
                throw new InvalidOperationException(
                    $"Mẫu in '{trimmedName}' đã tồn tại cho loại chứng từ '{dt}'.");

            // 3️⃣ Chuẩn bị entity
            var template = new PrintTemplate
            {
                DocumentType = dt,
                TemplateName = trimmedName,
                HtmlBody = request.HtmlBody,
                PaperSize = request.PaperSize?.Trim(),
                IsDefault = request.IsDefault,
                CreatedAt = DateTime.UtcNow
            };

            // 4️⃣ Nếu là mẫu mặc định, bỏ mặc định các mẫu khác cùng DocumentType
            if (template.IsDefault)
            {
                await ClearDefaultForDocumentType(dt);
            }

            // 5️⃣ Nếu là mẫu đầu tiên cho DocumentType, tự set làm mặc định
            var existsAny = await _context.PrintTemplates.AnyAsync(t => t.DocumentType == dt);
            if (!existsAny)
            {
                template.IsDefault = true;
            }

            // 6️⃣ Lưu
            await CreateAsync(template);

            _logger.LogInformation("[PrintTemplateService] Tạo mẫu in thành công: ID={Id}, Name={Name}",
                template.PrintTemplateId, template.TemplateName);

            return ToResponse(template);
        }

        // =====================================================================
        // CẬP NHẬT
        // =====================================================================
        public async Task<PrintTemplateResponse> UpdateTemplateAsync(long id, UpdatePrintTemplateRequest request)
        {
            _logger.LogInformation("[PrintTemplateService] Bắt đầu cập nhật mẫu in ID={Id}", id);

            if (id <= 0)
                throw new ArgumentException("ID mẫu in phải là số nguyên dương.");

            // 1️⃣ Validate
            ValidateUpdateRequest(request);

            // 2️⃣ Kiểm tra tồn tại
            var existing = await GetByIdAsync(id);
            if (existing == null)
                throw new KeyNotFoundException($"Không tìm thấy mẫu in với ID = {id}.");

            var dt = request.DocumentType.Trim().ToUpperInvariant();
            var trimmedName = request.TemplateName.Trim();

            // 3️⃣ Kiểm tra trùng tên với mẫu khác trong cùng DocumentType
            var duplicateName = await _context.PrintTemplates
                .AnyAsync(t => t.DocumentType == dt
                            && t.TemplateName == trimmedName
                            && t.PrintTemplateId != id);
            if (duplicateName)
                throw new InvalidOperationException(
                    $"Mẫu in '{trimmedName}' đã tồn tại cho loại chứng từ '{dt}'.");

            // 4️⃣ Nếu set mặc định, bỏ mặc định các mẫu khác
            if (request.IsDefault && !existing.IsDefault)
            {
                await ClearDefaultForDocumentType(dt);
            }

            // 5️⃣ Cập nhật các trường
            existing.DocumentType = dt;
            existing.TemplateName = trimmedName;
            existing.HtmlBody = request.HtmlBody;
            existing.PaperSize = request.PaperSize?.Trim();
            existing.IsDefault = request.IsDefault;

            // 6️⃣ Lưu
            await UpdateAsync(existing);

            _logger.LogInformation("[PrintTemplateService] Cập nhật mẫu in thành công: ID={Id}, Name={Name}", id, existing.TemplateName);

            return ToResponse(existing);
        }

        // =====================================================================
        // XOÁ
        // =====================================================================
        public async Task<bool> DeleteTemplateAsync(long id)
        {
            _logger.LogInformation("[PrintTemplateService] Bắt đầu xoá mẫu in ID={Id}", id);

            if (id <= 0)
                throw new ArgumentException("ID mẫu in phải là số nguyên dương.");

            var template = await GetByIdAsync(id);
            if (template == null)
                throw new KeyNotFoundException($"Không tìm thấy mẫu in với ID = {id}.");

            // Không cho xoá mẫu mặc định nếu vẫn còn là mẫu mặc định
            if (template.IsDefault)
                throw new InvalidOperationException(
                    "Không thể xoá mẫu in mặc định. Hãy đặt mẫu khác làm mặc định trước.");

            var result = await DeleteAsync(id);

            _logger.LogInformation("[PrintTemplateService] Xoá mẫu in thành công: ID={Id}", id);
            return result;
        }

        // =====================================================================
        // ĐẶT LÀM MẬU MẶC ĐỊNH
        // =====================================================================
        public async Task<PrintTemplateResponse> SetDefaultTemplateAsync(long id)
        {
            _logger.LogInformation("[PrintTemplateService] Đặt mẫu in mặc định: ID={Id}", id);

            if (id <= 0)
                throw new ArgumentException("ID mẫu in phải là số nguyên dương.");

            var template = await GetByIdAsync(id);
            if (template == null)
                throw new KeyNotFoundException($"Không tìm thấy mẫu in với ID = {id}.");

            if (template.IsDefault)
            {
                _logger.LogInformation("[PrintTemplateService] Mẫu in ID={Id} đã là mẫu mặc định, bỏ qua.", id);
                return ToResponse(template);
            }

            // Bỏ mặc định tất cả mẫu cùng DocumentType
            await ClearDefaultForDocumentType(template.DocumentType);

            // Set mặc định cho mẫu này
            template.IsDefault = true;
            await UpdateAsync(template);

            _logger.LogInformation("[PrintTemplateService] Đặt mẫu in mặc định thành công: ID={Id}, DocumentType={DocumentType}",
                id, template.DocumentType);

            return ToResponse(template);
        }

        // =====================================================================
        // PRIVATE HELPERS
        // =====================================================================

        /// <summary>
        /// Bỏ cờ IsDefault cho tất cả mẫu in cùng DocumentType.
        /// </summary>
        private async Task ClearDefaultForDocumentType(string documentType)
        {
            var currentDefaults = await _context.PrintTemplates
                .Where(t => t.DocumentType == documentType && t.IsDefault)
                .ToListAsync();

            foreach (var t in currentDefaults)
            {
                t.IsDefault = false;
            }

            if (currentDefaults.Any())
            {
                await _context.SaveChangesAsync();
                _logger.LogDebug("[PrintTemplateService] Đã bỏ mặc định cho {Count} mẫu in của DocumentType={DocumentType}",
                    currentDefaults.Count, documentType);
            }
        }

        private static void ValidateCreateRequest(CreatePrintTemplateRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            ValidateCommon(request.DocumentType, request.TemplateName, request.HtmlBody);
        }

        private static void ValidateUpdateRequest(UpdatePrintTemplateRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            ValidateCommon(request.DocumentType, request.TemplateName, request.HtmlBody);
        }

        private static void ValidateCommon(string documentType, string templateName, string htmlBody)
        {
            if (string.IsNullOrWhiteSpace(documentType))
                throw new ArgumentException("Loại chứng từ (DocumentType) không được để trống.");

            var dt = documentType.Trim().ToUpperInvariant();
            if (!ValidDocumentTypes.Contains(dt))
                throw new ArgumentException(
                    $"Loại chứng từ '{dt}' không hợp lệ. Các giá trị hợp lệ: {string.Join(", ", ValidDocumentTypes)}.");

            if (string.IsNullOrWhiteSpace(templateName))
                throw new ArgumentException("Tên mẫu in không được để trống.");

            if (templateName.Trim().Length > 200)
                throw new ArgumentException("Tên mẫu in không được vượt quá 200 ký tự.");

            if (string.IsNullOrWhiteSpace(htmlBody))
                throw new ArgumentException("Nội dung HTML (HtmlBody) không được để trống.");
        }

        private static PrintTemplateResponse ToResponse(PrintTemplate entity)
        {
            return new PrintTemplateResponse
            {
                PrintTemplateId = entity.PrintTemplateId,
                DocumentType = entity.DocumentType,
                TemplateName = entity.TemplateName,
                IsDefault = entity.IsDefault,
                HtmlBody = entity.HtmlBody,
                PaperSize = entity.PaperSize,
                CreatedAt = entity.CreatedAt
            };
        }
    }
}
