import apiClient from './axios';
import { invalidate } from './pollingManager';

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
 * Lấy danh sách quy cách đóng gói.
 * Backend trả: { code, message, data: PackagingSpecResponse[] }
 */
export async function getPackagingSpecList() {
    const response = await apiClient.get(BASE);
    const raw = response?.data;
    const items = Array.isArray(raw?.data) ? raw.data
        : Array.isArray(raw) ? raw
        : [];
    return {
        items: items.map(row => mapPackagingSpecRow(row)).filter(Boolean),
        totalItems: items.length,
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
        SpecName: payload.specName ?? payload.SpecName,
        Description: payload.description ?? payload.Description ?? null,
    });
    invalidate('packaging-spec');
    return response?.data?.data ?? response?.data;
}

/**
 * Cập nhật. Body: specName, description?, isActive.
 */
export async function updatePackagingSpec(id, payload) {
    const response = await apiClient.put(`${BASE}/${id}`, {
        SpecName: payload.specName ?? payload.SpecName,
        Description: payload.description ?? payload.Description ?? null,
        IsActive: payload.isActive,
    });
    invalidate('packaging-spec');
    return response?.data?.data ?? response?.data;
}

/**
 * Xóa quy cách đóng gói.
 */
export async function deletePackagingSpec(id) {
    const response = await apiClient.delete(`${BASE}/${id}`);
    invalidate('packaging-spec');
    return response?.data;
}
