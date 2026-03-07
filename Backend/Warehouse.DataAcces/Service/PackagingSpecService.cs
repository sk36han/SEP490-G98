using System;
using System.Collections.Generic;
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
    public class PackagingSpecService : IPackagingSpecService
    {
        private readonly IGenericRepository<PackagingSpec> _packagingSpecRepository;
        private readonly IGenericRepository<Item> _itemRepository;
        private readonly IAuditLogService _auditLogService;

        private static readonly Regex _specCodeRegex = new Regex(@"^[A-Za-z0-9_\-]+$", RegexOptions.Compiled);
        private static readonly Regex _specNameRegex = new Regex(@"^[\p{L}\p{N}\s\-\.\&/]+$", RegexOptions.Compiled);

        public PackagingSpecService(
            IGenericRepository<PackagingSpec> packagingSpecRepository,
            IGenericRepository<Item> itemRepository,
            IAuditLogService auditLogService)
        {
            _packagingSpecRepository = packagingSpecRepository;
            _itemRepository = itemRepository;
            _auditLogService = auditLogService;
        }

        // =====================================================================
        // CREATE
        // =====================================================================
        public async Task<PackagingSpecResponse> CreatePackagingSpecAsync(CreatePackagingSpecRequest request, long currentUserId)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

            ValidateUserId(currentUserId);
            ValidateSpecCode(request.SpecCode);
            ValidateSpecName(request.SpecName);

            var specCode = request.SpecCode.Trim();
            var specName = request.SpecName.Trim();

            var all = await _packagingSpecRepository.GetAllAsync();
            if (all.Any(s => s.SpecCode.Trim().Equals(specCode, StringComparison.OrdinalIgnoreCase)))
                throw new InvalidOperationException($"Mã quy cách đóng gói '{specCode}' đã tồn tại.");

            if (all.Any(s => s.SpecName.Trim().Equals(specName, StringComparison.OrdinalIgnoreCase)))
                throw new InvalidOperationException($"Tên quy cách đóng gói '{specName}' đã tồn tại.");

            var spec = new PackagingSpec
            {
                SpecCode = specCode,
                SpecName = specName,
                Description = request.Description?.Trim(),
                IsActive = true
            };

            await _packagingSpecRepository.CreateAsync(spec);

            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Create,
                AuditEntity.PackagingSpec,
                spec.PackagingSpecId,
                $"Tạo quy cách đóng gói '{spec.SpecName}' (mã: {spec.SpecCode})"
            );

            return ToResponse(spec);
        }

        // =====================================================================
        // GET ALL
        // =====================================================================
        public async Task<IEnumerable<PackagingSpecResponse>> GetAllPackagingSpecsAsync()
        {
            var all = await _packagingSpecRepository.GetAllAsync();
            return all.Select(ToResponse).ToList();
        }

        // =====================================================================
        // GET BY ID
        // =====================================================================
        public async Task<PackagingSpecResponse> GetPackagingSpecByIdAsync(long specId)
        {
            ValidateSpecId(specId);

            var spec = await _packagingSpecRepository.GetByIdAsync(specId);
            if (spec == null)
                throw new KeyNotFoundException($"Không tìm thấy quy cách đóng gói với ID = {specId}.");

            return ToResponse(spec);
        }

        // =====================================================================
        // UPDATE
        // =====================================================================
        public async Task<PackagingSpecResponse> UpdatePackagingSpecAsync(long specId, UpdatePackagingSpecRequest request, long currentUserId)
        {
            ValidateSpecId(specId);

            if (request == null)
                throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

            ValidateUserId(currentUserId);
            ValidateSpecName(request.SpecName);

            var specName = request.SpecName.Trim();

            var all = await _packagingSpecRepository.GetAllAsync();
            var spec = all.FirstOrDefault(s => s.PackagingSpecId == specId);
            if (spec == null)
                throw new KeyNotFoundException($"Không tìm thấy quy cách đóng gói với ID = {specId}.");

            var oldValues = JsonSerializer.Serialize(new
            {
                spec.SpecName,
                spec.Description,
                spec.IsActive
            });

            if (all.Any(s => s.PackagingSpecId != specId && s.SpecName.Trim().Equals(specName, StringComparison.OrdinalIgnoreCase)))
                throw new InvalidOperationException($"Tên quy cách đóng gói '{specName}' đã tồn tại.");

            spec.SpecName = specName;
            spec.Description = request.Description?.Trim();
            spec.IsActive = request.IsActive;

            await _packagingSpecRepository.UpdateAsync(spec);

            var newValues = JsonSerializer.Serialize(new
            {
                spec.SpecName,
                spec.Description,
                spec.IsActive
            });

            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Update,
                AuditEntity.PackagingSpec,
                spec.PackagingSpecId,
                $"Cập nhật quy cách đóng gói '{spec.SpecName}' (mã: {spec.SpecCode})",
                oldValues,
                newValues
            );

            return ToResponse(spec);
        }

        // =====================================================================
        // TOGGLE STATUS
        // =====================================================================
        public async Task<PackagingSpecResponse> TogglePackagingSpecStatusAsync(long specId, bool isActive, long currentUserId)
        {
            ValidateSpecId(specId);
            ValidateUserId(currentUserId);

            var spec = await _packagingSpecRepository.GetByIdAsync(specId);
            if (spec == null)
                throw new KeyNotFoundException($"Không tìm thấy quy cách đóng gói với ID = {specId}.");

            if (spec.IsActive == isActive)
            {
                var statusText = isActive ? "đang hoạt động" : "đã bị vô hiệu hóa";
                throw new InvalidOperationException($"Quy cách đóng gói '{spec.SpecName}' hiện tại {statusText}. Không cần thay đổi.");
            }

            spec.IsActive = isActive;
            await _packagingSpecRepository.UpdateAsync(spec);

            var statusLabel = isActive ? "kích hoạt" : "vô hiệu hóa";
            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Update,
                AuditEntity.PackagingSpec,
                spec.PackagingSpecId,
                $"Đã {statusLabel} quy cách đóng gói '{spec.SpecName}' (mã: {spec.SpecCode})"
            );

            return ToResponse(spec);
        }

       

        // =====================================================================
        // PRIVATE VALIDATORS
        // =====================================================================
        private static void ValidateSpecId(long id)
        {
            if (id <= 0)
                throw new ArgumentException("ID quy cách đóng gói phải là số nguyên dương.");
        }

        private static void ValidateUserId(long userId)
        {
            if (userId <= 0)
                throw new ArgumentException("ID người dùng không hợp lệ.");
        }

        private static void ValidateSpecCode(string? code)
        {
            if (string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("Mã quy cách đóng gói không được để trống.");

            var trimmed = code.Trim();
            if (trimmed.Length < 2)
                throw new ArgumentException("Mã quy cách đóng gói phải có ít nhất 2 ký tự.");
            if (trimmed.Length > 50)
                throw new ArgumentException("Mã quy cách đóng gói không được vượt quá 50 ký tự.");

            if (!_specCodeRegex.IsMatch(trimmed))
                throw new ArgumentException("Mã quy cách đóng gói chỉ được chứa chữ cái, chữ số, dấu gạch dưới (_) và dấu gạch ngang (-).");
        }

        private static void ValidateSpecName(string? name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Tên quy cách đóng gói không được để trống.");

            var trimmed = name.Trim();
            if (trimmed.Length < 2)
                throw new ArgumentException("Tên quy cách đóng gói phải có ít nhất 2 ký tự.");
            if (trimmed.Length > 255)
                throw new ArgumentException("Tên quy cách đóng gói không được vượt quá 255 ký tự.");

            if (!_specNameRegex.IsMatch(trimmed))
                throw new ArgumentException("Tên quy cách đóng gói chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.), ký tự & và /.");
        }

        // =====================================================================
        // HELPER
        // =====================================================================
        private static PackagingSpecResponse ToResponse(PackagingSpec s) => new PackagingSpecResponse
        {
            PackagingSpecId = s.PackagingSpecId,
            SpecCode = s.SpecCode,
            SpecName = s.SpecName,
            Description = s.Description,
            IsActive = s.IsActive
        };
    }
}
