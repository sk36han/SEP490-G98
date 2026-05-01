import apiClient from './axios';
import { invalidate } from './pollingManager';

/**
 * Thông số kỹ thuật (Item Parameter) – kết nối ItemParameterController.
 * POST create-item-parameter, GET list-all-item-parameter, GET get-item-parameter-by-id/:id,
 * PUT update-item-parameter/:id, PATCH change-status-item-parameter/:id
 */

function mapItemParameterRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        specificationId: row.paramId ?? row.ParamId ?? row.specificationId,
        specificationCode: row.paramCode ?? row.ParamCode ?? row.specificationCode ?? '',
        specificationName: row.paramName ?? row.ParamName ?? row.specificationName ?? '',
        unit: row.dataType ?? row.DataType ?? row.unit ?? '',
        isActive: row.isActive ?? row.IsActive ?? true,
        createdAt: row.createdAt ?? row.CreatedAt ?? row.createdDate ?? row.CreatedDate,
    };
}

/**
 * Lấy danh sách thông số có phân trang và lọc.
 */
export async function getItemParameterList(params = {}) {
    const { page = 1, pageSize = 20, paramName, isActive } = params;
    const response = await apiClient.get('/ItemParameter/list-all-item-parameter', {
        params: { page, pageSize, paramName: paramName || undefined, isActive },
    });
    // Backend returns Ok(result) → body is PagedResponse directly (no .data wrapper)
    const body = response?.data ?? {};
    const paged = body.data ?? body;
    const rawList = Array.isArray(paged) ? paged : (paged?.items ?? paged?.Items ?? []);
    const items = (Array.isArray(rawList) ? rawList : []).map(mapItemParameterRow).filter(Boolean);
    return {
        page: paged?.page ?? paged?.Page ?? page,
        pageSize: paged?.pageSize ?? paged?.PageSize ?? pageSize,
        totalItems: paged?.totalItems ?? paged?.TotalItems ?? items.length,
        items,
    };
}

/**
 * Lấy chi tiết thông số theo ID.
 */
export async function getItemParameterById(id) {
    const response = await apiClient.get(`/ItemParameter/get-item-parameter-by-id/${id}`);
    const data = response?.data?.data ?? response?.data;
    return mapItemParameterRow(data);
}

/**
 * Tạo thông số mới.
 */
export async function createItemParameter(payload) {
    const response = await apiClient.post('/ItemParameter/create-item-parameter', {
        paramName: payload.paramName ?? payload.ParamName ?? payload.specificationName,
        dataType: payload.dataType ?? payload.DataType ?? payload.unit ?? 'string',
    });
    invalidate('spec');
    return response?.data?.data ?? response?.data;
}

/**
 * Cập nhật thông số (backend không cho đổi paramCode).
 */
export async function updateItemParameter(id, payload) {
    const response = await apiClient.put(`/ItemParameter/update-item-parameter/${id}`, {
        paramName: payload.paramName ?? payload.ParamName ?? payload.specificationName,
        dataType: payload.dataType ?? payload.DataType ?? payload.unit ?? 'string',
        isActive: payload.isActive,
    });
    invalidate('spec');
    return response?.data?.data ?? response?.data;
}

/**
 * Bật/tắt trạng thái thông số.
 */
export async function toggleItemParameterStatus(id, isActive) {
    const response = await apiClient.patch(`/ItemParameter/change-status-item-parameter/${id}`, null, {
        params: { isActive: !!isActive },
    });
    invalidate('spec');
    return response?.data?.data ?? response?.data;
}
