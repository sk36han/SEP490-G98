
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
    public class PurchaseReturnNoteService : IPurchaseReturnNoteService
    {
        private readonly Mkiwms5Context _context;
        private readonly IAuditLogService _auditLogService;

        public PurchaseReturnNoteService(Mkiwms5Context context, IAuditLogService auditLogService)
        {
            _context = context;
            _auditLogService = auditLogService;
        }

        public async Task<PurchaseReturnNoteResponse> CreatePRNAsync(long userId, CreatePRNRequest request)
        {
            // Validate GRN
            var grn = await _context.GoodsReceiptNotes
                .Include(g => g.GoodsReceiptNoteLines)
                    .ThenInclude(l => l.Item)
                .Include(g => g.Supplier)
                .Include(g => g.Warehouse)
                .FirstOrDefaultAsync(g => g.Grnid == request.RelatedGrnId);

            if (grn == null)
            {
                throw new KeyNotFoundException("Khong tim thay phieu nhap kho.");
            }

            if (grn.Status != "POSTED")
            {
                throw new InvalidOperationException("Chi co the tao phieu tra tu phieu nhap kho da duyet.");
            }

            // Validate User
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                throw new KeyNotFoundException("Khong tim thay nguoi dung.");
            }

            // Validate Lines
            var grnLineIds = request.Lines.Select(l => l.RelatedGrnlineId).ToList();
            var grnLines = await _context.GoodsReceiptNoteLines
                .Include(l => l.Item)
                .Where(l => l.Grnid == request.RelatedGrnId && grnLineIds.Contains(l.GrnlineId))
                .ToDictionaryAsync(l => l.GrnlineId);

            if (grnLines.Count != grnLineIds.Count)
            {
                throw new KeyNotFoundException("Co dong phieu nhap khong ton tai trong phieu nhap.");
            }

            // Validate ReturnQty
            foreach (var line in request.Lines)
            {
                var grnLine = grnLines[line.RelatedGrnlineId];

                var totalReturned = await _context.PurchaseReturnNoteLines
                    .Where(l => l.RelatedGrnlineId == grnLine.GrnlineId)
                    .SumAsync(l => l.ReturnQty);

                var availableQty = grnLine.ActualQty - totalReturned;

                if (line.ReturnQty > availableQty)
                {
                    throw new InvalidOperationException($"So luong tra ({line.ReturnQty}) vuot qua so luong kha dung ({availableQty}) cho vat tu {grnLine.Item?.ItemName}.");
                }

                if (line.ReturnQty <= 0)
                {
                    throw new InvalidOperationException("So luong tra phai lon hon 0.");
                }
            }

            // Generate PRN Code
            var prnCode = await GenerateNextPrnCodeAsync();

            // Tinh tong
            decimal totalReturnedQty = 0;
            decimal totalReturnedAmount = 0;

            foreach (var line in request.Lines)
            {
                var grnLine = grnLines[line.RelatedGrnlineId];
                var lineTotal = line.ReturnQty * (grnLine.UnitPrice ?? 0);
                totalReturnedQty += line.ReturnQty;
                totalReturnedAmount += lineTotal;
            }

            var netAmount = totalReturnedAmount + request.FeeAmount;

            // Tao PRN
            var prn = new PurchaseReturnNote
            {
                ReturnCode = prnCode,
                RelatedGrnid = request.RelatedGrnId,
                ReturnDate = request.ReturnDate,
                Status = request.Status ?? "DRAFT",
                Reason = request.Reason,
                Note = request.Note,
                FeeAmount = request.FeeAmount,
                RefundStatus = request.RefundStatus ?? "NotRefunded",
                RefundedAmount = 0,
                SupplierId = grn.SupplierId,
                WarehouseId = grn.WarehouseId,
                TotalReturnedQty = totalReturnedQty,
                TotalReturnedAmount = netAmount,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.PurchaseReturnNotes.Add(prn);
            await _context.SaveChangesAsync();

            // Tao PRN Lines
            foreach (var line in request.Lines)
            {
                var grnLine = grnLines[line.RelatedGrnlineId];
                var lineTotal = line.ReturnQty * (grnLine.UnitPrice ?? 0);

                var prnLine = new PurchaseReturnNoteLine
                {
                    PurchaseReturnId = prn.PurchaseReturnId,
                    ItemId = grnLine.ItemId,
                    UomId = grnLine.UomId,
                    ReturnQty = line.ReturnQty,
                    UnitPrice = grnLine.UnitPrice ?? 0,
                    LineTotal = lineTotal,
                    Reason = line.Reason,
                    Note = line.Note,
                    RelatedGrnlineId = grnLine.GrnlineId
                };

                _context.PurchaseReturnNoteLines.Add(prnLine);

                // Reserve hang trong kho
                var inventory = await _context.InventoryOnHands
                    .FirstOrDefaultAsync(i => i.ItemId == grnLine.ItemId && i.WarehouseId == grn.WarehouseId);

                if (inventory != null)
                {
                    inventory.ReservedQty += line.ReturnQty;
                    inventory.UpdatedAt = DateTime.UtcNow;
                }
            }

            // AuditLog
            await _auditLogService.LogAsync(
                userId,
                "CREATE",
                "PurchaseReturnNote",
                prn.PurchaseReturnId,
                $"Tao phieu tra hang {prnCode} tu phieu nhap {grn.Grncode}"
            );

            await _context.SaveChangesAsync();

            return new PurchaseReturnNoteResponse
            {
                PurchaseReturnId = prn.PurchaseReturnId,
                ReturnCode = prn.ReturnCode,
                RelatedGrnId = prn.RelatedGrnid,
                RelatedGrnCode = grn.Grncode,
                ReturnDate = prn.ReturnDate,
                Status = prn.Status,
                Reason = prn.Reason,
                Note = prn.Note,
                FeeAmount = prn.FeeAmount,
                RefundStatus = prn.RefundStatus,
                SupplierId = prn.SupplierId,
                SupplierName = grn.Supplier?.SupplierName,
                WarehouseId = prn.WarehouseId,
                WarehouseName = grn.Warehouse?.WarehouseName,
                TotalReturnedQty = prn.TotalReturnedQty,
                TotalReturnedAmount = prn.TotalReturnedAmount,
                CreatedBy = prn.CreatedBy,
                CreatedByName = user.FullName,
                CreatedAt = prn.CreatedAt
            };
        }

        public async Task<PagedResponse<PurchaseReturnNoteResponse>> GetPRNsAsync(int page, int pageSize)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;

            var query = _context.PurchaseReturnNotes
                .Include(prn => prn.RelatedGrn)
                .Include(prn => prn.Supplier)
                .Include(prn => prn.Warehouse)
                .Include(prn => prn.CreatedByNavigation)
                .AsQueryable();

            var totalItems = await query.CountAsync();

            var items = await query
                .OrderByDescending(prn => prn.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(prn => new PurchaseReturnNoteResponse
                {
                    PurchaseReturnId = prn.PurchaseReturnId,
                    ReturnCode = prn.ReturnCode,
                    RelatedGrnId = prn.RelatedGrnid,
                    RelatedGrnCode = prn.RelatedGrn != null ? prn.RelatedGrn.Grncode : null,
                    ReturnDate = prn.ReturnDate,
                    Status = prn.Status,
                    Reason = prn.Reason,
                    FeeAmount = prn.FeeAmount,
                    RefundStatus = prn.RefundStatus,
                    RefundedAmount = prn.RefundedAmount,
                    SupplierId = prn.SupplierId,
                    SupplierName = prn.Supplier != null ? prn.Supplier.SupplierName : null,
                    WarehouseId = prn.WarehouseId,
                    WarehouseName = prn.Warehouse != null ? prn.Warehouse.WarehouseName : null,
                    TotalReturnedQty = prn.TotalReturnedQty,
                    TotalReturnedAmount = prn.TotalReturnedAmount,
                    CreatedBy = prn.CreatedBy,
                    CreatedByName = prn.CreatedByNavigation != null ? prn.CreatedByNavigation.FullName : null,
                    CreatedAt = prn.CreatedAt
                })
                .ToListAsync();

            return new PagedResponse<PurchaseReturnNoteResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Items = items
            };
        }

        public async Task<PurchaseReturnNoteDetailResponse> GetPRNDetailAsync(long prnId)
        {
            var prn = await _context.PurchaseReturnNotes
                .Include(p => p.RelatedGrn)
                .Include(p => p.Supplier)
                .Include(p => p.Warehouse)
                .Include(p => p.CreatedByNavigation)
                .Include(p => p.ApprovedByNavigation)
                .Include(p => p.PurchaseReturnNoteLines)
                    .ThenInclude(l => l.Item)
                .Include(p => p.PurchaseReturnNoteLines)
                    .ThenInclude(l => l.Uom)
                .FirstOrDefaultAsync(p => p.PurchaseReturnId == prnId);

            if (prn == null)
            {
                throw new KeyNotFoundException("Khong tim thay phieu tra hang.");
            }

            var lines = prn.PurchaseReturnNoteLines.Select(l => new PRNLineDetailResponse
            {
                PurchaseReturnLineId = l.PurchaseReturnLineId,
                ItemId = l.ItemId,
                ItemCode = l.Item != null ? l.Item.ItemCode : null,
                ItemName = l.Item != null ? l.Item.ItemName : null,
                UomId = l.UomId,
                UomName = l.Uom != null ? l.Uom.UomName : null,
                ReturnQty = l.ReturnQty,
                UnitPrice = l.UnitPrice,
                LineTotal = l.LineTotal,
                Reason = l.Reason,
                Note = l.Note,
                RelatedGrnlineId = l.RelatedGrnlineId
            }).ToList();

            return new PurchaseReturnNoteDetailResponse
            {
                PurchaseReturnId = prn.PurchaseReturnId,
                ReturnCode = prn.ReturnCode,
                RelatedGrnId = prn.RelatedGrnid,
                RelatedGrnCode = prn.RelatedGrn?.Grncode,
                ReturnDate = prn.ReturnDate,
                Status = prn.Status,
                Reason = prn.Reason,
                Note = prn.Note,
                FeeAmount = prn.FeeAmount,
                RefundStatus = prn.RefundStatus,
                RefundedAmount = prn.RefundedAmount,
                RefundMethod = prn.RefundMethod,
                RefundReference = prn.RefundReference,
                RefundedAt = prn.RefundedAt,
                SupplierId = prn.SupplierId,
                SupplierName = prn.Supplier?.SupplierName,
                WarehouseId = prn.WarehouseId,
                WarehouseName = prn.Warehouse?.WarehouseName,
                TotalReturnedQty = prn.TotalReturnedQty,
                TotalReturnedAmount = prn.TotalReturnedAmount,
                CreatedBy = prn.CreatedBy,
                CreatedByName = prn.CreatedByNavigation?.FullName,
                CreatedAt = prn.CreatedAt,
                ApprovedAt = prn.ApprovedAt,
                PostedAt = prn.PostedAt,
                Lines = lines
            };
        }

        public async Task<PurchaseReturnNoteResponse> ApprovePRNAsync(long prnId, long userId)
        {
            var prn = await _context.PurchaseReturnNotes
                .Include(p => p.PurchaseReturnNoteLines)
                .FirstOrDefaultAsync(p => p.PurchaseReturnId == prnId);

            if (prn == null)
            {
                throw new KeyNotFoundException("Khong tim thay phieu tra hang.");
            }

            if (prn.Status?.Equals("CANCELLED", StringComparison.OrdinalIgnoreCase) == true)
            {
                throw new InvalidOperationException("Phieu tra hang da bi huy.");
            }

            if (!string.IsNullOrEmpty(prn.Status) &&
    !prn.Status.Equals("DRAFT", StringComparison.OrdinalIgnoreCase) &&
    !prn.Status.Equals("SUBMITTED", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Phieu tra hang khong o trang thai cho phep duyet.");
            }

            // Cap nhat Status
            prn.Status = "APPROVED";
            prn.ApprovedBy = userId;
            prn.ApprovedAt = DateTime.UtcNow;

            // Tru ton kho - giam ReservedQty (da reserve khi tao), giam OnHandQty (hang di ra)
            foreach (var line in prn.PurchaseReturnNoteLines)
            {
                var inventory = await _context.InventoryOnHands
                    .FirstOrDefaultAsync(i => i.ItemId == line.ItemId && i.WarehouseId == prn.WarehouseId);

                if (inventory != null)
                {
                    inventory.OnHandQty -= line.ReturnQty;
                    inventory.ReservedQty -= line.ReturnQty;
                    if (inventory.OnHandQty < 0) inventory.OnHandQty = 0;
                    if (inventory.ReservedQty < 0) inventory.ReservedQty = 0;
                    inventory.UpdatedAt = DateTime.UtcNow;
                }

                // Tao InventoryTransaction
                var txn = new InventoryTransaction
                {
                    TxnType = "PURCHASE_RETURN",
                    TxnDate = DateTime.UtcNow,
                    WarehouseId = prn.WarehouseId ?? 0,
                    ReferenceType = "PRN",
                    ReferenceId = prn.PurchaseReturnId,
                    Status = "POSTED",
                    PostedBy = userId,
                    PostedAt = DateTime.UtcNow
                };
                _context.InventoryTransactions.Add(txn);
                await _context.SaveChangesAsync();

                var txnLine = new InventoryTransactionLine
                {
                    InventoryTxnId = txn.InventoryTxnId,
                    ItemId = line.ItemId,
                    QtyChange = -line.ReturnQty,
                    UomId = line.UomId,
                    Note = $"Tra hang {prn.ReturnCode}"
                };
                _context.InventoryTransactionLines.Add(txnLine);
            }

            // AuditLog
            await _auditLogService.LogAsync(
                userId,
                "APPROVE",
                "PurchaseReturnNote",
                prn.PurchaseReturnId,
                $"Duyet phieu tra hang {prn.ReturnCode}"
            );

            await _context.SaveChangesAsync();

            return new PurchaseReturnNoteResponse
            {
                PurchaseReturnId = prn.PurchaseReturnId,
                ReturnCode = prn.ReturnCode,
                Status = prn.Status
            };
        }

        public async Task<PurchaseReturnNoteResponse> RefundPRNAsync(long prnId, long userId, RefundPRNRequest request)
        {
            var prn = await _context.PurchaseReturnNotes
                .Include(p => p.PurchaseReturnNoteLines)
                .FirstOrDefaultAsync(p => p.PurchaseReturnId == prnId);

            if (prn == null)
            {
                throw new KeyNotFoundException("Khong tim thay phieu tra hang.");
            }

            if (prn.Status?.Equals("CANCELLED", StringComparison.OrdinalIgnoreCase) == true)
            {
                throw new InvalidOperationException("Phieu tra hang da bi huy.");
            }

            if (prn.RefundStatus?.Equals("Refunded", StringComparison.OrdinalIgnoreCase) == true)
            {
                throw new InvalidOperationException("Phieu tra hang da duoc hoan tien.");
            }

            // Update Refund info
            prn.RefundedAmount = request.RefundedAmount;
            prn.RefundMethod = request.RefundMethod;
            prn.RefundReference = request.RefundReference;
            prn.RefundStatus = request.RefundStatus ?? "NotRefunded";
            prn.RefundedAt = DateTime.UtcNow;

            // AuditLog
            await _auditLogService.LogAsync(
                userId,
                "REFUND",
                "PurchaseReturnNote",
                prn.PurchaseReturnId,
                $"Cap nhat hoan tien phieu tra hang {prn.ReturnCode}"
            );

            await _context.SaveChangesAsync();

            return new PurchaseReturnNoteResponse
            {
                PurchaseReturnId = prn.PurchaseReturnId,
                ReturnCode = prn.ReturnCode,
                Status = prn.Status,
                RefundStatus = prn.RefundStatus,
                RefundedAmount = prn.RefundedAmount,
                RefundMethod = prn.RefundMethod
            };
        }

        public async Task<PurchaseReturnNoteResponse> CancelPRNAsync(long prnId, long userId)
        {
            var prn = await _context.PurchaseReturnNotes
                .Include(p => p.PurchaseReturnNoteLines)
                .FirstOrDefaultAsync(p => p.PurchaseReturnId == prnId);

            if (prn == null)
            {
                throw new KeyNotFoundException("Khong tim thay phieu tra hang.");
            }

            if (prn.Status?.Equals("CANCELLED", StringComparison.OrdinalIgnoreCase) == true)
            {
                throw new InvalidOperationException("Phieu tra hang da bi huy.");
            }

            if (prn.Status?.Equals("APPROVED", StringComparison.OrdinalIgnoreCase) == true)
            {
                throw new InvalidOperationException("Phieu tra hang da duoc duyet, khong the huy.");
            }

            // Hoan ReservedQty
            foreach (var line in prn.PurchaseReturnNoteLines)
            {
                var inventory = await _context.InventoryOnHands
                    .FirstOrDefaultAsync(i => i.ItemId == line.ItemId && i.WarehouseId == prn.WarehouseId);

                if (inventory != null)
                {
                    inventory.ReservedQty -= line.ReturnQty;
                    if (inventory.ReservedQty < 0) inventory.ReservedQty = 0;
                    inventory.UpdatedAt = DateTime.UtcNow;
                }
            }

            // Cap nhat Status
            prn.Status = "CANCELLED";

            // AuditLog
            await _auditLogService.LogAsync(
                userId,
                "CANCEL",
                "PurchaseReturnNote",
                prn.PurchaseReturnId,
                $"Huy phieu tra hang {prn.ReturnCode}"
            );

            await _context.SaveChangesAsync();

            return new PurchaseReturnNoteResponse
            {
                PurchaseReturnId = prn.PurchaseReturnId,
                ReturnCode = prn.ReturnCode,
                Status = prn.Status
            };
        }

        private async Task<string> GenerateNextPrnCodeAsync()
        {
            var prnCodes = await _context.PurchaseReturnNotes
                .Where(p => p.ReturnCode.StartsWith("PRN"))
                .Select(p => p.ReturnCode)
                .ToListAsync();

            var maxNumber = 0;
            foreach (var code in prnCodes)
            {
                if (code.Length <= 3) continue;

                var numberPart = code.Substring(3);
                if (int.TryParse(numberPart, out var number) && number > maxNumber)
                {
                    maxNumber = number;
                }
            }

            return $"PRN{maxNumber + 1}";
        }
    }
}