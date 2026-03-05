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
        private readonly Mkiwms5Context _context;

        public ReceiverService(IGenericRepository<Receiver> receiverRepository, Mkiwms5Context context)
        {
            _receiverRepository = receiverRepository;
            _context = context;
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
                City = request.City,
                Ward = request.Ward,
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
                City = receiver.City,
                Ward = receiver.Ward,
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
                    City = r.City,
                    Ward = r.Ward,
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
            receiver.City = request.City;
            receiver.Ward = request.Ward;
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
                City = receiver.City,
                Ward = receiver.Ward,
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
                City = receiver.City,
                Ward = receiver.Ward,
                Notes = receiver.Notes,
                IsActive = receiver.IsActive
            };
        }
        public async Task<ReceiverResponse> GetReceiverByIdAsync(long id)
        {
            var receiver = await _receiverRepository.GetByIdAsync(id);
            if (receiver == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy người nhận với ID = {id}");
            }

            return new ReceiverResponse
            {
                ReceiverId = receiver.ReceiverId,
                ReceiverCode = receiver.ReceiverCode,
                ReceiverName = receiver.ReceiverName,
                Phone = receiver.Phone,
                Email = receiver.Email,
                Address = receiver.Address,
                City = receiver.City,
                Ward = receiver.Ward,
                Notes = receiver.Notes,
                IsActive = receiver.IsActive
            };
        }

        public async Task<ReceiverTransactionUnifiedResponse> GetReceiverTransactionsAsync(
            long receiverId,
            int page,
            int pageSize,
            string? transactionType,
            string? status,
            DateTime? fromDate,
            DateTime? toDate,
            string? detailType,
            long? detailDocId)
        {
            var response = new ReceiverTransactionUnifiedResponse();

            // 1. DETAIL (If requested)
            if (detailDocId.HasValue && !string.IsNullOrWhiteSpace(detailType))
            {
                if (detailType.ToUpper() == "RR")
                {
                    var rr = await _context.ReleaseRequests.FindAsync(detailDocId.Value);
                    var rrLines = _context.ReleaseRequestLines.Where(l => l.ReleaseRequestId == detailDocId.Value).ToList();
                    if (rr != null) response.Detail = new { Header = rr, Lines = rrLines };
                }
                else if (detailType.ToUpper() == "GDN")
                {
                    var gdn = await _context.GoodsDeliveryNotes.FindAsync(detailDocId.Value);
                    var gdnLines = _context.GoodsDeliveryNoteLines.Where(l => l.Gdnid == detailDocId.Value).ToList();
                    if (gdn != null) response.Detail = new { Header = gdn, Lines = gdnLines };
                }
                return response;
            }

            // 2. SUMMARY
            var totalRr = _context.ReleaseRequests.Count(x => x.ReceiverId == receiverId);
            var totalGdn = _context.GoodsDeliveryNotes.Count(x => x.ReleaseRequest.ReceiverId == receiverId);
            var totalQtyRequested = _context.ReleaseRequestLines.Where(x => x.ReleaseRequest.ReceiverId == receiverId).Sum(x => (decimal?)x.RequestedQty) ?? 0;
            var totalQtyDelivered = _context.GoodsDeliveryNoteLines.Where(x => x.Gdn.ReleaseRequest.ReceiverId == receiverId).Sum(x => (decimal?)x.ActualQty) ?? 0;

            response.Summary = new ReceiverTransactionSummaryDto
            {
                TotalReleaseRequests = totalRr,
                TotalGoodsDeliveryNotes = totalGdn,
                TotalQuantityRequested = totalQtyRequested,
                TotalQuantityDelivered = totalQtyDelivered
            };

            // 3. HISTORY
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;

            // RR Query
            var rrQuery = _context.ReleaseRequests.Where(x => x.ReceiverId == receiverId);
            if (!string.IsNullOrWhiteSpace(status)) rrQuery = rrQuery.Where(x => x.Status.ToUpper() == status.ToUpper());
            
            var rrList = rrQuery.Select(x => new ReceiverTransactionDto
            {
                TransactionId = x.ReleaseRequestId,
                TransactionDate = x.RequestedDate.HasValue 
                    ? x.RequestedDate.Value.ToDateTime(TimeOnly.MinValue) 
                    : x.CreatedAt.Date,
                TransactionCode = x.ReleaseRequestCode,
                TransactionType = "RR",
                Status = x.Status,
                Note = x.Purpose,
                WarehouseName = x.Warehouse.WarehouseName,
                CreatedBy = x.RequestedByNavigation.FullName,
                ItemCount = x.ReleaseRequestLines.Count,
                TotalQuantity = x.ReleaseRequestLines.Sum(l => l.RequestedQty),
                CreatedAt = x.CreatedAt
            }).ToList();

            // GDN Query
            var gdnQuery = _context.GoodsDeliveryNotes.Where(x => x.ReleaseRequest.ReceiverId == receiverId);
            if (!string.IsNullOrWhiteSpace(status)) gdnQuery = gdnQuery.Where(x => x.Status.ToUpper() == status.ToUpper());

            var gdnList = gdnQuery.Select(x => new ReceiverTransactionDto
            {
                TransactionId = x.Gdnid,
                TransactionDate = x.IssueDate.ToDateTime(TimeOnly.MinValue),
                TransactionCode = x.Gdncode,
                TransactionType = "GDN",
                Status = x.Status,
                Note = x.Note,
                WarehouseName = x.Warehouse.WarehouseName,
                CreatedBy = x.CreatedByNavigation.FullName,
                ItemCount = x.GoodsDeliveryNoteLines.Count,
                TotalQuantity = x.GoodsDeliveryNoteLines.Sum(l => (decimal?)l.ActualQty) ?? 0,
                CreatedAt = x.SubmittedAt ?? x.PostedAt ?? x.ApprovedAt ?? DateTime.UtcNow
            }).ToList();

            // Merge and Filter
            var merged = rrList.Concat(gdnList).AsQueryable();

            if (!string.IsNullOrWhiteSpace(transactionType))
                merged = merged.Where(x => x.TransactionType.ToUpper() == transactionType.ToUpper());

            if (fromDate.HasValue)
                merged = merged.Where(x => x.TransactionDate >= fromDate.Value.Date);

            if (toDate.HasValue)
                merged = merged.Where(x => x.TransactionDate <= toDate.Value.Date);

            var totalItems = merged.Count();
            var items = merged
                .OrderByDescending(x => x.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            response.History = new PagedResponse<ReceiverTransactionDto>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = items
            };

            return response;
        }
    }
}
