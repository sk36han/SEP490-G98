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

            // Lấy danh sách vật tư trong kho
            response.Items = await _context.InventoryOnHands
                .AsNoTracking()
                .Where(i => i.WarehouseId == warehouseId)
                .Select(i => new WarehouseItemDto
                {
                    ItemId = i.ItemId,
                    ItemCode = i.Item.ItemCode,
                    ItemName = i.Item.ItemName,
                    CategoryName = i.Item.Category != null ? i.Item.Category.CategoryName : null,
                    BrandName = i.Item.Brand != null ? i.Item.Brand.BrandName : null,
                    UnitName = i.Item.BaseUom != null ? i.Item.BaseUom.UomName : null,
                    OnHandQty = i.OnHandQty,
                    ReservedQty = i.ReservedQty
                })
                .ToListAsync();

            response.ItemCount = response.Items.Count;

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
                    response.ApproverName = await GetApproverNameAsync("GRN", refId);
                }
                else if (refType == "GDN")
                {
                    var gdn = await _context.GoodsDeliveryNotes.FindAsync(refId);
                    response.VoucherCode = gdn?.Gdncode ?? "N/A";
                    response.ApproverName = await GetApproverNameAsync("GDN", refId);
                }
                else if (refType == "ADJ")
                {
                    var adj = await _context.InventoryAdjustmentRequests.FindAsync(refId);
                    response.VoucherCode = adj?.AdjustmentCode ?? "N/A";
                    response.ApproverName = await GetApproverNameAsync("ADJ", refId);
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

        private async Task<string> GetApproverNameAsync(string docType, long docId)
        {
            var approval = await _context.DocumentApprovals
                .Include(a => a.ActionByNavigation)
                .Where(a => a.DocType == docType && a.DocId == docId && a.Decision == "APPROVE")
                .OrderByDescending(a => a.ActionAt)
                .FirstOrDefaultAsync();

            return approval?.ActionByNavigation?.FullName ?? "Chưa được duyệt";
        }
    }
}
