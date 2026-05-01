import apiClient from './axios';

/**
 * GET /InventoryAdjustment/list-all — toàn bộ phiếu điều chỉnh (không phân trang).
 * @param {string} [search] — tìm theo mã phiếu, kho, người đề xuất, mã kiểm kê
 * @returns {Promise<{ summary: { total, approved, pendingApproval }, items: Array }>}
 */
export async function fetchInventoryAdjustmentsListAll(search) {
    const params = {};
    if (search != null && String(search).trim() !== '') {
        params.search = String(search).trim();
    }
    const res = await apiClient.get('/InventoryAdjustment/list-all', { params });
    const body = res?.data?.data ?? res?.data ?? {};
    const summary = body.summary ?? body.Summary ?? {};
    const rawItems = body.items ?? body.Items ?? [];

    const items = (Array.isArray(rawItems) ? rawItems : []).map(mapAdjustmentListRow);

    return {
        summary: {
            total: summary.total ?? summary.Total ?? items.length,
            approved: summary.approved ?? summary.Approved ?? 0,
            pendingApproval: summary.pendingApproval ?? summary.PendingApproval ?? 0,
        },
        items,
    };
}

function mapAdjustmentListRow(row) {
    if (row == null || typeof row !== 'object') return null;
    const status = row.status ?? row.Status ?? '';
    const createdAt = row.createdAt ?? row.CreatedAt ?? null;
    return {
        adjustmentId: row.adjustmentId ?? row.AdjustmentId,
        adjustmentCode: row.adjustmentCode ?? row.AdjustmentCode ?? '',
        stocktakeCode: row.stocktakeCode ?? row.StocktakeCode ?? null,
        warehouseName: row.warehouseName ?? row.WarehouseName ?? '',
        submittedByName: row.submittedByName ?? row.SubmittedByName ?? '',
        status,
        statusDisplay: row.statusDisplay ?? row.StatusDisplay ?? '',
        submittedAt: createdAt,
        createdAt,
        stt: row.stt ?? row.Stt,
    };
}

/**
 * Chi tiết phiếu điều chỉnh (dòng + vật tư).
 * GET /Approvals/InventoryAdjustment/{id}
 */
export async function fetchInventoryAdjustmentDetail(adjustmentId) {
    const res = await apiClient.get(`/Approvals/InventoryAdjustment/${adjustmentId}`);
    const top = res?.data ?? {};
    const d = top.data ?? top.Data ?? top;

    const linesRaw = d?.lines ?? d?.Lines ?? [];
    const lines = (Array.isArray(linesRaw) ? linesRaw : []).map((l) => {
        const systemQty = Number(l.systemQty ?? l.SystemQty ?? 0);
        const countedQty = Number(l.countedQty ?? l.CountedQty ?? 0);
        const qtyChange = Number(l.qtyChange ?? l.QtyChange ?? countedQty - systemQty);
        const id = l.adjustmentLineId ?? l.AdjustmentLineId ?? Math.random();
        return {
            id,
            adjustmentLineId: id,
            itemCode: l.itemCode ?? l.ItemCode ?? '',
            itemName: l.itemName ?? l.ItemName ?? '',
            uom: l.uomName ?? l.UomName ?? l.uom ?? '—',
            systemQty,
            countedQty,
            varianceQty: qtyChange,
            adjustmentQty: qtyChange,
            qtyChange,
            note: l.note ?? l.Note ?? '',
        };
    });

    return {
        adjustment: {
            adjustmentId: d?.adjustmentId ?? d?.AdjustmentId,
            adjustmentCode: d?.adjustmentCode ?? d?.AdjustmentCode ?? '',
            stocktakeCode: d?.stocktakeCode ?? d?.StocktakeCode ?? null,
            warehouseCode: d?.warehouseCode ?? d?.WarehouseCode ?? '',
            warehouseName: d?.warehouseName ?? d?.WarehouseName ?? '',
            submittedByName: d?.submittedBy ?? d?.SubmittedBy ?? '',
            status: d?.status ?? d?.Status ?? '',
            reason: d?.reason ?? d?.Reason ?? '',
            submittedAt: d?.submittedAt ?? d?.SubmittedAt ?? null,
            approvedAt: d?.approvedAt ?? d?.ApprovedAt ?? null,
            postedAt: d?.postedAt ?? d?.PostedAt ?? null,
            note: d?.reason ?? d?.Reason ?? '',
        },
        lines,
    };
}
