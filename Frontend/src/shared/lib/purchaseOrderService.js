import apiClient from './axios';

/**
 * Purchase Order API – kết nối PurchaseOrderController.
 * POST /PurchaseOrder/create – body CreatePurchaseOrderRequest
 */

/**
 * Tạo đơn mua.
 * @param {{
 *  supplierId: number,
 *  warehouseId: number,
 *  responsibleUserId?: number|null,
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

