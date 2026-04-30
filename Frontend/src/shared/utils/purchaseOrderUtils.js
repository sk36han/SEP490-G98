// ============================================
// Utility functions for Purchase Order
// ============================================

/**
 * Format currency to VND format
 * @param {number} value 
 * @returns {string}
 */
export const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
};

/**
 * Validate Purchase Order form data
 * @param {Object} formData
 * @param {Array} lines
 * @param {boolean} isDraft - true: bỏ qua validate bắt buộc các trường
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
export const validatePOForm = (formData, lines, isDraft = false) => {
    const errors = {};

    if (!isDraft) {
        // Validate expected receipt date
        if (!formData.expectedReceiptDate) {
            errors.expectedReceiptDate = 'Ngày nhập dự kiến là bắt buộc';
        } else {
            const receiptDate = new Date(formData.expectedReceiptDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            receiptDate.setHours(0, 0, 0, 0);

            if (receiptDate < today) {
                errors.expectedReceiptDate = 'Ngày nhập dự kiến không được trong quá khứ';
            }
        }

        // Validate supplier
        if (!formData.supplierName?.trim()) {
            errors.supplierName = 'Nhà cung cấp là bắt buộc';
        }

        // Validate warehouse
        if (!formData.warehouseName?.trim()) {
            errors.warehouseName = 'Kho nhận là bắt buộc';
        }
    }

    // Validate lines - luôn bắt buộc
    if (!lines || lines.length === 0) {
        errors.lines = 'Vui lòng thêm ít nhất 1 sản phẩm';
    } else if (!isDraft) {
        const hasInvalidLine = lines.some(line => {
            const itemIdNumber = Number(line.itemId);
            return (
                !line.itemName?.trim() ||
                !line.itemId ||
                Number.isNaN(itemIdNumber) ||
                itemIdNumber <= 0 ||
                Number(line.orderedQty) <= 0
            );
        });

        if (hasInvalidLine) {
            errors.lines = 'Vui lòng điền đầy đủ thông tin sản phẩm (chọn vật tư, tên, số lượng > 0)';
        }
    }

    // Validate discount
    if (formData.discountType === 'percent') {
        const v = Number(formData.discount);
        if (isNaN(v) || v < 0 || v > 100) {
            errors.discount = 'Chiết khấu (%) phải từ 0 đến 100';
        }
    } else {
        const v = Number(formData.discountAmountFixed);
        if (isNaN(v) || v < 0) {
            errors.discountAmountFixed = 'Chiết khấu (số tiền) phải lớn hơn hoặc bằng 0';
        }
    }

    // Validate additional costs
    const costs = formData.additionalCosts || [];
    for (let i = 0; i < costs.length; i++) {
        const amount = Number(costs[i].amount) || 0;
        const name = (costs[i].name || '').trim();
        if (amount > 0 && !name) {
            errors.additionalCosts = `Dịch vụ chi phí thứ ${i + 1}: nhập tên chi phí khi có số tiền`;
            break;
        }
        if (amount < 0) {
            errors.additionalCosts = `Dịch vụ chi phí thứ ${i + 1}: số tiền phải >= 0`;
            break;
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Map items to PO lines format
 * @param {Array} products 
 * @param {Array} existingLines 
 * @returns {Array}
 */
export const mapProductsToPOLines = (products, existingLines) => {
    return products.map(product => ({
        id: product.id || product.itemId || Date.now() + Math.random(),
        itemId: product.id || product.itemId,
        itemName: product.name || product.itemName || '',
        itemSku: product.sku || product.itemCode || '',
        itemImage: product.image || null,
        orderedQty: 1,
        unitPrice: product.unitPrice || 0,
        totalPrice: product.unitPrice || 0,
        hasCO: false,
        hasCQ: false,
        note: ''
    }));
};

/**
 * Merge new lines with existing lines (avoid duplicates)
 * @param {Array} existingLines 
 * @param {Array} newLines 
 * @returns {Array}
 */
export const mergePOLines = (existingLines, newLines) => {
    const existingItemIds = new Set(existingLines.map(l => l.itemId));
    const uniqueNewLines = newLines.filter(l => !existingItemIds.has(l.itemId));
    return [...existingLines, ...uniqueNewLines];
};

/**
 * Calculate PO totals
 * @param {Array} lines 
 * @param {Object} formData 
 * @returns {Object} - { totalQuantity, subtotal, discountAmount, totalAdditionalCosts, grandTotal }
 */
export const calculatePOTotals = (lines, formData) => {
    const totalQuantity = lines.reduce((sum, line) => sum + (Number(line.orderedQty) || 0), 0);
    const subtotal = lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0);
    const discountAmount = formData.discountType === 'amount'
        ? (Number(formData.discountAmountFixed) || 0)
        : (subtotal * (Number(formData.discount) || 0)) / 100;
    const totalAdditionalCosts = (formData.additionalCosts || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const grandTotal = subtotal - discountAmount + totalAdditionalCosts;

    return { totalQuantity, subtotal, discountAmount, totalAdditionalCosts, grandTotal };
};

/**
 * Prepare PO payload for API
 * @param {Object} formData 
 * @param {Array} lines 
 * @param {number} discountAmount 
 * @param {string} status - Optional status (default: 'DRAFT')
 * @returns {Object}
 */
export const preparePOPayload = (formData, lines, discountAmount, status = 'DRAFT') => {
    const supplierId = Number(formData.supplierId);
    const warehouseId = Number(formData.warehouseId);

    return {
        supplierId,
        warehouseId,
        expectedDeliveryDate: formData.expectedReceiptDate ? String(formData.expectedReceiptDate) : null,
        justification: (formData.justification || '').trim() || null,
        discountAmount: Number(discountAmount) || 0,
        status,
        lines: lines.map(l => ({
            itemId: Number(l.itemId),
            orderedQty: Number(l.orderedQty) || 0,
            unitPrice: Number(l.unitPrice) || 0,
            note: (l.note || '').trim() || null,
        })),
    };
};

/**
 * Filter PO list by search keyword
 * @param {Array} items 
 * @param {string} keyword 
 * @param {string} searchField 
 * @returns {Array}
 */
export const filterListByKeyword = (items, keyword, searchField = 'name') => {
    const q = (keyword || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter(item =>
        (item[searchField] || '').toLowerCase().includes(q)
    );
};

/**
 * Initial form data for Purchase Order
 * @param {Object} currentUser 
 * @returns {Object}
 */
export const getInitialPOFormData = (currentUser) => ({
    supplierId: '',
    supplierName: '',
    supplierPhone: '',
    supplierEmail: '',
    supplierTaxCode: '',
    supplierAddressStreet: '',
    supplierAddressWard: '',
    supplierAddressDistrict: '',
    supplierAddressProvince: '',
    warehouseId: '',
    warehouseName: '',
    creatorId: currentUser?.userId || '',
    creatorName: currentUser?.fullName || currentUser?.FullName || '',
    expectedReceiptDate: '',
    justification: '',
    discountType: 'percent',
    discount: 0,
    discountAmountFixed: 0,
    additionalCosts: [],
});

// Constants
export const MAX_JUSTIFICATION_LENGTH = 250;
export const DISCOUNT_TYPES = {
    PERCENT: 'percent',
    AMOUNT: 'amount',
};
export const PO_STATUS = {
    DRAFT: 'DRAFT',
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
};
