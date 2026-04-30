/** Tiền VNĐ: làm tròn số nguyên, không phần thập phân */
export function formatVndInteger(amount) {
    if (amount === '' || amount == null || Number.isNaN(Number(amount))) return null;
    const n = Math.round(Number(amount));
    return `${n.toLocaleString('vi-VN')} VNĐ`;
}

/** Thành tiền dòng = SL × đơn giá (null nếu không tính được) */
export function formatLineTotalVnd(line) {
    const qty = Number(line.quantity) || 0;
    const unit = line.unitPrice === '' || line.unitPrice == null ? null : Number(line.unitPrice);
    if (unit == null || Number.isNaN(unit)) return null;
    return formatVndInteger(qty * unit);
}

export function normalizeId(value) {
    if (value === null || value === undefined || value === '') return '';
    return String(value);
}

export function formatAddress(address, ward, district, city) {
    const parts = [address, ward, district, city].filter(Boolean);
    return parts.length ? parts.join(', ') : '';
}

/** Kiểm tra từng dòng vật tư (số lượng, ĐVT) */
export function getLineItemsValidationError(lineItems) {
    for (let i = 0; i < lineItems.length; i++) {
        const line = lineItems[i];
        const row = i + 1;
        if (!normalizeId(line.uomId ?? line.UomId)) {
            return `Vật tư dòng ${row}: thiếu đơn vị tính.`;
        }
        const qty = Number(line.quantity);
        if (!Number.isFinite(qty) || qty < 1) {
            return `Vật tư dòng ${row}: số lượng phải ≥ 1.`;
        }
        const max = Number(line.availableQty ?? line.AvailableQty ?? 0);
        if (Number.isFinite(max) && max > 0 && qty > max) {
            return `Vật tư dòng ${row}: số lượng không được vượt tồn khả dụng (${max.toLocaleString('vi-VN')}).`;
        }
    }
    return null;
}

export function findAttachmentByType(attachments, typeUpper) {
    if (!Array.isArray(attachments)) return null;
    return attachments.find((a) => String(a?.attachmentType || '').toUpperCase() === typeUpper) || null;
}

export function toAbsoluteFileUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const apiBase = (import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:5141/api').replace(/\/api\/?$/, '');
    return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
}
