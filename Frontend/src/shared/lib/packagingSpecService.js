import apiClient from './axios';

/**
 * Quy cách đóng gói (PackagingSpec) – kết nối api/packagingspecs.
 * GET /, GET /:id, POST, PUT /:id, DELETE /:id
 */

function mapPackagingSpecRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        packagingSpecId: row.packagingSpecId ?? row.PackagingSpecId,
        specCode: row.specCode ?? row.SpecCode ?? '',
        specName: row.specName ?? row.SpecName ?? '',
        description: row.description ?? row.Description ?? null,
        isActive: row.isActive ?? row.IsActive ?? true,
    };
}

const BASE = '/packagingspecs';

/**
 * Lấy toàn bộ danh sách quy cách đóng gói.
 * Backend trả: { code, message, data: PackagingSpecResponse[] }
 */
export async function getPackagingSpecList() {
    const response = await apiClient.get(BASE);
    const data = response?.data?.data ?? response?.data;
    const list = Array.isArray(data) ? data : (data?.items ?? data?.Items ?? []);
    const arr = Array.isArray(list) ? list : [];
    return arr.map((row) => mapPackagingSpecRow(row)).filter(Boolean);
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
 * Tạo mới. Body: specCode, specName, description?
 */
export async function createPackagingSpec(payload) {
    const response = await apiClient.post(BASE, {
        specCode: payload.specCode ?? payload.SpecCode,
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
