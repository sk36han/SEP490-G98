/**
 * Mock InventoryLots — khớp seed `DTB 14.4.sql` (MKIWMS5), chờ API thật.
 * Dùng ở ViewItemDetail (lọc theo itemId).
 */

export const MOCK_INVENTORY_LOTS = [
    { lotId: 1, itemId: 1, warehouseId: 1, grnLineId: 1, receiptDate: '2026-01-27T08:00:00', quantity: 6.3, unitCost: 23.25, expiryDate: '2026-08-05T08:00:00', isActive: true },
    { lotId: 2, itemId: 2, warehouseId: 2, grnLineId: 2, receiptDate: '2026-01-28T08:00:00', quantity: 8.8, unitCost: 26.5, expiryDate: '2026-08-16T08:00:00', isActive: true },
    { lotId: 3, itemId: 3, warehouseId: 3, grnLineId: 3, receiptDate: '2026-01-29T08:00:00', quantity: 11.5, unitCost: 29.75, expiryDate: '2026-08-27T08:00:00', isActive: true },
    { lotId: 4, itemId: 4, warehouseId: 4, grnLineId: 4, receiptDate: '2026-01-30T08:00:00', quantity: 7.2, unitCost: 33, expiryDate: '2026-09-07T08:00:00', isActive: true },
    { lotId: 5, itemId: 5, warehouseId: 5, grnLineId: null, receiptDate: '2026-01-31T08:00:00', quantity: 10, unitCost: 36.25, expiryDate: '2027-01-31T08:00:00', isActive: true },
    { lotId: 6, itemId: 6, warehouseId: 6, grnLineId: 6, receiptDate: '2026-02-01T08:00:00', quantity: 13, unitCost: 39.5, expiryDate: '2026-09-29T08:00:00', isActive: true },
    { lotId: 7, itemId: 7, warehouseId: 7, grnLineId: 7, receiptDate: '2026-02-02T08:00:00', quantity: 8.1, unitCost: 42.75, expiryDate: '2026-10-10T08:00:00', isActive: true },
    { lotId: 8, itemId: 8, warehouseId: 8, grnLineId: 8, receiptDate: '2026-02-03T08:00:00', quantity: 11.2, unitCost: 46, expiryDate: '2026-10-21T08:00:00', isActive: true },
    { lotId: 9, itemId: 9, warehouseId: 9, grnLineId: 9, receiptDate: '2026-02-04T08:00:00', quantity: 14.5, unitCost: 49.25, expiryDate: '2026-11-01T08:00:00', isActive: true },
    { lotId: 10, itemId: 10, warehouseId: 10, grnLineId: null, receiptDate: '2026-02-05T08:00:00', quantity: 9, unitCost: 52.5, expiryDate: '2027-02-05T08:00:00', isActive: true },
    { lotId: 11, itemId: 11, warehouseId: 1, grnLineId: 11, receiptDate: '2026-02-06T08:00:00', quantity: 12.4, unitCost: 55.75, expiryDate: '2026-11-23T08:00:00', isActive: true },
    { lotId: 12, itemId: 12, warehouseId: 2, grnLineId: 12, receiptDate: '2026-02-07T08:00:00', quantity: 16, unitCost: 59, expiryDate: '2026-12-04T08:00:00', isActive: true },
    { lotId: 13, itemId: 13, warehouseId: 3, grnLineId: 13, receiptDate: '2026-02-08T08:00:00', quantity: 9.9, unitCost: 62.25, expiryDate: '2026-12-15T08:00:00', isActive: true },
    { lotId: 14, itemId: 14, warehouseId: 4, grnLineId: 14, receiptDate: '2026-02-09T08:00:00', quantity: 13.6, unitCost: 65.5, expiryDate: '2026-12-26T08:00:00', isActive: true },
    { lotId: 15, itemId: 15, warehouseId: 5, grnLineId: null, receiptDate: '2026-02-10T08:00:00', quantity: 17.5, unitCost: 68.75, expiryDate: '2027-02-10T08:00:00', isActive: true },
    { lotId: 16, itemId: 16, warehouseId: 6, grnLineId: 16, receiptDate: '2026-02-11T08:00:00', quantity: 10.8, unitCost: 72, expiryDate: '2027-01-17T08:00:00', isActive: true },
    { lotId: 17, itemId: 17, warehouseId: 7, grnLineId: 17, receiptDate: '2026-02-12T08:00:00', quantity: 14.8, unitCost: 75.25, expiryDate: '2027-01-28T08:00:00', isActive: true },
    { lotId: 18, itemId: 18, warehouseId: 8, grnLineId: 18, receiptDate: '2026-02-13T08:00:00', quantity: 19, unitCost: 78.5, expiryDate: '2027-02-08T08:00:00', isActive: false },
    { lotId: 19, itemId: 19, warehouseId: 9, grnLineId: 19, receiptDate: '2026-02-14T08:00:00', quantity: 11.7, unitCost: 81.75, expiryDate: '2027-02-19T08:00:00', isActive: true },
    { lotId: 20, itemId: 20, warehouseId: 10, grnLineId: null, receiptDate: '2026-02-15T08:00:00', quantity: 16, unitCost: 85, expiryDate: '2027-02-15T08:00:00', isActive: true },
];

/** Mã phiếu nhập kho từ GRNLineId: GRNLineId i → GRNCode GRN000i */
export const getGrnCodeFromLineId = (grnLineId) => {
    if (grnLineId == null || grnLineId === '') return null;
    const n = Number(grnLineId);
    if (!Number.isFinite(n) || n < 1 || n > 20) return null;
    return `GRN${String(n).padStart(4, '0')}`;
};

/** Giá lô — định dạng tiền VND (vi-VN) */
export const formatLotMoney = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return '—';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.round(n));
};

/** Số lượng lô — luôn hiển thị số nguyên dương, không thập phân */
export const formatLotQuantityInt = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return '—';
    const positiveInt = Math.max(0, Math.round(n));
    return positiveInt.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
};
