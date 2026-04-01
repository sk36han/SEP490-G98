import apiClient from './axios';

function getPayload(data) {
    return data?.data ?? data?.Data ?? data ?? null;
}

export async function createGoodsDeliveryNote(payload) {
    try {
        const response = await apiClient.post('/GoodsDeliveryNote/create', payload);
        return getPayload(response?.data);
    } catch (error) {
        if (error?.response?.status === 404) {
            throw new Error('Backend chưa hỗ trợ API tạo phiếu xuất hàng (GoodsDeliveryNote/create).');
        }

        throw new Error(
            error?.response?.data?.message
            || error?.response?.data?.detail
            || 'Không thể tạo phiếu xuất hàng.'
        );
    }
}

export async function createTransportInfo(payload) {
    try {
        const response = await apiClient.post('/TransportInfo', payload);
        return getPayload(response?.data);
    } catch (error) {
        throw new Error(
            error?.response?.data?.message
            || error?.response?.data?.detail
            || 'Không thể tạo thông tin vận chuyển.'
        );
    }
}
