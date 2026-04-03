using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
    public class PurchaseOrderService : IPurchaseOrderService
    {
        private readonly Mkiwms5Context _context;
        private readonly IAuditLogService _auditLogService;

        public PurchaseOrderService(Mkiwms5Context context, IAuditLogService auditLogService)
        {
            _context = context;
            _auditLogService = auditLogService;
        }

        public async Task<PagedResponse<PurchaseOrderResponse>> GetPurchaseOrdersAsync(
            int page,
            int pageSize)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;

            var query = _context.PurchaseOrders
                .Include(po => po.Supplier)
                .Include(po => po.Warehouse)
                .Include(po => po.RequestedByNavigation)
                .Include(po => po.ResponsibleUser)
                .Include(po => po.PurchaseOrderLines)
                .AsQueryable();

            var totalItems = query.Count();

            var items = await query
                .OrderByDescending(po => po.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(po => new PurchaseOrderResponse
                {
                    PurchaseOrderId = po.PurchaseOrderId,
                    POCode = po.Pocode,
                    Status = po.Status,
                    LifecycleStatus = po.LifecycleStatus,
                    RequestedDate = po.RequestedDate,
                    ExpectedDeliveryDate = po.ExpectedDeliveryDate,
                    TotalAmount = po.TotalAmount,
                    DiscountAmount = po.DiscountAmount,
                    NetAmount = po.NetAmount ?? 0,
                    TotalReceivedQty = po.PurchaseOrderLines.Sum(line => line.ReceivedQty),
                    SupplierId = po.SupplierId,
                    SupplierName = po.Supplier != null ? po.Supplier.SupplierName : null,
                    WarehouseId = po.WarehouseId,
                    WarehouseName = po.Warehouse != null ? po.Warehouse.WarehouseName : null,
                    RequestedBy = po.RequestedBy,
                    RequestedByName = po.RequestedByNavigation != null ? po.RequestedByNavigation.FullName : null,
                    ResponsibleUserId = po.ResponsibleUserId,
                    ResponsibleUserName = po.ResponsibleUser != null ? po.ResponsibleUser.FullName : null,
                    CreatedAt = po.CreatedAt
                })
                .ToListAsync();

            return new PagedResponse<PurchaseOrderResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = items
            };
        }

        public async Task<PurchaseOrderDetailResponse?> GetPurchaseOrderByIdAsync(long id)
        {
            var po = await _context.PurchaseOrders
                .Include(po => po.Supplier)
                .Include(po => po.Warehouse)
                .Include(po => po.RequestedByNavigation)
                .Include(po => po.ResponsibleUser)
                .Include(po => po.PurchaseOrderLines)
                    .ThenInclude(line => line.Item)
                .FirstOrDefaultAsync(po => po.PurchaseOrderId == id);

            if (po == null)
            {
                return null;
            }

            var totalOrderedQty = po.PurchaseOrderLines.Sum(line => line.OrderedQty);

            return new PurchaseOrderDetailResponse
            {
                PurchaseOrderId = po.PurchaseOrderId,
                POCode = po.Pocode,
                Status = po.Status,
                LifecycleStatus = po.LifecycleStatus,
                CurrentStageNo = po.CurrentStageNo,
                RequestedBy = po.RequestedBy,
                RequestedByName = po.RequestedByNavigation?.FullName,
                ResponsibleUserId = po.ResponsibleUserId,
                ResponsibleUserName = po.ResponsibleUser?.FullName,
                SupplierId = po.SupplierId,
                SupplierName = po.Supplier?.SupplierName,
                WarehouseId = po.WarehouseId,
                WarehouseName = po.Warehouse?.WarehouseName,
                RequestedDate = po.RequestedDate,
                ExpectedDeliveryDate = po.ExpectedDeliveryDate,
                Justification = po.Justification,
                TotalAmount = po.TotalAmount,
                DiscountAmount = po.DiscountAmount,
                NetAmount = po.NetAmount ?? 0,
                TotalOrderedQty = totalOrderedQty,
                CreatedAt = po.CreatedAt,
                SubmittedAt = po.SubmittedAt,
                UpdatedAt = po.UpdatedAt,
                Lines = po.PurchaseOrderLines.Select(line => new PurchaseOrderLineResponse
                {
                    PurchaseOrderLineId = line.PurchaseOrderLineId,
                    ItemId = line.ItemId,
                    ItemCode = line.Item?.ItemCode,
                    ItemName = line.Item?.ItemName,
                    UomId = line.UomId,
                    OrderedQty = line.OrderedQty,
                    ReceivedQty = line.ReceivedQty,
                    UnitPrice = line.UnitPrice ?? 0,
                    LineTotal = line.LineTotal ?? 0,
                    Currency = line.Currency ?? "VND",
                    LineStatus = line.LineStatus,
                    Note = line.Note,
                    RequiresCo = line.Item?.RequiresCo ?? false,
                    RequiresCq = line.Item?.RequiresCq ?? false
                }).ToList()
            };
        }

        public async Task<PurchaseOrderDetailResponse> CreatePurchaseOrderAsync(long requestedByUserId, CreatePurchaseOrderRequest request)
        {
            if (request.Lines == null || request.Lines.Count == 0)
            {
                throw new InvalidOperationException("Đơn mua phải có ít nhất 1 vật tư.");
            }

            var supplier = await _context.Suppliers.FirstOrDefaultAsync(s => s.SupplierId == request.SupplierId);
            if (supplier == null)
            {
                throw new KeyNotFoundException("Không tìm thấy nhà cung cấp.");
            }
            if (!supplier.IsActive)
            {
                throw new InvalidOperationException("Nhà cung cấp đang không hoạt động.");
            }

            var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.WarehouseId == request.WarehouseId);
            if (warehouse == null)
            {
                throw new KeyNotFoundException("Không tìm thấy kho nhập.");
            }
            if (!warehouse.IsActive)
            {
                throw new InvalidOperationException("Kho nhập đang không hoạt động.");
            }

            User? responsibleUser = null;
            if (request.ResponsibleUserId.HasValue)
            {
                responsibleUser = await _context.Users.FirstOrDefaultAsync(u => u.UserId == request.ResponsibleUserId.Value);
                if (responsibleUser == null)
                {
                    throw new KeyNotFoundException("Không tìm thấy nhân viên phụ trách.");
                }
                if (!responsibleUser.IsActive)
                {
                    throw new InvalidOperationException("Nhân viên phụ trách đang không hoạt động.");
                }
            }

            var requestedByUser = await _context.Users.FirstOrDefaultAsync(u => u.UserId == requestedByUserId);
            if (requestedByUser == null)
            {
                throw new KeyNotFoundException("Không tìm thấy người tạo đơn.");
            }

            // Validate ExpectedDeliveryDate
            if (request.ExpectedDeliveryDate.HasValue && request.ExpectedDeliveryDate.Value < DateOnly.FromDateTime(DateTime.Today))
            {
                throw new InvalidOperationException("Ngày giao hàng dự kiến không được trong quá khứ.");
            }

            var itemIds = request.Lines.Select(x => x.ItemId).Distinct().ToList();
            var items = await _context.Items
                .Where(i => itemIds.Contains(i.ItemId))
                .ToDictionaryAsync(i => i.ItemId, i => i);

            if (items.Count != itemIds.Count)
            {
                throw new KeyNotFoundException("Có vật tư không tồn tại trong hệ thống.");
            }

            if (items.Values.Any(i => !i.IsActive))
            {
                throw new InvalidOperationException("Có vật tư đang không hoạt động.");
            }

            if (request.Lines.GroupBy(x => x.ItemId).Any(g => g.Count() > 1))
            {
                throw new InvalidOperationException("Một vật tư không được xuất hiện nhiều hơn 1 lần trong cùng đơn mua.");
            }

            var poCode = await GenerateNextPoCodeAsync();
            var now = DateTime.UtcNow;
            var discount = request.DiscountAmount ?? 0m;

            var po = new PurchaseOrder
            {
                Pocode = poCode,
                RequestedBy = requestedByUserId,
                SupplierId = request.SupplierId,
                RequestedDate = DateOnly.FromDateTime(now),
                Justification = request.Justification,
                // Sử dụng Status từ request, nếu null thì để database tự set default
                   Status = request.Status ?? "PENDING",
                CurrentStageNo = 1,
                CreatedAt = now,
                SubmittedAt = now,
                UpdatedAt = now,
                ExpectedDeliveryDate = request.ExpectedDeliveryDate,
                LifecycleStatus = "PendingRcv", // PendingReceipt
                DiscountAmount = discount,
                ResponsibleUserId = request.ResponsibleUserId,
                WarehouseId = request.WarehouseId
            };

            decimal totalAmount = 0m;
            foreach (var line in request.Lines)
            {
                if (line.OrderedQty <= 0)
                {
                    throw new InvalidOperationException("Số lượng đặt phải lớn hơn 0.");
                }

                if (line.UnitPrice < 0)
                {
                    throw new InvalidOperationException("Đơn giá không được âm.");
                }

                var item = items[line.ItemId];
                var lineTotal = line.OrderedQty * line.UnitPrice;
                totalAmount += lineTotal;

                po.PurchaseOrderLines.Add(new PurchaseOrderLine
                {
                    ItemId = line.ItemId,
                    OrderedQty = line.OrderedQty,
                    UomId = item.BaseUomId,
                    Note = line.Note,
                    ReceivedQty = 0,
                    LineStatus = "Open", // PendingReceipt
                    UnitPrice = line.UnitPrice,
                    Currency = "VND",
                    LineTotal = lineTotal
                });
            }

            if (discount > totalAmount)
            {
                throw new InvalidOperationException("Giảm giá không được lớn hơn tổng tiền đơn hàng.");
            }

            var netAmount = totalAmount - discount;
            po.TotalAmount = totalAmount;
            po.NetAmount = netAmount;

            _context.PurchaseOrders.Add(po);
            await _context.SaveChangesAsync();

            // Ghi audit log khi tạo PO
            await _auditLogService.LogAsync(
                requestedByUserId,
                AuditAction.Create,
                AuditEntity.PurchaseOrder,
                po.PurchaseOrderId,
                $"Tạo đơn mua hàng {po.Pocode}");

            return new PurchaseOrderDetailResponse
            {
                PurchaseOrderId = po.PurchaseOrderId,
                POCode = po.Pocode,
                Status = po.Status,
                LifecycleStatus = po.LifecycleStatus,
                CurrentStageNo = po.CurrentStageNo,
                RequestedBy = po.RequestedBy,
                RequestedByName = requestedByUser.FullName,
                ResponsibleUserId = po.ResponsibleUserId,
                ResponsibleUserName = responsibleUser?.FullName,
                SupplierId = po.SupplierId,
                SupplierName = supplier.SupplierName,
                WarehouseId = po.WarehouseId,
                WarehouseName = warehouse.WarehouseName,
                RequestedDate = po.RequestedDate,
                ExpectedDeliveryDate = po.ExpectedDeliveryDate,
                Justification = po.Justification,
                TotalAmount = po.TotalAmount,
                DiscountAmount = po.DiscountAmount,
                NetAmount = po.NetAmount ?? 0,
                CreatedAt = po.CreatedAt,
                SubmittedAt = po.SubmittedAt,
                UpdatedAt = po.UpdatedAt,
                Lines = po.PurchaseOrderLines.Select(x => new PurchaseOrderLineResponse
                {
                    PurchaseOrderLineId = x.PurchaseOrderLineId,
                    ItemId = x.ItemId,
                    ItemCode = items[x.ItemId].ItemCode,
                    ItemName = items[x.ItemId].ItemName,
                    UomId = x.UomId,
                    OrderedQty = x.OrderedQty,
                    ReceivedQty = x.ReceivedQty,
                    UnitPrice = x.UnitPrice ?? 0,
                    LineTotal = x.LineTotal ?? 0,
                    Currency = x.Currency ?? "VND",
                    LineStatus = x.LineStatus,
                    Note = x.Note
                }).ToList()
            };
        }

        public Task<bool> CancelPurchaseOrderAsync(long id)
        {
            throw new NotImplementedException();
        }

        public async Task<PurchaseOrderDetailResponse> UpdatePurchaseOrderAsync(long poId, long userId, UpdatePurchaseOrderRequest request)
        {
            // Lấy PO cùng với lines
            var po = await _context.PurchaseOrders
                .Include(p => p.PurchaseOrderLines)
                .FirstOrDefaultAsync(p => p.PurchaseOrderId == poId);

            if (po == null)
            {
                throw new KeyNotFoundException("Không tìm thấy đơn mua hàng.");
            }

            // Chỉ cho sửa khi PO còn ở trạng thái chờ duyệt
            var pendingStatuses = new[] { "PENDING", "DRAFT", "PENDING_DIR", "PENDING_ACC" };
            if (!pendingStatuses.Contains(po.Status))
            {
                throw new InvalidOperationException("Chỉ có thể sửa đơn mua hàng đang ở trạng thái chờ duyệt.");
            }

            // Kiểm tra không cho sửa nếu đã có GRN
            var hasGrn = await _context.GoodsReceiptNotes
                .AnyAsync(g => g.PurchaseOrderId == poId && g.Status == "POSTED");
            if (hasGrn)
            {
                throw new InvalidOperationException("Không thể sửa đơn mua hàng đã có đơn nhập kho.");
            }

            // Cập nhật thông tin chung (chỉ khi có giá trị)
            if (request.SupplierId.HasValue)
            {
                po.SupplierId = request.SupplierId.Value;
            }

            if (request.WarehouseId.HasValue)
            {
                po.WarehouseId = request.WarehouseId.Value;
            }

            if (request.ExpectedDeliveryDate.HasValue)
            {
                po.ExpectedDeliveryDate = request.ExpectedDeliveryDate;
            }

            if (request.Justification != null)
            {
                po.Justification = request.Justification;
            }

            if (request.ResponsibleUserId.HasValue)
            {
                po.ResponsibleUserId = request.ResponsibleUserId.Value;
            }

            if (request.DiscountAmount.HasValue)
            {
                po.DiscountAmount = request.DiscountAmount.Value;
            }

            // Cập nhật lines nếu có
            if (request.Lines != null && request.Lines.Any())
            {
                foreach (var lineRequest in request.Lines)
                {
                    var line = po.PurchaseOrderLines.FirstOrDefault(l => l.PurchaseOrderLineId == lineRequest.LineId);
                    if (line == null)
                    {
                        throw new KeyNotFoundException($"Không tìm thấy dòng đơn với ID = {lineRequest.LineId}");
                    }

                    line.OrderedQty = lineRequest.OrderedQty;
                    line.UnitPrice = lineRequest.UnitPrice;
                    line.LineTotal = lineRequest.OrderedQty * lineRequest.UnitPrice;
                    line.Note = lineRequest.Note;
                }
            }

            // Tính lại TotalAmount và NetAmount
            po.TotalAmount = po.PurchaseOrderLines.Sum(l => l.LineTotal ?? 0);
            po.NetAmount = po.TotalAmount - po.DiscountAmount;
            if (po.NetAmount < 0) po.NetAmount = 0;

            po.UpdatedAt = DateTime.UtcNow;

            // Audit log
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Update,
                AuditEntity.PurchaseOrder,
                po.PurchaseOrderId,
                $"Cập nhật đơn mua hàng {po.Pocode}");

            await _context.SaveChangesAsync();

            return await GetPurchaseOrderByIdAsync(poId) ?? throw new Exception("Lỗi khi lấy thông tin PO");
        }

        private async Task<string> GenerateNextPoCodeAsync()
        {
            var poCodes = await _context.PurchaseOrders
                .Where(p => p.Pocode.StartsWith("PO"))
                .Select(p => p.Pocode)
                .ToListAsync();

            var maxNumber = 0;
            foreach (var code in poCodes)
            {
                if (code.Length <= 2) continue;

                var numberPart = code.Substring(2);
                if (int.TryParse(numberPart, out var number) && number > maxNumber)
                {
                    maxNumber = number;
                }
            }

            return $"PO{maxNumber + 1}";
        }
    }
}
