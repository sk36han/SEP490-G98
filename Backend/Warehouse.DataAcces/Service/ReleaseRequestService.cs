using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
    public class ReleaseRequestService : IReleaseRequestService
    {
        private readonly Mkiwms5Context _context;

        public ReleaseRequestService(Mkiwms5Context context)
        {
            _context = context;
        }

        // ──────────────────────────── CREATE ────────────────────────────

        public async Task<ReleaseRequestDetailResponse> CreateReleaseRequestAsync(
            long requestedByUserId,
            CreateReleaseRequestRequest request)
        {
            // 1. Validate: Lines không rỗng
            if (request.Lines == null || request.Lines.Count == 0)
                throw new InvalidOperationException("Yêu cầu xuất kho phải có ít nhất 1 vật tư.");

            // 2. Validate: Kho xuất
            var warehouse = await _context.Warehouses
                .FirstOrDefaultAsync(w => w.WarehouseId == request.WarehouseId);
            if (warehouse == null)
                throw new KeyNotFoundException("Không tìm thấy kho xuất.");
            if (!warehouse.IsActive)
                throw new InvalidOperationException("Kho xuất đang không hoạt động.");

            var receiver = await _context.Receivers
                .Include(r => r.Company)
                .FirstOrDefaultAsync(r => r.ReceiverId == request.ReceiverId);
            if (receiver == null)
                throw new KeyNotFoundException("Không tìm thấy người nhận.");
            if (!receiver.IsActive)
                throw new InvalidOperationException("Người nhận đang không hoạt động.");

            // Cập nhật thông tin Công ty/Địa chỉ cho Người nhận nếu có truyền lên
            if (request.CompanyId.HasValue) receiver.CompanyId = request.CompanyId.Value;
            if (request.AddressId.HasValue)
            {
                var addr = await _context.Addresses.FindAsync(request.AddressId.Value);
                if (addr != null)
                {
                    receiver.Address = addr.AddressDetail;
                    receiver.City = addr.City;
                    receiver.District = addr.District;
                    receiver.Ward = addr.Ward;
                }
            }

            // 4. Validate: Người tạo
            var requestedByUser = await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == requestedByUserId);
            if (requestedByUser == null)
                throw new KeyNotFoundException("Không tìm thấy người tạo yêu cầu.");

            // 5. Validate: Không có vật tư trùng lặp
            if (request.Lines.GroupBy(l => l.ItemId).Any(g => g.Count() > 1))
                throw new InvalidOperationException("Một vật tư không được xuất hiện nhiều hơn 1 lần.");

            // 6. Validate: Tất cả vật tư tồn tại + đang hoạt động
            var itemIds = request.Lines.Select(l => l.ItemId).Distinct().ToList();
            var items = await _context.Items
                .Where(i => itemIds.Contains(i.ItemId))
                .ToDictionaryAsync(i => i.ItemId, i => i);

            if (items.Count != itemIds.Count)
                throw new KeyNotFoundException("Có vật tư không tồn tại trong hệ thống.");
            if (items.Values.Any(i => !i.IsActive))
                throw new InvalidOperationException("Có vật tư đang không hoạt động.");

            // 7. Validate: Đơn vị tính tồn tại
            var uomIds = request.Lines.Select(l => l.UomId).Distinct().ToList();
            var uoms = await _context.UnitOfMeasures
                .Where(u => uomIds.Contains(u.UomId))
                .ToDictionaryAsync(u => u.UomId, u => u);

            if (uoms.Count != uomIds.Count)
                throw new KeyNotFoundException("Có đơn vị tính không tồn tại trong hệ thống.");

            // 8. Tạo mã yêu cầu xuất kho tự động
            var rrCode = await GenerateNextRRCodeAsync();
            var now = DateTime.UtcNow;

            // 9. Tạo entity ReleaseRequest
            var releaseRequest = new ReleaseRequest
            {
                ReleaseRequestCode = rrCode,
                RequestedBy = requestedByUserId,
                ReceiverId = request.ReceiverId,
                WarehouseId = request.WarehouseId,
                RequestedDate = DateOnly.FromDateTime(now),
                ExpectedDate = request.ExpectedDate,
                Purpose = request.Purpose,
                Status = request.Status ?? "PENDING_ACC",
                LifecycleStatus = "IssuePending",
                CreatedAt = now,
                SubmittedAt = now
            };

            // 10. Tạo các dòng vật tư và thực hiện giữ hàng (ReservedQty)
            foreach (var line in request.Lines)
            {
                var rrLine = new ReleaseRequestLine
                {
                    ItemId = line.ItemId,
                    RequestedQty = line.RequestedQty,
                    UomId = line.UomId,
                    Note = line.Note,
                    ApprovedQty = line.RequestedQty, // Mặc định số lượng duyệt = số lượng yêu cầu
                    AllocatedQty = line.RequestedQty, // Gán AllocatedQty = RequestedQty (giữ riêng cấp dòng)
                    IssuedQty = 0,
                    LineStatus = "Open"
                };
                releaseRequest.ReleaseRequestLines.Add(rrLine);

                // Chỉ thực hiện giữ hàng (ReservedQty) nếu trạng thái không phải là DRAFT
                if (releaseRequest.Status != "DRAFT")
                {
                    // Cập nhật ReservedQty trong InventoryOnHands (giữ hàng cấp kho)
                    var inventory = await _context.InventoryOnHands
                        .FirstOrDefaultAsync(ioh => ioh.WarehouseId == request.WarehouseId && ioh.ItemId == line.ItemId);

                    if (inventory == null)
                    {
                        // Nếu không tìm thấy bản ghi tồn kho, báo lỗi vì không thể xuất hàng không có trong danh mục kho
                        throw new KeyNotFoundException($"Không tìm thấy bản ghi tồn kho cho vật tư ID {line.ItemId} tại kho {warehouse.WarehouseName}.");
                    }

                    inventory.ReservedQty += line.RequestedQty;
                    inventory.UpdatedAt = DateTime.UtcNow;
                }
            }

            // 11. Lưu vào database
            _context.ReleaseRequests.Add(releaseRequest);
            await _context.SaveChangesAsync();

            // 12. Ghi audit log
            _context.AuditLogs.Add(new AuditLog
            {
                ActorUserId = requestedByUserId,
                Action = "CREATE",
                EntityType = "ReleaseRequest",
                EntityId = releaseRequest.ReleaseRequestId,
                Detail = $"Tạo yêu cầu xuất kho {rrCode}",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            // 13. Trả về response chi tiết
            return MapToDetailResponse(releaseRequest, warehouse, receiver, requestedByUser, items, uoms);
        }

        // ──────────────────────────── LIST ────────────────────────────

        public async Task<PagedResponse<ReleaseRequestResponse>> GetReleaseRequestsAsync(
            int page, int pageSize)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;

            var query = _context.ReleaseRequests
                .Include(rr => rr.Warehouse)
                .Include(rr => rr.Receiver)
                    .ThenInclude(rc => rc.Company)
                .Include(rr => rr.RequestedByNavigation)
                .Include(rr => rr.ReleaseRequestLines)
                .AsQueryable();

            var totalItems = await query.CountAsync();

            var items = await query
                .OrderByDescending(rr => rr.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(rr => new ReleaseRequestResponse
                {
                    ReleaseRequestId = rr.ReleaseRequestId,
                    ReleaseRequestCode = rr.ReleaseRequestCode,
                    Status = rr.Status,
                    LifecycleStatus = rr.LifecycleStatus,
                    RequestedDate = rr.RequestedDate,
                    ExpectedDate = rr.ExpectedDate,
                    Purpose = rr.Purpose,
                    WarehouseId = rr.WarehouseId,
                    WarehouseName = rr.Warehouse != null ? rr.Warehouse.WarehouseName : null,
                    ReceiverId = rr.ReceiverId,
                    ReceiverName = rr.Receiver != null ? rr.Receiver.ReceiverName : null,
                    CompanyId = rr.Receiver != null ? rr.Receiver.CompanyId : null,
                    CompanyName = (rr.Receiver != null && rr.Receiver.Company != null) ? rr.Receiver.Company.CompanyName : null,
                    ReceiverAddress = rr.Receiver != null ? rr.Receiver.Address : null,
                    RequestedBy = rr.RequestedBy,
                    RequestedByName = rr.RequestedByNavigation != null ? rr.RequestedByNavigation.FullName : null,
                    TotalItems = rr.ReleaseRequestLines.Count,
                    TotalRequestedQty = rr.ReleaseRequestLines.Sum(l => l.RequestedQty),
                    CreatedAt = rr.CreatedAt
                })
                .ToListAsync();

            return new PagedResponse<ReleaseRequestResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = items
            };
        }

        // ──────────────────────────── DETAIL ────────────────────────────

        public async Task<ReleaseRequestDetailResponse?> GetReleaseRequestByIdAsync(long id)
        {
            var rr = await _context.ReleaseRequests
                .Include(r => r.Warehouse)
                .Include(r => r.Receiver)
                    .ThenInclude(x => x.Company)
                .Include(r => r.RequestedByNavigation)
                .Include(r => r.ReleaseRequestLines)
                    .ThenInclude(l => l.Item)
                .Include(r => r.ReleaseRequestLines)
                    .ThenInclude(l => l.Uom)
                .FirstOrDefaultAsync(r => r.ReleaseRequestId == id);

            if (rr == null) return null;

            return new ReleaseRequestDetailResponse
            {
                ReleaseRequestId = rr.ReleaseRequestId,
                ReleaseRequestCode = rr.ReleaseRequestCode,
                Status = rr.Status,
                LifecycleStatus = rr.LifecycleStatus,
                RequestedDate = rr.RequestedDate,
                ExpectedDate = rr.ExpectedDate,
                Purpose = rr.Purpose,
                WarehouseId = rr.WarehouseId,
                WarehouseName = rr.Warehouse?.WarehouseName,
                RequestedBy = rr.RequestedBy,
                RequestedByName = rr.RequestedByNavigation?.FullName,
                Receiver = rr.Receiver != null ? new ReleaseRequestReceiverInfo
                {
                    ReceiverId = rr.Receiver.ReceiverId,
                    ReceiverName = rr.Receiver.ReceiverName,
                    Phone = rr.Receiver.Phone,
                    Email = rr.Receiver.Email,
                    CompanyId = rr.Receiver.CompanyId,
                    CompanyName = rr.Receiver.Company?.CompanyName,
                    Notes = rr.Receiver.Notes,
                    Address = rr.Receiver.Address,
                    City = rr.Receiver.City,
                    District = rr.Receiver.District,
                    Ward = rr.Receiver.Ward
                } : null,
                TotalItems = rr.ReleaseRequestLines.Count,
                TotalRequestedQty = rr.ReleaseRequestLines.Sum(l => l.RequestedQty),
                CreatedAt = rr.CreatedAt,
                SubmittedAt = rr.SubmittedAt,
                Lines = rr.ReleaseRequestLines.Select(l => new ReleaseRequestLineResponse
                {
                    ReleaseRequestLineId = l.ReleaseRequestLineId,
                    ItemId = l.ItemId,
                    ItemCode = l.Item?.ItemCode,
                    ItemName = l.Item?.ItemName,
                    RequestedQty = l.RequestedQty,
                    UomId = l.UomId,
                    UomName = l.Uom?.UomName,
                    Note = l.Note,
                    ApprovedQty = l.ApprovedQty,
                    AllocatedQty = l.AllocatedQty,
                    IssuedQty = l.IssuedQty,
                    LineStatus = l.LineStatus
                }).ToList()
            };
        }

        // ──────────────────────────── UPDATE ────────────────────────────

        public async Task<ReleaseRequestDetailResponse> UpdateReleaseRequestAsync(
            long id, long userId, UpdateReleaseRequestRequest request)
        {
            // 1. Lấy yêu cầu xuất kho cùng lines
            var rr = await _context.ReleaseRequests
                .Include(r => r.Receiver)
                .Include(r => r.ReleaseRequestLines)
                .FirstOrDefaultAsync(r => r.ReleaseRequestId == id);

            if (rr == null)
                throw new KeyNotFoundException("Không tìm thấy yêu cầu xuất kho.");

            // 2. Chỉ cho phép sửa khi trạng thái PENDING hoặc DRAFT
            var editableStatuses = new[] { "DRAFT", "PENDING", "PENDING_APPROVAL" };
            if (!editableStatuses.Contains(rr.Status))
                throw new InvalidOperationException("Chỉ có thể sửa yêu cầu xuất kho đang ở trạng thái chờ duyệt.");

            // 3. Không cho sửa nếu đã có phiếu xuất kho (GDN)
            var hasGdn = await _context.GoodsDeliveryNotes
                .AnyAsync(g => g.ReleaseRequestId == id && g.Status == "POSTED");
            if (hasGdn)
                throw new InvalidOperationException("Không thể sửa yêu cầu xuất kho đã có phiếu xuất.");

            // 4. Lưu lại ID kho cũ để xử lý chuyển giữ hàng nếu có đổi kho
            long oldWarehouseId = rr.WarehouseId;

            // 5. Cập nhật kho xuất
            if (request.WarehouseId.HasValue && request.WarehouseId.Value != oldWarehouseId)
            {
                var warehouse = await _context.Warehouses
                    .FirstOrDefaultAsync(w => w.WarehouseId == request.WarehouseId.Value);
                if (warehouse == null)
                    throw new KeyNotFoundException("Không tìm thấy kho xuất.");
                if (!warehouse.IsActive)
                    throw new InvalidOperationException("Kho xuất đang không hoạt động.");
                rr.WarehouseId = request.WarehouseId.Value;
            }

            // 5. Cập nhật người nhận
            if (request.ReceiverId.HasValue && request.ReceiverId.Value != rr.ReceiverId)
            {
                var newReceiver = await _context.Receivers
                    .FirstOrDefaultAsync(r => r.ReceiverId == request.ReceiverId.Value);
                if (newReceiver == null)
                    throw new KeyNotFoundException("Không tìm thấy người nhận mới.");
                if (!newReceiver.IsActive)
                    throw new InvalidOperationException("Người nhận mới đang không hoạt động.");
                
                rr.ReceiverId = request.ReceiverId.Value;
                // Nếu đổi người nhận thì dùng người nhận mới để update info bên dưới
                rr.Receiver = newReceiver; 
            }

            // Cập nhật thông tin Công ty/Địa chỉ cho Người nhận hiện tại của đơn
            if (request.CompanyId.HasValue) rr.Receiver.CompanyId = request.CompanyId.Value;
            if (request.AddressId.HasValue)
            {
                var addr = await _context.Addresses.FindAsync(request.AddressId.Value);
                if (addr != null)
                {
                    rr.Receiver.Address = addr.AddressDetail;
                    rr.Receiver.City = addr.City;
                    rr.Receiver.District = addr.District;
                    rr.Receiver.Ward = addr.Ward;
                }
            }

            // 7. Cập nhật ngày xuất dự kiến
            if (request.ExpectedDate.HasValue)
                rr.ExpectedDate = request.ExpectedDate;

            // 8. Cập nhật ghi chú
            if (request.Purpose != null)
                rr.Purpose = request.Purpose;

            // 9. Cập nhật danh sách vật tư (nếu có)
            if (request.Lines != null)
            {
                if (request.Lines.Count == 0)
                    throw new InvalidOperationException("Yêu cầu xuất kho phải có ít nhất 1 vật tư.");

                // Validate không trùng vật tư
                if (request.Lines.GroupBy(l => l.ItemId).Any(g => g.Count() > 1))
                    throw new InvalidOperationException("Một vật tư không được xuất hiện nhiều hơn 1 lần.");

                // Validate vật tư tồn tại + hoạt động
                var itemIds = request.Lines.Select(l => l.ItemId).Distinct().ToList();
                var items = await _context.Items
                    .Where(i => itemIds.Contains(i.ItemId))
                    .ToDictionaryAsync(i => i.ItemId, i => i);

                if (items.Count != itemIds.Count)
                    throw new KeyNotFoundException("Có vật tư không tồn tại trong hệ thống.");
                if (items.Values.Any(i => !i.IsActive))
                    throw new InvalidOperationException("Có vật tư đang không hoạt động.");

                // Validate đơn vị tính
                var uomIds = request.Lines.Select(l => l.UomId).Distinct().ToList();
                var uomCount = await _context.UnitOfMeasures.CountAsync(u => uomIds.Contains(u.UomId));
                if (uomCount != uomIds.Count)
                    throw new KeyNotFoundException("Có đơn vị tính không tồn tại trong hệ thống.");

                // Lấy danh sách ID dòng cũ cần giữ lại
                var keepLineIds = request.Lines
                    .Where(l => l.ReleaseRequestLineId.HasValue && l.ReleaseRequestLineId > 0)
                    .Select(l => l.ReleaseRequestLineId!.Value)
                    .ToHashSet();

                // 9a. Xóa dòng cũ không còn trong request: Trả lại ReservedQty cho kho cũ
                var linesToRemove = rr.ReleaseRequestLines
                    .Where(l => !keepLineIds.Contains(l.ReleaseRequestLineId))
                    .ToList();
                foreach (var line in linesToRemove)
                {
                    // Chỉ trả lại ReservedQty nếu trạng thái hiện tại không phải là DRAFT
                    if (rr.Status != "DRAFT")
                    {
                        var inventory = await _context.InventoryOnHands
                            .FirstOrDefaultAsync(ioh => ioh.WarehouseId == oldWarehouseId && ioh.ItemId == line.ItemId);
                        if (inventory != null)
                        {
                            inventory.ReservedQty -= line.AllocatedQty;
                            inventory.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                    _context.ReleaseRequestLines.Remove(line);
                }

                // 9b. Cập nhật dòng cũ + thêm dòng mới
                foreach (var lineReq in request.Lines)
                {
                    if (lineReq.ReleaseRequestLineId.HasValue && lineReq.ReleaseRequestLineId > 0)
                    {
                        // Cập nhật dòng đã có
                        var existingLine = rr.ReleaseRequestLines
                            .FirstOrDefault(l => l.ReleaseRequestLineId == lineReq.ReleaseRequestLineId.Value);
                        if (existingLine == null)
                            throw new KeyNotFoundException($"Không tìm thấy dòng vật tư với ID = {lineReq.ReleaseRequestLineId}.");

                        // Xử lý ReservedQty (Chỉ thực hiện nếu trạng thái không phải là DRAFT)
                        if (rr.Status != "DRAFT")
                        {
                            if (rr.WarehouseId != oldWarehouseId)
                            {
                                // Nếu đổi kho: Trả hàng kho cũ, giữ hàng kho mới
                                var oldInv = await _context.InventoryOnHands
                                    .FirstOrDefaultAsync(ioh => ioh.WarehouseId == oldWarehouseId && ioh.ItemId == existingLine.ItemId);
                                if (oldInv != null) oldInv.ReservedQty -= existingLine.AllocatedQty;

                                var newInv = await _context.InventoryOnHands
                                    .FirstOrDefaultAsync(ioh => ioh.WarehouseId == rr.WarehouseId && ioh.ItemId == existingLine.ItemId);
                                if (newInv == null) throw new KeyNotFoundException($"Vật tư {existingLine.ItemId} không có trong kho mới {rr.WarehouseId}.");
                                newInv.ReservedQty += lineReq.RequestedQty;
                            }
                            else
                            {
                                // Nếu cùng kho: Tính chênh lệch Delta = Số_mới - Số_cũ
                                decimal delta = lineReq.RequestedQty - existingLine.AllocatedQty;
                                var inv = await _context.InventoryOnHands
                                    .FirstOrDefaultAsync(ioh => ioh.WarehouseId == rr.WarehouseId && ioh.ItemId == existingLine.ItemId);
                                if (inv != null) inv.ReservedQty += delta;
                            }
                        }

                        existingLine.ItemId = lineReq.ItemId;
                        existingLine.RequestedQty = lineReq.RequestedQty;
                        existingLine.ApprovedQty = lineReq.RequestedQty; // Cập nhật số lượng duyệt khớp với số lượng mới
                        existingLine.AllocatedQty = lineReq.RequestedQty; // Cập nhật AllocatedQty = Số_mới
                        existingLine.UomId = lineReq.UomId;
                        existingLine.Note = lineReq.Note;
                    }
                    else
                    {
                        // Thêm dòng mới
                        var newLine = new ReleaseRequestLine
                        {
                            ItemId = lineReq.ItemId,
                            RequestedQty = lineReq.RequestedQty,
                            UomId = lineReq.UomId,
                            Note = lineReq.Note,
                            ApprovedQty = lineReq.RequestedQty, // Mặc định số lượng duyệt = số lượng yêu cầu
                            AllocatedQty = lineReq.RequestedQty, // Gán AllocatedQty cho dòng mới
                            IssuedQty = 0,
                            LineStatus = "Open"
                        };
                        rr.ReleaseRequestLines.Add(newLine);

                        // Giữ hàng cho dòng mới tại kho hiện tại (Chỉ khi status != DRAFT)
                        if (rr.Status != "DRAFT")
                        {
                            var inv = await _context.InventoryOnHands
                                .FirstOrDefaultAsync(ioh => ioh.WarehouseId == rr.WarehouseId && ioh.ItemId == lineReq.ItemId);
                            if (inv == null) throw new KeyNotFoundException($"Vật tư {lineReq.ItemId} không có trong kho {rr.WarehouseId}.");
                            inv.ReservedQty += lineReq.RequestedQty;
                            inv.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                }
            }
            else if (oldWarehouseId != rr.WarehouseId && rr.Status != "DRAFT")
            {
                // Trường hợp request.Lines null nhưng WarehouseId thay đổi và không phải DRAFT
                // Phải chuyển toàn bộ giữ hàng từ kho cũ sang kho mới
                foreach (var line in rr.ReleaseRequestLines)
                {
                    var oldInv = await _context.InventoryOnHands
                        .FirstOrDefaultAsync(ioh => ioh.WarehouseId == oldWarehouseId && ioh.ItemId == line.ItemId);
                    if (oldInv != null) oldInv.ReservedQty -= line.AllocatedQty;

                    var newInv = await _context.InventoryOnHands
                        .FirstOrDefaultAsync(ioh => ioh.WarehouseId == rr.WarehouseId && ioh.ItemId == line.ItemId);
                    if (newInv != null) newInv.ReservedQty += line.AllocatedQty;
                }
            }

            // 9. Audit log
            _context.AuditLogs.Add(new AuditLog
            {
                ActorUserId = userId,
                Action = "UPDATE",
                EntityType = "ReleaseRequest",
                EntityId = rr.ReleaseRequestId,
                Detail = $"Cập nhật yêu cầu xuất kho {rr.ReleaseRequestCode}",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            // 10. Trả về chi tiết sau khi cập nhật
            return await GetReleaseRequestByIdAsync(id)
                ?? throw new Exception("Lỗi khi lấy thông tin yêu cầu xuất kho.");
        }  

        public async Task<bool> CancelReleaseRequestAsync(long id)
        {
            var rr = await _context.ReleaseRequests
                .Include(r => r.ReleaseRequestLines)
                .FirstOrDefaultAsync(r => r.ReleaseRequestId == id);

            if (rr == null) return false;

            // 1. Giải phóng hàng đã giữ (ReservedQty) trong kho nếu trạng thái trước đó không phải DRAFT
            if (rr.Status != "DRAFT")
            {
                foreach (var line in rr.ReleaseRequestLines)
                {
                    var inventory = await _context.InventoryOnHands
                        .FirstOrDefaultAsync(ioh => ioh.WarehouseId == rr.WarehouseId && ioh.ItemId == line.ItemId);
                    
                    if (inventory != null)
                    {
                        inventory.ReservedQty -= line.AllocatedQty;
                        inventory.UpdatedAt = DateTime.UtcNow;
                    }
                }
            }

            // 2. Chuyển trạng thái đơn thành CANCELLED
            rr.Status = "CANCELLED";
            rr.LifecycleStatus = "Cancelled";

            await _context.SaveChangesAsync();
            return true;
        }

        // ──────────────────────────── HELPERS ────────────────────────────

        
        /// Tạo mã yêu cầu xuất kho tự tăng: RR-001, RR-002, RR-003, ...
      
        private async Task<string> GenerateNextRRCodeAsync()
        {
            var year = DateTime.Now.Year;
            var prefix = $"XR-{year}-";
            
            var lastCode = await _context.ReleaseRequests
                .Where(r => r.ReleaseRequestCode.StartsWith(prefix))
                .OrderByDescending(r => r.ReleaseRequestCode)
                .Select(r => r.ReleaseRequestCode)
                .FirstOrDefaultAsync();

            var nextNumber = 1;
            if (lastCode != null)
            {
                var parts = lastCode.Split('-');
                if (parts.Length == 3 && int.TryParse(parts[2], out var lastNumber))
                {
                    nextNumber = lastNumber + 1;
                }
            }
            else
            {
                // Fallback cho logic cũ nếu không tìm thấy prefix năm hiện tại
                var codes = await _context.ReleaseRequests
                    .Select(r => r.ReleaseRequestCode)
                    .ToListAsync();
                
                var maxNumber = 0;
                foreach (var code in codes)
                {
                    var parts = code.Split('-');
                    var lastPart = parts.Last();
                    if (int.TryParse(lastPart, out var number) && number > maxNumber)
                        maxNumber = number;
                }
                nextNumber = maxNumber + 1;
            }

            return $"{prefix}{nextNumber:D3}";
        }

       
        /// Map entity sang response chi tiết (dùng khi vừa tạo xong)
      
        private static ReleaseRequestDetailResponse MapToDetailResponse(
            ReleaseRequest rr,
            Warehouse.Entities.Models.Warehouse warehouse,
            Receiver receiver,
            User requestedByUser,
            Dictionary<long, Item> items,
            Dictionary<long, UnitOfMeasure> uoms)
        {
            return new ReleaseRequestDetailResponse
            {
                ReleaseRequestId = rr.ReleaseRequestId,
                ReleaseRequestCode = rr.ReleaseRequestCode,
                Status = rr.Status,
                LifecycleStatus = rr.LifecycleStatus,
                RequestedDate = rr.RequestedDate,
                ExpectedDate = rr.ExpectedDate,
                Purpose = rr.Purpose,
                WarehouseId = rr.WarehouseId,
                WarehouseName = warehouse.WarehouseName,
                RequestedBy = rr.RequestedBy,
                RequestedByName = requestedByUser.FullName,
                Receiver = new ReleaseRequestReceiverInfo
                {
                    ReceiverId = receiver.ReceiverId,
                    ReceiverName = receiver.ReceiverName,
                    Phone = receiver.Phone,
                    Email = receiver.Email,
                    CompanyId = receiver.CompanyId,
                    CompanyName = receiver.Company?.CompanyName,
                    Notes = receiver.Notes,
                    Address = receiver.Address,
                    City = receiver.City,
                    District = receiver.District,
                    Ward = receiver.Ward
                },
                TotalItems = rr.ReleaseRequestLines.Count,
                TotalRequestedQty = rr.ReleaseRequestLines.Sum(l => l.RequestedQty),
                CreatedAt = rr.CreatedAt,
                SubmittedAt = rr.SubmittedAt,
                Lines = rr.ReleaseRequestLines.Select(l => new ReleaseRequestLineResponse
                {
                    ReleaseRequestLineId = l.ReleaseRequestLineId,
                    ItemId = l.ItemId,
                    ItemCode = items.ContainsKey(l.ItemId) ? items[l.ItemId].ItemCode : null,
                    ItemName = items.ContainsKey(l.ItemId) ? items[l.ItemId].ItemName : null,
                    RequestedQty = l.RequestedQty,
                    UomId = l.UomId,
                    UomName = uoms.ContainsKey(l.UomId) ? uoms[l.UomId].UomName : null,
                    Note = l.Note,
                    ApprovedQty = l.ApprovedQty,
                    AllocatedQty = l.AllocatedQty,
                    IssuedQty = l.IssuedQty,
                    LineStatus = l.LineStatus
                }).ToList()
            };
        }
    }
}
