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
        private readonly IStocktakeService _stocktakeService;

        public ReleaseRequestService(Mkiwms5Context context, IStocktakeService stocktakeService)
        {
            _context = context;
            _stocktakeService = stocktakeService;
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

            // Kiểm tra kho có đang bị khóa (kiểm kê) không
            if (await _stocktakeService.IsWarehouseFrozenAsync(request.WarehouseId))
                throw new InvalidOperationException($"Kho '{warehouse.WarehouseName}' đang trong quá trình kiểm kê, không thể tạo yêu cầu xuất kho.");

            // Kiểm tra Người nhận (Receiver)
            var receiver = await _context.Receivers
                .Include(r => r.Company)
                .FirstOrDefaultAsync(r => r.ReceiverId == request.ReceiverId);
            if (receiver == null)
                throw new KeyNotFoundException("Không tìm thấy người nhận.");
            if (!receiver.IsActive)
                throw new InvalidOperationException("Người nhận đang không hoạt động.");

            // Validate: Người nhận phải thuộc Công ty đã chọn (nếu có truyền CompanyId)
            if (request.CompanyId.HasValue && receiver.CompanyId != request.CompanyId.Value)
            {
                throw new InvalidOperationException("Người nhận không thuộc công ty đã chọn.");
            }

            // Ghi đè địa chỉ hệ thống của người nhận nếu có chọn Address từ bảng
            if (request.AddressId.HasValue)
            {
                var addr = await _context.Addresses.FirstOrDefaultAsync(a => a.AddressId == request.AddressId.Value);
                if (addr == null)
                    throw new KeyNotFoundException("Không tìm thấy địa chỉ đã chọn.");
                
                // Validate địa chỉ phải thuộc công ty
                if (request.CompanyId.HasValue && addr.CompanyId != request.CompanyId.Value)
                    throw new InvalidOperationException("Địa chỉ không thuộc công ty đã chọn.");

                // Cập nhật đè địa chỉ vào bản ghi Receiver theo đúng logic hệ thống hiện tại
                receiver.Address = addr.AddressDetail;
                receiver.City = addr.City;
                receiver.District = addr.District;
                receiver.Ward = addr.Ward;
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
                    ApprovedQty = 0, // Mặc định 0, sẽ được cập nhật khi duyệt
                    AllocatedQty = line.RequestedQty, // Gán AllocatedQty = RequestedQty (đã cộng vào ReservedQty của kho)
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

                    // Kiểm tra tồn kho khả dụng
                    var availableQty = inventory.OnHandQty - inventory.ReservedQty;
                    if (availableQty < line.RequestedQty)
                    {
                        throw new InvalidOperationException($"Vật tư '{items[line.ItemId].ItemName}' không đủ số lượng khả dụng. Yêu cầu: {line.RequestedQty}, Khả dụng: {availableQty}.");
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
            var editableStatuses = new[] { "DRAFT", "PENDING_ACC" };
            if (!editableStatuses.Contains(rr.Status))
                throw new InvalidOperationException("Chỉ có thể sửa yêu cầu xuất kho đang ở trạng thái chờ duyệt hoặc nháp.");

            // Kiểm tra kho hiện tại có đang bị khóa không
            if (await _stocktakeService.IsWarehouseFrozenAsync(rr.WarehouseId))
                throw new InvalidOperationException($"Kho '{rr.Warehouse.WarehouseName}' đang trong quá trình kiểm kê, không thể cập nhật yêu cầu xuất kho.");

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

            // Validate Người nhận thuộc Công ty đã chọn (nếu có truyền CompanyId)
            if (request.CompanyId.HasValue && rr.Receiver.CompanyId != request.CompanyId.Value)
            {
                throw new InvalidOperationException("Người nhận không thuộc công ty đã chọn.");
            }

            // Ghi đè địa chỉ hệ thống của người nhận nếu có chọn Address từ bảng
            if (request.AddressId.HasValue)
            {
                var addr = await _context.Addresses.FirstOrDefaultAsync(a => a.AddressId == request.AddressId.Value);
                if (addr == null)
                    throw new KeyNotFoundException("Không tìm thấy địa chỉ đã chọn.");
                
                // Validate địa chỉ phải thuộc công ty
                if (request.CompanyId.HasValue && addr.CompanyId != request.CompanyId.Value)
                    throw new InvalidOperationException("Địa chỉ không thuộc công ty đã chọn.");

                // Cập nhật đè địa chỉ vào bản ghi Receiver theo đúng logic hệ thống hiện tại
                rr.Receiver.Address = addr.AddressDetail;
                rr.Receiver.City = addr.City;
                rr.Receiver.District = addr.District;
                rr.Receiver.Ward = addr.Ward;
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
                                
                                var availableQty = newInv.OnHandQty - newInv.ReservedQty;
                                if (availableQty < lineReq.RequestedQty)
                                    throw new InvalidOperationException($"Vật tư '{items[existingLine.ItemId].ItemName}' không đủ số lượng khả dụng tại kho mới. Yêu cầu: {lineReq.RequestedQty}, Khả dụng: {availableQty}.");
                                
                                newInv.ReservedQty += lineReq.RequestedQty;
                            }
                            else
                            {
                                // Nếu cùng kho: Tính chênh lệch Delta = Số_mới - Số_cũ
                                decimal delta = lineReq.RequestedQty - existingLine.AllocatedQty;
                                var inv = await _context.InventoryOnHands
                                    .FirstOrDefaultAsync(ioh => ioh.WarehouseId == rr.WarehouseId && ioh.ItemId == existingLine.ItemId);
                                if (inv != null)
                                {
                                    if (delta > 0)
                                    {
                                        var availableQty = inv.OnHandQty - inv.ReservedQty;
                                        if (availableQty < delta)
                                            throw new InvalidOperationException($"Vật tư '{items[existingLine.ItemId].ItemName}' không đủ số lượng khả dụng. Yêu cầu thêm: {delta}, Khả dụng: {availableQty}.");
                                    }
                                    inv.ReservedQty += delta;
                                }
                            }
                        }

                        existingLine.ItemId = lineReq.ItemId;
                        existingLine.RequestedQty = lineReq.RequestedQty;
                        existingLine.ApprovedQty = 0; // Luôn reset về 0 để chờ duyệt lại nếu có thay đổi
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
                            ApprovedQty = 0, // Mặc định 0, sẽ được cập nhật khi duyệt
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

                            var availableQty = inv.OnHandQty - inv.ReservedQty;
                            if (availableQty < lineReq.RequestedQty)
                                throw new InvalidOperationException($"Vật tư '{items[lineReq.ItemId].ItemName}' không đủ số lượng khả dụng. Yêu cầu: {lineReq.RequestedQty}, Khả dụng: {availableQty}.");

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
                    if (newInv != null)
                    {
                        var availableQty = newInv.OnHandQty - newInv.ReservedQty;
                        if (availableQty < line.AllocatedQty)
                            throw new InvalidOperationException($"Vật tư ID {line.ItemId} không đủ số lượng ở kho mới. Yêu cầu: {line.AllocatedQty}, Khả dụng: {availableQty}.");

                        newInv.ReservedQty += line.AllocatedQty;
                    }
                    else
                    {
                        throw new KeyNotFoundException($"Vật tư ID {line.ItemId} không có trong kho mới {rr.WarehouseId}.");
                    }
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

        public async Task<bool> CancelReleaseRequestAsync(long id, long userId)
        {
            var rr = await _context.ReleaseRequests
                .Include(r => r.ReleaseRequestLines)
                .FirstOrDefaultAsync(r => r.ReleaseRequestId == id);

            if (rr == null) return false;

            // 1. Giải phóng hàng đã giữ (ReservedQty) trong kho nếu trạng thái trước đó không phải DRAFT
            if (rr.Status != "DRAFT")
            {
                await ReleaseReservedQtyAsync(rr);
            }

            // 2. Chuyển trạng thái đơn thành CANCELLED
            rr.Status = "CANCELLED";
            rr.LifecycleStatus = "Cancelled";

            // 3. Ghi audit log
            _context.AuditLogs.Add(new AuditLog
            {
                ActorUserId = userId,
                Action = "CANCEL",
                EntityType = "ReleaseRequest",
                EntityId = rr.ReleaseRequestId,
                Detail = $"Hủy yêu cầu xuất kho {rr.ReleaseRequestCode}",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return true;
        }

        // ──────────────────────────── CLOSE ────────────────────────────

        public async Task<bool> CloseReleaseRequestAsync(long id, long userId)
        {
            var rr = await _context.ReleaseRequests
                .Include(r => r.ReleaseRequestLines)
                .FirstOrDefaultAsync(r => r.ReleaseRequestId == id);

            if (rr == null) return false;

            // Chỉ cho phép đóng khi đã APPROVED
            if (rr.Status != "APPROVED")
                throw new InvalidOperationException("Chỉ có thể đóng yêu cầu xuất kho đang ở trạng thái đã duyệt (APPROVED).");
                
            if (rr.LifecycleStatus == "IssueFull" || rr.LifecycleStatus == "Closed" || rr.LifecycleStatus == "Cancelled")
                throw new InvalidOperationException($"Không thể đóng yêu cầu xuất kho ở trạng thái '{rr.LifecycleStatus}'.");

            // Giải phóng hàng còn dư (ReservedQty)
            foreach (var line in rr.ReleaseRequestLines)
            {
                // Lượng dư chưa xuất: AllocatedQty (lượng đã giữ) - IssuedQty (lượng thực tế đã xuất)
                decimal remainingReserve = line.AllocatedQty - line.IssuedQty;
                
                if (remainingReserve > 0)
                {
                    var inventory = await _context.InventoryOnHands
                        .FirstOrDefaultAsync(ioh => ioh.WarehouseId == rr.WarehouseId && ioh.ItemId == line.ItemId);
                    
                    if (inventory != null)
                    {
                        if (inventory.ReservedQty >= remainingReserve)
                            inventory.ReservedQty -= remainingReserve;
                        else
                            inventory.ReservedQty = 0;
                            
                        inventory.UpdatedAt = DateTime.UtcNow;
                    }
                    
                    // Cập nhật lại AllocatedQty bằng IssuedQty để phản ánh không còn giữ hàng dư
                    line.AllocatedQty = line.IssuedQty;
                }
            }

            // Chuyển trạng thái đơn thành CLOSED
            rr.Status = "CLOSED";
            rr.LifecycleStatus = "Closed";

            // Ghi audit log
            _context.AuditLogs.Add(new AuditLog
            {
                ActorUserId = userId,
                Action = "CLOSE",
                EntityType = "ReleaseRequest",
                EntityId = rr.ReleaseRequestId,
                Detail = $"Đóng yêu cầu xuất kho {rr.ReleaseRequestCode} và giải phóng tồn kho đã giữ",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return true;
        }

        // ──────────────────────────── APPROVE (2-stage: Kế toán → Giám đốc) ────────────────────────────

       private const string ROLE_ACCOUNTANT = "KT";
		//private const string ROLE_ACCOUNTANT = "SE";


		public async Task<ReleaseRequestDetailResponse> ApproveReleaseRequestAsync(
            long id, long userId, ApproveReleaseRequest request)
        {
            // 1. Lấy RR kèm lines
            var rr = await _context.ReleaseRequests
                .Include(r => r.ReleaseRequestLines)
                .Include(r => r.Warehouse)
                .FirstOrDefaultAsync(r => r.ReleaseRequestId == id);

            if (rr == null)
                throw new KeyNotFoundException("Không tìm thấy yêu cầu xuất kho.");

            // 2. Lấy user và role
            var user = await _context.Users
                .Include(u => u.UserRoleUser)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
                throw new KeyNotFoundException("Không tìm thấy người dùng.");

            var userRoleCode = user.UserRoleUser?.Role?.RoleCode;
            string decision = request.IsApproved ? "APPROVE" : "REJECT";

            // 3. Xử lý theo trạng thái hiện tại (Chỉ 1 bước: Kế toán duyệt)
            if (rr.Status == "PENDING_ACC")
            {
                // Chỉ Kế toán mới có quyền duyệt RR
                if (userRoleCode != ROLE_ACCOUNTANT)
                    throw new InvalidOperationException(
                        "Chỉ Kế toán mới có quyền duyệt yêu cầu xuất kho.");

                if (request.IsApproved)
                {
                    rr.Status = "APPROVED";

                    var approvedQtyMap = request.Lines?.ToDictionary(l => l.ReleaseRequestLineId, l => l.ApprovedQty) 
                                         ?? new Dictionary<long, decimal>();

                    foreach (var rrLine in rr.ReleaseRequestLines)
                    {
                        decimal approvedQty = approvedQtyMap.ContainsKey(rrLine.ReleaseRequestLineId) 
                            ? approvedQtyMap[rrLine.ReleaseRequestLineId] 
                            : rrLine.RequestedQty;

                        if (approvedQty > rrLine.RequestedQty)
                            throw new InvalidOperationException(
                                $"Số lượng duyệt ({approvedQty}) không được vượt quá số lượng yêu cầu.");

                        decimal oldAllocated = rrLine.AllocatedQty;
                        rrLine.ApprovedQty = approvedQty;
                        rrLine.AllocatedQty = approvedQty;

                        decimal delta = approvedQty - oldAllocated;
                        if (delta != 0)
                        {
                            var inventory = await _context.InventoryOnHands
                                .FirstOrDefaultAsync(ioh => ioh.WarehouseId == rr.WarehouseId && ioh.ItemId == rrLine.ItemId);

                            if (inventory != null)
                            {
                                inventory.ReservedQty += delta;
                                if (inventory.ReservedQty < 0) inventory.ReservedQty = 0;
                                inventory.UpdatedAt = DateTime.UtcNow;
                            }
                        }
                    }
                }
                else
                {
                    rr.Status = "REJECTED";
                    // Giải phóng hàng đã giữ khi từ chối
                    await ReleaseReservedQtyAsync(rr);
                }

                _context.DocumentApprovals.Add(new DocumentApproval
                {
                    DocType = "GIR",
                    DocId = rr.ReleaseRequestId,
                    StageNo = 1,
                    Decision = decision,
                    Reason = request.Reason,
                    ActionBy = userId,
                    ActionAt = DateTime.UtcNow
                });
            }
            else
            {
                throw new InvalidOperationException(
                    $"Yêu cầu xuất kho không ở trạng thái chờ duyệt. Trạng thái hiện tại: {rr.Status}.");
            }

            // Audit log
            _context.AuditLogs.Add(new AuditLog
            {
                ActorUserId = userId,
                Action = request.IsApproved ? "APPROVE" : "REJECT",
                EntityType = "ReleaseRequest",
                EntityId = rr.ReleaseRequestId,
                Detail = $"{(request.IsApproved ? "Duyệt" : "Từ chối")} yêu cầu xuất kho {rr.ReleaseRequestCode}" +
                         (string.IsNullOrEmpty(request.Reason) ? "" : $" - Lý do: {request.Reason}"),
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return await GetReleaseRequestByIdAsync(id)
                ?? throw new Exception("Lỗi khi lấy thông tin yêu cầu xuất kho.");
        }

        /// <summary>
        /// Giải phóng toàn bộ ReservedQty đã giữ cho RR (dùng khi reject/cancel)
        /// </summary>
        private async Task ReleaseReservedQtyAsync(ReleaseRequest rr)
        {
            foreach (var line in rr.ReleaseRequestLines)
            {
                var inventory = await _context.InventoryOnHands
                    .FirstOrDefaultAsync(ioh => ioh.WarehouseId == rr.WarehouseId && ioh.ItemId == line.ItemId);

                if (inventory != null)
                {
                    inventory.ReservedQty -= line.AllocatedQty;
                    if (inventory.ReservedQty < 0) inventory.ReservedQty = 0;
                    inventory.UpdatedAt = DateTime.UtcNow;
                }
            }
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
