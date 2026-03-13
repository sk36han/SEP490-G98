using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service
{
    public class StocktakeService : IStocktakeService
    {
        private readonly Mkiwms5Context _context;

        private static readonly string[] AllowedStatuses = { "DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED" };
        private static readonly string[] AllowedModes = { "FULL", "PARTIAL" };

        public StocktakeService(Mkiwms5Context context)
        {
            _context = context;
        }

        // ─────────────────────────────────────────────────────────────
        // 1. LIST / SEARCH  (with filters + progress fields + paging)
        // ─────────────────────────────────────────────────────────────
        public async Task<PagedResponse<StocktakeSummaryResponse>> GetStocktakesAsync(StocktakeListRequest request)
        {
            // ── Validate Status & Mode (business-layer guard, dù DTO đã có Regex) ──
            if (!string.IsNullOrWhiteSpace(request.Status) &&
                !AllowedStatuses.Contains(request.Status.ToUpper()))
            {
                throw new ArgumentException(
                    $"Status không hợp lệ. Chỉ chấp nhận: {string.Join(", ", AllowedStatuses)}.");
            }

            if (!string.IsNullOrWhiteSpace(request.Mode) &&
                !AllowedModes.Contains(request.Mode.ToUpper()))
            {
                throw new ArgumentException(
                    $"Mode không hợp lệ. Chỉ chấp nhận: {string.Join(", ", AllowedModes)}.");
            }

            // ── Validate date ranges ──
            if (request.PlannedFrom.HasValue && request.PlannedTo.HasValue &&
                request.PlannedFrom > request.PlannedTo)
            {
                throw new ArgumentException("PlannedFrom không được lớn hơn PlannedTo.");
            }
            if (request.StartedFrom.HasValue && request.StartedTo.HasValue &&
                request.StartedFrom > request.StartedTo)
            {
                throw new ArgumentException("StartedFrom không được lớn hơn StartedTo.");
            }
            if (request.EndedFrom.HasValue && request.EndedTo.HasValue &&
                request.EndedFrom > request.EndedTo)
            {
                throw new ArgumentException("EndedFrom không được lớn hơn EndedTo.");
            }

            // ── Build query ──
            var query = _context.StocktakeSessions
                .Include(s => s.Warehouse)
                .Include(s => s.CreatedByNavigation)
                .Include(s => s.StocktakeLines)
                .AsNoTracking()
                .AsQueryable();

            // ── FILTER: StocktakeCode (contains, case-insensitive) ──
            if (!string.IsNullOrWhiteSpace(request.StocktakeCode))
            {
                var code = request.StocktakeCode.Trim();
                query = query.Where(s => s.StocktakeCode.Contains(code));
            }

            // ── FILTER: WarehouseName (contains, case-insensitive) ──
            if (!string.IsNullOrWhiteSpace(request.WarehouseName))
            {
                var wName = request.WarehouseName.Trim();
                query = query.Where(s => s.Warehouse.WarehouseName.Contains(wName));
            }

            // ── FILTER: Status (exact, case-insensitive) ──
            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                var status = request.Status.ToUpper();
                query = query.Where(s => s.Status.ToUpper() == status);
            }

            // ── FILTER: Mode (exact, case-insensitive) ──
            if (!string.IsNullOrWhiteSpace(request.Mode))
            {
                var mode = request.Mode.ToUpper();
                query = query.Where(s => s.Mode.ToUpper() == mode);
            }

            // ── FILTER: CreatedByName (contains, case-insensitive) ──
            if (!string.IsNullOrWhiteSpace(request.CreatedByName))
            {
                var cName = request.CreatedByName.Trim();
                query = query.Where(s => s.CreatedByNavigation.FullName.Contains(cName));
            }

            // ── FILTER: PlannedAt range ──
            if (request.PlannedFrom.HasValue)
                query = query.Where(s => s.PlannedAt >= request.PlannedFrom.Value);
            if (request.PlannedTo.HasValue)
                query = query.Where(s => s.PlannedAt <= request.PlannedTo.Value.Date.AddDays(1).AddSeconds(-1));

            // ── FILTER: StartedAt range ──
            if (request.StartedFrom.HasValue)
                query = query.Where(s => s.StartedAt >= request.StartedFrom.Value);
            if (request.StartedTo.HasValue)
                query = query.Where(s => s.StartedAt <= request.StartedTo.Value.Date.AddDays(1).AddSeconds(-1));

            // ── FILTER: EndedAt range ──
            if (request.EndedFrom.HasValue)
                query = query.Where(s => s.EndedAt >= request.EndedFrom.Value);
            if (request.EndedTo.HasValue)
                query = query.Where(s => s.EndedAt <= request.EndedTo.Value.Date.AddDays(1).AddSeconds(-1));

            // ── Count total (before paging) ──
            var totalItems = await query.CountAsync();

            // ── Paging + Projection ──
            var items = await query
                .OrderByDescending(s => s.PlannedAt ?? s.StartedAt ?? DateTime.MinValue)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(s => new StocktakeSummaryResponse
                {
                    StocktakeId      = s.StocktakeId,
                    StocktakeCode    = s.StocktakeCode,
                    WarehouseId      = s.WarehouseId,
                    WarehouseName    = s.Warehouse.WarehouseName,
                    Status           = s.Status,
                    Mode             = s.Mode,
                    PlannedAt        = s.PlannedAt,
                    StartedAt        = s.StartedAt,
                    EndedAt          = s.EndedAt,
                    CreatedBy        = s.CreatedBy,
                    CreatedByName    = s.CreatedByNavigation.FullName,
                    Note             = s.Note,
                    // ── Progress fields (calculated) ──
                    TotalLines       = s.StocktakeLines.Count,
                    CountedLines     = s.StocktakeLines.Count(l => l.CountedQty != null),
                    VarianceLines    = s.StocktakeLines.Count(l => l.VarianceQty != null && l.VarianceQty != 0),
                    ProgressPercent  = s.StocktakeLines.Count == 0
                        ? 0
                        : Math.Round(
                            (decimal)s.StocktakeLines.Count(l => l.CountedQty != null)
                            / s.StocktakeLines.Count * 100, 1)
                })
                .ToListAsync();

            return new PagedResponse<StocktakeSummaryResponse>
            {
                Page       = request.Page,
                PageSize   = request.PageSize,
                TotalItems = totalItems,
                Items      = items
            };
        }

        // ─────────────────────────────────────────────────────────────
        // 2. DETAIL HEADER (by ID)
        // ─────────────────────────────────────────────────────────────
        public async Task<StocktakeDetailResponse?> GetStocktakeDetailAsync(long stocktakeId)
        {
            // ── Validate ID ──
            if (stocktakeId <= 0)
                throw new ArgumentException("StocktakeId phải là số nguyên dương.");

            var session = await _context.StocktakeSessions
                .Include(s => s.Warehouse)
                .Include(s => s.CreatedByNavigation)
                .Include(s => s.StocktakeLines)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.StocktakeId == stocktakeId);

            if (session == null)
                return null;

            var totalLines   = session.StocktakeLines.Count;
            var countedLines = session.StocktakeLines.Count(l => l.CountedQty != null);
            var varianceLines= session.StocktakeLines.Count(l => l.VarianceQty != null && l.VarianceQty != 0);

            return new StocktakeDetailResponse
            {
                StocktakeId   = session.StocktakeId,
                StocktakeCode = session.StocktakeCode,
                WarehouseId   = session.WarehouseId,
                WarehouseName = session.Warehouse.WarehouseName,
                Status        = session.Status,
                Mode          = session.Mode,
                PlannedAt     = session.PlannedAt,
                StartedAt     = session.StartedAt,
                EndedAt       = session.EndedAt,
                CreatedBy     = session.CreatedBy,
                CreatedByName = session.CreatedByNavigation.FullName,
                Note          = session.Note,
                // ── Progress fields ──
                TotalLines      = totalLines,
                CountedLines    = countedLines,
                VarianceLines   = varianceLines,
                ProgressPercent = totalLines == 0
                    ? 0
                    : Math.Round((decimal)countedLines / totalLines * 100, 1)
            };
        }
        // ─────────────────────────────────────────────────────────────
        // 3. CREATE DRAFT (FULL mode – kiểm kê toàn bộ kho)
        // ─────────────────────────────────────────────────────────────
        public async Task<StocktakeDetailResponse> CreateDraftAsync(
            CreateStocktakeDraftRequest request, long currentUserId)
        {
            // 1️⃣ Validate – kho tồn tại và đang hoạt động
            var warehouse = await _context.Warehouses
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.WarehouseId == request.WarehouseId);

            if (warehouse == null)
                throw new KeyNotFoundException(
                    $"Không tìm thấy kho với ID = {request.WarehouseId}.");

            if (!warehouse.IsActive)
                throw new InvalidOperationException(
                    $"Kho '{warehouse.WarehouseName}' đang bị vô hiệu hóa, không thể tạo phiếu kiểm kê.");

            // 2️⃣ Validate – không có phiên kiểm kê đang chạy (IN_PROGRESS) trên kho này
            var hasPendingSession = await _context.StocktakeSessions
                .AnyAsync(s => s.WarehouseId == warehouse.WarehouseId
                            && (s.Status == "IN_PROGRESS" || s.Status == "DRAFT"));

            if (hasPendingSession)
                throw new InvalidOperationException(
                    $"Kho '{warehouse.WarehouseName}' đang có phiên kiểm kê chưa hoàn thành " +
                    "(DRAFT hoặc IN_PROGRESS). Vui lòng hủy hoặc hoàn tất phiên đó trước.");

            // 3️⃣ Validate – ngày kiểm kê dự kiến không được ở quá khứ
            if (request.PlannedAt.HasValue && request.PlannedAt.Value.Date < DateTime.UtcNow.Date)
                throw new ArgumentException("Ngày kiểm kê dự kiến (PlannedAt) không được ở trong quá khứ.");

            // 4️⃣ Tạo mã phiếu tự động: ST-2025-0001
            var year = DateTime.UtcNow.Year;
            var countThisYear = await _context.StocktakeSessions
                .CountAsync(s => s.StocktakeCode.StartsWith($"ST-{year}-"));
            var newCode = $"ST-{year}-{(countThisYear + 1):D4}";

            // 5️⃣ Insert StocktakeSession (DRAFT, Mode = FULL)
            var session = new StocktakeSession
            {
                StocktakeCode = newCode,
                WarehouseId   = request.WarehouseId,
                Mode          = "FULL",
                Status        = "DRAFT",
                PlannedAt     = request.PlannedAt,
                Note          = request.Note,
                CreatedBy     = currentUserId
            };

            _context.StocktakeSessions.Add(session);
            await _context.SaveChangesAsync();

            // 6️⃣ Reload để lấy navigation properties (Warehouse, CreatedByNavigation)
            await _context.Entry(session).Reference(s => s.Warehouse).LoadAsync();
            await _context.Entry(session).Reference(s => s.CreatedByNavigation).LoadAsync();

            // 7️⃣ Return
            return new StocktakeDetailResponse
            {
                StocktakeId   = session.StocktakeId,
                StocktakeCode = session.StocktakeCode,
                WarehouseId   = session.WarehouseId,
                WarehouseName = session.Warehouse.WarehouseName,
                Status        = session.Status,
                Mode          = session.Mode,
                PlannedAt     = session.PlannedAt,
                StartedAt     = null,
                EndedAt       = null,
                CreatedBy     = session.CreatedBy,
                CreatedByName = session.CreatedByNavigation.FullName,
                Note          = session.Note,
                TotalLines    = 0,
                CountedLines  = 0,
                VarianceLines = 0,
                ProgressPercent = 0
            };
        }
    }
}
