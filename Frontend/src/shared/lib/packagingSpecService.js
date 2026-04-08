import apiClient from './axios';

/**
 * Quy cách đóng gói (PackagingSpec) – kết nối api/packagingspecs.
 * GET /, GET /:id, POST, PUT /:id, DELETE /:id
 */

function mapPackagingSpecRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        packagingSpecId: row.packagingSpecId ?? row.PackagingSpecId,
        specName: row.specName ?? row.SpecName ?? '',
        description: row.description ?? row.Description ?? null,
        isActive: row.isActive ?? row.IsActive ?? true,
    };
}

const BASE = '/packagingspecs';

/**
 * Lấy danh sách quy cách đóng gói (có phân trang).
 * Backend trả: { code, message, data: PackagingSpecResponse[] } hoặc { items, page, pageSize, totalItems }
 */
export async function getPackagingSpecList({ page = 1, pageSize = 20, specName = '', isActive = null } = {}) {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('pageSize', String(pageSize));
    if (specName.trim()) query.set('specName', specName.trim());
    if (isActive === true) query.set('isActive', 'true');
    if (isActive === false) query.set('isActive', 'false');

    const response = await apiClient.get(`${BASE}?${query.toString()}`);
    const data = response?.data?.data ?? response?.data;
    // Backend có thể trả array trực tiếp hoặc wrapped object
    const payload = Array.isArray(data) ? { items: data, page, pageSize, totalItems: data.length } : data;
    const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.Items) ? payload.Items : Array.isArray(payload) ? payload : [];
    return {
        items: items.map(row => mapPackagingSpecRow(row)).filter(Boolean),
        page: payload?.page ?? payload?.Page ?? page,
        pageSize: payload?.pageSize ?? payload?.PageSize ?? pageSize,
        totalItems: payload?.totalItems ?? payload?.TotalItems ?? items.length,
    };
}

/**
 * Lấy chi tiết theo ID.
 */
export async function getPackagingSpecById(id) {
    const response = await apiClient.get(`${BASE}/${id}`);
    const data = response?.data?.data ?? response?.data;
    return mapPackagingSpecRow(data);
}

/**
 * Tạo mới. Body: specName, description?
 */
export async function createPackagingSpec(payload) {
    const response = await apiClient.post(BASE, {
        specName: payload.specName ?? payload.SpecName,
        description: payload.description ?? payload.Description ?? null,
    });
    return response?.data?.data ?? response?.data;
}

/**
 * Cập nhật. Body: specName, description?, isActive.
 */
export async function updatePackagingSpec(id, payload) {
    const response = await apiClient.put(`${BASE}/${id}`, {
        specName: payload.specName ?? payload.SpecName,
        description: payload.description ?? payload.Description ?? null,
        isActive: payload.isActive,
    });
    return response?.data?.data ?? response?.data;
}

/**
 * Xóa quy cách đóng gói.
 */
export async function deletePackagingSpec(id) {
    const response = await apiClient.delete(`${BASE}/${id}`);
    return response?.data;
}
