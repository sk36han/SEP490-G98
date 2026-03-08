import apiClient from './axios';

/**
 * Thương hiệu (Brand) – kết nối BrandController.
 * POST create-brand, GET list-all-brand, GET get-brand-by-id/:id, PUT update-brand/:id, PATCH change-status-brand/:id
 */

function mapBrandRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        brandId: row.brandId ?? row.BrandId,
        brandName: row.brandName ?? row.BrandName ?? '',
        isActive: row.isActive ?? row.IsActive ?? true,
    };
}

/**
 * Lấy danh sách thương hiệu có phân trang và lọc.
 * @param {{ page?: number, pageSize?: number, brandName?: string, isActive?: boolean }} params
 */
export async function getBrandList(params = {}) {
    const { page = 1, pageSize = 20, brandName, isActive } = params;
    const response = await apiClient.get('/Brand/list-all-brand', {
        params: { page, pageSize, brandName: brandName || undefined, isActive },
    });
    // Backend returns Ok(result) → body is PagedResponse directly (no .data wrapper)
    const body = response?.data ?? {};
    const paged = body.data ?? body;
    const rawList = Array.isArray(paged) ? paged : (paged?.items ?? paged?.Items ?? []);
    const items = (Array.isArray(rawList) ? rawList : []).map(mapBrandRow).filter(Boolean);
    return {
        page: paged?.page ?? paged?.Page ?? page,
        pageSize: paged?.pageSize ?? paged?.PageSize ?? pageSize,
        totalItems: paged?.totalItems ?? paged?.TotalItems ?? items.length,
        items,
    };
}

/**
 * Lấy chi tiết thương hiệu theo ID.
 */
export async function getBrandById(id) {
    const response = await apiClient.get(`/Brand/get-brand-by-id/${id}`);
    const data = response?.data?.data ?? response?.data;
    return mapBrandRow(data);
}

/**
 * Tạo thương hiệu mới. Backend chỉ có BrandName.
 */
export async function createBrand(payload) {
    const response = await apiClient.post('/Brand/create-brand', {
        brandName: payload.brandName ?? payload.BrandName,
    });
    return response?.data?.data ?? response?.data;
}

/**
 * Cập nhật thương hiệu.
 */
export async function updateBrand(id, payload) {
    const response = await apiClient.put(`/Brand/update-brand/${id}`, {
        brandName: payload.brandName ?? payload.BrandName,
        isActive: payload.isActive,
    });
    return response?.data?.data ?? response?.data;
}

/**
 * Bật/tắt trạng thái thương hiệu.
 */
export async function toggleBrandStatus(id, isActive) {
    const response = await apiClient.patch(`/Brand/change-status-brand/${id}`, null, {
        params: { isActive: !!isActive },
    });
    return response?.data?.data ?? response?.data;
}
