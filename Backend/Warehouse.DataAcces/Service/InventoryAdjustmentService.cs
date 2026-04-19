using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service;

public class InventoryAdjustmentService : IInventoryAdjustmentService
{
    private readonly Mkiwms5Context _context;

    public InventoryAdjustmentService(Mkiwms5Context context)
    {
        _context = context;
    }

    public async Task<InventoryAdjustmentListResponse> GetAllAsync(string? search)
    {
        var query = _context.InventoryAdjustmentRequests
            .AsNoTracking()
            .Include(a => a.Warehouse)
            .Include(a => a.Stocktake)
            .Include(a => a.SubmittedByNavigation)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(a =>
                a.AdjustmentCode.Contains(term)
                || a.Warehouse.WarehouseName.Contains(term)
                || (a.SubmittedByNavigation.FullName != null && a.SubmittedByNavigation.FullName.Contains(term))
                || (a.Stocktake != null && a.Stocktake.StocktakeCode.Contains(term)));
        }

        var rows = await query
            .OrderByDescending(a => a.SubmittedAt ?? a.PostedAt ?? a.ApprovedAt ?? DateTime.MinValue)
            .ThenByDescending(a => a.AdjustmentId)
            .ToListAsync();

        var items = new List<InventoryAdjustmentListItemResponse>(rows.Count);
        var stt = 1;
        foreach (var a in rows)
        {
            var status = a.Status ?? "";
            items.Add(new InventoryAdjustmentListItemResponse
            {
                Stt = stt++,
                AdjustmentId = a.AdjustmentId,
                AdjustmentCode = a.AdjustmentCode,
                StocktakeCode = a.Stocktake?.StocktakeCode,
                WarehouseName = a.Warehouse.WarehouseName,
                Status = status,
                StatusDisplay = MapStatusDisplay(status),
                CreatedAt = a.SubmittedAt ?? a.PostedAt ?? a.ApprovedAt,
                SubmittedByName = a.SubmittedByNavigation?.FullName
            });
        }

        var summary = new InventoryAdjustmentListSummaryResponse
        {
            Total = items.Count,
            Approved = items.Count(i => string.Equals(i.Status, "APPROVED", StringComparison.OrdinalIgnoreCase)),
            PendingApproval = items.Count(i => i.Status.StartsWith("PENDING", StringComparison.OrdinalIgnoreCase))
        };

        return new InventoryAdjustmentListResponse
        {
            Summary = summary,
            Items = items
        };
    }

    private static string MapStatusDisplay(string status)
    {
        if (string.IsNullOrWhiteSpace(status))
            return "—";

        var s = status.Trim().ToUpperInvariant();
        return s switch
        {
            "POSTED" => "Đã ghi sổ",
            "APPROVED" => "Đã duyệt",
            "REJECTED" => "Từ chối",
            "DRAFT" => "Nháp",
            "PENDING_DIR" or "PENDING_DIRECTOR" => "Chờ giám đốc duyệt",
            _ => s.StartsWith("PENDING", StringComparison.Ordinal) ? "Chờ giám đốc duyệt" : status
        };
    }
}
