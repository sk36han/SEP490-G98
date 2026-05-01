/**
 * Giá trị cột Items.ItemType — phải khớp chuỗi lưu trong SQL Server.
 * (Trước đây UI dùng Product/Material/Service nên không khớp DB có "Hàng hóa", "Công cụ dụng cụ".)
 *
 * Nếu trong DB bạn dùng biến thể khác (vd. "Hàng Hóa"), đổi `value` cho trùng byte-for-byte.
 */
export const ITEM_TYPE_VALUES = {
    GOODS: 'Hàng hóa',
    TOOLS: 'Công cụ dụng cụ',
};

export const ITEM_TYPE_OPTIONS = [
    { value: ITEM_TYPE_VALUES.GOODS, label: 'Hàng hóa' },
    { value: ITEM_TYPE_VALUES.TOOLS, label: 'Công cụ dụng cụ' },
];

export const DEFAULT_ITEM_TYPE = ITEM_TYPE_VALUES.GOODS;

export function getItemTypeLabel(itemType) {
    if (itemType == null || itemType === '') return '—';
    const o = ITEM_TYPE_OPTIONS.find((x) => x.value === itemType);
    if (o) return o.label;
    return String(itemType);
}

/** Select: hai loại chuẩn + thêm một dòng nếu DB đang lưu giá trị legacy/khác danh mục. */
export function getItemTypeSelectOptions(currentType) {
    const base = [...ITEM_TYPE_OPTIONS];
    const v = currentType == null || currentType === '' ? null : String(currentType);
    if (!v) return base;
    if (base.some((o) => o.value === v)) return base;
    return [...base, { value: v, label: `${v} (trong DB)` }];
}
