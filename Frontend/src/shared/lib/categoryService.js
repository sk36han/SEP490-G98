import apiClient from './axios';

/**
 * Danh mục sản phẩm (Item Category) – kết nối CategoryController.
 * POST create-category, GET list-all-category, GET get-category-by-id/:id, PUT update-category/:id, PATCH change-status-category/:id
 */

function mapCategoryRow(row) {
    if (row == null || typeof row !== 'object') return null;
    return {
        categoryId: row.categoryId ?? row.CategoryId,
        categoryCode: row.categoryCode ?? row.CategoryCode ?? '',
        categoryName: row.categoryName ?? row.CategoryName ?? '',
        parentId: row.parentId ?? row.ParentId ?? null,
        parentName: row.parentName ?? row.ParentName ?? null,
        isActive: row.isActive ?? row.IsActive ?? true,
    };
}

/**
 * Lấy danh sách danh mục có phân trang và lọc.
 */
export async function getCategoryList(params = {}) {
    const { page = 1, pageSize = 20, categoryName, isActive } = params;
    const response = await apiClient.get('/Category/list-all-category', {
        params: { page, pageSize, categoryName: categoryName || undefined, isActive },
    });
    // Backend returns Ok(result) → body is PagedResponse directly (no .data wrapper)
    const body = response?.data ?? {};
    const paged = body.data ?? body;
    const rawList = Array.isArray(paged) ? paged : (paged?.items ?? paged?.Items ?? []);
    const items = (Array.isArray(rawList) ? rawList : []).map(mapCategoryRow).filter(Boolean);
    return {
        page: paged?.page ?? paged?.Page ?? page,
        pageSize: paged?.pageSize ?? paged?.PageSize ?? pageSize,
        totalItems: paged?.totalItems ?? paged?.TotalItems ?? items.length,
        items,
    };
}

/**
 * Lấy chi tiết danh mục theo ID.
 */
export async function getCategoryById(id) {
    const response = await apiClient.get(`/Category/get-category-by-id/${id}`);
    const data = response?.data?.data ?? response?.data;
    return mapCategoryRow(data);
}

/**
 * Tạo danh mục mới.
 */
export async function createCategory(payload) {
    const response = await apiClient.post('/Category/create-category', {
        categoryCode: payload.categoryCode ?? payload.CategoryCode,
        categoryName: payload.categoryName ?? payload.CategoryName,
        parentId: payload.parentId ?? payload.ParentId ?? null,
    });
    return response?.data?.data ?? response?.data;
}

/**
 * Cập nhật danh mục.
 */
export async function updateCategory(id, payload) {
    const response = await apiClient.put(`/Category/update-category/${id}`, {
        categoryCode: payload.categoryCode ?? payload.CategoryCode,
        categoryName: payload.categoryName ?? payload.CategoryName,
        parentId: payload.parentId ?? payload.ParentId ?? null,
        isActive: payload.isActive,
    });
    return response?.data?.data ?? response?.data;
}

/**
 * Bật/tắt trạng thái danh mục.
 */
export async function toggleCategoryStatus(id, isActive) {
    const response = await apiClient.patch(`/Category/change-status-category/${id}`, null, {
        params: { isActive: !!isActive },
    });
    return response?.data?.data ?? response?.data;
}
