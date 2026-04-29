using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.Api.ApiController
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ItemWarehousePolicyController : ControllerBase
    {
        private readonly Mkiwms5Context _context;
        private readonly INotificationService _notificationService;

        public ItemWarehousePolicyController(Mkiwms5Context context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        [HttpGet("list-all")]
        public async Task<IActionResult> GetListAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? keyword = null,
            [FromQuery] long? warehouseId = null,
            [FromQuery] string? statusFilter = null)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 200);

            var query = _context.ItemWarehousePolicies
                .AsNoTracking()
                .Include(x => x.Item)
                .ThenInclude(i => i.BaseUom)
                .Include(x => x.Warehouse)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim().ToLower();
                query = query.Where(x =>
                    x.Item.ItemCode.ToLower().Contains(kw) ||
                    x.Item.ItemName.ToLower().Contains(kw));
            }

            if (warehouseId.HasValue && warehouseId.Value > 0)
            {
                query = query.Where(x => x.WarehouseId == warehouseId.Value);
            }

            var inventoryRows = _context.InventoryOnHands.AsNoTracking();

            var projected = query.Select(x => new
            {
                Policy = x,
                OnHandQty = inventoryRows
                    .Where(i => i.ItemId == x.ItemId && i.WarehouseId == x.WarehouseId)
                    .Select(i => (decimal?)i.OnHandQty)
                    .FirstOrDefault() ?? 0
            });

            if (!string.IsNullOrWhiteSpace(statusFilter))
            {
                var normalized = statusFilter.Trim().ToLower();
                if (normalized == "under")
                {
                    projected = projected.Where(x => x.OnHandQty <= x.Policy.MinQty);
                }
                else if (normalized == "safe")
                {
                    projected = projected.Where(x => x.OnHandQty > x.Policy.MinQty);
                }
            }

            var totalRecords = await projected.CountAsync();

            var pageRowsRaw = await projected
                .OrderByDescending(x => x.Policy.ItemWarehousePolicyId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var pageRows = pageRowsRaw
                .Select(x => new PolicySnapshot
                {
                    Policy = x.Policy,
                    OnHandQty = x.OnHandQty
                })
                .ToList();

            await TriggerInventoryAlertTransitionsAsync(pageRows);

            var items = pageRows
                .Select(x => ToResponse(x.Policy, x.OnHandQty))
                .ToList();

            var result = new ItemWarehousePolicyListResponse
            {
                Page = page,
                PageSize = pageSize,
                TotalRecords = totalRecords,
                Items = items
            };

            return Ok(ApiResponse<ItemWarehousePolicyListResponse>.SuccessResponse(result, "Lấy danh sách chính sách tồn kho thành công."));
        }

        [HttpGet("detail/{id:long}")]
        public async Task<IActionResult> GetDetail(long id)
        {
            var policy = await _context.ItemWarehousePolicies
                .AsNoTracking()
                .Include(x => x.Item)
                .ThenInclude(i => i.BaseUom)
                .Include(x => x.Warehouse)
                .FirstOrDefaultAsync(x => x.ItemWarehousePolicyId == id);

            if (policy == null)
            {
                return NotFound(ApiResponse<string>.ErrorResponse("Không tìm thấy chính sách tồn kho."));
            }

            var onHandQty = await _context.InventoryOnHands
                .AsNoTracking()
                .Where(i => i.ItemId == policy.ItemId && i.WarehouseId == policy.WarehouseId)
                .Select(i => (decimal?)i.OnHandQty)
                .FirstOrDefaultAsync() ?? 0;

            var result = ToResponse(policy, onHandQty);
            return Ok(ApiResponse<ItemWarehousePolicyResponse>.SuccessResponse(result, "Lấy chi tiết chính sách tồn kho thành công."));
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateItemWarehousePolicyRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse<string>.ErrorResponse("Dữ liệu không hợp lệ."));
            }

            var exists = await _context.ItemWarehousePolicies
                .AnyAsync(x => x.ItemId == request.ItemId && x.WarehouseId == request.WarehouseId);
            if (exists)
            {
                return Conflict(ApiResponse<string>.ErrorResponse("Vật tư tại kho này đã có chính sách tồn kho."));
            }

            var itemExists = await _context.Items.AnyAsync(x => x.ItemId == request.ItemId);
            var warehouseExists = await _context.Warehouses.AnyAsync(x => x.WarehouseId == request.WarehouseId);
            if (!itemExists || !warehouseExists)
            {
                return BadRequest(ApiResponse<string>.ErrorResponse("Vật tư hoặc kho không tồn tại."));
            }

            var entity = new ItemWarehousePolicy
            {
                ItemId = request.ItemId,
                WarehouseId = request.WarehouseId,
                MinQty = request.MinQty,
                ReorderQty = request.ReorderQty
            };

            _context.ItemWarehousePolicies.Add(entity);
            await _context.SaveChangesAsync();

            return await GetDetail(entity.ItemWarehousePolicyId);
        }

        [HttpPut("update/{id:long}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateItemWarehousePolicyRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse<string>.ErrorResponse("Dữ liệu không hợp lệ."));
            }

            var policy = await _context.ItemWarehousePolicies.FirstOrDefaultAsync(x => x.ItemWarehousePolicyId == id);
            if (policy == null)
            {
                return NotFound(ApiResponse<string>.ErrorResponse("Không tìm thấy chính sách tồn kho."));
            }

            policy.MinQty = request.MinQty;
            policy.ReorderQty = request.ReorderQty;
            await _context.SaveChangesAsync();

            return await GetDetail(id);
        }

        [HttpDelete("delete/{id:long}")]
        public async Task<IActionResult> Delete(long id)
        {
            var policy = await _context.ItemWarehousePolicies.FirstOrDefaultAsync(x => x.ItemWarehousePolicyId == id);
            if (policy == null)
            {
                return NotFound(ApiResponse<string>.ErrorResponse("Không tìm thấy chính sách tồn kho."));
            }

            _context.ItemWarehousePolicies.Remove(policy);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<string>.SuccessResponse("OK", "Xóa chính sách tồn kho thành công."));
        }

        [HttpPost("upsert")]
        public async Task<IActionResult> Upsert([FromBody] List<CreateItemWarehousePolicyRequest> policies)
        {
            if (policies == null || policies.Count == 0)
            {
                return BadRequest(ApiResponse<string>.ErrorResponse("Danh sách chính sách không được trống."));
            }

            foreach (var request in policies)
            {
                var existing = await _context.ItemWarehousePolicies
                    .FirstOrDefaultAsync(x => x.ItemId == request.ItemId && x.WarehouseId == request.WarehouseId);

                if (existing == null)
                {
                    _context.ItemWarehousePolicies.Add(new ItemWarehousePolicy
                    {
                        ItemId = request.ItemId,
                        WarehouseId = request.WarehouseId,
                        MinQty = request.MinQty,
                        ReorderQty = request.ReorderQty
                    });
                }
                else
                {
                    existing.MinQty = request.MinQty;
                    existing.ReorderQty = request.ReorderQty;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<string>.SuccessResponse("OK", "Cập nhật chính sách tồn kho thành công."));
        }

        private static ItemWarehousePolicyResponse ToResponse(ItemWarehousePolicy policy, decimal onHandQty)
        {
            return new ItemWarehousePolicyResponse
            {
                ItemWarehousePolicyId = policy.ItemWarehousePolicyId,
                ItemId = policy.ItemId,
                WarehouseId = policy.WarehouseId,
                MinQty = policy.MinQty,
                ReorderQty = policy.ReorderQty,
                OnHandQty = onHandQty,
                ItemCode = policy.Item?.ItemCode ?? string.Empty,
                ItemName = policy.Item?.ItemName ?? string.Empty,
                WarehouseName = policy.Warehouse?.WarehouseName ?? string.Empty,
                Uom = policy.Item?.BaseUom?.UomName,
                CreatedAt = policy.Item?.CreatedAt
            };
        }

        private async Task TriggerInventoryAlertTransitionsAsync(List<PolicySnapshot> rows)
        {
            if (rows == null || rows.Count == 0) return;

            var roleCodes = new[] { UserRoleConstants.Storekeeper, UserRoleConstants.SaleSupport };
            var userIds = await _context.UserRoles
                .AsNoTracking()
                .Include(ur => ur.Role)
                .Where(ur => roleCodes.Contains(ur.Role.RoleCode))
                .Select(ur => ur.UserId)
                .Distinct()
                .ToListAsync();

            if (userIds.Count == 0) return;

            foreach (var row in rows)
            {
                var policy = row.Policy;
                var onHandQty = row.OnHandQty;
                bool isUnderOrEqualMin = onHandQty <= policy.MinQty;

                var latestByUser = await _context.Notifications
                    .AsNoTracking()
                    .Where(n =>
                        userIds.Contains(n.UserId) &&
                        n.Type == NotificationTypes.InventoryAlert &&
                        n.RefType == "ItemWarehousePolicy" &&
                        n.RefId == policy.ItemWarehousePolicyId &&
                        !n.IsDeleted)
                    .GroupBy(n => n.UserId)
                    .Select(g => g.OrderByDescending(x => x.CreatedAt).First())
                    .ToListAsync();

                var latestTitle = latestByUser.Select(x => x.Title).FirstOrDefault();
                bool wasUnderOrEqualMin = string.Equals(latestTitle, "Cảnh báo chạm ngưỡng tồn kho tối thiểu", StringComparison.Ordinal);

                if (isUnderOrEqualMin && !wasUnderOrEqualMin)
                {
                    await _notificationService.CreateForRolesAsync(
                        roleCodes,
                        "Cảnh báo chạm ngưỡng tồn kho tối thiểu",
                        $"Vật tư {policy.Item?.ItemCode} - {policy.Item?.ItemName} tại {policy.Warehouse?.WarehouseName} đã chạm ngưỡng tối thiểu (Tồn: {onHandQty:n0}, Min: {policy.MinQty:n0}).",
                        "ItemWarehousePolicy",
                        policy.ItemWarehousePolicyId,
                        null,
                        NotificationTypes.InventoryAlert,
                        (byte)NotificationSeverity.Warning);
                }
                else if (!isUnderOrEqualMin && wasUnderOrEqualMin)
                {
                    await _notificationService.CreateForRolesAsync(
                        roleCodes,
                        "Tồn kho đã về mức an toàn",
                        $"Vật tư {policy.Item?.ItemCode} - {policy.Item?.ItemName} tại {policy.Warehouse?.WarehouseName} đã trở lại mức an toàn (Tồn: {onHandQty:n0}, Min: {policy.MinQty:n0}).",
                        "ItemWarehousePolicy",
                        policy.ItemWarehousePolicyId,
                        null,
                        NotificationTypes.InventoryAlert,
                        (byte)NotificationSeverity.Info);
                }
            }
        }

        private sealed class PolicySnapshot
        {
            public ItemWarehousePolicy Policy { get; set; } = null!;
            public decimal OnHandQty { get; set; }
        }
    }
}
