import axios from 'axios';

/**
 * Base URL hành chính VN.
 * Dùng v1 (mặc định). Khi API v2 ổn định có thể đổi sang v2 cho dữ liệu sau sáp nhập 2025/2026.
 * Ví dụ v2: baseURL: 'https://provinces.open-api.vn/api/v2'
 */
const BASE_URL = 'https://provinces.open-api.vn/api';
const BASE_URL_V2 = 'https://provinces.open-api.vn/api/v2';
const provinceClient = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
});
const provinceClientV2 = axios.create({
    baseURL: BASE_URL_V2,
    timeout: 15000,
});

/** Cache chi tiết tỉnh (code -> { districts, ... }) để không gọi lại khi đổi tỉnh rồi chọn lại */
const provinceDetailCache = new Map();
const provinceDetailCacheV2 = new Map();

/**
 * Lấy danh sách tỉnh/thành phố (chỉ tên + code). Nhẹ, load nhanh.
 * @returns {Promise<Array<{ code: number, name: string }>>}
 */
export async function getProvinces() {
    const res = await provinceClient.get('/?depth=1');
    return res.data || [];
}

/**
 * Lấy chi tiết một tỉnh kèm quận/huyện và phường/xã (depth=3).
 * Kết quả được cache theo code; gọi lại cùng code trả về cache.
 * @param {number|string} provinceCode
 * @returns {Promise<{ code, name, districts: Array<{ code, name, wards: Array<{ code, name }> }> }>}
 */
export async function getProvinceWithWards(provinceCode) {
    const key = String(provinceCode);
    if (provinceDetailCache.has(key)) {
        return provinceDetailCache.get(key);
    }
    const res = await provinceClient.get(`/p/${provinceCode}`, {
        params: { depth: 3 },
    });
    const data = res.data;
    if (data) {
        provinceDetailCache.set(key, data);
    }
    return data;
}

/**
 * Lấy danh sách tỉnh/thành phố từ API v2 (dữ liệu sau sáp nhập 2025/2026).
 * @returns {Promise<Array<{ code: number, name: string }>>}
 */
export async function getProvincesV2() {
    const res = await provinceClientV2.get('/?depth=1');
    return res.data || [];
}

/**
 * Lấy chi tiết một tỉnh từ API v2 kèm wards trực tiếp (không qua district).
 * Dùng cho địa chỉ sau sáp nhập.
 * @param {number|string} provinceCode
 * @returns {Promise<{ code, name, wards: Array<{ code, name }> }>}
 */
export async function getProvinceWardsDirectV2(provinceCode) {
    const key = String(provinceCode);
    if (provinceDetailCacheV2.has(key)) {
        return provinceDetailCacheV2.get(key);
    }
    const res = await provinceClientV2.get(`/p/${provinceCode}`, {
        params: { depth: 2 },
    });
    const data = res.data;
    if (data) {
        provinceDetailCacheV2.set(key, data);
    }
    return data;
}

/**
 * Lấy danh sách quận/huyện theo mã tỉnh.
 * @param {number|string} provinceCode
 * @returns {Promise<Array<{ code: number, name: string }>>}
 */
export async function getDistricts(provinceCode) {
    if (!provinceCode) return [];
    const res = await provinceClient.get(`/p/${provinceCode}`, {
        params: { depth: 1 },
    });
    return res.data?.districts || [];
}

/**
 * Lấy danh sách phường/xã theo mã quận/huyện.
 * @param {number|string} districtCode
 * @returns {Promise<Array<{ code: number, name: string }>>}
 */
export async function getWards(districtCode) {
    if (!districtCode) return [];
    const res = await provinceClient.get(`/d/${districtCode}`, {
        params: { depth: 1 },
    });
    return res.data?.wards || [];
}

/**
 * Lấy danh sách quận/huyện từ API v2.
 * @param {number|string} provinceCode
 * @returns {Promise<Array<{ code: number, name: string }>>}
 */
export async function getDistrictsV2(provinceCode) {
    if (!provinceCode) return [];
    const res = await provinceClientV2.get(`/p/${provinceCode}`, {
        params: { depth: 1 },
    });
    return res.data?.districts || [];
}

/**
 * Lấy danh sách phường/xã từ API v2.
 * @param {number|string} districtCode
 * @returns {Promise<Array<{ code: number, name: string }>>}
 */
export async function getWardsV2(districtCode) {
    if (!districtCode) return [];
    const res = await provinceClientV2.get(`/d/${districtCode}`, {
        params: { depth: 1 },
    });
    return res.data?.wards || [];
}
