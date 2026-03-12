import apiClient from './axios';

/**
 * Purchase Order API – kết nối PurchaseOrderController.
 * GET  /PurchaseOrder/list – danh sách đơn mua (phân trang)
 * POST /PurchaseOrder/create – tạo đơn mua
 */

/**
 * Lấy danh sách đơn mua hàng (có phân trang).
 * Backend trả: PagedResponse<PurchaseOrderResponse>
 * @param {Object} params
 * @param {number} params.page - Số trang (bắt đầu từ 1)
 * @param {number} params.pageSize - Số dòng mỗi trang
 * @param {string=} params.poCode - Lọc theo mã PO (tùy chọn)
 * @param {string=} params.supplierName - Lọc theo tên NCC (tùy chọn)
 * @param {string=} params.status - Lọc theo trạng thái (tùy chọn)
 * @param {string=} params.fromDate - Từ ngày (yyyy-MM-dd)
 * @param {string=} params.toDate - Đến ngày (yyyy-MM-dd)
 * @param {string=} params.requestedByName - Lọc theo người tạo (tùy chọn)
 * @returns {Promise<{ items: any[], totalItems: number, page: number, pageSize: number, totalPages: number }>}
 */
export async function getPurchaseOrders({ page = 1, pageSize = 20, poCode, supplierName, status, fromDate, toDate, requestedByName } = {}) {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('pageSize', pageSize);
    if (poCode) params.append('poCode', poCode);
    if (supplierName) params.append('supplierName', supplierName);
    if (status) params.append('status', status);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    if (requestedByName) params.append('requestedByName', requestedByName);

    const response = await apiClient.get(`/PurchaseOrder/list?${params.toString()}`);
    const data = response?.data;
    
    // Chuẩn hóa response từ backend
    if (data && typeof data === 'object') {
        return {
            items: data.items ?? data.Data ?? [],
            totalItems: data.totalItems ?? data.TotalItems ?? 0,
            page: data.page ?? data.Page ?? 1,
            pageSize: data.pageSize ?? data.PageSize ?? pageSize,
            totalPages: data.totalPages ?? data.TotalPages ?? 0,
        };
    }
    
    return { items: [], totalItems: 0, page: 1, pageSize, totalPages: 0 };
}

/**
 * Tạo đơn mua.
 * @param {{
 *  supplierId: number,
 *  warehouseId: number,
 *  responsibleUserId?: number|null,
 *  status?: string, // DRAFT, PENDING
 *  expectedDeliveryDate?: string|null, // yyyy-MM-dd
 *  justification?: string|null,
 *  discountAmount?: number|null,
 *  lines: { itemId: number, orderedQty: number, unitPrice: number, note?: string|null }[]
 * }} payload
 * @returns {Promise<any>} PurchaseOrderDetailResponse (backend trả trực tiếp)
 */
export async function createPurchaseOrder(payload) {
    const response = await apiClient.post('/PurchaseOrder/create', payload);
    return response?.data;
}

/**
 * Lấy danh sách tất cả đơn mua (dùng cho dropdown chọn PO).
 * Gọi API với pageSize lớn để lấy đủ danh sách.
 * @param {string=} status - Lọc theo trạng thái (mặc định lấy Approved)
 * @returns {Promise<any[]>} Danh sách PO
 */
export async function getAllPurchaseOrdersForSelection(status = 'Approved') {
    try {
        const result = await getPurchaseOrders({ page: 1, pageSize: 100, status });
        return result.items ?? [];
    } catch (err) {
        console.error('Lỗi khi lấy danh sách PO:', err);
        return [];
    }
}

/**
 * Lấy chi tiết một đơn mua theo ID.
 * @param {number|string} poId
 * @returns {Promise<any>} Chi tiết PO
 */
export async function getPurchaseOrderDetail(poId) {
    const response = await apiClient.get(`/PurchaseOrder/detail/${poId}`);
    return response?.data;
}

/**
 * Duyệt đơn mua hàng
 * @param {number|string} poId - ID của đơn mua
 * @param {string=} reason - Lý do duyệt (tùy chọn)
 * @returns {Promise<any>}
 */
export async function approvePurchaseOrder(poId, reason = null) {
    const payload = reason ? { reason } : {};
    const response = await apiClient.post(`/approvals/PurchaseOrder/${poId}/approve`, payload);
    return response?.data;
}

/**
 * Từ chối đơn mua hàng
 * @param {number|string} poId - ID của đơn mua
 * @param {string} reason - Lý do từ chối (bắt buộc)
 * @returns {Promise<any>}
 */
export async function rejectPurchaseOrder(poId, reason) {
    const response = await apiClient.post(`/approvals/PurchaseOrder/${poId}/reject`, { reason });
    return response?.data;
}
