import axios from 'axios';

/**
 * Base URL hành chính VN.
 * Dùng v1 (mặc định). Khi API v2 ổn định có thể đổi sang v2 cho dữ liệu sau sáp nhập 2025/2026.
 * Ví dụ v2: baseURL: 'https://provinces.open-api.vn/api/v2'
 */
const BASE_URL = 'https://provinces.open-api.vn/api';
const provinceClient = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
});

/** Cache chi tiết tỉnh (code -> { districts, ... }) để không gọi lại khi đổi tỉnh rồi chọn lại */
const provinceDetailCache = new Map();

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
