import apiClient from './axios';

/**
 * Lay danh sach dia chi theo cong ty.
 * GET /api/Address/addressBycompany/{companyId}
 */
export async function getAddressesByCompany(companyId) {
    try {
        const response = await apiClient.get(`/Address/addressBycompany/${companyId}`);
        const data = response?.data ?? {};
        const raw = Array.isArray(data)
            ? data
            : (data.data ?? data.Data ?? data.items ?? data.Items ?? []);

        return raw
            .filter(row => row != null && typeof row === 'object')
            .map(row => ({
                addressId: row.addressId ?? row.AddressId,
                companyId: row.companyId ?? row.CompanyId,
                addressName: row.addressName ?? row.AddressName ?? '',
                addressDetail: row.addressDetail ?? row.AddressDetail ?? '',
                district: row.district ?? row.District ?? '',
                city: row.city ?? row.City ?? '',
                ward: row.ward ?? row.Ward ?? '',
                isDefault: row.isDefault ?? row.IsDefault ?? false,
                isActive: row.isActive ?? row.IsActive ?? true,
            }));
    } catch (error) {
        if (error.response?.status === 404) return [];
        throw new Error(error.response?.data?.message || 'Khong tai duoc danh sach dia chi.');
    }
}

export async function getAddresses(companyId) {
    return getAddressesByCompany(companyId);
}

/**
 * Tao dia chi moi cho mot cong ty.
 * POST /api/Address
 */
export async function createAddress(data) {
    try {
        const payload = {
            companyId: Number(data.companyId),
            addressName: data.addressName?.trim() || null,
            addressDetail: data.addressDetail?.trim() || null,
            district: data.district?.trim() || null,
            city: data.city?.trim() || null,
            ward: data.ward?.trim() || null,
            isDefault: Boolean(data.isDefault),
        };

        const response = await apiClient.post('/Address', payload);
        return response?.data ?? response;
    } catch (error) {
        if (error.response?.status === 400) {
            throw new Error(error.response?.data?.message || 'Du lieu dia chi khong hop le.');
        } else if (error.response?.status === 401) {
            throw new Error('Phien dang nhap da het han. Vui long dang nhap lai.');
        } else if (error.message === 'Network Error') {
            throw new Error('Khong the ket noi den server.');
        } else {
            throw new Error(error.response?.data?.message || 'Da xay ra loi khi tao dia chi.');
        }
    }
}
