using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.DataAcces.Service
{
    public class ReceiverService : IReceiverService
    {
        private readonly IGenericRepository<Receiver> _receiverRepository;

        public ReceiverService(IGenericRepository<Receiver> receiverRepository)
        {
            _receiverRepository = receiverRepository;
        }

        public async Task<ReceiverResponse> CreateReceiverAsync(CreateReceiverRequest request)
        {
            // 1. Check duplicate ReceiverCode
            var receivers = await _receiverRepository.GetAllAsync();
            if (receivers.Any(r => r.ReceiverCode == request.ReceiverCode))
            {
                throw new InvalidOperationException("Mã người nhận đã tồn tại");
            }

            // 2. Create entity
            var receiver = new Receiver
            {
                ReceiverCode = request.ReceiverCode,
                ReceiverName = request.ReceiverName,
                Phone = request.Phone,
                Email = request.Email,
                Address = request.Address,
                Notes = request.Notes,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            // 3. Save
            await _receiverRepository.CreateAsync(receiver);

            // 4. Return response
            return new ReceiverResponse
            {
                ReceiverId = receiver.ReceiverId,
                ReceiverCode = receiver.ReceiverCode,
                ReceiverName = receiver.ReceiverName,
                Phone = receiver.Phone,
                Email = receiver.Email,
                Address = receiver.Address,
                Notes = receiver.Notes,
                IsActive = receiver.IsActive
            };
        }

        public async Task<PagedResponse<ReceiverResponse>> GetReceiversAsync(
            int page,
            int pageSize,
            string? receiverCode,
            string? receiverName,
            bool? isActive,
            DateTime? fromDate,
            DateTime? toDate)
        {
            // Safety
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;

            // 1. Get all
            var receivers = await _receiverRepository.GetAllAsync();
            var query = receivers.AsQueryable();

            // 2. SEARCH
            if (!string.IsNullOrWhiteSpace(receiverCode))
            {
                query = query.Where(r =>
                    r.ReceiverCode != null &&
                    r.ReceiverCode.Contains(receiverCode));
            }

            if (!string.IsNullOrWhiteSpace(receiverName))
            {
                query = query.Where(r =>
                    r.ReceiverName.Contains(receiverName));
            }

            // 3. FILTER
            if (isActive.HasValue)
            {
                query = query.Where(r => r.IsActive == isActive.Value);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(r => r.CreatedAt >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(r => r.CreatedAt <= toDate.Value);
            }

            // 4. Total after search + filter
            var totalItems = query.Count();

            // 5. Paging
            var items = query
                .OrderBy(r => r.ReceiverName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new ReceiverResponse
                {
                    ReceiverId = r.ReceiverId,
                    ReceiverCode = r.ReceiverCode,
                    ReceiverName = r.ReceiverName,
                    Phone = r.Phone,
                    Email = r.Email,
                    Address = r.Address,
                    Notes = r.Notes,
                    IsActive = r.IsActive
                })
                .ToList();

            // 6. Return
            return new PagedResponse<ReceiverResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = items
            };
        }

        public async Task<ReceiverResponse> UpdateReceiverAsync(long id, UpdateReceiverRequest request)
        {
            // 1. Check receiver exists
            var receiver = await _receiverRepository.GetByIdAsync(id);
            if (receiver == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy người nhận với ID = {id}");
            }

            // 2. Check duplicate Email (if provided and different from current)
            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var allReceivers = await _receiverRepository.GetAllAsync();
                var duplicateEmail = allReceivers.Any(r =>
                    r.ReceiverId != id &&
                    !string.IsNullOrWhiteSpace(r.Email) &&
                    r.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase));

                if (duplicateEmail)
                {
                    throw new InvalidOperationException("Email đã được sử dụng bởi người nhận khác");
                }
            }

            // 3. Map request fields to entity
            receiver.ReceiverName = request.ReceiverName;
            receiver.Phone = request.Phone;
            receiver.Email = request.Email;
            receiver.Address = request.Address;
            receiver.Notes = request.Notes;
            receiver.IsActive = request.IsActive;

            // 4. Save
            await _receiverRepository.UpdateAsync(receiver);

            // 5. Return response
            return new ReceiverResponse
            {
                ReceiverId = receiver.ReceiverId,
                ReceiverCode = receiver.ReceiverCode,
                ReceiverName = receiver.ReceiverName,
                Phone = receiver.Phone,
                Email = receiver.Email,
                Address = receiver.Address,
                Notes = receiver.Notes,
                IsActive = receiver.IsActive
            };
        }

        public async Task<ReceiverResponse> ToggleReceiverStatusAsync(long id, bool isActive)
        {
            // 1. Check receiver exists
            var receiver = await _receiverRepository.GetByIdAsync(id);
            if (receiver == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy người nhận với ID = {id}");
            }

            // 2. Check new status differs from current status
            if (receiver.IsActive == isActive)
            {
                var statusText = isActive ? "đang hoạt động" : "đã bị vô hiệu hóa";
                throw new InvalidOperationException(
                    $"Người nhận '{receiver.ReceiverName}' hiện tại {statusText}. Không cần thay đổi.");
            }

            // 3. Update only IsActive
            receiver.IsActive = isActive;

            // 4. Save
            await _receiverRepository.UpdateAsync(receiver);

            // 5. Return response
            return new ReceiverResponse
            {
                ReceiverId = receiver.ReceiverId,
                ReceiverCode = receiver.ReceiverCode,
                ReceiverName = receiver.ReceiverName,
                Phone = receiver.Phone,
                Email = receiver.Email,
                Address = receiver.Address,
                Notes = receiver.Notes,
                IsActive = receiver.IsActive
            };
        }
    }
}
