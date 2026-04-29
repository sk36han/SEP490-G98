import apiClient from './axios';
import { invalidate } from './pollingManager';

/**
 * Quy cách đóng gói (PackagingSpec) – kết nối api/packagingspecs.
 * GET /, GET /:id, POST, PUT /:id, DELETE /:id
 */

/** Khớp quy tắc tên với backend (PackagingSpecService.ValidateSpecName) */
export const PACKAGING_SPEC_NAME_REGEX = /^[\p{L}\p{N}\s\-.&/]+$/u;

/**
 * Validate tên + mô tả trước khi gọi API (mô tả bắt buộc, 2–500 ký tự).
 * @returns {{ valid: boolean, errors: { specName?: string, description?: string } }}
 */
export function validatePackagingSpecFields(specNameRaw, descriptionRaw) {
    const errors = {};
    const name = String(specNameRaw ?? '').trim();
    const desc = String(descriptionRaw ?? '').trim();
    if (name.length < 2) {
        errors.specName = 'Tên quy cách phải có ít nhất 2 ký tự.';
    } else if (name.length > 255) {
        errors.specName = 'Tên không được vượt quá 255 ký tự.';
    } else if (!PACKAGING_SPEC_NAME_REGEX.test(name)) {
        errors.specName = 'Tên chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu - . & và /.';
    }
    if (desc.length < 2) {
        errors.description = 'Mô tả bắt buộc, tối thiểu 2 ký tự.';
    } else if (desc.length > 500) {
        errors.description = 'Mô tả không được vượt quá 500 ký tự.';
    }
    return { valid: Object.keys(errors).length === 0, errors };
}

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
        Description: payload.description ?? payload.Description ?? '',
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
        Description: payload.description ?? payload.Description ?? '',
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
