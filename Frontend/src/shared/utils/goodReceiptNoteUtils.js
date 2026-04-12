// ============================================
// Utility functions for Good Receipt Note
// ============================================

/** Ngày hiện tại theo giờ máy (YYYY-MM-DD), dùng cho date input / min. */
export const getLocalDateYmd = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/** true nếu chuỗi YYYY-MM-DD là ngày trước hôm nay (theo giờ máy). */
export const isYmdBeforeToday = (ymd) => {
    if (!ymd || typeof ymd !== 'string') return false;
    const parts = ymd.trim().split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return false;
    const [y, mo, d] = parts;
    const picked = new Date(y, mo - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    picked.setHours(0, 0, 0, 0);
    return picked < today;
};

/**
 * Format currency to VND format
 * @param {number} value 
 * @returns {string}
 */
export const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
};

/**
 * Validate GRN form data
 * @param {Object} formData 
 * @param {Array} lines 
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
export const validateGRNForm = (formData, lines) => {
    const errors = {};

    // Validate warehouse
    if (!formData.warehouseName?.trim()) {
        errors.warehouseName = 'Vui lòng chọn kho nhận';
    }

    // Validate receipt date
    if (!formData.receiptDate) {
        errors.receiptDate = 'Vui lòng chọn ngày nhập';
    } else if (isYmdBeforeToday(formData.receiptDate)) {
        errors.receiptDate = 'Ngày nhập dự kiến không được trong quá khứ';
    }

    // Validate lines
    if (!lines || lines.length === 0) {
        errors.lines = 'Vui lòng thêm ít nhất 1 sản phẩm';
    } else {
        const hasInvalidLine = lines.some((line, index) => {
            if (!line.itemName?.trim()) return true;
            const receivedQty = Number(line.receivedQty);
            // Số lượng phải là số nguyên dương
            if (!Number.isInteger(receivedQty) || receivedQty <= 0) {
                errors[`line_${index}`] = 'Số lượng nhập phải là số nguyên lớn hơn 0';
                return true;
            }
            const orderedQty = Number(line.orderedQty) || 0;
            const remainingQty = Number(line.remainingQty) || orderedQty;
            // Không vượt quá ordered/remaining qty
            if (receivedQty > remainingQty) {
                errors[`line_${index}`] = `Số lượng nhập (${receivedQty}) vượt quá số lượng đặt (${remainingQty})`;
                return true;
            }
            return false;
        });
        if (hasInvalidLine) {
            errors.lines = 'Mỗi sản phẩm phải có số lượng nhập lớn hơn 0';
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Map PO data to GRN format
 * @param {Object} poDetail 
 * @returns {Array} - Array of line items
 */
export const mapPOLinesToGRNLines = (poDetail) => {
    return (poDetail.lines ?? [])
        .filter(line => (line.receivedQty ?? 0) < (line.orderedQty ?? 0))
        .map(line => ({
            id: line.purchaseOrderLineId || line.PurchaseOrderLineId || line.id || Date.now() + Math.random(),
            itemId: line.itemId ?? line.ItemId,
            itemName: line.itemName ?? line.ItemName ?? '',
            itemSku: line.sku ?? line.Sku ?? '',
            uom: line.uom ?? line.Uom ?? '',
            orderedQty: line.orderedQty ?? line.OrderedQty ?? 0,
            remainingQty: (line.orderedQty ?? 0) - (line.receivedQty ?? 0),
            receivedQty: (line.orderedQty ?? 0) - (line.receivedQty ?? 0),
            unitPrice: line.unitPrice ?? line.UnitPrice ?? 0,
            totalPrice: (line.unitPrice ?? line.UnitPrice ?? 0) * ((line.orderedQty ?? 0) - (line.receivedQty ?? 0)),
            note: '',
            hasCO: false,
            hasCQ: false,
        }));
};

/**
 * Map PO list to dropdown format
 * @param {Array} poList 
 * @returns {Array}
 */
export const mapPOListForDropdown = (poList) => {
    return poList.map(po => ({
        poCode: po.poCode ?? po.PoCode ?? '',
        supplierName: po.supplierName ?? po.SupplierName ?? '',
        warehouseName: po.warehouseName ?? po.WarehouseName ?? '',
        status: po.status ?? po.Status ?? '',
        requestedDate: po.requestedDate ?? po.RequestedDate ?? '',
        expectedDeliveryDate: po.expectedDeliveryDate ?? po.ExpectedDeliveryDate ?? '',
        supplierId: po.supplierId ?? po.SupplierId ?? null,
        warehouseId: po.warehouseId ?? po.WarehouseId ?? null,
        poId: po.purchaseOrderId ?? po.PurchaseOrderId ?? null,
        lines: po.lines ?? po.Lines ?? [],
    }));
};

/**
 * Tổng giá trị hàng trên PO (Σ orderedQty × unitPrice) — dùng làm mẫu số chiết khấu cho khớp đơn mua.
 * Header TotalAmount đôi khi lệch với tổng dòng; ưu tiên tổng từ lines.
 */
export const getPoGrossTotalForDiscount = (poDetail) => {
    if (!poDetail) return 0;
    const lines = poDetail.lines ?? poDetail.Lines ?? [];
    if (Array.isArray(lines) && lines.length > 0) {
        const sum = lines.reduce((s, line) => {
            const q = Number(line.orderedQty ?? line.OrderedQty ?? 0);
            const p = Number(line.unitPrice ?? line.UnitPrice ?? 0);
            return s + q * p;
        }, 0);
        if (sum > 0) return sum;
    }
    return Number(poDetail.totalAmount ?? poDetail.TotalAmount ?? 0) || 0;
};

/**
 * Chiết khấu PO phân bổ cho lần nhập GRN: (tạm tính GRN / tổng giá trị hàng PO) × chiết khấu PO.
 * @param {number} grnSubtotal - Tạm tính GRN (sum line.totalPrice)
 * @param {number} poGrossTotal - Tổng giá trị đặt trên PO (ưu tiên Σ dòng)
 * @param {number} poDiscountAmount - PO DiscountAmount
 */
export const computeProportionalPoDiscountOnGrn = (grnSubtotal, poGrossTotal, poDiscountAmount) => {
    const s = Number(grnSubtotal) || 0;
    const t = Number(poGrossTotal) || 0;
    const d = Number(poDiscountAmount) || 0;
    if (t <= 0 || d <= 0 || s <= 0) return 0;
    const raw = (s * d) / t;
    return Math.min(s, Math.round(raw));
};

/**
 * Calculate GRN totals
 * @param {Array} lines
 * @param {Object} formData
 * @param {Object | null} poDetail - Chi tiết PO (để lấy chiết khấu readonly theo đơn mua)
 * @returns {Object} - { subtotal, discountAmount, grandTotal, totalQuantityOrdered, totalAdditionalCosts }
 */
export const calculateGRNTotals = (lines, formData, poDetail = null) => {
    const totalQuantityOrdered = lines.reduce((sum, line) => sum + (Number(line.orderedQty) || 0), 0);
    const subtotal = lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0);
    const poGross = getPoGrossTotalForDiscount(poDetail);
    const poDisc = Number(poDetail?.discountAmount ?? poDetail?.DiscountAmount ?? 0);
    const discountAmount = computeProportionalPoDiscountOnGrn(subtotal, poGross, poDisc);
    const shippingFee = Number(formData.shippingFee) || 0;
    const grandTotal = subtotal - discountAmount + shippingFee;

    return { subtotal, discountAmount, grandTotal, totalQuantityOrdered, shippingFee };
};

/**
 * Prepare GRN payload for API
 * @param {Object} formData 
 * @param {Array} lines 
 * @returns {Object}
 */
export const prepareGRNPayload = (formData, lines, poDetail = null) => {
    const subtotal = (lines || []).reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0);
    const poGross = getPoGrossTotalForDiscount(poDetail);
    const poDisc = Number(poDetail?.discountAmount ?? poDetail?.DiscountAmount ?? 0);
    const discountValue = computeProportionalPoDiscountOnGrn(subtotal, poGross, poDisc);
    return {
        purchaseOrderId: Number(formData.purchaseOrderId),
        receiptDate: formData.receiptDate,
        warehouseId: Number(formData.warehouseId),
        supplierId: Number(formData.supplierId),
        discountType: 'Amount',
        discountValue,
        shippingFee: Number(formData.shippingFee) || 0,
        note: formData.justification || null,
        lines: lines.map(line => ({
            itemId: Number(line.itemId),
            expectedQty: Number(line.orderedQty),
            actualQty: Number(line.receivedQty),
            uomId: 1, // TODO: Map UOM properly
            hasCO: line.hasCO || false,
            hasCQ: line.hasCQ || false,
            note: line.note || null,
            purchaseOrderLineId: line.purchaseOrderLineId || null,
            unitPrice: Number(line.unitPrice) || 0,
        })),
    };
};

/**
 * Filter PO list by search keyword
 * @param {Array} poList 
 * @param {string} keyword 
 * @returns {Array}
 */
export const filterPOList = (poList, keyword) => {
    const q = (keyword || '').trim().toLowerCase();
    if (!q) return poList.map(po => po.poCode);
    return poList.filter(po =>
        po.poCode.toLowerCase().includes(q) ||
        po.supplierName.toLowerCase().includes(q)
    ).map(po => po.poCode);
};

/**
 * Initial form data for GRN
 * @param {Object} currentUser 
 * @returns {Object}
 */
export const getInitialGRNFormData = (currentUser) => ({
    warehouseId: '',
    warehouseName: '',
    purchaseOrderCode: '',
    supplierId: '',
    supplierName: '',
    receiptDate: getLocalDateYmd(),
    creatorId: currentUser?.userId || '',
    creatorName: currentUser?.fullName || currentUser?.FullName || '',
    justification: '',
    shippingFee: 0,
});

// Constants
export const MAX_JUSTIFICATION_LENGTH = 250;
export const DISCOUNT_TYPES = {
    PERCENT: 'percent',
    AMOUNT: 'amount',
};
