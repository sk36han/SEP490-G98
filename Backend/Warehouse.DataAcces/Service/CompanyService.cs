using System;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service
{
    public class CompanyService : ICompanyService
    {
        private readonly IGenericRepository<Company> _companyRepository;
        private readonly IAuditLogService _auditLogService;

        // Chỉ cho phép chữ cái (unicode), chữ số, khoảng trắng, gạch ngang, dấu chấm, & và /
        private static readonly Regex _companyNameRegex =
            new Regex(@"^[\p{L}\p{N}\s\-\.\&/]+$", RegexOptions.Compiled);

        // Chỉ cho phép chữ cái, chữ số, gạch dưới và gạch ngang
        private static readonly Regex _companyCodeRegex =
            new Regex(@"^[A-Za-z0-9_\-]+$", RegexOptions.Compiled);

        public CompanyService(
            IGenericRepository<Company> companyRepository,
            IAuditLogService auditLogService)
        {
            _companyRepository = companyRepository;
            _auditLogService = auditLogService;
        }

        // =====================================================================
        // CREATE
        // =====================================================================
        public async Task<CompanyResponse> CreateCompanyAsync(CreateCompanyRequest request, long currentUserId)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

            ValidateUserId(currentUserId);
            ValidateCompanyCode(request.CompanyCode);
            ValidateCompanyName(request.CompanyName);

            var companyCode = request.CompanyCode.Trim();
            var companyName = request.CompanyName.Trim();

            var all = await _companyRepository.GetAllAsync();
            if (all.Any(c => c.CompanyCode.Trim().Equals(companyCode, StringComparison.OrdinalIgnoreCase)))
                throw new InvalidOperationException($"Mã công ty '{companyCode}' đã tồn tại.");

            if (all.Any(c => c.CompanyName.Trim().Equals(companyName, StringComparison.OrdinalIgnoreCase)))
                throw new InvalidOperationException($"Tên công ty '{companyName}' đã tồn tại.");

            var company = new Company
            {
                CompanyCode = companyCode,
                CompanyName = companyName,
                IsActive = true
            };

            await _companyRepository.CreateAsync(company);

            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Create,
                AuditEntity.Company,
                company.CompanyId,
                $"Tạo công ty '{company.CompanyName}' (mã: {company.CompanyCode})"
            );

            return ToResponse(company);
        }

        // =====================================================================
        // GET ALL (paged + filter)
        // =====================================================================
        public async Task<PagedResponse<CompanyResponse>> GetCompaniesAsync(
            int page,
            int pageSize,
            string? companyName,
            bool? isActive)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;
            else if (pageSize > 100)
                throw new ArgumentException("Số lượng item mỗi trang không được vượt quá 100.");

            if (companyName != null && companyName.Trim().Length > 255)
                throw new ArgumentException("Từ khoá tìm kiếm không được vượt quá 255 ký tự.");

            var all = await _companyRepository.GetAllAsync();
            var query = all.AsQueryable();

            if (!string.IsNullOrWhiteSpace(companyName))
            {
                var keyword = companyName.Trim();
                query = query.Where(c =>
                    c.CompanyName.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                    c.CompanyCode.Contains(keyword, StringComparison.OrdinalIgnoreCase));
            }

            if (isActive.HasValue)
                query = query.Where(c => c.IsActive == isActive.Value);

            var totalItems = query.Count();

            var items = query
                .OrderBy(c => c.CompanyCode)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => ToResponse(c))
                .ToList();

            return new PagedResponse<CompanyResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = items
            };
        }

        // =====================================================================
        // GET BY ID
        // =====================================================================
        public async Task<CompanyResponse> GetCompanyByIdAsync(long id)
        {
            ValidateCompanyId(id);

            var all = await _companyRepository.GetAllAsync();
            var company = all.FirstOrDefault(c => c.CompanyId == id);
            if (company == null)
                throw new KeyNotFoundException($"Không tìm thấy công ty với ID = {id}.");

            return ToResponse(company);
        }

        // =====================================================================
        // UPDATE
        // =====================================================================
        public async Task<CompanyResponse> UpdateCompanyAsync(long id, UpdateCompanyRequest request, long currentUserId)
        {
            ValidateCompanyId(id);

            if (request == null)
                throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

            var all = await _companyRepository.GetAllAsync();
            var company = all.FirstOrDefault(c => c.CompanyId == id);
            if (company == null)
                throw new KeyNotFoundException($"Không tìm thấy công ty với ID = {id}.");

            var oldValues = JsonSerializer.Serialize(new
            {
                company.CompanyCode,
                company.CompanyName,
                company.IsActive
            });

            var companyCode = (request.CompanyCode ?? "").Trim();
            var companyName = (request.CompanyName ?? "").Trim();

            if (all.Any(c => c.CompanyId != id && (c.CompanyCode ?? "").Trim().Equals(companyCode, StringComparison.OrdinalIgnoreCase)))
                throw new InvalidOperationException($"Mã công ty '{companyCode}' đã tồn tại.");

            if (all.Any(c => c.CompanyId != id && (c.CompanyName ?? "").Trim().Equals(companyName, StringComparison.OrdinalIgnoreCase)))
                throw new InvalidOperationException($"Tên công ty '{companyName}' đã tồn tại.");

            ValidateUserId(currentUserId);
            ValidateCompanyCode(request.CompanyCode);
            ValidateCompanyName(request.CompanyName);

            company.CompanyCode = companyCode;
            company.CompanyName = companyName;
            company.IsActive = request.IsActive;

            await _companyRepository.UpdateAsync(company);

            var newValues = JsonSerializer.Serialize(new
            {
                company.CompanyCode,
                company.CompanyName,
                company.IsActive
            });

            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Update,
                AuditEntity.Company,
                company.CompanyId,
                $"Cập nhật công ty '{company.CompanyName}' (mã: {company.CompanyCode})",
                oldValues,
                newValues
            );

            return ToResponse(company);
        }

        // =====================================================================
        // TOGGLE STATUS
        // =====================================================================
        public async Task<CompanyResponse> ToggleCompanyStatusAsync(long id, bool isActive, long currentUserId)
        {
            ValidateCompanyId(id);
            ValidateUserId(currentUserId);

            var all = await _companyRepository.GetAllAsync();
            var company = all.FirstOrDefault(c => c.CompanyId == id);
            if (company == null)
                throw new KeyNotFoundException($"Không tìm thấy công ty với ID = {id}.");

            if (company.IsActive == isActive)
            {
                var statusText = isActive ? "đang hoạt động" : "đã bị vô hiệu hóa";
                throw new InvalidOperationException(
                    $"Công ty '{company.CompanyName}' hiện tại {statusText}. Không cần thay đổi.");
            }

            company.IsActive = isActive;

            await _companyRepository.UpdateAsync(company);

            var statusLabel = isActive ? "kích hoạt" : "vô hiệu hóa";
            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Update,
                AuditEntity.Company,
                company.CompanyId,
                $"Đã {statusLabel} công ty '{company.CompanyName}' (mã: {company.CompanyCode})"
            );

            return ToResponse(company);
        }

        // =====================================================================
        // PRIVATE VALIDATORS
        // =====================================================================
        private static void ValidateCompanyId(long id)
        {
            if (id <= 0)
                throw new ArgumentException("ID công ty phải là số nguyên dương.");
        }

        private static void ValidateUserId(long userId)
        {
            if (userId <= 0)
                throw new ArgumentException("ID người dùng không hợp lệ.");
        }

        private static void ValidateCompanyCode(string? companyCode)
        {
            if (string.IsNullOrWhiteSpace(companyCode))
                throw new ArgumentException("Mã công ty không được để trống.");

            var trimmed = companyCode.Trim();
            if (trimmed.Length < 2)
                throw new ArgumentException("Mã công ty phải có ít nhất 2 ký tự.");
            if (trimmed.Length > 50)
                throw new ArgumentException("Mã công ty không được vượt quá 50 ký tự.");

            if (!_companyCodeRegex.IsMatch(trimmed))
                throw new ArgumentException(
                    "Mã công ty chỉ được chứa chữ cái, chữ số, dấu gạch dưới (_) và dấu gạch ngang (-).");
        }

        private static void ValidateCompanyName(string? companyName)
        {
            if (string.IsNullOrWhiteSpace(companyName))
                throw new ArgumentException("Tên công ty không được để trống.");

            var trimmed = companyName.Trim();
            if (trimmed.Length < 2)
                throw new ArgumentException("Tên công ty phải có ít nhất 2 ký tự.");
            if (trimmed.Length > 255)
                throw new ArgumentException("Tên công ty không được vượt quá 255 ký tự.");

            if (!_companyNameRegex.IsMatch(trimmed))
                throw new ArgumentException(
                    "Tên công ty chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.), ký tự & và /.");
        }

        // =====================================================================
        // HELPER
        // =====================================================================
        private static CompanyResponse ToResponse(Company c) => new CompanyResponse
        {
            CompanyId = c.CompanyId,
            CompanyCode = c.CompanyCode,
            CompanyName = c.CompanyName,
            IsActive = c.IsActive,
            CreatedAt = c.CreatedAt
        };
    }
}
