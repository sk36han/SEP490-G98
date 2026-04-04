using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service
{
    public class GoodsReceiptNoteService : IGoodsReceiptNoteService
    {
        private readonly Mkiwms5Context _context;
        private readonly INotificationService _notificationService;
        private readonly IAuditLogService _auditLogService;

        public GoodsReceiptNoteService(Mkiwms5Context context, INotificationService notificationService, IAuditLogService auditLogService)
        {
            _context = context;
            _notificationService = notificationService;
            _auditLogService = auditLogService;
        }

        public async Task<PagedResponse<GoodsReceiptNoteResponse>> GetGoodsReceiptNotesAsync(int page, int pageSize)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;

            var query = _context.GoodsReceiptNotes
                .Include(grn => grn.Supplier)
                .Include(grn => grn.Warehouse)
                .Include(grn => grn.CreatedByNavigation)
                .Include(grn => grn.PurchaseOrder)
                .AsQueryable();

            var totalItems = await query.CountAsync();

            var items = await query
                .OrderByDescending(grn => grn.Grnid)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(grn => new GoodsReceiptNoteResponse
                {
                    GrnId = grn.Grnid,
                    GrnCode = grn.Grncode,
                    ReceiptDate = grn.ReceiptDate,
                    Status = grn.Status,
                    IsPaid = grn.IsPaid,
                    PurchaseOrderId = grn.PurchaseOrderId,
                    PurchaseOrderCode = grn.PurchaseOrder != null ? grn.PurchaseOrder.Pocode : null,
                    SupplierId = grn.SupplierId,
                    SupplierName = grn.Supplier != null ? grn.Supplier.SupplierName : null,
                    WarehouseId = grn.WarehouseId,
                    WarehouseName = grn.Warehouse != null ? grn.Warehouse.WarehouseName : null,
                    CreatedBy = grn.CreatedBy,
                    CreatedByName = grn.CreatedByNavigation != null ? grn.CreatedByNavigation.FullName : null,
                    TotalReceivedQty = grn.TotalReceivedQty,
                    TotalAmount = grn.TotalGoodsAmount,
                    ShippingFee = grn.ShippingFee,
                    NetAmount = grn.TotalGoodsAmount + grn.ShippingFee,
                    CreatedAt = DateTime.UtcNow,
                    Note = grn.Note
                })
                .ToListAsync();

            return new PagedResponse<GoodsReceiptNoteResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = items
            };
        }

        public async Task<GoodsReceiptNoteResponse> CreateGRNAsync(long userId, CreateGRNRequest request)
        {
            // Validate PurchaseOrder
            var purchaseOrder = await _context.PurchaseOrders
                .Include(po => po.PurchaseOrderLines)
                .FirstOrDefaultAsync(po => po.PurchaseOrderId == request.PurchaseOrderId);

            if (purchaseOrder == null)
            {
                throw new KeyNotFoundException("Không tìm thấy đơn mua hàng.");
            }

            // Validate Warehouse
            var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.WarehouseId == request.WarehouseId);
            if (warehouse == null)
            {
                throw new KeyNotFoundException("Không tìm thấy kho nhận.");
            }
            if (!warehouse.IsActive)
            {
                throw new InvalidOperationException("Kho nhận đang không hoạt động.");
            }

            // Validate Supplier
            var supplier = await _context.Suppliers.FirstOrDefaultAsync(s => s.SupplierId == request.SupplierId);
            if (supplier == null)
            {
                throw new KeyNotFoundException("Không tìm thấy nhà cung cấp.");
            }
            if (!supplier.IsActive)
            {
                throw new InvalidOperationException("Nhà cung cấp đang không hoạt động.");
            }

            // Validate User
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                throw new KeyNotFoundException("Không tìm thấy người dùng.");
            }

            // Validate Items
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

            // Validate UOM
            var uomIds = request.Lines.Select(x => x.UomId).Distinct().ToList();
            var uoms = await _context.UnitOfMeasures
                .Where(u => uomIds.Contains(u.UomId))
                .ToDictionaryAsync(u => u.UomId, u => u);

            if (uoms.Count != uomIds.Count)
            {
                throw new KeyNotFoundException("Có đơn vị tính không tồn tại.");
            }

            // Tạo GRN Code
            var grnCode = await GenerateNextGrnCodeAsync();

            // Tính toán totals
            decimal totalGoodsAmount = 0;
            decimal totalReceivedQty = 0;
            decimal discountAmount = 0;

            // Tính discount
            if (request.DiscountValue.HasValue && request.DiscountValue > 0)
            {
                if (request.DiscountType == "Percentage")
                {
                    // Tính tổng tiền hàng trước
                    foreach (var line in request.Lines)
                    {
                        var lineTotal = line.ActualQty * (line.UnitPrice ?? 0);
                        totalGoodsAmount += lineTotal;
                    }
                    discountAmount = totalGoodsAmount * (request.DiscountValue.Value / 100);
                }
                else // Amount
                {
                    foreach (var line in request.Lines)
                    {
                        var lineTotal = line.ActualQty * (line.UnitPrice ?? 0);
                        totalGoodsAmount += lineTotal;
                    }
                    discountAmount = request.DiscountValue.Value;
                }
            }
            else
            {
                foreach (var line in request.Lines)
                {
                    var lineTotal = line.ActualQty * (line.UnitPrice ?? 0);
                    totalGoodsAmount += lineTotal;
                }
            }

            totalGoodsAmount = totalGoodsAmount - discountAmount;
            if (totalGoodsAmount < 0)
            {
                throw new InvalidOperationException("Giảm giá không được lớn hơn tổng giá trị hàng hóa.");
            }

            foreach (var line in request.Lines)
            {
                totalReceivedQty += line.ActualQty;
            }

            var shippingFee = request.ShippingFee ?? 0;
            var netAmount = totalGoodsAmount + shippingFee;

            var grn = new GoodsReceiptNote
            {
                Grncode = grnCode,
                PurchaseOrderId = request.PurchaseOrderId,
                SupplierId = request.SupplierId,
                WarehouseId = request.WarehouseId,
                ReceiptDate = request.ReceiptDate,
                CreatedBy = userId,
                Status = "PENDING_ACC", // Chờ duyệt
                SubmittedAt = DateTime.UtcNow, // Tạo xong là submit luôn
                Note = request.Note,
                ShippingFee = shippingFee,
                IsPaid = request.IsPaid,
                PaymentMethod = request.PaymentMethod,
                TotalReceivedQty = totalReceivedQty,
                TotalGoodsAmount = totalGoodsAmount
            };

            _context.GoodsReceiptNotes.Add(grn);
            await _context.SaveChangesAsync();

            foreach (var line in request.Lines)
            {
                var lineTotal = line.ActualQty * (line.UnitPrice ?? 0);

                var grnLine = new GoodsReceiptNoteLine
                {
                    Grnid = grn.Grnid,
                    ItemId = line.ItemId,
                    ExpectedQty = line.ExpectedQty,
                    ActualQty = line.ActualQty,
                    UomId = line.UomId,
                    RequiresCocq = line.HasCQ, // CQ = Certificate of Quality
                    PurchaseOrderLineId = line.PurchaseOrderLineId,
                    UnitPrice = line.UnitPrice,
                    LineTotal = lineTotal
                };

                _context.GoodsReceiptNoteLines.Add(grnLine);
            }

            // Tạo InventoryTransaction để ghi nhận lịch sử nhập kho
            var inventoryTxn = new InventoryTransaction
            {
                TxnType = "INBOUND",
                TxnDate = DateTime.UtcNow,
                WarehouseId = grn.WarehouseId,
                ReferenceType = "GRN",
                ReferenceId = grn.Grnid,
                Status = "POSTED",
                PostedBy = userId,
                PostedAt = DateTime.UtcNow
            };
            _context.InventoryTransactions.Add(inventoryTxn);
            await _context.SaveChangesAsync();

            // Tạo InventoryTransactionLine cho từng item
            foreach (var grnLine in grn.GoodsReceiptNoteLines)
            {
                var txnLine = new InventoryTransactionLine
                {
                    InventoryTxnId = inventoryTxn.InventoryTxnId,
                    ItemId = grnLine.ItemId,
                    QtyChange = grnLine.ActualQty,
                    UomId = grnLine.UomId,
                    Note = $"Nhập theo {grn.Grncode}"
                };
                _context.InventoryTransactionLines.Add(txnLine);
            }

            await _auditLogService.LogAsync(
                userId,
                "CREATE",
                "GoodsReceiptNote",
                grn.Grnid,
                $"Tạo phiếu nhập {grn.Grncode}"
            );

            // Gửi thông báo cho Kế toán nếu đơn ở trạng thái chờ duyệt
            if (grn.Status == "PENDING_ACC")
            {
                await _notificationService.CreateForRolesAsync(
                    new[] { "KT" },
                    "Phiếu nhập kho mới chờ duyệt",
                    $"Phiếu nhập {grnCode} vừa được tạo bởi {user.FullName} và đang chờ Kế toán phê duyệt.",
                    "GoodsReceipt",
                    grn.Grnid,
                    userId,
                    "NewRequest"
                );
            }

            return new GoodsReceiptNoteResponse
            {
                GrnId = grn.Grnid,
                GrnCode = grn.Grncode,
                ReceiptDate = grn.ReceiptDate,
                Status = grn.Status,
                IsPaid = grn.IsPaid,
                PurchaseOrderId = grn.PurchaseOrderId,
                PurchaseOrderCode = purchaseOrder.Pocode,
                SupplierId = grn.SupplierId,
                SupplierName = supplier.SupplierName,
                WarehouseId = grn.WarehouseId,
                WarehouseName = warehouse.WarehouseName,
                CreatedBy = grn.CreatedBy,
                CreatedByName = user.FullName,
                TotalReceivedQty = grn.TotalReceivedQty,
                TotalAmount = grn.TotalGoodsAmount,
                ShippingFee = grn.ShippingFee,
                NetAmount = netAmount,
                CreatedAt = DateTime.UtcNow,
                Note = grn.Note
            };
        }

        private async Task<string> GenerateNextGrnCodeAsync()
        {
            var grnCodes = await _context.GoodsReceiptNotes
                .Where(g => g.Grncode.StartsWith("GRN"))
                .Select(g => g.Grncode)
                .ToListAsync();

            var maxNumber = 0;
            foreach (var code in grnCodes)
            {
                if (code.Length <= 3) continue;

                var numberPart = code.Substring(3);
                if (int.TryParse(numberPart, out var number) && number > maxNumber)
                {
                    maxNumber = number;
                }
            }

            return $"GRN{maxNumber + 1}";
        }

        public async Task<GoodsReceiptNoteResponse> ApproveGRNAsync(long grnId, long userId, ApproveGRNRequest request)
        {
            // Lấy GRN cùng với lines và PO
            var grn = await _context.GoodsReceiptNotes
                .Include(g => g.GoodsReceiptNoteLines)
                .Include(g => g.PurchaseOrder)
                    .ThenInclude(po => po.PurchaseOrderLines)
                .FirstOrDefaultAsync(g => g.Grnid == grnId);

            if (grn == null)
            {
                throw new KeyNotFoundException("Không tìm thấy phiếu nhập kho.");
            }

            // Kiểm tra status
            if (grn.Status != "PENDING_ACC")
            {
                throw new InvalidOperationException("Chỉ có thể duyệt phiếu nhập kho đang chờ duyệt.");
            }

            // Cập nhật GRN status thành POST
            grn.Status = "POSTED";
            grn.PostedAt = DateTime.UtcNow;
            grn.ApprovedAt = DateTime.UtcNow;

            // Tính tổng giá trị GRN để phân bổ shipping
            var totalGrnAmount = grn.GoodsReceiptNoteLines
                .Sum(l => (l.UnitPrice ?? 0) * l.ActualQty);

            // Lấy thông tin PO
            var purchaseOrder = grn.PurchaseOrder;
            if (purchaseOrder != null)
            {
                // Duyệt từng line của GRN
                foreach (var grnLine in grn.GoodsReceiptNoteLines)
                {
                    // Tìm PO line tương ứng
                    var poLine = purchaseOrder.PurchaseOrderLines
                        .FirstOrDefault(l => l.PurchaseOrderLineId == grnLine.PurchaseOrderLineId);

                    if (poLine != null)
                    {
                        // Kiểm tra số lượng nhập không vượt quá số lượng đặt
                        var totalReceived = poLine.ReceivedQty + grnLine.ActualQty;
                        if (totalReceived > poLine.OrderedQty)
                        {
                            throw new InvalidOperationException($"Số lượng nhập vượt quá số lượng đặt cho item {grnLine.ItemId}.");
                        }

                        // Cập nhật ReceivedQty trong PO Line
                        poLine.ReceivedQty = totalReceived;

                        // Cập nhật LineStatus
                        if (totalReceived >= poLine.OrderedQty)
                        {
                            poLine.LineStatus = "FullyReceived";
                        }
                        else if (totalReceived > 0)
                        {
                            poLine.LineStatus = "PartiallyReceived";
                        }
                    }

                    // Cập nhật tồn kho (InventoryOnHand)
                    var inventory = await _context.InventoryOnHands
                        .FirstOrDefaultAsync(i => i.WarehouseId == grn.WarehouseId && i.ItemId == grnLine.ItemId);

                    var purchasePrice = grnLine.UnitPrice;

                    // Phân bổ shipping theo tỷ trọng giá trị
                    var lineAmount = (purchasePrice ?? 0) * grnLine.ActualQty;
                    var shippingRatio = totalGrnAmount > 0 ? lineAmount / totalGrnAmount : 0;
                    var shippingForLine = grn.ShippingFee * shippingRatio;
                    var shippingPerUnit = grnLine.ActualQty > 0 ? shippingForLine / grnLine.ActualQty : 0;

                    // Cost = Purchase + Shipping phân bổ
                    var costPrice = (purchasePrice ?? 0) + shippingPerUnit;

                    if (inventory != null)
                    {
                        // Cộng dồn số lượng tồn kho
                        var oldQty = inventory.OnHandQty;
                        var oldCost = inventory.UnitCost;
                        var newQty = grnLine.ActualQty;

                        // Tính bình quân gia quyền với Cost đã bao gồm shipping
                        if (oldQty > 0 && newQty > 0 && costPrice > 0)
                        {
                            inventory.UnitCost = (oldQty * oldCost + newQty * costPrice) / (oldQty + newQty);
                        }
                        else if (newQty > 0 && costPrice > 0)
                        {
                            inventory.UnitCost = costPrice;
                        }

                        inventory.OnHandQty += newQty;
                        inventory.UpdatedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        // Tạo mới inventory nếu chưa có
                        var newInventory = new InventoryOnHand
                        {
                            WarehouseId = grn.WarehouseId,
                            ItemId = grnLine.ItemId,
                            OnHandQty = grnLine.ActualQty,
                            ReservedQty = 0,
                            UnitCost = costPrice, // Cost = Purchase + Shipping
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.InventoryOnHands.Add(newInventory);
                    }

                    // Tạo InventoryLot cho FIFO
                    var lot = new InventoryLot
                    {
                        ItemId = grnLine.ItemId,
                        WarehouseId = grn.WarehouseId,
                        GrnlineId = grnLine.GrnlineId,
                        ReceiptDate = grn.ReceiptDate.ToDateTime(TimeOnly.MinValue),
                        Quantity = grnLine.ActualQty,
                        UnitCost = costPrice,
                        IsActive = true
                    };
                    _context.InventoryLots.Add(lot);

                    // Cập nhật giá mua (Purchase) vào ItemPrice
                    // ItemPrice lưu lịch sử giá theo từng đợt nhập hàng
                    // Giá thực tế để bán nằm trong InventoryLot theo từng lô
                    if (purchasePrice.HasValue && purchasePrice > 0)
                    {
                        var today = DateOnly.FromDateTime(DateTime.UtcNow);

                        // Deactive giá Purchase cũ chỉ khi đã active từ ngày trước
                        // Nếu cùng ngày thì giữ nguyên để tránh khoảng trống
                        var existingPurchasePrices = _context.ItemPrices
                            .Where(p => p.ItemId == grnLine.ItemId && p.PriceType == "Purchase" && p.IsActive)
                            .ToList();
                        foreach (var price in existingPurchasePrices)
                        {
                            if (price.EffectiveFrom < today)
                            {
                                price.IsActive = false;
                                price.EffectiveTo = today.AddDays(-1);
                            }
                        }

                        // Luôn tạo ItemPrice mới cho mỗi đợt nhập hàng
                        _context.ItemPrices.Add(new ItemPrice
                        {
                            ItemId = grnLine.ItemId,
                            PriceType = "Purchase",
                            Amount = purchasePrice.Value,
                            Currency = "VND",
                            EffectiveFrom = today,
                            EffectiveTo = null,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }

                // Cập nhật PO LifecycleStatus
                var totalOrderedQty = purchaseOrder.PurchaseOrderLines.Sum(l => l.OrderedQty);
                var totalReceivedQty = purchaseOrder.PurchaseOrderLines.Sum(l => l.ReceivedQty);

                if (totalReceivedQty >= totalOrderedQty)
                {
                    purchaseOrder.LifecycleStatus = "FullRcv"; // Nhận đủ
                }
                else if (totalReceivedQty > 0)
                {
                    purchaseOrder.LifecycleStatus = "PartRcv"; // Nhận một phần
                }
            }

            // Audit log
            await _auditLogService.LogAsync(
                userId,
                "APPROVE",
                "GoodsReceiptNote",
                grn.Grnid,
                $"Duyệt phiếu nhập kho {grn.Grncode}"
            );

            await _context.SaveChangesAsync();

            // Gửi thông báo kết quả cho người tạo đơn
            await _notificationService.CreateAsync(
                grn.CreatedBy,
                $"Phiếu nhập kho {grn.Grncode} ĐÃ ĐƯỢC DUYỆT",
                $"Phiếu nhập kho {grn.Grncode} của bạn đã được kế toán phê duyệt và ghi sổ.",
                "GoodsReceipt",
                grn.Grnid,
                "ApprovalResult",
                1 // Info level
            );

            // Trả về kết quả
            return new GoodsReceiptNoteResponse
            {
                GrnId = grn.Grnid,
                GrnCode = grn.Grncode,
                ReceiptDate = grn.ReceiptDate,
                Status = grn.Status,
                IsPaid = grn.IsPaid,
                PurchaseOrderId = grn.PurchaseOrderId,
                PurchaseOrderCode = purchaseOrder?.Pocode,
                SupplierId = grn.SupplierId,
                WarehouseId = grn.WarehouseId,
                CreatedBy = grn.CreatedBy,
                TotalReceivedQty = grn.TotalReceivedQty,
                TotalAmount = grn.TotalGoodsAmount,
                ShippingFee = grn.ShippingFee,
                NetAmount = grn.TotalGoodsAmount + grn.ShippingFee,
                CreatedAt = grn.PostedAt ?? DateTime.UtcNow,
                Note = grn.Note
            };
        }

        public async Task<GRNDetailResponse> GetGRNDetailAsync(long grnId)
        {
            var grn = await _context.GoodsReceiptNotes
                .Include(g => g.Supplier)
                .Include(g => g.Warehouse)
                .Include(g => g.CreatedByNavigation)
                .Include(g => g.PurchaseOrder)
                .Include(g => g.GoodsReceiptNoteLines)
                    .ThenInclude(l => l.Item)
                .Include(g => g.GoodsReceiptNoteLines)
                    .ThenInclude(l => l.Uom)
                .FirstOrDefaultAsync(g => g.Grnid == grnId);

            if (grn == null)
            {
                throw new KeyNotFoundException("Không tìm thấy phiếu nhập kho.");
            }

            var lines = grn.GoodsReceiptNoteLines.Select(l => new GRNLineDetailResponse
            {
                GrnlineId = l.GrnlineId,
                ItemId = l.ItemId,
                ItemName = l.Item != null ? l.Item.ItemName : null,
                ItemCode = l.Item != null ? l.Item.ItemCode : null,
                ExpectedQty = l.ExpectedQty ?? 0,
                ActualQty = l.ActualQty,
                UomId = l.UomId,
                UomName = l.Uom != null ? l.Uom.UomName : null,
                UnitPrice = l.UnitPrice,
                LineTotal = l.LineTotal,
                HasCO = l.RequiresCocq,
                HasCQ = l.RequiresCocq,
                PurchaseOrderLineId = l.PurchaseOrderLineId
            }).ToList();

            return new GRNDetailResponse
            {
                GrnId = grn.Grnid,
                GrnCode = grn.Grncode,
                ReceiptDate = grn.ReceiptDate,
                Status = grn.Status,
                IsPaid = grn.IsPaid,
                PaymentMethod = grn.PaymentMethod,
                PurchaseOrderId = grn.PurchaseOrderId,
                PurchaseOrderCode = grn.PurchaseOrder?.Pocode,
                SupplierId = grn.SupplierId,
                SupplierName = grn.Supplier?.SupplierName,
                WarehouseId = grn.WarehouseId,
                WarehouseName = grn.Warehouse?.WarehouseName,
                CreatedBy = grn.CreatedBy,
                CreatedByName = grn.CreatedByNavigation?.FullName,
                TotalReceivedQty = grn.TotalReceivedQty,
                TotalAmount = grn.TotalGoodsAmount,
                ShippingFee = grn.ShippingFee,
                NetAmount = grn.TotalGoodsAmount + grn.ShippingFee,
                CreatedAt = DateTime.UtcNow,
                SubmittedAt = grn.SubmittedAt,
                PostedAt = grn.PostedAt,
                Note = grn.Note,
                Lines = lines
            };
        }
    }
}
