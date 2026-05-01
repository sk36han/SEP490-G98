/**
 * DB thường lưu ItemType tiếng Việt (Hàng hóa, CCDC, …); form dùng Product | Material | Service.
 */

const CANONICAL = ['Product', 'Material', 'Service'];

function foldVi(s) {
    if (s == null) return '';
    return String(s)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/gi, 'd')
        .toLowerCase()
        .trim();
}

const ALIAS = {
    'hang hoa': 'Product',
    hanghoa: 'Product',
    'san pham': 'Product',
    goods: 'Product',
    merchandise: 'Product',
    'cong cu dung cu': 'Material',
    'cong dung cu': 'Material',
    'cong cu': 'Material',
    nvl: 'Material',
    'nguyen vat lieu': 'Material',
    'raw material': 'Material',
    'dich vu': 'Service',
};

export function normalizeItemTypeFromDb(raw) {
    if (raw == null) return null;
    const t = String(raw).trim();
    if (!t) return null;
    const hit = CANONICAL.find((c) => c.toLowerCase() === t.toLowerCase());
    if (hit) return hit;
    const f = foldVi(t);
    if (ALIAS[f]) return ALIAS[f];
    return t;
}
