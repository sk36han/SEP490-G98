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

/**
 * Address API — maps to backend AddressController.
 * Lấy danh sách địa chỉ theo companyId,
 * và tạo mới địa chỉ cho một công ty.
 */

/**
 * Lấy danh sách địa chỉ của một công ty.
 * @param {number|string} companyId
 * @returns {Promise<Array<{
 *   addressId: number,
 *   companyId: number,
 *   addressName: string,
 *   addressDetail: string,
 *   district: string,
 *   city: string,
 *   ward: string,
 *   isDefault: boolean,
 *   isActive: boolean,
 * }>>}
 */
export async function getAddresses(companyId) {
    const query = new URLSearchParams();
    if (companyId != null) {
        query.set('companyId', String(companyId));
    }

    const response = await apiClient.get(`/Address/list-all?${query.toString()}`);
    const data = response?.data ?? {};

    // Handle multiple response shapes: flat array, { data: [] }, { items: [] }
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
}

/**
 * Tạo địa chỉ mới cho một công ty.
 * @param {{
 *   companyId: number,
 *   addressName: string,
 *   addressDetail: string,
 *   district?: string,
 *   city?: string,
 *   ward?: string,
 * }} data
 * @returns {Promise<Object>}
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

        const response = await apiClient.post('/Address/create', payload);
        return response?.data ?? response;
    } catch (error) {
        if (error.response?.status === 400) {
            throw new Error(error.response?.data?.message || 'Dữ liệu địa chỉ không hợp lệ.');
        } else if (error.response?.status === 401) {
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else if (error.message === 'Network Error') {
            throw new Error('Không thể kết nối đến server.');
        } else {
            throw new Error(error.response?.data?.message || 'Đã xảy ra lỗi khi tạo địa chỉ.');
        }
    }
}
