/**
 * Chuẩn hóa status từ API (camelCase, khoảng trắng, v.v.) → UPPER_SNAKE.
 */
export function normalizeStocktakeStatus(status) {
    if (!status) return '';
    return String(status)
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toUpperCase();
}

/**
 * Map status API → key trong StatusBadge (STOCK_* tránh trùng IN_PROGRESS với GRN).
 */
export function getStocktakeStatusBadgeKey(rawStatus) {
    const s = normalizeStocktakeStatus(rawStatus);
    switch (s) {
        case 'IN_PROGRESS':
        case 'EXECUTING':
        case 'STARTED':
            return 'STOCK_IN_PROGRESS';
        case 'PENDING_APPROVAL':
            return 'STOCK_PENDING_APPROVAL';
        case 'PENDING_RESULTADJ':
            return 'STOCK_PENDING_RESULTADJ';
        case 'DRAFT':
            return 'STOCK_DRAFT';
        case 'APPROVED':
            return 'APPROVED';
        case 'COMPLETED':
            return 'STOCK_COMPLETED';
        case 'CANCELLED':
            return 'CANCELLED';
        default:
            return s || rawStatus;
    }
}
