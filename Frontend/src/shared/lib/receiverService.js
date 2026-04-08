import apiClient from './axios';
import { invalidate } from './pollingManager';

/**
 * Receiver API - maps to backend ReceiverController / ReceiverResponse.
 * Backend tra ve data truc tiep (khong buc qua ApiResponse): PagedResponse hoac ReceiverResponse.
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
 * @param {number|null} [params.companyId] - Loc receiver theo cong ty
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
        companyId = null,
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
    if (companyId != null) query.set('companyId', String(companyId));

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
            district: row.district ?? row.District ?? '',
            notes: row.notes ?? row.Notes ?? '',
            position: row.position ?? row.Position ?? '',
            addressId: row.addressId ?? row.AddressId ?? null,
            companyId: row.companyId ?? row.CompanyId ?? null,
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
 * Lay danh sach nguoi nhan theo cong ty.
 * GET /api/Receiver/ReceiversByCompany/{companyId}
 */
export async function getReceiversByCompany(companyId) {
    try {
        const response = await apiClient.get(`/Receiver/ReceiversByCompany/${companyId}`);
        const data = response?.data ?? {};
        const raw = Array.isArray(data)
            ? data
            : (data.data ?? data.Data ?? data.items ?? data.Items ?? []);

        return raw
            .filter(row => row != null && typeof row === 'object')
            .map(row => ({
                receiverId: row.receiverId ?? row.ReceiverId,
                receiverCode: row.receiverCode ?? row.ReceiverCode ?? '',
                receiverName: row.receiverName ?? row.ReceiverName ?? '',
                phone: row.phone ?? row.Phone ?? '',
                email: row.email ?? row.Email ?? '',
                address: row.address ?? row.Address ?? '',
                city: row.city ?? row.City ?? '',
                ward: row.ward ?? row.Ward ?? '',
                district: row.district ?? row.District ?? '',
                position: row.position ?? row.Position ?? '',
                addressId: row.addressId ?? row.AddressId ?? null,
                companyId: row.companyId ?? row.CompanyId ?? null,
            }));
    } catch (error) {
        if (error.response?.status === 404) return [];
        throw new Error(error.response?.data?.message || 'Khong tai duoc danh sach nguoi nhan.');
    }
}

/**
 * Tao nguoi nhan moi
 * POST /api/Receiver/create - backend tra ve ReceiverResponse
 */
export async function createReceiver(data) {
    try {
        const response = await apiClient.post('/Receiver/create', {
            receiverName: data.receiverName,
            phone: data.phone || null,
            email: data.email || null,
            address: data.address || null,
            notes: data.notes || null,
            // Extended fields
            companyId: data.companyId != null ? Number(data.companyId) : null,
            addressId: data.addressId != null ? Number(data.addressId) : null,
            position: data.position?.trim() || null,
            city: data.city?.trim() || null,
            district: data.district?.trim() || null,
            ward: data.ward?.trim() || null,
        });
        invalidate('receiver');
        return response.data;
    } catch (error) {
        if (error.response?.status === 400) {
            throw new Error(error.response?.data?.message || 'Du lieu khong hop le.');
        } else if (error.response?.status === 401) {
            throw new Error('Phien dang nhap da het han. Vui long dang nhap lai.');
        } else if (error.message === 'Network Error') {
            throw new Error('Khong the ket noi den server.');
        } else {
            throw new Error(error.response?.data?.message || 'Da xay ra loi khi tao nguoi nhan.');
        }
    }
}

/**
 * Cap nhat nguoi nhan
 * PUT /api/Receiver/update/{id} - backend tra ve ReceiverResponse
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
            // Extended fields
            companyId: data.companyId != null ? Number(data.companyId) : null,
            addressId: data.addressId != null ? Number(data.addressId) : null,
            position: data.position?.trim() || null,
            city: data.city?.trim() || null,
            district: data.district?.trim() || null,
            ward: data.ward?.trim() || null,
        });
        invalidate('receiver');
        return response.data;
    } catch (error) {
        if (error.response?.status === 400) {
            throw new Error(error.response?.data?.message || 'Du lieu khong hop le.');
        } else if (error.response?.status === 401) {
            throw new Error('Phien dang nhap da het han. Vui long dang nhap lai.');
        } else if (error.response?.status === 404) {
            throw new Error('Khong tim thay nguoi nhan.');
        } else if (error.message === 'Network Error') {
            throw new Error('Khong the ket noi den server.');
        } else {
            throw new Error(error.response?.data?.message || 'Da xay ra loi khi cap nhat nguoi nhan.');
        }
    }
}

/**
 * Lay chi tiet mot nguoi nhan.
 * GET /api/Receiver/get-receiver-by-id/{id} - backend tra ve ReceiverResponse truc tiep.
 */
export async function getReceiverDetail(id) {
    const response = await apiClient.get(`/Receiver/get-receiver-by-id/${id}`);
    const data = response?.data ?? {};
    const raw = data.data ?? data.Data ?? data;
    return {
        receiverId: raw.receiverId ?? raw.ReceiverId,
        receiverCode: raw.receiverCode ?? raw.ReceiverCode ?? '',
        receiverName: raw.receiverName ?? raw.ReceiverName ?? '',
        phone: raw.phone ?? raw.Phone ?? '',
        email: raw.email ?? raw.Email ?? '',
        address: raw.address ?? raw.Address ?? '',
        city: raw.city ?? raw.City ?? '',
        ward: raw.ward ?? raw.Ward ?? '',
        district: raw.district ?? raw.District ?? '',
        notes: raw.notes ?? raw.Notes ?? '',
        position: raw.position ?? raw.Position ?? '',
        isActive: raw.isActive ?? raw.IsActive ?? true,
        createdAt: raw.createdAt ?? raw.CreatedAt ?? null,
        updatedAt: raw.updatedAt ?? raw.UpdatedAt ?? null,
        companyId: raw.companyId ?? raw.CompanyId ?? null,
        addressId: raw.addressId ?? raw.AddressId ?? null,
        // Neu backend tra ve nested company / address
        companyName: raw.company?.companyName ?? raw.Company?.companyName ?? raw.companyName ?? '',
        addressName: raw.addressName ?? raw.AddressName ?? '',
    };
}

/**
 * Bat/tat trang thai nguoi nhan
 * PATCH /api/Receiver/change-status/{id}?isActive= - backend tra ve ReceiverResponse
 */
export async function toggleReceiverStatus(id, isActive) {
    try {
        const response = await apiClient.patch(`/Receiver/change-status/${id}`, null, {
            params: { isActive: !!isActive },
        });
        invalidate('receiver');
        return response.data;
    } catch (error) {
        if (error.response?.status === 401) {
            throw new Error('Phien dang nhap da het han. Vui long dang nhap lai.');
        } else if (error.response?.status === 404) {
            throw new Error('Khong tim thay nguoi nhan.');
        } else {
            throw new Error(error.response?.data?.message || 'Da xay ra loi khi doi trang thai.');
        }
    }
}
