import apiClient from './axios';

/**
 * Kho (Warehouse) – kết nối WarehouseController.
 * GET /Warehouse/get-Warehouse?pageNumber=1&pageSize=100 (FilterRequest)
 * Response: ApiResponse<PagedResult<WarehouseResponse>> → data.Data.Items
 */

function mapWarehouseRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        warehouseId: row.warehouseId ?? row.WarehouseId,
        warehouseCode: row.warehouseCode ?? row.WarehouseCode ?? '',
        warehouseName: row.warehouseName ?? row.WarehouseName ?? '',
        address: row.address ?? row.Address ?? null,
        isActive: row.isActive ?? row.IsActive ?? true,
    };
}

/**
 * Lấy danh sách kho có phân trang.
 * @param {{ pageNumber?: number, pageSize?: number }} params
 * @returns {Promise<{ items, totalItems, pageNumber, pageSize }>}
 */
export async function getWarehouseList(params = {}) {
    const { pageNumber = 1, pageSize = 100 } = params;
    try {
        const response = await apiClient.get('/Warehouse/get-Warehouse', {
            params: { pageNumber, pageSize },
        });
        // ApiResponse<PagedResult<WarehouseResponse>> → body.data / body.Data = PagedResult với Items
        const body = response?.data ?? {};
        const paged = body.data ?? body.Data ?? body;
        const rawList = Array.isArray(paged) ? paged : (paged?.items ?? paged?.Items ?? []);
        const items = (Array.isArray(rawList) ? rawList : []).map(mapWarehouseRow).filter(Boolean);
        return {
            items,
            totalItems: paged?.totalItems ?? paged?.TotalItems ?? items.length,
            pageNumber: paged?.pageNumber ?? paged?.PageNumber ?? pageNumber,
            pageSize: paged?.pageSize ?? paged?.PageSize ?? pageSize,
        };
    } catch {
        return { items: [], totalItems: 0, pageNumber: 1, pageSize };
    }
}

/** Alias cho ViewWarehouseList và các nơi dùng tên getWarehouses */
export const getWarehouses = getWarehouseList;

/**
 * Tạo kho mới.
 * POST /Warehouse/create-warehouse
 * @param {{ warehouseCode: string, warehouseName: string, address?: string, isActive?: boolean }} data
 * @returns {Promise<any>}
 */
export async function createWarehouse(data) {
    try {
        const response = await apiClient.post('/Warehouse/create-warehouse', data);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
}
