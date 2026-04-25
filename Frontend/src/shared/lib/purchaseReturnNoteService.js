import apiClient from './axios';

/**
 * Purchase Return Note API - ket noi PurchaseReturnNoteController.
 * GET  /PurchaseReturnNote/list - danh sach phieu tra hang
 * GET  /PurchaseReturnNote/detail/{id} - chi tiet phieu tra hang
 * POST /PurchaseReturnNote/create - tao phieu tra hang
 * POST /PurchaseReturnNote/approve/{id} - duyet phieu tra hang
 * POST /PurchaseReturnNote/cancel/{id} - huy phieu tra hang
 * POST /PurchaseReturnNote/refund/{id} - hoan tien phieu tra hang
 * PUT  /PurchaseReturnNote/update/{id} - cap nhat phieu (DRAFT / SUBMITTED)
 */

/**
 * Lay danh sach phieu tra hang (co phan trang).
 * Backend tra: PagedResponse<PurchaseReturnNoteResponse>
 * @param {Object} params
 * @param {number} params.page - So trang (bat dau tu 1)
 * @param {number} params.pageSize - So dong moi trang
 * @returns {Promise<{ items: any[], totalItems: number, page: number, pageSize: number, totalPages: number }>}
 */
export async function getPurchaseReturnNotes({ page = 1, pageSize = 20 } = {}) {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('pageSize', pageSize);

    const response = await apiClient.get(`/PurchaseReturnNote/list?${params.toString()}`);
    const data = response?.data;

    // Chuan hoa response tu backend
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
 * Tao phieu tra hang.
 * @param {{
 *   RelatedGrnId: number,
 *   ReturnDate: string, // yyyy-MM-dd
 *   Reason?: string,
 *   Note?: string,
 *   FeeAmount?: number,
 *   RefundMethod?: string,
 *   Status?: string,
 *   RefundStatus?: string,
 *   Lines: {
 *     RelatedGrnlineId: number,
 *     ReturnQty: number,
 *     Reason?: string,
 *     Note?: string
 *   }[]
 * }} payload
 * @returns {Promise<any>} PurchaseReturnNoteResponse
 */
export async function createPurchaseReturn(payload) {
    const response = await apiClient.post('/PurchaseReturnNote/create', payload);
    return response?.data;
}

/**
 * Cap nhat phieu tra hang (ngay tra, ly do, ghi chu phi, phi, dong hang).
 * @param {number} id - purchaseReturnId
 * @param {{
 *   ReturnDate: string,
 *   Reason: string|null,
 *   Note: string|null,
 *   FeeAmount: number,
 *   Lines: { RelatedGrnlineId: number, ReturnQty: number, Reason?: string|null, Note?: string|null }[]
 * }} payload
 */
export async function updatePurchaseReturn(id, payload) {
    const response = await apiClient.put(`/PurchaseReturnNote/update/${id}`, payload);
    return response?.data;
}

/**
 * Lay chi tiet phieu tra hang.
 * @param {number} id - PurchaseReturnId
 * @returns {Promise<any>} PurchaseReturnNoteDetailResponse
 */
export async function getPurchaseReturnDetail(id) {
    const response = await apiClient.get(`/PurchaseReturnNote/detail/${id}`);
    return response?.data;
}

/**
 * Duyet phieu tra hang.
 * @param {number} id - PurchaseReturnId
 * @returns {Promise<any>}
 */
export async function approvePurchaseReturn(id) {
    const response = await apiClient.post(`/PurchaseReturnNote/approve/${id}`);
    return response?.data;
}

/**
 * Huy phieu tra hang.
 * @param {number} id - PurchaseReturnId
 * @returns {Promise<any>}
 */
export async function cancelPurchaseReturn(id) {
    const response = await apiClient.post(`/PurchaseReturnNote/cancel/${id}`);
    return response?.data;
}

/**
 * Hoan tien phieu tra hang.
 * @param {number} id - PurchaseReturnId
 * @param {{ RefundMethod: string, RefundReference?: string }} payload
 * @returns {Promise<any>}
 */
export async function refundPurchaseReturn(id, payload) {
    const response = await apiClient.post(`/PurchaseReturnNote/refund/${id}`, payload);
    return response?.data;
}
