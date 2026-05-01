import apiClient from './axios';

/**
 * ItemWarehousePolicy API – kết nối ItemWarehousePolicyController.
 *
 * Backend endpoints:
 *   GET  /ItemWarehousePolicy/list-all     – danh sách có phân trang + filter
 *   GET  /ItemWarehousePolicy/detail/{id} – chi tiết 1 policy
 *   POST /ItemWarehousePolicy/create       – tạo mới
 *   PUT  /ItemWarehousePolicy/update/{id} – cập nhật
 *   DELETE /ItemWarehousePolicy/delete/{id} – xóa
 *
 * Entity: ItemWarehousePolicy
 *   - itemWarehousePolicyId (bigint)
 *   - itemId (bigint)
 *   - warehouseId (bigint)
 *   - minQty (decimal 18,3)
 *   - reorderQty (decimal 18,3, nullable)
 *
 * Unique constraint: (itemId, warehouseId)
 */

// ─── Row mapper ────────────────────────────────────────────────────────────────

/**
 * Map một dòng API → camelCase cho frontend.
 * Hỗ trợ cả PascalCase và camelCase từ backend.
 */
function mapPolicyRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        alertId: row.itemWarehousePolicyId ?? row.ItemWarehousePolicyId,
        itemWarehousePolicyId: row.itemWarehousePolicyId ?? row.ItemWarehousePolicyId,
        itemId: row.itemId ?? row.ItemId,
        warehouseId: row.warehouseId ?? row.WarehouseId,
        minQty: row.minQty ?? row.MinQty ?? 0,
        reorderQty: row.reorderQty ?? row.ReorderQty ?? null,
        onHandQty: row.onHandQty ?? row.OnHandQty ?? 0,
        uom: row.uom ?? row.Uom ?? null,
        // join fields
        itemCode: row.itemCode ?? row.ItemCode ?? '',
        itemName: row.itemName ?? row.ItemName ?? '',
        warehouseName: row.warehouseName ?? row.WarehouseName ?? '',
        createdAt: row.createdAt ?? row.CreatedAt ?? null,
        createdBy: row.createdBy ?? row.CreatedBy ?? row.createdByName ?? row.CreatedByName ?? '',
    };
}

// ─── Get list ─────────────────────────────────────────────────────────────────

/**
 * Lấy danh sách ItemWarehousePolicy có phân trang và filter.
 *
 * Backend trả: ApiResponse<ItemWarehousePolicyListResponse>
 *
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=20]
 * @param {string} [params.keyword]           – tìm kiếm theo mã/tên vật tư
 * @param {number} [params.warehouseId]      – lọc theo kho
 * @param {string} [params.statusFilter]      – "under" | "safe"
 * @returns {Promise<{ items, totalItems, pageNumber, pageSize }>}
 */
export async function getItemWarehousePolicyList(params = {}) {
    const {
        page = 1,
        pageSize = 20,
        keyword = null,
        warehouseId = null,
        statusFilter = null,
    } = params;

    try {
        const response = await apiClient.get('/ItemWarehousePolicy/list-all', {
            params: { page, pageSize, keyword, warehouseId, statusFilter },
        });
        const body = response?.data ?? {};
        const paged = body?.data ?? body;
        const rawList = Array.isArray(paged) ? paged : (paged?.items ?? paged?.Items ?? paged ?? []);
        const items = (Array.isArray(rawList) ? rawList : [])
            .map(mapPolicyRow)
            .filter(Boolean);

        return {
            items,
            totalItems: paged?.totalRecords ?? paged?.TotalRecords ?? items.length,
            pageNumber: paged?.page ?? paged?.Page ?? page,
            pageSize: paged?.pageSize ?? paged?.PageSize ?? pageSize,
        };
    } catch (error) {
        console.error('[ItemWarehousePolicyService] getItemWarehousePolicyList failed:', error);
        throw error.response?.data || error;
    }
}

// ─── Get detail ───────────────────────────────────────────────────────────────

/**
 * Lấy chi tiết một ItemWarehousePolicy.
 *
 * @param {number|string} id – ItemWarehousePolicyId
 * @returns {Promise<Object>}
 */
export async function getItemWarehousePolicyDetail(id) {
    try {
        const response = await apiClient.get(`/ItemWarehousePolicy/detail/${id}`);
        const body = response?.data ?? {};
        const data = body.data ?? body.Data ?? body;
        return mapPolicyRow(data);
    } catch (error) {
        console.error('[ItemWarehousePolicyService] getItemWarehousePolicyDetail failed:', error);
        throw error.response?.data || error;
    }
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Tạo mới một ItemWarehousePolicy.
 *
 * Backend nhận: CreateItemWarehousePolicyRequest
 *   { itemId, warehouseId, minQty, reorderQty? }
 *
 * @param {{ itemId: number, warehouseId: number, minQty: number, reorderQty?: number }} data
 * @returns {Promise<Object>} – ItemWarehousePolicyResponse đã tạo
 */
export async function createItemWarehousePolicy(data) {
    try {
        const response = await apiClient.post('/ItemWarehousePolicy/create', {
            itemId: data.itemId,
            warehouseId: data.warehouseId,
            minQty: data.minQty,
            reorderQty: data.reorderQty ?? null,
        });
        const body = response?.data ?? {};
        const result = body.data ?? body.Data ?? body;
        return mapPolicyRow(result);
    } catch (error) {
        console.error('[ItemWarehousePolicyService] createItemWarehousePolicy failed:', error);
        throw error.response?.data || error;
    }
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Cập nhật một ItemWarehousePolicy.
 *
 * Backend nhận: UpdateItemWarehousePolicyRequest
 *   { minQty, reorderQty? }
 *
 * @param {number|string} id     – ItemWarehousePolicyId
 * @param {{ minQty: number, reorderQty?: number }} data
 * @returns {Promise<Object>}
 */
export async function updateItemWarehousePolicy(id, data) {
    try {
        const response = await apiClient.put(`/ItemWarehousePolicy/update/${id}`, {
            minQty: data.minQty,
            reorderQty: data.reorderQty ?? null,
        });
        const body = response?.data ?? {};
        const result = body.data ?? body.Data ?? body;
        return mapPolicyRow(result);
    } catch (error) {
        console.error('[ItemWarehousePolicyService] updateItemWarehousePolicy failed:', error);
        throw error.response?.data || error;
    }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Xóa một ItemWarehousePolicy.
 *
 * @param {number|string} id – ItemWarehousePolicyId
 * @returns {Promise<void>}
 */
export async function deleteItemWarehousePolicy(id) {
    try {
        await apiClient.delete(`/ItemWarehousePolicy/delete/${id}`);
    } catch (error) {
        console.error('[ItemWarehousePolicyService] deleteItemWarehousePolicy failed:', error);
        throw error.response?.data || error;
    }
}

// ─── Upsert (batch) ───────────────────────────────────────────────────────────

/**
 * Tạo hoặc cập nhật nhiều ItemWarehousePolicy cùng lúc.
 * Backend nhận: [{ itemId, warehouseId, minQty, reorderQty }]
 *
 * @param {Array<{ itemId: number, warehouseId: number, minQty: number, reorderQty?: number }>} policies
 * @returns {Promise<Object>}
 */
export async function upsertItemWarehousePolicies(policies) {
    try {
        const response = await apiClient.post('/ItemWarehousePolicy/upsert', policies);
        return response?.data;
    } catch (error) {
        console.error('[ItemWarehousePolicyService] upsertItemWarehousePolicies failed:', error);
        throw error.response?.data || error;
    }
}
