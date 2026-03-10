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
    public class PurchaseOrderService : IPurchaseOrderService
    {
        private readonly Mkiwms5Context _context;

        public PurchaseOrderService(Mkiwms5Context context)
        {
            _context = context;
        }

        public Task<PagedResponse<PurchaseOrderResponse>> GetPurchaseOrdersAsync(
            int page,
            int pageSize,
            string? poCode,
            string? supplierName,
            string? status,
            DateTime? fromDate,
            DateTime? toDate,
            string? requestedByName)
        {
            throw new NotImplementedException();
        }

        public Task<PurchaseOrderDetailResponse?> GetPurchaseOrderByIdAsync(long id)
        {
            throw new NotImplementedException();
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
                Status = "DRAFT",
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
