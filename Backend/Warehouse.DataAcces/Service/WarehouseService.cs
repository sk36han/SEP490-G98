using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;
using WarehouseEntity = Warehouse.Entities.Models.Warehouse;
namespace Warehouse.DataAcces.Service
{
    public class WarehouseService : GenericRepository<WarehouseEntity>, IWarehouseService
    {
		private readonly IConfiguration _configuration;
		private readonly IAuditLogService _auditLogService;
		public WarehouseService(Mkiwms5Context context, IConfiguration configuration, IAuditLogService auditLogService) : base(context)
		{
			_configuration = configuration;
			_auditLogService = auditLogService;
		}


		public async Task<PagedResult<WarehouseResponse>> GetWarehouseListAsync(FilterRequest filter)
        {
            var query = _context.Warehouses.AsNoTracking().OrderBy(w => w.WarehouseId);

            int totalCount = await query.CountAsync();

            var items = await query
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(w => new WarehouseResponse
                {
                    WarehouseId = w.WarehouseId,
                    WarehouseCode = w.WarehouseCode,
                    WarehouseName = w.WarehouseName,
                    Address = w.Address,
                    IsActive = w.IsActive,
                    CreatedAt = w.CreatedAt,
                    ItemCount = w.InventoryOnHands.Count
                })
                .ToListAsync();

            return new PagedResult<WarehouseResponse>(items, totalCount, filter.PageNumber, filter.PageSize);
        }

        public async Task<WarehouseDetailResponse> GetWarehouseDetailAsync(long warehouseId)
        {
            var warehouse = await _context.Warehouses
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.WarehouseId == warehouseId);

            if (warehouse == null)
            {
                throw new KeyNotFoundException("Không tìm thấy kho.");
            }

            var response = new WarehouseDetailResponse
            {
                WarehouseId = warehouse.WarehouseId,
                WarehouseCode = warehouse.WarehouseCode,
                WarehouseName = warehouse.WarehouseName,
                Address = warehouse.Address,
                IsActive = warehouse.IsActive,
                CreatedAt = warehouse.CreatedAt
            };

            // Query thẳng từ InventoryOnHand → chỉ lấy items ĐÃ CÓ bản ghi (kể cả OnHandQty = 0)
            // ✅ Item hết hàng (OnHandQty = 0): vẫn lấy — đã từng nhập, chỉ là hết hàng
            // ❌ Item chưa bao giờ nhập kho: không có row → không trả về (exclude hoàn toàn)
            // Logic này khớp hoàn toàn với StartStocktakeExecutionAsync
            response.Items = await (
                from inv in _context.InventoryOnHands
                where inv.WarehouseId == warehouseId
                join item in _context.Items.Where(i => i.IsActive)
                    on inv.ItemId equals item.ItemId
                orderby item.ItemCode
                select new WarehouseItemDto
                {
                    ItemId             = item.ItemId,
                    ItemCode           = item.ItemCode,
                    ItemName           = item.ItemName,
                    CategoryName       = item.Category != null ? item.Category.CategoryName : null,
                    BrandName          = item.Brand    != null ? item.Brand.BrandName       : null,
                    UnitName           = item.BaseUom  != null ? item.BaseUom.UomName       : null,
                    OnHandQty          = inv.OnHandQty,
                    ReservedQty        = inv.ReservedQty,
                    HasInventoryRecord = true   // luôn true vì đã lọc từ InventoryOnHand
                }
            ).ToListAsync();

            response.ItemCount = response.Items.Count;

            // Lấy danh sách lô trong kho (kèm mã GRN và vị trí lưu trữ nếu đã gán)
            response.Lots = await _context.InventoryLots
                .AsNoTracking()
                .Where(l => l.WarehouseId == warehouseId)
                .Include(l => l.Grnline)
                    .ThenInclude(gl => gl.Grn)
                .Include(l => l.Location)
                .OrderByDescending(l => l.ReceiptDate)
                .ThenByDescending(l => l.LotId)
                .Select(l => new WarehouseLotDto
                {
                    LotId = l.LotId,
                    ItemId = l.ItemId,
                    WarehouseId = l.WarehouseId,
                    GrnlineId = l.GrnlineId,
                    GrnCode = l.Grnline != null ? l.Grnline.Grn.Grncode : null,
                    LocationCode = l.Location != null ? l.Location.LocationCode : null,
                    ReceiptDate = l.ReceiptDate,
                    Quantity = l.Quantity,
                    UnitCost = l.UnitCost,
                    ExpiryDate = l.ExpiryDate,
                    IsActive = l.IsActive
                })
                .ToListAsync();


            // Lấy giấy tờ nhập kho (GRN)
            var importPapers = await _context.GoodsReceiptNotes
                .AsNoTracking()
                .Where(g => g.WarehouseId == warehouseId)
                .Select(g => new 
                {
                    g.Grnid,
                    g.Grncode,
                    g.ReceiptDate,
                    g.Status,
                    g.Note
                })
                .ToListAsync();

            response.ImportPapers = importPapers.Select(g => new WarehousePaperDto
            {
                PaperId = g.Grnid,
                PaperType = "GRN",
                PaperCode = g.Grncode,
                Date = g.ReceiptDate.ToDateTime(TimeOnly.MinValue),
                Status = g.Status,
                Note = g.Note
            }).ToList();

            // Lấy giấy tờ xuất kho (GDN)
            var exportPapers = await _context.GoodsDeliveryNotes
                .AsNoTracking()
                .Where(g => g.WarehouseId == warehouseId)
                .Select(g => new 
                {
                    g.Gdnid,
                    g.Gdncode,
                    g.IssueDate,
                    g.Status,
                    g.Note
                })
                .ToListAsync();

            response.ExportPapers = exportPapers.Select(g => new WarehousePaperDto
            {
                PaperId = g.Gdnid,
                PaperType = "GDN",
                PaperCode = g.Gdncode,
                Date = g.IssueDate.ToDateTime(TimeOnly.MinValue),
                Status = g.Status,
                Note = g.Note
            }).ToList();

            // Lấy giấy tờ trả lại hàng (PurchaseReturnNote) liên quan đến kho này
            response.ReturnPapers = await _context.PurchaseReturnNotes
                .AsNoTracking()
                .Where(p => p.RelatedGrn != null && p.RelatedGrn.WarehouseId == warehouseId)
                .Select(p => new WarehousePaperDto
                {
                    PaperId = p.PurchaseReturnId,
                    PaperType = "PRN",
                    PaperCode = p.ReturnCode,
                    Date = p.ReturnDate,
                    Status = p.Status,
                    Note = p.Note
                })
                .ToListAsync();

            return response;
        }

        public async Task<WarehouseResponse> CreateWarehouseAsync(CreateWarehouseRequest request, long currentUserId)
        {
            var exists = await _context.Warehouses
                .AnyAsync(w => w.WarehouseCode == request.WarehouseCode);
            if (exists)
                throw new InvalidOperationException("Mã kho đã tồn tại.");

            var entity = new WarehouseEntity
            {
                WarehouseCode = request.WarehouseCode,
                WarehouseName = request.WarehouseName,
                Address = request.Address,
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            await CreateAsync(entity);

            // Ghi audit log
            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Create,
                AuditEntity.Warehouse,
                entity.WarehouseId,
                $"Tạo kho '{entity.WarehouseName}' (Mã: {entity.WarehouseCode})"
            );

            return new WarehouseResponse
            {
                WarehouseId = entity.WarehouseId,
                WarehouseCode = entity.WarehouseCode,
                WarehouseName = entity.WarehouseName,
                Address = entity.Address,
                IsActive = entity.IsActive,
                CreatedAt = entity.CreatedAt
            };
        }

        public async Task<WarehouseResponse> UpdateWarehouseAsync(long id, UpdateWarehouseRequest request, long currentUserId)
        {
            var entity = await _context.Warehouses.FindAsync(id);
            if (entity == null)
                throw new KeyNotFoundException("Không tìm thấy kho.");

            // Lưu giá trị cũ
            var oldValues = JsonSerializer.Serialize(new
            {
                entity.WarehouseName,
                entity.Address,
                entity.IsActive
            });

            entity.WarehouseName = request.WarehouseName;
            entity.Address = request.Address;
            entity.IsActive = request.IsActive;
            await _context.SaveChangesAsync();

            // Ghi audit log
            var newValues = JsonSerializer.Serialize(new
            {
                entity.WarehouseName,
                entity.Address,
                entity.IsActive
            });
            await _auditLogService.LogAsync(
                currentUserId,
                AuditAction.Update,
                AuditEntity.Warehouse,
                entity.WarehouseId,
                $"Cập nhật kho '{entity.WarehouseName}' (Mã: {entity.WarehouseCode})",
                oldValues,
                newValues
            );

            return new WarehouseResponse
            {
                WarehouseId = entity.WarehouseId,
                WarehouseCode = entity.WarehouseCode,
                WarehouseName = entity.WarehouseName,
                Address = entity.Address,
                IsActive = entity.IsActive,
                CreatedAt = entity.CreatedAt
            };
        }

        public async Task<WarehouseResponse> ToggleWarehouseStatusAsync(long id)
        {
            var entity = await _context.Warehouses.FindAsync(id);
            if (entity == null)
                throw new KeyNotFoundException("Không tìm thấy kho.");

            entity.IsActive = !entity.IsActive;
            await _context.SaveChangesAsync();

            return new WarehouseResponse
            {
                WarehouseId = entity.WarehouseId,
                WarehouseCode = entity.WarehouseCode,
                WarehouseName = entity.WarehouseName,
                Address = entity.Address,
                IsActive = entity.IsActive,
                CreatedAt = entity.CreatedAt
            };
        }
        public async Task<List<WarehouseDropdownItem>> GetWarehouseDropdownAsync()
        {
            return await _context.Warehouses
                .AsNoTracking()
                .Where(w => w.IsActive)
                .OrderBy(w => w.WarehouseName)
                .Select(w => new WarehouseDropdownItem
                {
                    WarehouseId   = w.WarehouseId,
                    WarehouseName = w.WarehouseName,
                    WarehouseCode = w.WarehouseCode
                })
                .ToListAsync();
        }


        public async Task<PagedResult<WarehouseHistoryResponse>> GetWarehouseHistoryAsync(int pageNumber, int pageSize, long? warehouseId = null)
        {
            var query = _context.InventoryTransactionLines
                .Include(l => l.InventoryTxn)
                .Include(l => l.Item)
                .AsQueryable();

            if (warehouseId.HasValue)
            {
                query = query.Where(l => l.InventoryTxn.WarehouseId == warehouseId.Value);
            }

            var totalItems = await query.CountAsync();

            var lines = await query
                .OrderByDescending(l => l.InventoryTxn.TxnDate)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var results = new List<WarehouseHistoryResponse>();

            foreach (var line in lines)
            {
                var response = new WarehouseHistoryResponse
                {
                    ItemName = line.Item?.ItemName ?? "Vật tư không xác định",
                    Quantity = line.QtyChange,
                    TransactionDate = line.InventoryTxn.TxnDate
                };

                string refType = line.InventoryTxn.ReferenceType;
                long refId = line.InventoryTxn.ReferenceId;

                if (refType == "GRN")
                {
                    var grn = await _context.GoodsReceiptNotes.FindAsync(refId);
                    response.VoucherCode = grn?.Grncode ?? "N/A";
                    var approverName = await GetApproverNameAsync("GRN", refId);
                    if (!string.IsNullOrWhiteSpace(approverName))
                    {
                        response.ApproverName = approverName;
                    }
                    else
                    {
                        var user = grn != null ? await _context.Users.FindAsync(grn.CreatedBy) : null;
                        response.ApproverName = user?.FullName ?? "Hệ thống";
                    }
                }
                else if (refType == "GDN")
                {
                    var gdn = await _context.GoodsDeliveryNotes.FindAsync(refId);
                    response.VoucherCode = gdn?.Gdncode ?? "N/A";
                    var approverName = await GetApproverNameAsync("GDN", refId);
                    if (!string.IsNullOrWhiteSpace(approverName))
                    {
                        response.ApproverName = approverName;
                    }
                    else
                    {
                        var user = gdn != null ? await _context.Users.FindAsync(gdn.CreatedBy) : null;
                        response.ApproverName = user?.FullName ?? "Hệ thống";
                    }
                }
                else if (refType == "ADJ")
                {
                    var adj = await _context.InventoryAdjustmentRequests.FindAsync(refId);
                    response.VoucherCode = adj?.AdjustmentCode ?? "N/A";
                    var approverName = await GetApproverNameAsync("ADJ", refId);
                    if (!string.IsNullOrWhiteSpace(approverName))
                    {
                        response.ApproverName = approverName;
                    }
                    else
                    {
                        var user = adj != null ? await _context.Users.FindAsync(adj.SubmittedBy) : null;
                        response.ApproverName = user?.FullName ?? "Hệ thống";
                    }
                }
                else
                {
                    response.VoucherCode = "N/A";
                    var user = await _context.Users.FindAsync(line.InventoryTxn.PostedBy);
                    response.ApproverName = user?.FullName ?? "Hệ thống";
                }

                results.Add(response);
            }

            return new PagedResult<WarehouseHistoryResponse>(results, totalItems, pageNumber, pageSize);
        }

        private async Task<string?> GetApproverNameAsync(string docType, long docId)
        {
            var approval = await _context.DocumentApprovals
                .Include(a => a.ActionByNavigation)
                .Where(a => a.DocType == docType && a.DocId == docId && a.Decision == "APPROVE")
                .OrderByDescending(a => a.ActionAt)
                .FirstOrDefaultAsync();

            return approval?.ActionByNavigation?.FullName;
        }
    }
}
