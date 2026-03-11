import apiClient from './axios';

/**
 * Đơn vị tính (Unit of Measure) – kết nối UnitOfMeasureController.
 * GET ?page, pageSize, keyword, isActive
 * POST body CreateUnitOfMeasureRequest (uomCode, uomName)
 * GET /:id
 * PUT /:id body UpdateUnitOfMeasureRequest
 * PATCH /:id/status?isActive=
 */

/**
 * Chuẩn hóa một bản ghi UoM từ API (PascalCase/camelCase) sang camelCase.
 */
function mapUomRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        uomId: row.uomId ?? row.UomId,
        uomCode: row.uomCode ?? row.UomCode ?? '',
        uomName: row.uomName ?? row.UomName ?? '',
        isActive: row.isActive ?? row.IsActive ?? true,
    };
}

/**
 * Lấy danh sách đơn vị tính có phân trang và lọc.
 * @param {{ page?: number, pageSize?: number, keyword?: string, isActive?: boolean }} params
 * @returns {Promise<{ page, pageSize, totalItems, items }>}
 */
export async function getUomList(params = {}) {
    const { page = 1, pageSize = 20, keyword, isActive } = params;
    const response = await apiClient.get('/UnitOfMeasure', {
        params: { page, pageSize, keyword: keyword || undefined, isActive },
    });
    // Backend returns Ok(new { success, message, data = result }) → list in response.data.data
    const body = response?.data ?? {};
    const paged = body.data ?? body;
    const rawList = Array.isArray(paged) ? paged : (paged?.items ?? paged?.Items ?? []);
    const items = (Array.isArray(rawList) ? rawList : []).map(mapUomRow).filter(Boolean);
    return {
        page: paged?.page ?? paged?.Page ?? page,
        pageSize: paged?.pageSize ?? paged?.PageSize ?? pageSize,
        totalItems: paged?.totalItems ?? paged?.TotalItems ?? items.length,
        items,
    };
}

/**
 * Lấy chi tiết đơn vị tính theo ID.
 * @param {number|string} id
 * @returns {Promise<{ uomId, uomCode, uomName, isActive }>}
 */
export async function getUomById(id) {
    const response = await apiClient.get(`/UnitOfMeasure/${id}`);
    const data = response?.data?.data ?? response?.data;
    return mapUomRow(data);
}

/**
 * Tạo đơn vị tính mới.
 * @param {{ uomCode: string, uomName: string }} payload
 * @returns {Promise<{ success, message, data }>}
 */
export async function createUom(payload) {
    const response = await apiClient.post('/UnitOfMeasure', payload);
    return response?.data;
}

/**
 * Cập nhật đơn vị tính.
 * @param {number|string} id
 * @param {{ uomCode: string, uomName: string, isActive?: boolean }} payload
 * @returns {Promise<{ success, message, data }>}
 */
export async function updateUom(id, payload) {
    const response = await apiClient.put(`/UnitOfMeasure/${id}`, payload);
    return response?.data;
}

/**
 * Bật/tắt trạng thái đơn vị tính.
 * @param {number|string} id
 * @param {boolean} isActive
 * @returns {Promise<{ success, message, data }>}
 */
export async function toggleUomStatus(id, isActive) {
    const response = await apiClient.patch(`/UnitOfMeasure/${id}/status`, null, {
        params: { isActive: !!isActive },
    });
    return response?.data;
}
