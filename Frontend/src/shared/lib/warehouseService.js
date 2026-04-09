import apiClient from './axios';
import { invalidate } from './pollingManager';

/**
 * Kho (Warehouse) – kết nối WarehouseController.
 * GET /Warehouse/get-Warehouse?pageNumber=1&pageSize=100 (FilterRequest)
 * GET /Warehouse/{id}/detail          ← chi tiết kho kèm items (WarehouseDetailResponse)
 * GET /Warehouse/history?pageNumber=1&pageSize=10&warehouseId=...
 * PUT /Warehouse/update-warehouse/{id}
 * PATCH /Warehouse/toggle-status/{id}
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
        return { items: [], totalItems: 0, pageNumber: 1, pageSize: 100 };
    }
}

/**
 * Lấy chi tiết kho (kèm danh sách vật tư, phiếu nhập/xuất/trả).
 * GET /Warehouse/{id}/detail
 * @param {number} id - Warehouse ID
 * @returns {Promise<import('../entities/warehouseDetail').WarehouseDetailResponse>}
 */
export async function getWarehouseDetail(id) {
    try {
        const response = await apiClient.get(`/Warehouse/${id}/detail`);
        const body = response?.data ?? {};
        const data = body.data ?? body.Data ?? body;
        return data;
    } catch (error) {
        throw error.response?.data || error;
    }
}

/**
 * Lấy lịch sử biến động kho.
 * GET /Warehouse/history?pageNumber=1&pageSize=10&warehouseId=...
 * @param {{ pageNumber?: number, pageSize?: number, warehouseId?: number }} params
 * @returns {Promise<{ items, totalItems, pageNumber, pageSize }>}
 */
export async function getWarehouseHistory(params = {}) {
    const { pageNumber = 1, pageSize = 20, warehouseId } = params;
    try {
        const response = await apiClient.get('/Warehouse/history', {
            params: { pageNumber, pageSize, warehouseId },
        });
        const body = response?.data ?? {};
        const paged = body.data ?? body.Data ?? body;
        const rawList = Array.isArray(paged) ? paged : (paged?.items ?? paged?.Items ?? []);
        return {
            items: rawList,
            totalItems: paged?.totalItems ?? paged?.TotalItems ?? rawList.length,
            pageNumber: paged?.pageNumber ?? paged?.PageNumber ?? pageNumber,
            pageSize: paged?.pageSize ?? paged?.PageSize ?? pageSize,
        };
    } catch (error) {
        throw error.response?.data || error;
    }
}

/**
 * Bật/Tắt trạng thái kho.
 * PATCH /Warehouse/toggle-status/{id}
 * @param {number} id - Warehouse ID
 * @returns {Promise<any>}
 */
export async function toggleWarehouseStatus(id) {
    try {
        const response = await apiClient.patch(`/Warehouse/toggle-status/${id}`);
        invalidate('warehouse');
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
}

/**
 * Alias cho ViewWarehouseList và các nơi tên getWarehouses
 */
export const getWarehouses = getWarehouseList;

/**
 * Tạo kho mới.
 * POST /Warehouse/create-warehouse
 * @param {{ warehouseCode: string, warehouseName: string, address?: string, isActive?: boolean }} data
 * @returns {Promise<any>}
 */
export async function createWarehouse(data) {
    try {
        const response = await apiClient.post('/Warehouse/create-warehouse', {
            warehouseCode: data.warehouseCode,
            warehouseName: data.warehouseName,
            address: data.address,
            isActive: data.isActive,
        });
        invalidate('warehouse');
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
}

/**
 * Cập nhật thông tin kho.
 * PUT /Warehouse/update-warehouse/{id}
 * @param {{ id: number, warehouseName: string, address?: string, isActive?: boolean }} data
 * @returns {Promise<any>}
 */
export async function updateWarehouse(data) {
    try {
        const response = await apiClient.put(`/Warehouse/update-warehouse/${data.id}`, {
            warehouseName: data.warehouseName,
            address: data.address,
            isActive: data.isActive,
        });
        invalidate('warehouse');
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
}
