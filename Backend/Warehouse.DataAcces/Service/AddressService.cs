using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service
{
    public class AddressService : IAddressService
    {
        private readonly IGenericRepository<Address> _addressRepository;
        private readonly IGenericRepository<Company> _companyRepository;
        private readonly IAuditLogService _auditLogService;

        public AddressService(
            IGenericRepository<Address> addressRepository,
            IGenericRepository<Company> companyRepository,
            IAuditLogService auditLogService)
        {
            _addressRepository = addressRepository;
            _companyRepository = companyRepository;
            _auditLogService = auditLogService;
        }

        // =====================================================================
        // CREATE
        // =====================================================================
        public async Task<AddressResponse> CreateAddressAsync(CreateAddressRequest request, long currentUserId)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

            ValidateUserId(currentUserId);
            ValidateAddressDetails(request.AddressDetail);

            var companies = await _companyRepository.GetAllAsync();
            var company = companies.FirstOrDefault(c => c.CompanyId == request.CompanyId);
            if (company == null)
                throw new KeyNotFoundException($"Không tìm thấy công ty với ID = {request.CompanyId}.");

            if (!company.IsActive)
                throw new InvalidOperationException("Không thể thêm địa chỉ cho công ty đã bị vô hiệu hóa.");

            // Handle IsDefault logic
            var allAddresses = await _addressRepository.GetAllAsync();
            var companyAddresses = allAddresses.Where(a => a.CompanyId == request.CompanyId).ToList();

            if (request.IsDefault)
            {
                var currentDefault = companyAddresses.FirstOrDefault(a => a.IsDefault);
                if (currentDefault != null)
                {
                    currentDefault.IsDefault = false;
                    await _addressRepository.UpdateAsync(currentDefault);
                }
            }
            else if (!companyAddresses.Any())
            {
                // If it's the first address, force it to be default
                request.IsDefault = true;
            }

            var address = new Address
            {
                CompanyId = request.CompanyId,
                AddressName = (request.AddressName ?? "").Trim(),
                AddressDetail = request.AddressDetail.Trim(),
                District = (request.District ?? "").Trim(),
                City = (request.City ?? "").Trim(),
                Ward = (request.Ward ?? "").Trim(),
                IsDefault = request.IsDefault,
                IsActive = true
            };

            await _addressRepository.CreateAsync(address);

            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Create,
                AuditEntity.Address,
                address.AddressId,
                $"Thêm địa chỉ mới '{address.AddressName}' cho công ty ID = {address.CompanyId}"
            );

            return ToResponse(address);
        }

        // =====================================================================
        // GET ALL (paged + filter)
        // =====================================================================
        public async Task<PagedResponse<AddressResponse>> GetAddressesAsync(
            int page,
            int pageSize,
            long? companyId,
            string? keyword,
            bool? isActive)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;
            else if (pageSize > 100)
                throw new ArgumentException("Số lượng item mỗi trang không được vượt quá 100.");

            if (keyword != null && keyword.Trim().Length > 255)
                throw new ArgumentException("Từ khoá tìm kiếm không được vượt quá 255 ký tự.");

            var all = await _addressRepository.GetAllAsync();
            var query = all.AsQueryable();

            if (companyId.HasValue && companyId.Value > 0)
            {
                query = query.Where(a => a.CompanyId == companyId.Value);
            }

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim();
                query = query.Where(a =>
                    (a.AddressName != null && a.AddressName.Contains(kw, StringComparison.OrdinalIgnoreCase)) ||
                    a.AddressDetail.Contains(kw, StringComparison.OrdinalIgnoreCase));
            }

            if (isActive.HasValue)
                query = query.Where(a => a.IsActive == isActive.Value);

            var totalItems = query.Count();

            var items = query
                .OrderByDescending(a => a.IsDefault) // Default addresses first
                .ThenBy(a => a.AddressId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => ToResponse(a))
                .ToList();

            return new PagedResponse<AddressResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = items
            };
        }

        // =====================================================================
        // GET BY COMPANY (LOOKUP)
        // =====================================================================
        public async Task<List<AddressResponse>> GetAddressesByCompanyAsync(long companyId)
        {
            var all = await _addressRepository.GetAllAsync();
            var addresses = all
                .Where(a => a.CompanyId == companyId && a.IsActive)
                .Select(a => ToResponse(a))
                .ToList();

            return addresses;
        }

        // =====================================================================
        // GET BY ID
        // =====================================================================
        public async Task<AddressResponse> GetAddressByIdAsync(long id)
        {
            ValidateAddressId(id);

            var all = await _addressRepository.GetAllAsync();
            var address = all.FirstOrDefault(a => a.AddressId == id);
            if (address == null)
                throw new KeyNotFoundException($"Không tìm thấy địa chỉ với ID = {id}.");

            return ToResponse(address);
        }

        // =====================================================================
        // UPDATE
        // =====================================================================
        public async Task<AddressResponse> UpdateAddressAsync(long id, UpdateAddressRequest request, long currentUserId)
        {
            ValidateAddressId(id);

            if (request == null)
                throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

            var allAddresses = await _addressRepository.GetAllAsync();
            var address = allAddresses.FirstOrDefault(a => a.AddressId == id);
            if (address == null)
                throw new KeyNotFoundException($"Không tìm thấy địa chỉ với ID = {id}.");

            ValidateUserId(currentUserId);
            ValidateAddressDetails(request.AddressDetail);

            var oldValues = JsonSerializer.Serialize(new
            {
                address.AddressName,
                address.AddressDetail,
                address.District,
                address.City,
                address.Ward,
                address.IsDefault,
                address.IsActive
            });

            // Handle IsDefault logic
            if (request.IsDefault && !address.IsDefault)
            {
                var companyAddresses = allAddresses.Where(a => a.CompanyId == address.CompanyId && a.AddressId != id).ToList();
                var currentDefault = companyAddresses.FirstOrDefault(a => a.IsDefault);
                if (currentDefault != null)
                {
                    currentDefault.IsDefault = false;
                    await _addressRepository.UpdateAsync(currentDefault);
                }
            }
            else if (!request.IsDefault && address.IsDefault)
            {
                // Prevent un-defaulting if it's the only active address, maybe? Or just allow it.
                // We will allow it but the user has to manually set another default later.
            }

            address.AddressName = (request.AddressName ?? "").Trim();
            address.AddressDetail = request.AddressDetail.Trim();
            address.District = (request.District ?? "").Trim();
            address.City = (request.City ?? "").Trim();
            address.Ward = (request.Ward ?? "").Trim();
            address.IsDefault = request.IsDefault;
            address.IsActive = request.IsActive;

            await _addressRepository.UpdateAsync(address);

            var newValues = JsonSerializer.Serialize(new
            {
                address.AddressName,
                address.AddressDetail,
                address.District,
                address.City,
                address.Ward,
                address.IsDefault,
                address.IsActive
            });

            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Update,
                AuditEntity.Address,
                address.AddressId,
                $"Cập nhật địa chỉ '{address.AddressName}' (ID: {address.AddressId})",
                oldValues,
                newValues
            );

            return ToResponse(address);
        }

        // =====================================================================
        // TOGGLE STATUS
        // =====================================================================
        public async Task<AddressResponse> ToggleAddressStatusAsync(long id, bool isActive, long currentUserId)
        {
            ValidateAddressId(id);
            ValidateUserId(currentUserId);

            var all = await _addressRepository.GetAllAsync();
            var address = all.FirstOrDefault(a => a.AddressId == id);
            if (address == null)
                throw new KeyNotFoundException($"Không tìm thấy địa chỉ với ID = {id}.");

            if (address.IsActive == isActive)
            {
                var statusText = isActive ? "đang hoạt động" : "đã bị vô hiệu hóa";
                throw new InvalidOperationException(
                    $"Địa chỉ '{address.AddressName ?? address.AddressDetail}' hiện tại {statusText}. Không cần thay đổi.");
            }

            // Optional: If address is default and is being deactivated, we might need warning. 
            // Here we just allow it.

            address.IsActive = isActive;

            await _addressRepository.UpdateAsync(address);

            var statusLabel = isActive ? "kích hoạt" : "vô hiệu hóa";
            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Update,
                AuditEntity.Address,
                address.AddressId,
                $"Đã {statusLabel} địa chỉ '{address.AddressName ?? address.AddressDetail}' (ID: {address.AddressId})"
            );

            return ToResponse(address);
        }

        // =====================================================================
        // PRIVATE VALIDATORS
        // =====================================================================
        private static void ValidateAddressId(long id)
        {
            if (id <= 0)
                throw new ArgumentException("ID địa chỉ phải là số nguyên dương.");
        }

        private static void ValidateUserId(long userId)
        {
            if (userId <= 0)
                throw new ArgumentException("ID người dùng không hợp lệ.");
        }

        private static void ValidateAddressDetails(string? addressDetail)
        {
            if (string.IsNullOrWhiteSpace(addressDetail))
                throw new ArgumentException("Chi tiết địa chỉ không được để trống.");

            if (addressDetail.Trim().Length > 500)
                throw new ArgumentException("Chi tiết địa chỉ không được vượt quá 500 ký tự.");
        }

        // =====================================================================
        // HELPER
        // =====================================================================
        private static AddressResponse ToResponse(Address a) => new AddressResponse
        {
            AddressId = a.AddressId,
            CompanyId = a.CompanyId,
            AddressName = a.AddressName,
            AddressDetail = a.AddressDetail,
            District = a.District,
            City = a.City,
            Ward = a.Ward,
            IsDefault = a.IsDefault,
            IsActive = a.IsActive
        };
    }
}
