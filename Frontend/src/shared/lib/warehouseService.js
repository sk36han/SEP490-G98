import apiClient from './axios';

/**
 * Warehouse API – maps to backend WarehouseController.
 * Backend: GET /api/warehouse/get-Warehouse?pageNumber=1&pageSize=20
 * Response: ApiResponse<PagedResult<WarehouseResponse>> → data: { items, totalItems, pageNumber, pageSize }
 */

/**
 * @param {Object} params
 * @param {number} [params.pageNumber=1] - 1-based (backend FilterRequest)
 * @param {number} [params.pageSize=20]
 * @returns {Promise<{ items: Array, totalItems: number, pageNumber: number, pageSize: number }>}
 */
export async function getWarehouses(params = {}) {
    const { pageNumber = 1, pageSize = 20 } = params;
    const query = new URLSearchParams();
    query.set('pageNumber', String(pageNumber));
    query.set('pageSize', String(pageSize));

    const response = await apiClient.get(`/warehouse/get-Warehouse?${query.toString()}`);
    const data = response.data;
    // Backend wraps in ApiResponse: { success, message, data: PagedResult }
    const payload = data?.data ?? data;
    const rawItems = payload?.items ?? payload?.Items ?? [];

    const items = rawItems.map((row) => ({
        warehouseId: row.warehouseId ?? row.WarehouseId,
        warehouseCode: row.warehouseCode ?? row.WarehouseCode ?? '',
        warehouseName: row.warehouseName ?? row.WarehouseName ?? '',
        address: row.address ?? row.Address ?? null,
        isActive: row.isActive ?? row.IsActive ?? true,
        createdAt: row.createdAt ?? row.CreatedAt ?? null,
    }));

    return {
        items,
        totalItems: payload?.totalItems ?? payload?.TotalItems ?? 0,
        pageNumber: payload?.pageNumber ?? payload?.PageNumber ?? pageNumber,
        pageSize: payload?.pageSize ?? payload?.PageSize ?? pageSize,
    };
}
