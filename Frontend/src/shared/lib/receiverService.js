import apiClient from './axios';

/**
 * Receiver API – maps to backend ReceiverController / ReceiverResponse.
 * Backend trả data trực tiếp (không bọc ApiResponse): PagedResponse hoặc ReceiverResponse.
 * Path: GET list-all, POST create, PUT update/{id}, PATCH change-status/{id}
 */

/**
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=20]
 * @param {string} [params.receiverCode]
 * @param {string} [params.receiverName]
 * @param {boolean|null} [params.isActive]
 * @param {string} [params.fromDate] - ISO date
 * @param {string} [params.toDate] - ISO date
 */
export async function getReceivers(params = {}) {
    const {
        page = 1,
        pageSize = 20,
        receiverCode = '',
        receiverName = '',
        isActive = null,
        fromDate = null,
        toDate = null,
    } = params;
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('pageSize', String(pageSize));
    if (receiverCode != null && String(receiverCode).trim() !== '') query.set('receiverCode', String(receiverCode).trim());
    if (receiverName != null && String(receiverName).trim() !== '') query.set('receiverName', String(receiverName).trim());
    if (isActive === true) query.set('isActive', 'true');
    if (isActive === false) query.set('isActive', 'false');
    if (fromDate && typeof fromDate === 'string') query.set('fromDate', fromDate);
    if (toDate && typeof toDate === 'string') query.set('toDate', toDate);

    const response = await apiClient.get(`/Receiver/list-all?${query.toString()}`);
    const data = response?.data;
    if (data == null) {
        return { page: 1, pageSize: pageSize || 20, totalItems: 0, items: [] };
    }
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
            receiverId: row.receiverId ?? row.ReceiverId,
            receiverCode: row.receiverCode ?? row.ReceiverCode ?? '',
            receiverName: row.receiverName ?? row.ReceiverName ?? '',
            phone: row.phone ?? row.Phone ?? '',
            email: row.email ?? row.Email ?? '',
            address: row.address ?? row.Address ?? '',
            city: row.city ?? row.City ?? '',
            ward: row.ward ?? row.Ward ?? '',
            notes: row.notes ?? row.Notes ?? '',
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
 * Tạo người nhận mới
 * POST /api/Receiver/create – backend trả trực tiếp ReceiverResponse
 */
export async function createReceiver(data) {
    try {
        const response = await apiClient.post('/Receiver/create', {
            receiverCode: data.receiverCode,
            receiverName: data.receiverName,
            phone: data.phone || null,
            email: data.email || null,
            address: data.address || null,
            notes: data.notes || null,
        });
        return response.data;
    } catch (error) {
        if (error.response?.status === 400) {
            throw new Error(error.response?.data?.message || 'Dữ liệu không hợp lệ.');
        } else if (error.response?.status === 401) {
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else if (error.message === 'Network Error') {
            throw new Error('Không thể kết nối đến server.');
        } else {
            throw new Error(error.response?.data?.message || 'Đã xảy ra lỗi khi tạo người nhận.');
        }
    }
}

/**
 * Cập nhật người nhận
 * PUT /api/Receiver/update/{id} – backend trả trực tiếp ReceiverResponse
 */
export async function updateReceiver(id, data) {
    try {
        const response = await apiClient.put(`/Receiver/update/${id}`, {
            receiverName: data.receiverName,
            phone: data.phone || null,
            email: data.email || null,
            address: data.address || null,
            notes: data.notes || null,
            isActive: data.isActive,
        });
        return response.data;
    } catch (error) {
        if (error.response?.status === 400) {
            throw new Error(error.response?.data?.message || 'Dữ liệu không hợp lệ.');
        } else if (error.response?.status === 401) {
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else if (error.response?.status === 404) {
            throw new Error('Không tìm thấy người nhận.');
        } else if (error.message === 'Network Error') {
            throw new Error('Không thể kết nối đến server.');
        } else {
            throw new Error(error.response?.data?.message || 'Đã xảy ra lỗi khi cập nhật người nhận.');
        }
    }
}

/**
 * Bật/tắt trạng thái người nhận
 * PATCH /api/Receiver/change-status/{id}?isActive= – backend trả trực tiếp ReceiverResponse
 */
export async function toggleReceiverStatus(id, isActive) {
    try {
        const response = await apiClient.patch(`/Receiver/change-status/${id}`, null, {
            params: { isActive: !!isActive },
        });
        return response.data;
    } catch (error) {
        if (error.response?.status === 401) {
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else if (error.response?.status === 404) {
            throw new Error('Không tìm thấy người nhận.');
        } else {
            throw new Error(error.response?.data?.message || 'Đã xảy ra lỗi khi đổi trạng thái.');
        }
    }
}
