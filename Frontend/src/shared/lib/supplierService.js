import apiClient from './axios';

/**
 * Supplier API – maps to backend SupplierController / SupplierResponse.
 * Backend: GET /api/Supplier (page, pageSize, supplierCode, supplierName, ...)
 * Response: PagedResponse<SupplierResponse> → { Page, PageSize, TotalItems, Items }
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
    if (supplierCode != null && supplierCode.trim() !== '') query.set('supplierCode', supplierCode.trim());
    if (supplierName != null && supplierName.trim() !== '') query.set('supplierName', supplierName.trim());
    if (taxCode != null && taxCode.trim() !== '') query.set('taxCode', taxCode.trim());
    if (isActive === true) query.set('isActive', 'true');
    if (isActive === false) query.set('isActive', 'false');
    if (fromDate) query.set('fromDate', fromDate);
    if (toDate) query.set('toDate', toDate);

    const response = await apiClient.get(`/Supplier?${query.toString()}`);
    const data = response.data;
    const rawItems = data.items ?? data.Items ?? [];
    // Normalize to camelCase for DataGrid (backend may return PascalCase)
    const items = rawItems.map((row) => ({
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
        page: data.page ?? data.Page,
        pageSize: data.pageSize ?? data.PageSize,
        totalItems: data.totalItems ?? data.TotalItems ?? 0,
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
