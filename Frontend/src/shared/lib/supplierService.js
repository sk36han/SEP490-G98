import apiClient from './axios';

/**
 * Supplier API – maps to backend SupplierController / SupplierResponse.
 * Backend trả data trực tiếp (không bọc ApiResponse): PagedResponse hoặc SupplierResponse.
 * Path: GET list-all, POST create, PUT update/{id}, PATCH change-status/{id}
 */

/**
 * @param {Object} params
 * @param {number} [params.page=1] - 1-based (backend)
 * @param {number} [params.pageSize=20]
 * @param {string} [params.supplierCode]
 * @param {string} [params.supplierName]
 * @param {string} [params.taxCode]
 * @param {boolean|null} [params.isActive]
 * @param {string} [params.fromDate] - ISO date
 * @param {string} [params.toDate] - ISO date
 */
export async function getSuppliers(params = {}) {
    const {
        page = 1,
        pageSize = 20,
        supplierCode = '',
        supplierName = '',
        taxCode = '',
        isActive = null,
        fromDate = null,
        toDate = null,
    } = params;
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('pageSize', String(pageSize));
    if (supplierCode != null && String(supplierCode).trim() !== '') query.set('supplierCode', String(supplierCode).trim());
    if (supplierName != null && String(supplierName).trim() !== '') query.set('supplierName', String(supplierName).trim());
    if (taxCode != null && String(taxCode).trim() !== '') query.set('taxCode', String(taxCode).trim());
    if (isActive === true) query.set('isActive', 'true');
    if (isActive === false) query.set('isActive', 'false');
    if (fromDate && typeof fromDate === 'string') query.set('fromDate', fromDate);
    if (toDate && typeof toDate === 'string') query.set('toDate', toDate);

    const response = await apiClient.get(`/Supplier/list-all?${query.toString()}`);
    const data = response?.data;
    if (data == null) {
        return { page: 1, pageSize: pageSize || 20, totalItems: 0, items: [] };
    }
    // Backend trả Ok(PagedResponse): ASP.NET Core mặc định camelCase → items, page, totalItems
    const payload = data.data ?? data.Data ?? data;
    const rawItems = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.Items)
            ? payload.Items
            : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.Items)
            ? data.Items
            : [];
    const items = rawItems
        .filter((row) => row != null && typeof row === 'object')
        .map((row) => ({
            supplierId: row.supplierId ?? row.SupplierId,
            supplierCode: row.supplierCode ?? row.SupplierCode ?? '',
            supplierName: row.supplierName ?? row.SupplierName ?? '',
            taxCode: row.taxCode ?? row.TaxCode ?? '',
            phone: row.phone ?? row.Phone ?? '',
            email: row.email ?? row.Email ?? '',
            address: row.address ?? row.Address ?? '',
            isActive: row.isActive ?? row.IsActive ?? true,
        }));
    return {
        page: payload.page ?? payload.Page ?? 1,
        pageSize: payload.pageSize ?? payload.PageSize ?? pageSize ?? 20,
        totalItems: payload.totalItems ?? payload.TotalItems ?? 0,
        items,
    };
}

/**
 * Lấy gợi ý cho filter autocomplete từ API list (pageSize nhỏ).
 * @param {'supplierCode'|'supplierName'|'taxCode'} field - field cần gợi ý
 * @param {string} query - chuỗi tìm (gửi đúng param tương ứng)
 * @returns {Promise<string[]>} mảng giá trị unique từ items
 */
export async function getSupplierSuggestions(field, query) {
    if (!query || typeof query !== 'string' || !query.trim()) return [];
    const param = { page: 1, pageSize: 20 };
    if (field === 'supplierCode') param.supplierCode = query.trim();
    if (field === 'supplierName') param.supplierName = query.trim();
    if (field === 'taxCode') param.taxCode = query.trim();
    try {
        const res = await getSuppliers(param);
        const items = res.items || [];
        const seen = new Set();
        const list = [];
        for (const row of items) {
            const v = row[field] ?? '';
            if (v && !seen.has(v)) {
                seen.add(v);
                list.push(String(v));
            }
        }
        return list;
    } catch {
        return [];
    }
}

/**
 * Tạo nhà cung cấp mới
 * POST /api/Supplier/create – backend trả trực tiếp SupplierResponse (không bọc ApiResponse)
 */
export async function createSupplier(data) {
    try {
        const payload = {
            supplierName: data.supplierName,
            taxCode: data.taxCode || null,
            phone: data.phone || null,
            email: data.email || null,
            address: data.address || null,
        };
        
        // Don't send supplierCode, let backend generate it
        console.log('Supplier API payload:', payload);
        
        const response = await apiClient.post('/Supplier/create', payload);
        return response.data;
    } catch (error) {
        console.error('Supplier API error response:', error.response?.data);
        if (error.response?.status === 400) {
            const errorMsg = error.response?.data?.message || error.response?.data?.title || 'Dữ liệu không hợp lệ.';
            const errors = error.response?.data?.errors;
            if (errors) {
                console.error('Validation errors:', errors);
                const errorDetails = Object.entries(errors)
                    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                    .join('; ');
                throw new Error(`${errorMsg}\n${errorDetails}`);
            }
            throw new Error(errorMsg);
        } else if (error.response?.status === 401) {
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else if (error.message === 'Network Error') {
            throw new Error('Không thể kết nối đến server.');
        } else {
            throw new Error(error.response?.data?.message || 'Đã xảy ra lỗi khi tạo nhà cung cấp.');
        }
    }
}

/**
 * Cập nhật nhà cung cấp
 * PUT /api/Supplier/update/{id} – backend trả trực tiếp SupplierResponse
 */
export async function updateSupplier(id, data) {
    try {
        const response = await apiClient.put(`/Supplier/update/${id}`, {
            supplierName: data.supplierName,
            taxCode: data.taxCode || null,
            phone: data.phone || null,
            email: data.email || null,
            address: data.address || null,
            isActive: data.isActive,
        });
        return response.data;
    } catch (error) {
        if (error.response?.status === 400) {
            throw new Error(error.response?.data?.message || 'Dữ liệu không hợp lệ.');
        } else if (error.response?.status === 401) {
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else if (error.response?.status === 404) {
            throw new Error('Không tìm thấy nhà cung cấp.');
        } else if (error.message === 'Network Error') {
            throw new Error('Không thể kết nối đến server.');
        } else {
            throw new Error(error.response?.data?.message || 'Đã xảy ra lỗi khi cập nhật nhà cung cấp.');
        }
    }
}

/**
 * Bật/tắt trạng thái nhà cung cấp
 * PATCH /api/Supplier/change-status/{id}?isActive= – backend trả trực tiếp SupplierResponse
 */
export async function toggleSupplierStatus(id, isActive) {
    try {
        const response = await apiClient.patch(`/Supplier/change-status/${id}`, null, {
            params: { isActive: !!isActive },
        });
        return response.data;
    } catch (error) {
        if (error.response?.status === 401) {
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else if (error.response?.status === 404) {
            throw new Error('Không tìm thấy nhà cung cấp.');
        } else {
            throw new Error(error.response?.data?.message || 'Đã xảy ra lỗi khi đổi trạng thái.');
        }
    }
}
