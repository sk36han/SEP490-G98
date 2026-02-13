using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service
{
    public class PurchaseOrderService : IPurchaseOrderService
    {
        private readonly IGenericRepository<PurchaseOrder> _purchaseOrderRepository;



        public PurchaseOrderService(IGenericRepository<PurchaseOrder> purchaseOrderRepository)
        {
            _purchaseOrderRepository = purchaseOrderRepository;
        }

        public async Task<PagedResponse<PurchaseOrderResponse>> GetPurchaseOrdersAsync(
            int page,
            int pageSize,
            string? poCode,
            string? supplierName,
            string? status,
            DateTime? fromDate,
            DateTime? toDate,
            string? requestedByName)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;


            
            var context = ((GenericRepository<PurchaseOrder>)_purchaseOrderRepository).Context;

            var query = context.PurchaseOrders
                .Include(po => po.Supplier)
                .Include(po => po.RequestedByNavigation)
                .AsQueryable();

            // 1. SEARCH & FILTER
            if (!string.IsNullOrWhiteSpace(poCode))
            {
                query = query.Where(po => po.Pocode.Contains(poCode));
            }

            if (!string.IsNullOrWhiteSpace(supplierName))
            {
                query = query.Where(po => po.Supplier != null && po.Supplier.SupplierName.Contains(supplierName));
            }
            
            if (!string.IsNullOrWhiteSpace(requestedByName))
            {
                query = query.Where(po => po.RequestedByNavigation.FullName.Contains(requestedByName));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                // Exact match for status usually, or contains? Let's use Contains for flexibility or specific if Enum
                // Status is string in DB.
                query = query.Where(po => po.Status == status);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(po => po.CreatedAt >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(po => po.CreatedAt <= toDate.Value);
            }

            // 2. Total
            var totalItems = await query.CountAsync();

            // 3. Paging
            var items = await query
                .OrderByDescending(po => po.CreatedAt) // Newest first
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(po => new PurchaseOrderResponse
                {
                    PurchaseOrderId = po.PurchaseOrderId,
                    Pocode = po.Pocode,
                    RequestedBy = po.RequestedBy,
                    SupplierId = po.SupplierId,
                    RequestedDate = po.RequestedDate,
                    Justification = po.Justification,
                    Status = po.Status,
                    CurrentStageNo = po.CurrentStageNo,
                    CreatedAt = po.CreatedAt,
                    SubmittedAt = po.SubmittedAt,
                    UpdatedAt = po.UpdatedAt,
                    SupplierName = po.Supplier != null ? po.Supplier.SupplierName : null,
                    RequestedByName = po.RequestedByNavigation.FullName
                })
                .ToListAsync();

            // 4. Return
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
            var context = ((GenericRepository<PurchaseOrder>)_purchaseOrderRepository).Context;

            var po = await context.PurchaseOrders
                .Include(p => p.Supplier)
                .Include(p => p.RequestedByNavigation)
                .Include(p => p.PurchaseOrderLines)
                    .ThenInclude(line => line.Item)
                .Include(p => p.PurchaseOrderLines)
                    .ThenInclude(line => line.Uom)
                .FirstOrDefaultAsync(p => p.PurchaseOrderId == id);

            if (po == null)
            {
                return null;
            }

            return new PurchaseOrderDetailResponse
            {
                PurchaseOrderId = po.PurchaseOrderId,
                Pocode = po.Pocode,
                RequestedBy = po.RequestedBy,
                SupplierId = po.SupplierId,
                RequestedDate = po.RequestedDate,
                Justification = po.Justification,
                Status = po.Status,
                CurrentStageNo = po.CurrentStageNo,
                CreatedAt = po.CreatedAt,
                SubmittedAt = po.SubmittedAt,
                UpdatedAt = po.UpdatedAt,
                SupplierName = po.Supplier != null ? po.Supplier.SupplierName : null,
                RequestedByName = po.RequestedByNavigation.FullName,
                PurchaseOrderLines = po.PurchaseOrderLines.Select(line => new PurchaseOrderLineResponse
                {
                    PurchaseOrderLineId = line.PurchaseOrderLineId,
                    PurchaseOrderId = line.PurchaseOrderId,
                    ItemId = line.ItemId,
                    ItemCode = line.Item.ItemCode,
                    ItemName = line.Item.ItemName,
                    OrderedQty = line.OrderedQty,
                    UomId = line.UomId,
                    UomName = line.Uom.UomName,
                    Note = line.Note
                }).ToList()
            };
        }

        public async Task<PurchaseOrderDetailResponse> CreatePurchaseOrderAsync(long requestedByUserId, CreatePurchaseOrderRequest request)
        {
            var context = ((GenericRepository<PurchaseOrder>)_purchaseOrderRepository).Context;

            // 1. Validate PO Code uniqueness
            var isDuplicate = await context.PurchaseOrders.AnyAsync(p => p.Pocode == request.Pocode);
            if (isDuplicate)
            {
                throw new InvalidOperationException($"Mã đơn hàng '{request.Pocode}' đã tồn tại trong hệ thống.");
            }

            using var transaction = await context.Database.BeginTransactionAsync();
            try
            {
                // 2. Map & Create Header
                var purchaseOrder = new PurchaseOrder
                {
                    Pocode = request.Pocode,
                    RequestedBy = requestedByUserId,
                    SupplierId = request.SupplierId,
                    RequestedDate = request.RequestedDate,
                    Justification = request.Justification,
                    Status = request.Status,
                    CurrentStageNo = request.CurrentStageNo,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                context.PurchaseOrders.Add(purchaseOrder);
                await context.SaveChangesAsync(); // Save to get PurchaseOrderId

                // 3. Map & Create Lines
                foreach (var lineReq in request.OrderLines)
                {
                    var line = new PurchaseOrderLine
                    {
                        PurchaseOrderId = purchaseOrder.PurchaseOrderId,
                        ItemId = lineReq.ItemId,
                        OrderedQty = lineReq.OrderedQty,
                        UomId = lineReq.UomId,
                        Note = lineReq.Note
                    };
                    context.PurchaseOrderLines.Add(line);
                }

                await context.SaveChangesAsync();
                await transaction.CommitAsync();

                // 4. Return created detail
                return await GetPurchaseOrderByIdAsync(purchaseOrder.PurchaseOrderId)
                       ?? throw new Exception("Error retrieving created Purchase Order");
            }
            catch (DbUpdateException ex)
            {
                await transaction.RollbackAsync();
                var message = ex.InnerException?.Message ?? ex.Message;
                throw new InvalidOperationException($"Lỗi DB: {message}");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<PurchaseOrderDetailResponse?> UpdatePurchaseOrderAsync(long id, UpdatePurchaseOrderRequest request)
        {
            var context = ((GenericRepository<PurchaseOrder>)_purchaseOrderRepository).Context;

            var purchaseOrder = await context.PurchaseOrders
                .Include(p => p.PurchaseOrderLines)
                .FirstOrDefaultAsync(p => p.PurchaseOrderId == id);

            if (purchaseOrder == null)
            {
                return null;
            }

            // 1. Validate PO Code uniqueness (if changed)
            if (purchaseOrder.Pocode != request.Pocode)
            {
                var isDuplicate = await context.PurchaseOrders.AnyAsync(p => p.Pocode == request.Pocode && p.PurchaseOrderId != id);
                if (isDuplicate)
                {
                    throw new InvalidOperationException($"Mã đơn hàng '{request.Pocode}' đã tồn tại trong hệ thống.");
                }
            }

            using var transaction = await context.Database.BeginTransactionAsync();
            try
            {
                // 2. Update Header
                purchaseOrder.Pocode = request.Pocode;
                purchaseOrder.SupplierId = request.SupplierId;
                purchaseOrder.RequestedDate = request.RequestedDate;
                purchaseOrder.Justification = request.Justification;
                purchaseOrder.Status = request.Status;
                purchaseOrder.CurrentStageNo = request.CurrentStageNo;
                purchaseOrder.UpdatedAt = DateTime.UtcNow;

                // 3. Update Lines
                // Remove lines that are not in the request
                var requestedLineIds = request.OrderLines
                    .Where(l => l.PurchaseOrderLineId.HasValue)
                    .Select(l => l.PurchaseOrderLineId!.Value)
                    .ToList();

                var linesToRemove = purchaseOrder.PurchaseOrderLines
                    .Where(l => !requestedLineIds.Contains(l.PurchaseOrderLineId))
                    .ToList();

                context.PurchaseOrderLines.RemoveRange(linesToRemove);

                // Add or update lines
                foreach (var lineReq in request.OrderLines)
                {
                    if (lineReq.PurchaseOrderLineId.HasValue)
                    {
                        // Update existing line
                        var existingLine = purchaseOrder.PurchaseOrderLines
                            .FirstOrDefault(l => l.PurchaseOrderLineId == lineReq.PurchaseOrderLineId.Value);

                        if (existingLine != null)
                        {
                            existingLine.ItemId = lineReq.ItemId;
                            existingLine.OrderedQty = lineReq.OrderedQty;
                            existingLine.UomId = lineReq.UomId;
                            existingLine.Note = lineReq.Note;
                        }
                    }
                    else
                    {
                        // Add new line
                        var newLine = new PurchaseOrderLine
                        {
                            PurchaseOrderId = id,
                            ItemId = lineReq.ItemId,
                            OrderedQty = lineReq.OrderedQty,
                            UomId = lineReq.UomId,
                            Note = lineReq.Note
                        };
                        context.PurchaseOrderLines.Add(newLine);
                    }
                }

                await context.SaveChangesAsync();
                await transaction.CommitAsync();

                return await GetPurchaseOrderByIdAsync(id);
            }
            catch (DbUpdateException ex)
            {
                await transaction.RollbackAsync();
                var message = ex.InnerException?.Message ?? ex.Message;
                throw new InvalidOperationException($"Lỗi DB khi cập nhật: {message}");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
