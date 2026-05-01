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
    public class TransportInfoService : ITransportInfoService
    {
        private readonly IGenericRepository<TransportInfo> _transportRepository;
        private readonly IGenericRepository<GoodsDeliveryNote> _gdnRepository;
        private readonly IAuditLogService _auditLogService;

        public TransportInfoService(
            IGenericRepository<TransportInfo> transportRepository,
            IGenericRepository<GoodsDeliveryNote> gdnRepository,
            IAuditLogService auditLogService)
        {
            _transportRepository = transportRepository;
            _gdnRepository = gdnRepository;
            _auditLogService = auditLogService;
        }

        public async Task<PagedResponse<TransportInfoResponse>> GetTransportInfosAsync(FilterTransportInfoRequest request)
        {
            if (request == null) request = new FilterTransportInfoRequest();
            if (request.PageNumber <= 0) request.PageNumber = 1;
            if (request.PageSize <= 0) request.PageSize = 20;

            var all = await _transportRepository.GetAllAsync();
            var query = all.AsQueryable();

            if (request.Gdnid.HasValue && request.Gdnid.Value > 0)
            {
                query = query.Where(x => x.Gdnid == request.Gdnid.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.Keyword))
            {
                var keyword = request.Keyword.Trim();
                query = query.Where(x => 
                    (!string.IsNullOrEmpty(x.LicensePlate) && x.LicensePlate.Contains(keyword, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(x.CarrierName) && x.CarrierName.Contains(keyword, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(x.DriverName) && x.DriverName.Contains(keyword, StringComparison.OrdinalIgnoreCase)));
            }

            if (request.IsActive.HasValue)
            {
                query = query.Where(x => x.IsActive == request.IsActive.Value);
            }

            var totalItems = query.Count();
            var items = query
                .OrderByDescending(x => x.TransportId)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(x => ToResponse(x))
                .ToList();

            return new PagedResponse<TransportInfoResponse>
            {
                Page = request.PageNumber,
                PageSize = request.PageSize,
                TotalItems = totalItems,
                Items = items
            };
        }

        public async Task<TransportInfoResponse> GetTransportInfoByIdAsync(long id)
        {
            if (id <= 0) throw new ArgumentException("ID không hợp lệ.");
            var info = await _transportRepository.GetByIdAsync(id);
            if (info == null) throw new KeyNotFoundException($"Không tìm thấy thông tin vận chuyển ID={id}.");
            return ToResponse(info);
        }

        public async Task<TransportInfoResponse> GetTransportInfoByGdnIdAsync(long gdnId)
        {
            if (gdnId <= 0) throw new ArgumentException("GDN ID không hợp lệ.");
            var all = await _transportRepository.GetAllAsync();
            var info = all.FirstOrDefault(x => x.Gdnid == gdnId);
            if (info == null) throw new KeyNotFoundException($"Không tìm thấy thông tin vận chuyển cho phiếu xuất {gdnId}.");
            return ToResponse(info);
        }

        public async Task<TransportInfoResponse> CreateTransportInfoAsync(CreateTransportInfoRequest request, long currentUserId)
        {
            if (request == null) throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");
            if (currentUserId <= 0) throw new ArgumentException("User ID không hợp lệ.");

            // Check if GDN exists
            var gdn = await _gdnRepository.GetByIdAsync(request.Gdnid);
            if (gdn == null) throw new KeyNotFoundException($"Phiếu xuất ID={request.Gdnid} không tồn tại.");

            // Check if GDN already has transport info
            var allTransport = await _transportRepository.GetAllAsync();
            if (allTransport.Any(x => x.Gdnid == request.Gdnid))
                throw new InvalidOperationException($"Phiếu xuất ID={request.Gdnid} đã có thông tin vận chuyển. Vui lòng cập nhật thay vì tạo mới.");

            var info = new TransportInfo
            {
                Gdnid = request.Gdnid,
                CarrierName = request.CarrierName?.Trim(),
                DriverName = request.DriverName?.Trim(),
                DriverPhone = request.DriverPhone?.Trim(),
                LicensePlate = request.LicensePlate?.Trim(),
                Note = request.Note?.Trim(),
                IsActive = true
            };

            await _transportRepository.CreateAsync(info);

            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Create,
                AuditEntity.TransportInfo,
                info.TransportId,
                $"Tạo thông tin vận chuyển cho phiếu xuất ID={info.Gdnid}"
            );

            return ToResponse(info);
        }

        public async Task<TransportInfoResponse> UpdateTransportInfoAsync(long id, UpdateTransportInfoRequest request, long currentUserId)
        {
            if (id <= 0) throw new ArgumentException("ID không hợp lệ.");
            if (request == null) throw new ArgumentNullException(nameof(request));
            if (currentUserId <= 0) throw new ArgumentException("User ID không hợp lệ.");

            var info = await _transportRepository.GetByIdAsync(id);
            if (info == null) throw new KeyNotFoundException($"Không tìm thấy thông tin vận chuyển ID={id}.");

            var oldValues = JsonSerializer.Serialize(new { info.CarrierName, info.DriverName, info.DriverPhone, info.LicensePlate, info.Note });

            info.CarrierName = request.CarrierName?.Trim();
            info.DriverName = request.DriverName?.Trim();
            info.DriverPhone = request.DriverPhone?.Trim();
            info.LicensePlate = request.LicensePlate?.Trim();
            info.Note = request.Note?.Trim();

            await _transportRepository.UpdateAsync(info);

            var newValues = JsonSerializer.Serialize(new { info.CarrierName, info.DriverName, info.DriverPhone, info.LicensePlate, info.Note });
            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Update,
                AuditEntity.TransportInfo,
                info.TransportId,
                $"Cập nhật thông tin vận chuyển ID={id}",
                oldValues,
                newValues
            );

            return ToResponse(info);
        }

        public async Task<TransportInfoResponse> UpdateTransportActiveStatusAsync(long transportId, bool isActive, long currentUserId)
        {
            if (transportId <= 0) throw new ArgumentException("ID không hợp lệ.");
            if (currentUserId <= 0) throw new ArgumentException("User ID không hợp lệ.");

            var info = await _transportRepository.GetByIdAsync(transportId);
            if (info == null) throw new KeyNotFoundException($"Không tìm thấy thông tin vận chuyển ID={transportId}.");

            if (info.IsActive == isActive) return ToResponse(info);

            var oldStatus = info.IsActive ? "Hoạt động" : "Ngừng hoạt động";
            var newStatus = isActive ? "Hoạt động" : "Ngừng hoạt động";

            info.IsActive = isActive;
            await _transportRepository.UpdateAsync(info);

            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Update,
                AuditEntity.TransportInfo,
                info.TransportId,
                $"Thay đổi trạng thái hoạt động của thông tin vận chuyển ID={transportId} từ {oldStatus} thành {newStatus}"
            );

            return ToResponse(info);
        }

        public async Task<List<TransportHistoryResponse>> GetTransportHistoryAsync()
        {
            var all = await _transportRepository.GetAllAsync();
            if (all == null) return new List<TransportHistoryResponse>();

            // Lấy các tổ hợp CarrierName, DriverName, DriverPhone, LicensePlate duy nhất đã từng nhập
            return all
                .Where(x => !string.IsNullOrWhiteSpace(x.CarrierName))
                .GroupBy(x => new 
                { 
                    CarrierName = x.CarrierName?.Trim(), 
                    DriverName = x.DriverName?.Trim(), 
                    DriverPhone = x.DriverPhone?.Trim(), 
                    LicensePlate = x.LicensePlate?.Trim() 
                })
                .Select(g => new TransportHistoryResponse
                {
                    CarrierName = g.Key.CarrierName,
                    DriverName = g.Key.DriverName,
                    DriverPhone = g.Key.DriverPhone,
                    LicensePlate = g.Key.LicensePlate
                })
                .ToList();
        }

        private static TransportInfoResponse ToResponse(TransportInfo t) => new TransportInfoResponse
        {
            TransportId = t.TransportId,
            Gdnid = t.Gdnid,
            CarrierName = t.CarrierName,
            DriverName = t.DriverName,
            DriverPhone = t.DriverPhone,
            LicensePlate = t.LicensePlate,
            Note = t.Note,
            IsActive = t.IsActive
        };
    }
}
