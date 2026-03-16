import apiClient from './axios';

/**
 * Good Receipt Note API – kết nối GoodsReceiptNoteController.
 * GET  /GoodsReceiptNote/list – danh sách phiếu nhập (phân trang)
 * POST /GoodsReceiptNote/create – tạo phiếu nhập
 * POST /GoodsReceiptNote/approve/{id} – duyệt phiếu nhập
 */

/**
 * Lấy danh sách phiếu nhập kho (có phân trang).
 * Backend trả: PagedResponse<GoodsReceiptNoteResponse>
 * @param {Object} params
 * @param {number} params.page - Số trang (bắt đầu từ 1)
 * @param {number} params.pageSize - Số dòng mỗi trang
 * @returns {Promise<{ items: any[], totalItems: number, page: number, pageSize: number, totalPages: number }>}
 */
export async function getGoodReceiptNotes({ page = 1, pageSize = 20 } = {}) {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('pageSize', pageSize);

    const response = await apiClient.get(`/GoodsReceiptNote/list?${params.toString()}`);
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
 * Tạo phiếu nhập kho.
 * @param {{
 *  PurchaseOrderId: number,
 *  ReceiptDate: string, // yyyy-MM-dd
 *  WarehouseId: number,
 *  SupplierId: number,
 *  DiscountType?: string, // "Amount" hoặc "Percentage"
 *  DiscountValue?: number,
 *  ShippingFee?: number,
 *  IsPaid?: boolean,
 *  PaymentMethod?: string,
 *  Note?: string,
 *  lines: {
 *      ItemId: number,
 *      ExpectedQty: number,
 *      ActualQty: number,
 *      UomId: number,
 *      HasCO?: boolean,
 *      HasCQ?: boolean,
 *      Note?: string,
 *      PurchaseOrderLineId?: number,
 *      UnitPrice?: number
 *  }[]
 * }} payload
 * @returns {Promise<any>} GoodsReceiptNoteDetailResponse
 */
export async function createGoodReceiptNote(payload) {
    const response = await apiClient.post('/GoodsReceiptNote/create', payload);
    return response?.data;
}

/**
 * Duyệt phiếu nhập kho.
 * @param {number} id - ID của phiếu nhập
 * @param {{
 *  approvedNote?: string,
 *  IsPaid?: boolean,
 *  PaymentMethod?: string
 * }} payload
 * @returns {Promise<any>}
 */
export async function approveGoodReceiptNote(id, payload) {
    const response = await apiClient.post(`/GoodsReceiptNote/approve/${id}`, payload);
    return response?.data;
}

/**
 * Kiểm tra xem PO đã có GRN đang chờ duyệt (PENDING_ACC) chưa.
 * @param {number} purchaseOrderId - ID của PO
 * @returns {Promise<boolean>} true nếu đã có GRN đang chờ duyệt
 */
export async function hasPendingGRNForPO(purchaseOrderId) {
    try {
        const result = await getGoodReceiptNotes({ page: 1, pageSize: 100, purchaseOrderId });
        // Lọc các GRN có status = PENDING_ACC
        const pendingGRNs = result.items?.filter(
            grn => grn.status?.toUpperCase() === 'PENDING_ACC'
        );
        return pendingGRNs?.length > 0;
    } catch (error) {
        console.error('Lỗi kiểm tra GRN pending:', error);
        return false;
    }
}

/**
 * Lấy chi tiết GRN theo ID.
 * @param {number} grnId - ID của GRN
 * @returns {Promise<any>} GRNDetailResponse
 */
export async function getGRNDetail(grnId) {
    const response = await apiClient.get(`/GoodsReceiptNote/detail/${grnId}`);
    return response?.data;
}

/**
 * Duyệt GRN.
 * @param {number} grnId - ID của GRN
 * @param {{
 *  note?: string,
 *  isPaid?: boolean,
 *  paymentMethod?: string
 * }} payload
 * @returns {Promise<any>}
 */
export async function approveGRN(grnId, payload) {
    const response = await apiClient.post(`/GoodsReceiptNote/approve/${grnId}`, payload);
    return response?.data;
}
