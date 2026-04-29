import apiClient from './axios';

/**
 * Báo cáo tồn kho — InventoryReportController
 * GET /InventoryReport/weighted-average
 */

function mapWeightedAverageRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        itemId: row.itemId ?? row.ItemId,
        itemCode: row.itemCode ?? row.ItemCode ?? '',
        itemName: row.itemName ?? row.ItemName ?? '',
        warehouseId: row.warehouseId ?? row.WarehouseId,
        warehouseName: row.warehouseName ?? row.WarehouseName ?? '',
        latestImportPrice: Number(row.latestImportPrice ?? row.LatestImportPrice ?? 0),
        weightedAveragePrice: Number(row.weightedAveragePrice ?? row.WeightedAveragePrice ?? 0),
        totalInventory: Number(row.totalInventory ?? row.TotalInventory ?? 0),
        inventoryValue: Number(row.inventoryValue ?? row.InventoryValue ?? 0),
    };
}

function mapWeightedAverageResponse(raw, fallbackPage, fallbackPageSize) {
    const d = raw && typeof raw === 'object' ? raw : {};
    const itemsRaw = d.items ?? d.Items ?? [];
    const items = (Array.isArray(itemsRaw) ? itemsRaw : []).map(mapWeightedAverageRow).filter(Boolean);
    return {
        totalMaterials: Number(d.totalMaterials ?? d.TotalMaterials ?? 0),
        totalInventory: Number(d.totalInventory ?? d.TotalInventory ?? 0),
        averageWeightedPrice: Number(d.averageWeightedPrice ?? d.AverageWeightedPrice ?? 0),
        totalInventoryValue: Number(d.totalInventoryValue ?? d.TotalInventoryValue ?? 0),
        totalRecords: Number(d.totalRecords ?? d.TotalRecords ?? 0),
        page: Number(d.page ?? d.Page ?? fallbackPage),
        pageSize: Number(d.pageSize ?? d.PageSize ?? fallbackPageSize),
        items,
    };
}

/**
 * @param {{ keyword?: string, warehouseId?: number|null, page?: number, pageSize?: number }} params
 * @returns {Promise<ReturnType<typeof mapWeightedAverageResponse>>}
 */
export async function getWeightedAverageReport(params = {}) {
    const { keyword, warehouseId, page = 1, pageSize = 20 } = params;
    const query = new URLSearchParams();
    if (keyword != null && String(keyword).trim() !== '') {
        query.set('keyword', String(keyword).trim());
    }
    if (warehouseId != null && Number(warehouseId) > 0) {
        query.set('warehouseId', String(warehouseId));
    }
    query.set('page', String(Math.max(1, Number(page) || 1)));
    query.set('pageSize', String(Math.max(1, Number(pageSize) || 20)));

    const response = await apiClient.get(`/InventoryReport/weighted-average?${query.toString()}`);
    const body = response?.data ?? {};
    const data = body.data ?? body.Data ?? body;
    return mapWeightedAverageResponse(data, page, pageSize);
}
