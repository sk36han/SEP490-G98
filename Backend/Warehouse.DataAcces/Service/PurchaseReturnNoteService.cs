
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
        private readonly IDateTimeProvider _dateTimeProvider;

        public PurchaseReturnNoteService(Mkiwms5Context context, IAuditLogService auditLogService, IDateTimeProvider? dateTimeProvider = null)
        {
            _context = context;
            _auditLogService = auditLogService;
            _dateTimeProvider = dateTimeProvider ?? new DateTimeProvider("Asia/Ho_Chi_Minh", () => DateTime.UtcNow);
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

                var totalReturned = await ReturnLinesForAvailabilityQuery(grnLine.GrnlineId)
                    .SumAsync(l => (decimal?)l.ReturnQty) ?? 0;

                var availableQty = grnLine.ActualQty - totalReturned;
                var availableInLots = await GetAvailableLotQtyForGrnLineAsync(
                    grnLine.GrnlineId,
                    grn.WarehouseId,
                    grnLine.ItemId);
                var effectiveAvailableQty = Math.Min(availableQty, availableInLots);

                if (line.ReturnQty > effectiveAvailableQty)
                {
                    throw new InvalidOperationException(
                        $"So luong tra ({line.ReturnQty}) vuot qua so luong kha dung ({effectiveAvailableQty}) cho vat tu {grnLine.Item?.ItemName}.");
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
                // Khi tạo PRN luôn mặc định "Chưa hoàn tiền".
                // Việc xác nhận hoàn tiền được xử lý bởi kế toán qua API refund.
                RefundStatus = "NotRefunded",
                RefundedAmount = 0,
                RefundMethod = null,
                RefundReference = null,
                RefundedAt = null,
                SupplierId = grn.SupplierId,
                WarehouseId = grn.WarehouseId,
                TotalReturnedQty = totalReturnedQty,
                TotalReturnedAmount = netAmount,
                CreatedBy = userId,
                CreatedAt = _dateTimeProvider.UtcNow()
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
                    inventory.UpdatedAt = _dateTimeProvider.UtcNow();
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
                SupplierCode = grn.Supplier?.SupplierCode,
                SupplierPhone = grn.Supplier?.Phone,
                SupplierEmail = grn.Supplier?.Email,
                SupplierTaxCode = grn.Supplier?.TaxCode,
                SupplierAddressProvince = grn.Supplier?.City,
                SupplierAddressDistrict = grn.Supplier?.District,
                SupplierAddressWard = grn.Supplier?.Ward,
                SupplierAddressStreet = grn.Supplier?.Address,
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
                SupplierCode = prn.Supplier != null ? prn.Supplier.SupplierCode : null,
                SupplierPhone = prn.Supplier != null ? prn.Supplier.Phone : null,
                SupplierEmail = prn.Supplier != null ? prn.Supplier.Email : null,
                SupplierTaxCode = prn.Supplier != null ? prn.Supplier.TaxCode : null,
                SupplierAddressProvince = prn.Supplier != null ? prn.Supplier.City : null,
                SupplierAddressDistrict = prn.Supplier != null ? prn.Supplier.District : null,
                SupplierAddressWard = prn.Supplier != null ? prn.Supplier.Ward : null,
                SupplierAddressStreet = prn.Supplier != null ? prn.Supplier.Address : null,
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

            var attachments = await _context.DocumentAttachments
                .AsNoTracking()
                .Where(a => a.DocType == "PRN" && a.DocId == prnId)
                .OrderByDescending(a => a.UploadedAt)
                .Select(a => new PRNAttachmentResponse
                {
                    AttachmentId = a.AttachmentId,
                    FileName = a.FileName,
                    FileUrl = a.FileUrlOrPath,
                    AttachmentType = a.AttachmentType,
                    UploadedAt = a.UploadedAt
                })
                .ToListAsync();

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
                SupplierCode = prn.Supplier?.SupplierCode,
                SupplierPhone = prn.Supplier?.Phone,
                SupplierEmail = prn.Supplier?.Email,
                SupplierTaxCode = prn.Supplier?.TaxCode,
                SupplierAddressProvince = prn.Supplier?.City,
                SupplierAddressDistrict = prn.Supplier?.District,
                SupplierAddressWard = prn.Supplier?.Ward,
                SupplierAddressStreet = prn.Supplier?.Address,
                WarehouseId = prn.WarehouseId,
                WarehouseName = prn.Warehouse?.WarehouseName,
                TotalReturnedQty = prn.TotalReturnedQty,
                TotalReturnedAmount = prn.TotalReturnedAmount,
                CreatedBy = prn.CreatedBy,
                CreatedByName = prn.CreatedByNavigation?.FullName,
                CreatedAt = prn.CreatedAt,
                ApprovedAt = prn.ApprovedAt,
                PostedAt = prn.PostedAt,
                Lines = lines,
                Attachments = attachments
            };
        }

        public async Task<PurchaseReturnNoteDetailResponse> UpdatePRNAsync(long prnId, long userId, UpdatePRNRequest request)
        {
            if (request.Lines == null || request.Lines.Count == 0)
            {
                throw new InvalidOperationException("Phai co it nhat 1 dong tra hang.");
            }

            var lineIds = request.Lines.Select(l => l.RelatedGrnlineId).ToList();
            if (lineIds.Count != lineIds.Distinct().Count())
            {
                throw new InvalidOperationException("Khong duoc nhap trung dong phieu nhap.");
            }

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
                throw new InvalidOperationException("Chi co the sua phieu o trang thai NHAP hoac CHO hoan hang.");
            }

            var grnId = prn.RelatedGrnid ?? throw new InvalidOperationException("Phieu tra hang khong gan phieu nhap.");

            var grn = await _context.GoodsReceiptNotes
                .Include(g => g.GoodsReceiptNoteLines)
                    .ThenInclude(l => l.Item)
                .FirstOrDefaultAsync(g => g.Grnid == grnId);

            if (grn == null)
            {
                throw new KeyNotFoundException("Khong tim thay phieu nhap kho.");
            }

            if (grn.Status != "POSTED")
            {
                throw new InvalidOperationException("Phieu nhap khong hop le.");
            }

            var grnLineIds = request.Lines.Select(l => l.RelatedGrnlineId).ToList();
            var grnLines = await _context.GoodsReceiptNoteLines
                .Include(l => l.Item)
                .Where(l => l.Grnid == grnId && grnLineIds.Contains(l.GrnlineId))
                .ToDictionaryAsync(l => l.GrnlineId);

            if (grnLines.Count != grnLineIds.Count)
            {
                throw new KeyNotFoundException("Co dong phieu nhap khong ton tai trong phieu nhap.");
            }

            foreach (var line in request.Lines)
            {
                var grnLine = grnLines[line.RelatedGrnlineId];

                var totalOtherReturns = await ReturnLinesForAvailabilityQuery(grnLine.GrnlineId)
                    .Where(l => l.PurchaseReturnId != prnId)
                    .SumAsync(l => (decimal?)l.ReturnQty) ?? 0;

                var availableQty = grnLine.ActualQty - totalOtherReturns;
                var availableInLots = await GetAvailableLotQtyForGrnLineAsync(
                    grnLine.GrnlineId,
                    grn.WarehouseId,
                    grnLine.ItemId);
                var effectiveAvailableQty = Math.Min(availableQty, availableInLots);

                if (line.ReturnQty > effectiveAvailableQty)
                {
                    throw new InvalidOperationException(
                        $"So luong tra ({line.ReturnQty}) vuot qua so luong kha dung ({effectiveAvailableQty}) cho vat tu {grnLine.Item?.ItemName}.");
                }

                if (line.ReturnQty <= 0)
                {
                    throw new InvalidOperationException("So luong tra phai lon hon 0.");
                }
            }

            await using var tx = await _context.Database.BeginTransactionAsync();

            try
            {
                var oldLines = prn.PurchaseReturnNoteLines.ToList();
                foreach (var oldLine in oldLines)
                {
                    var inventory = await _context.InventoryOnHands
                        .FirstOrDefaultAsync(i => i.ItemId == oldLine.ItemId && i.WarehouseId == prn.WarehouseId);

                    if (inventory != null)
                    {
                        inventory.ReservedQty -= oldLine.ReturnQty;
                        if (inventory.ReservedQty < 0)
                        {
                            inventory.ReservedQty = 0;
                        }

                        inventory.UpdatedAt = _dateTimeProvider.UtcNow();
                    }

                    _context.PurchaseReturnNoteLines.Remove(oldLine);
                }

                await _context.SaveChangesAsync();

                decimal totalReturnedQty = 0;
                decimal totalReturnedAmount = 0;

                foreach (var line in request.Lines)
                {
                    var grnLine = grnLines[line.RelatedGrnlineId];
                    var lineTotal = line.ReturnQty * (grnLine.UnitPrice ?? 0);
                    totalReturnedQty += line.ReturnQty;
                    totalReturnedAmount += lineTotal;

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

                    var inv = await _context.InventoryOnHands
                        .FirstOrDefaultAsync(i => i.ItemId == grnLine.ItemId && i.WarehouseId == grn.WarehouseId);

                    if (inv != null)
                    {
                        inv.ReservedQty += line.ReturnQty;
                        inv.UpdatedAt = _dateTimeProvider.UtcNow();
                    }
                }

                var netAmount = totalReturnedAmount + request.FeeAmount;

                prn.ReturnDate = request.ReturnDate;
                prn.Reason = request.Reason;
                prn.Note = request.Note;
                prn.FeeAmount = request.FeeAmount;
                prn.TotalReturnedQty = totalReturnedQty;
                prn.TotalReturnedAmount = netAmount;

                await _auditLogService.LogAsync(
                    userId,
                    "UPDATE",
                    "PurchaseReturnNote",
                    prn.PurchaseReturnId,
                    $"Cap nhat phieu tra hang {prn.ReturnCode}");

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }

            return await GetPRNDetailAsync(prnId);
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

            var warehouseId = prn.WarehouseId ?? 0;
            if (warehouseId == 0)
            {
                throw new InvalidOperationException("Phieu tra hang thieu kho.");
            }

            // Truoc khi duyet: phai du so luong con lai tren lot cua dong GRN (dong bo voi FIFO xuat kho).
            foreach (var line in prn.PurchaseReturnNoteLines)
            {
                if (!line.RelatedGrnlineId.HasValue)
                {
                    throw new InvalidOperationException("Dong phieu tra hang thieu dong phieu nhap lien quan.");
                }

                var availableInLots = await _context.InventoryLots
                    .Where(lot =>
                        lot.GrnlineId == line.RelatedGrnlineId.Value
                        && lot.WarehouseId == warehouseId
                        && lot.ItemId == line.ItemId
                        && lot.Quantity > 0)
                    .SumAsync(l => (decimal?)l.Quantity) ?? 0m;

                if (availableInLots < line.ReturnQty)
                {
                    throw new InvalidOperationException(
                        $"So luong con trong lot cua dong nhap #{line.RelatedGrnlineId.Value} ({availableInLots}) nho hon so luong tra ({line.ReturnQty}). Vui long kiem tra xuat kho hoac dieu chinh so luong tra.");
                }
            }

            // Cap nhat Status
            prn.Status = "APPROVED";
            prn.ApprovedBy = userId;
            prn.ApprovedAt = _dateTimeProvider.UtcNow();

            // Tru ton kho - giam ReservedQty (da reserve khi tao), giam OnHandQty (hang di ra);
            // dong thoi tru InventoryLot theo dong GRN (giong mo hinh nhap tao lot, xuat tru lot).
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
                    inventory.UpdatedAt = _dateTimeProvider.UtcNow();
                }

                var txn = new InventoryTransaction
                {
                    TxnType = "PURCHASE_RETURN",
                    TxnDate = _dateTimeProvider.UtcNow(),
                    WarehouseId = warehouseId,
                    ReferenceType = "PRN",
                    ReferenceId = prn.PurchaseReturnId,
                    Status = "POSTED",
                    PostedBy = userId,
                    PostedAt = _dateTimeProvider.UtcNow()
                };
                _context.InventoryTransactions.Add(txn);
                await _context.SaveChangesAsync();

                await DeductLotsAndAddTxnLinesForPurchaseReturnAsync(prn, line, txn.InventoryTxnId, warehouseId);
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
            prn.RefundedAt = _dateTimeProvider.UtcNow();

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
                    inventory.UpdatedAt = _dateTimeProvider.UtcNow();
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

        /// <summary>
        /// Tru <see cref="InventoryLot.Quantity"/> theo cac lot gan <see cref="PurchaseReturnNoteLine.RelatedGrnlineId"/>,
        /// ghi <see cref="InventoryTransactionLine"/> (co LotId) de khop voi xuat kho FIFO.
        /// </summary>
        private async Task DeductLotsAndAddTxnLinesForPurchaseReturnAsync(
            PurchaseReturnNote prn,
            PurchaseReturnNoteLine line,
            long inventoryTxnId,
            long warehouseId)
        {
            if (!line.RelatedGrnlineId.HasValue)
            {
                return;
            }

            var grnLineId = line.RelatedGrnlineId.Value;
            var lots = await _context.InventoryLots
                .Where(lot =>
                    lot.GrnlineId == grnLineId
                    && lot.WarehouseId == warehouseId
                    && lot.ItemId == line.ItemId
                    && lot.Quantity > 0)
                .OrderBy(lot => lot.ReceiptDate)
                .ThenBy(lot => lot.LotId)
                .ToListAsync();

            var remaining = line.ReturnQty;
            var code = prn.ReturnCode ?? string.Empty;

            foreach (var lot in lots)
            {
                if (remaining <= 0)
                {
                    break;
                }

                var deduct = Math.Min(lot.Quantity, remaining);
                lot.Quantity -= deduct;
                remaining -= deduct;
                if (lot.Quantity == 0)
                {
                    lot.IsActive = false;
                }

                _context.InventoryTransactionLines.Add(new InventoryTransactionLine
                {
                    InventoryTxnId = inventoryTxnId,
                    ItemId = line.ItemId,
                    QtyChange = -deduct,
                    UomId = line.UomId,
                    LotId = lot.LotId,
                    Note = $"Tra hang {code} - Lot #{lot.LotId}"
                });
            }

            if (remaining > 0)
            {
                throw new InvalidOperationException(
                    $"So luong trong lot cua dong nhap #{grnLineId} khong du de tra hang ({line.ReturnQty}).");
            }
        }

        /// <summary>
        /// Dong PRN thuoc phieu chua bi huy — dung tinh SL con co the tra theo dong GRN.
        /// </summary>
        private IQueryable<PurchaseReturnNoteLine> ReturnLinesForAvailabilityQuery(long grnLineId) =>
            _context.PurchaseReturnNoteLines.Where(l =>
                l.RelatedGrnlineId == grnLineId
                && l.PurchaseReturn != null
                && l.PurchaseReturn.Status != null
                && l.PurchaseReturn.Status.ToUpper() != "CANCELLED");

        /// <summary>
        /// So luong ton lot kha dung hien tai cua 1 dong nhap trong kho.
        /// Dung de chan tao/cap nhat PRN vuot qua ton thuc te sau khi da xuat.
        /// </summary>
        private async Task<decimal> GetAvailableLotQtyForGrnLineAsync(long grnLineId, long warehouseId, long itemId)
        {
            if (warehouseId <= 0)
            {
                return 0;
            }

            return await _context.InventoryLots
                .Where(lot =>
                    lot.GrnlineId == grnLineId
                    && lot.WarehouseId == warehouseId
                    && lot.ItemId == itemId
                    && lot.Quantity > 0)
                .SumAsync(l => (decimal?)l.Quantity) ?? 0m;
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