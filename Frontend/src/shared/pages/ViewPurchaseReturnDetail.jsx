/**
 * ViewPurchaseReturnDetail - Chi tiết phiếu trả hàng (xem + chỉnh sửa tại chỗ)
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    Clock,
    Package,
    Plus,
    X,
    Search,
    Trash2,
    Save,
    Loader,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateSupplier.css';

const TODAY = new Date().toISOString().slice(0, 10);
const MAX_REASON_LENGTH = 250;
const MAX_NOTE_LENGTH = 250;
const EDITABLE_STATUSES = new Set(['PENDING']);

const MOCK_GRN_SOURCE = {
    'GRN-2025-001': [
        { grnLineId: 1, productId: 1, sku: 'PEN-001', productName: 'Bút bi Thiên Long TL-057', uom: 'Cây', receivedQty: 50, unitPrice: 3500 },
        { grnLineId: 2, productId: 2, sku: 'NOTE-001', productName: 'Vở note 5 chấm A5', uom: 'Quyển', receivedQty: 20, unitPrice: 22000 },
        { grnLineId: 3, productId: 3, sku: 'PAPER-001', productName: 'Giấy A4 Double A 80gsm', uom: 'Ram', receivedQty: 10, unitPrice: 62000 },
        { grnLineId: 4, productId: 4, sku: 'MARK-001', productName: 'Bút lông bảng Thiên Long', uom: 'Cây', receivedQty: 12, unitPrice: 15000 },
    ],
};

const MOCK_DETAIL = {
    purchaseReturnId: 1,
    returnCode: 'PR-2025-001',
    relatedGRNId: 1,
    relatedGRNCode: 'GRN-2025-001',
    grnReceiptDate: '2025-01-10',

    supplierId: 101,
    supplierName: 'Công ty TNHH Vật tư ABC',
    supplierPhone: '024.12345678',
    supplierEmail: 'abc@vattu.com',
    supplierTaxCode: '0101234567',
    supplierAddressProvince: 'Hà Nội',
    supplierAddressDistrict: null,
    supplierAddressWard: null,
    supplierAddressStreet: null,

    warehouseId: 11,
    warehouseName: 'Kho Hà Nội',

    status: 'PENDING',
    createdById: 1,
    createdByName: 'Nguyễn Văn A',
    createdAt: '2025-01-14T08:00:00',
    approvedBy: null,
    approvedAt: null,

    returnDate: '2025-01-15',
    reason: 'Hàng có lỗi in mờ và sai màu mực.',

    feeAmount: 10000,
    deductionReason: 'Trừ phí vận chuyển chiều trả.',

    refundReceiveStatus: 'received',
    refundMethod: 'bank_transfer',
    refundRecordedDate: '2025-01-16',
    refundReceivedAmount: 113500,

    lines: [
        { grnLineId: 1, productId: 1, sku: 'PEN-001', productName: 'Bút bi Thiên Long TL-057', uom: 'Cây', receivedQty: 50, returnQty: 5, unitPrice: 3500, totalPrice: 17500 },
        { grnLineId: 2, productId: 2, sku: 'NOTE-001', productName: 'Vở note 5 chấm A5', uom: 'Quyển', receivedQty: 20, returnQty: 2, unitPrice: 22000, totalPrice: 44000 },
        { grnLineId: 3, productId: 3, sku: 'PAPER-001', productName: 'Giấy A4 Double A 80gsm', uom: 'Ram', receivedQty: 10, returnQty: 1, unitPrice: 62000, totalPrice: 62000 },
    ],
};

const STATUS_CONFIG = {
    PENDING: { label: 'Chờ duyệt', color: '#f59e0b', bg: '#fef3c7', icon: <Clock size={16} /> },
    APPROVED: { label: 'Đã duyệt', color: '#10b981', bg: '#d1fae5', icon: <CheckCircle size={16} /> },
    REJECTED: { label: 'Từ chối', color: '#ef4444', bg: '#fee2e2', icon: <XCircle size={16} /> },
};

const toNumber = (val) => {
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
};

const generateLineId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return `${formatDate(dateStr)} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(toNumber(val));
};

const getInitialDraftFromData = (data) => ({
    returnDate: data.returnDate || '',
    reason: data.reason || '',
    feeAmount: String(toNumber(data.feeAmount) || ''),
    deductionReason: data.deductionReason || '',
    refundReceiveStatus: data.refundReceiveStatus || 'later',
    refundMethod: data.refundMethod || 'cash',
    refundRecordedDate: data.refundRecordedDate || TODAY,
    lines: (data.lines || []).map((line) => ({
        ...line,
        lineId: generateLineId(),
        returnQty: toNumber(line.returnQty),
        receivedQty: toNumber(line.receivedQty),
        unitPrice: toNumber(line.unitPrice),
        totalPrice: toNumber(line.returnQty) * toNumber(line.unitPrice),
    })),
});

const buildUpdatePayload = (data, draft, estimatedRefundAmount) => ({
    relatedGRNId: data.relatedGRNId,
    returnDate: draft.returnDate,
    reason: draft.reason.trim(),
    feeAmount: toNumber(draft.feeAmount),
    deductionReason: draft.deductionReason?.trim() || null,
    refundReceiveStatus: draft.refundReceiveStatus,
    refundMethod: draft.refundReceiveStatus === 'received' ? draft.refundMethod : null,
    refundRecordedDate: draft.refundReceiveStatus === 'received' ? draft.refundRecordedDate : null,
    estimatedRefundAmount,
    lines: draft.lines.map((line) => ({
        grnLineId: line.grnLineId,
        itemId: line.productId,
        returnQty: toNumber(line.returnQty),
        unitPrice: toNumber(line.unitPrice),
    })),
});

export default function ViewPurchaseReturnDetail() {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();

    const [detailData, setDetailData] = useState(MOCK_DETAIL);
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(() => getInitialDraftFromData(MOCK_DETAIL));
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');

    const canEdit = EDITABLE_STATUSES.has(detailData.status);
    const statusClf = STATUS_CONFIG[detailData.status] || STATUS_CONFIG.PENDING;
    const returnStatusLabel = detailData.status === 'PENDING' ? 'Chờ trả hàng' : statusClf.label;
    const refundStatusLabel = detailData.refundReceiveStatus === 'received' ? 'Đã hoàn tiền' : 'Chờ hoàn tiền';

    const activeLines = isEditing ? draft.lines : detailData.lines;
    const subtotal = activeLines.reduce((sum, line) => sum + toNumber(line.totalPrice), 0);
    const feeAmount = isEditing ? toNumber(draft.feeAmount) : toNumber(detailData.feeAmount);
    const isFeeAmountExceedSubtotal = feeAmount > subtotal;
    const totalReturnQuantity = activeLines.reduce((sum, line) => sum + toNumber(line.returnQty), 0);
    const estimatedRefundAmount = Math.max(subtotal - feeAmount, 0);

    const availableProducts = useMemo(() => {
        const source = MOCK_GRN_SOURCE[detailData.relatedGRNCode] || [];
        const selectedIds = new Set(draft.lines.map((line) => line.productId));
        return source.filter((item) => !selectedIds.has(item.productId));
    }, [detailData.relatedGRNCode, draft.lines]);

    const filteredProducts = useMemo(() => {
        const q = searchKeyword.trim().toLowerCase();
        if (!q) return availableProducts;
        return availableProducts.filter(
            (item) =>
                (item.productName || '').toLowerCase().includes(q) ||
                (item.sku || '').toLowerCase().includes(q)
        );
    }, [availableProducts, searchKeyword]);

    const enterEditMode = () => {
        if (!canEdit) return;
        setDraft(getInitialDraftFromData(detailData));
        setErrors({});
        setShowProductSearch(false);
        setSearchKeyword('');
        setIsEditing(true);
    };

    const cancelEditMode = () => {
        setDraft(getInitialDraftFromData(detailData));
        setErrors({});
        setShowProductSearch(false);
        setSearchKeyword('');
        setIsEditing(false);
    };

    const setFieldError = (name, message) => {
        setErrors((prev) => ({ ...prev, [name]: message }));
    };

    const clearFieldError = (name) => {
        setErrors((prev) => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    };

    const handleDraftChange = (e) => {
        const { name, value } = e.target;

        if (name === 'reason' && value.length > MAX_REASON_LENGTH) return;
        if (name === 'deductionReason' && value.length > MAX_NOTE_LENGTH) return;

        if (name === 'feeAmount') {
            const digitsOnly = value.replace(/\D/g, '');
            const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
            const nextFee = toNumber(normalized);
            setDraft((prev) => ({ ...prev, feeAmount: normalized }));

            if (nextFee > subtotal) {
                setFieldError('feeAmount', 'Phí xử lý không được cao hơn Giá trị hoàn trả');
            } else {
                clearFieldError('feeAmount');
            }
            return;
        }

        if (name === 'returnDate') {
            if (value && detailData.grnReceiptDate && value < detailData.grnReceiptDate) {
                setFieldError('returnDate', 'Ngày trả hàng không được trước ngày nhập của GRN');
            } else {
                clearFieldError('returnDate');
            }
        }

        if (name === 'refundRecordedDate') {
            if (value && value > TODAY) {
                setFieldError('refundRecordedDate', 'Ngày ghi nhận không được ở tương lai');
            } else if (value && detailData.grnReceiptDate && value < detailData.grnReceiptDate) {
                setFieldError('refundRecordedDate', 'Ngày ghi nhận không được sớm hơn Ngày nhập dự kiến');
            } else {
                clearFieldError('refundRecordedDate');
            }
        }

        setDraft((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) clearFieldError(name);
    };

    const updateLineReturnQty = (lineId, value) => {
        setDraft((prev) => ({
            ...prev,
            lines: prev.lines.map((line) => {
                if (line.lineId !== lineId) return line;
                const qty = Math.min(Math.max(toNumber(value), 0), toNumber(line.receivedQty));
                return {
                    ...line,
                    returnQty: qty,
                    totalPrice: qty * toNumber(line.unitPrice),
                };
            }),
        }));
        clearFieldError('lines');
    };

    const openProductSearch = () => {
        setShowProductSearch(true);
        setSearchKeyword('');
    };

    const closeProductSearch = () => {
        setShowProductSearch(false);
        setSearchKeyword('');
    };

    const addLineFromGrn = (product) => {
        const exists = draft.lines.some((line) => line.productId === product.productId);
        if (exists) {
            showToast('Vật tư đã có trong danh sách trả.', 'warning');
            return;
        }

        const unitPrice = toNumber(product.unitPrice);
        const newLine = {
            lineId: generateLineId(),
            grnLineId: product.grnLineId,
            productId: product.productId,
            sku: product.sku,
            productName: product.productName,
            uom: product.uom,
            receivedQty: toNumber(product.receivedQty),
            returnQty: 1,
            unitPrice,
            totalPrice: unitPrice,
        };

        setDraft((prev) => ({ ...prev, lines: [...prev.lines, newLine] }));
        clearFieldError('lines');
        setShowProductSearch(false);
        setSearchKeyword('');
    };

    const removeLine = (lineId) => {
        setDraft((prev) => ({
            ...prev,
            lines: prev.lines.filter((line) => line.lineId !== lineId),
        }));
    };

    const validateDraft = () => {
        const newErrors = {};

        if (!draft.returnDate) {
            newErrors.returnDate = 'Ngày trả hàng là bắt buộc';
        } else if (detailData.grnReceiptDate && draft.returnDate < detailData.grnReceiptDate) {
            newErrors.returnDate = 'Ngày trả hàng không được trước ngày nhập của GRN';
        }

        if (!draft.lines.length) {
            newErrors.lines = 'Vui lòng thêm ít nhất 1 vật tư trả';
        } else {
            const invalidLine = draft.lines.find(
                (line) => toNumber(line.returnQty) <= 0 || toNumber(line.returnQty) > toNumber(line.receivedQty)
            );
            if (invalidLine) {
                newErrors.lines = 'Số lượng trả phải lớn hơn 0 và không vượt quá số lượng đã nhập';
            }
        }

        const fee = toNumber(draft.feeAmount);
        const sub = draft.lines.reduce((sum, line) => sum + toNumber(line.totalPrice), 0);

        if (fee < 0) {
            newErrors.feeAmount = 'Phí xử lý phải lớn hơn hoặc bằng 0';
        } else if (fee > sub) {
            newErrors.feeAmount = 'Phí xử lý không được cao hơn Giá trị hoàn trả';
        }

        if (draft.refundReceiveStatus === 'received') {
            if (!draft.refundRecordedDate) {
                newErrors.refundRecordedDate = 'Ngày ghi nhận là bắt buộc';
            } else if (draft.refundRecordedDate > TODAY) {
                newErrors.refundRecordedDate = 'Ngày ghi nhận không được ở tương lai';
            } else if (detailData.grnReceiptDate && draft.refundRecordedDate < detailData.grnReceiptDate) {
                newErrors.refundRecordedDate = 'Ngày ghi nhận không được sớm hơn Ngày nhập dự kiến';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const saveUpdate = async () => {
        if (submitting) return;
        if (!validateDraft()) {
            showToast('Vui lòng kiểm tra lại thông tin.', 'error');
            return;
        }

        try {
            setSubmitting(true);

            const payload = buildUpdatePayload(detailData, draft, estimatedRefundAmount);
            console.log('Update Purchase Return payload:', payload);

            await new Promise((resolve) => setTimeout(resolve, 800));

            setDetailData((prev) => ({
                ...prev,
                returnDate: draft.returnDate,
                reason: draft.reason,
                feeAmount: toNumber(draft.feeAmount),
                deductionReason: draft.deductionReason,
                refundReceiveStatus: draft.refundReceiveStatus,
                refundMethod: draft.refundReceiveStatus === 'received' ? draft.refundMethod : null,
                refundRecordedDate: draft.refundReceiveStatus === 'received' ? draft.refundRecordedDate : null,
                refundReceivedAmount: draft.refundReceiveStatus === 'received' ? estimatedRefundAmount : 0,
                lines: draft.lines.map((line) => ({
                    grnLineId: line.grnLineId,
                    productId: line.productId,
                    sku: line.sku,
                    productName: line.productName,
                    uom: line.uom,
                    receivedQty: line.receivedQty,
                    returnQty: line.returnQty,
                    unitPrice: line.unitPrice,
                    totalPrice: line.totalPrice,
                })),
            }));

            setIsEditing(false);
            setShowProductSearch(false);
            showToast('Cập nhật phiếu trả hàng thành công!', 'success');
        } catch (err) {
            showToast(err?.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="create-supplier-page">
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate('/purchase-returns')} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại danh sách</span>
                    </button>
                </div>

                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!isEditing && canEdit && (
                        <button type="button" className="btn btn-primary" onClick={enterEditMode}>
                            Chỉnh sửa
                        </button>
                    )}

                    {isEditing && (
                        <>
                            <button type="button" className="btn btn-cancel" onClick={cancelEditMode} disabled={submitting}>
                                <X size={15} />
                                Hủy chỉnh sửa
                            </button>
                            <button type="button" className="btn btn-primary" onClick={saveUpdate} disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <Loader size={15} className="spinner" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <Save size={15} />
                                        Lưu cập nhật
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="form-card">
                <div className="form-wrapper">
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <h1 className="page-title">Chi tiết phiếu trả hàng</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    MÃ PHIẾU:{' '}
                                    <span style={{ fontWeight: 600, color: '#2196F3' }}>{detailData.returnCode}</span>
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <div
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: 20,
                                        backgroundColor: statusClf.bg,
                                        color: statusClf.color,
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    {statusClf.icon}
                                    {returnStatusLabel}
                                </div>

                                <div
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: 20,
                                        backgroundColor: refundStatusLabel === 'Đã hoàn tiền' ? 'rgba(16,185,129,0.18)' : 'rgba(245,158,11,0.15)',
                                        color: refundStatusLabel === 'Đã hoàn tiền' ? '#047857' : '#d97706',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    {refundStatusLabel === 'Đã hoàn tiền' ? <CheckCircle size={16} /> : <Clock size={16} />}
                                    {refundStatusLabel}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PHẦN TRÊN */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start', height: '760px' }}>
                        {/* Cột trái: Chi tiết vật tư trả */}
                        <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '760px' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết vật tư trả</h2>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    {isEditing && (
                                        <button
                                            type="button"
                                            onClick={openProductSearch}
                                            className="btn btn-sm"
                                            style={{ fontSize: '14px', fontWeight: 600 }}
                                        >
                                            <Plus size={16} />
                                            Thêm vật tư
                                        </button>
                                    )}
                                </div>
                            </div>

                            {errors.lines && (
                                <div className="error-message" style={{ marginBottom: '16px' }}>
                                    {errors.lines}
                                </div>
                            )}

                            {isEditing && showProductSearch && (
                                <div style={{ marginBottom: '16px', animation: 'slideDown 0.3s ease-out', position: 'relative' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 1 }} />
                                        <input
                                            type="text"
                                            value={searchKeyword}
                                            onChange={(e) => setSearchKeyword(e.target.value)}
                                            placeholder="Tìm vật tư trong phiếu nhập tham chiếu..."
                                            autoFocus
                                            style={{
                                                width: '100%',
                                                padding: '12px 44px 12px 44px',
                                                border: '2px solid #2196F3',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                boxShadow: '0 0 0 4px rgba(33, 150, 243, 0.1)',
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={closeProductSearch}
                                            style={{
                                                position: 'absolute',
                                                right: '8px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: '#6b7280',
                                                zIndex: 1,
                                            }}
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', maxHeight: '350px', overflowY: 'auto', zIndex: 100 }}>
                                        {filteredProducts.length === 0 ? (
                                            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                                                <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                                                <p style={{ margin: 0, fontSize: '13px' }}>Không tìm thấy vật tư phù hợp</p>
                                            </div>
                                        ) : (
                                            filteredProducts.map((product) => (
                                                <div
                                                    key={product.grnLineId}
                                                    style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                                                    onClick={() => addLineFromGrn(product)}
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                >
                                                    <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                        <Package size={20} color="#9ca3af" />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                                                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>{product.productName}</span>
                                                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#2196F3', marginLeft: '12px' }}>
                                                                {formatCurrency(product.unitPrice)}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap' }}>
                                                            <span>Mã: {product.sku}</span>
                                                            <span>•</span>
                                                            <span>ĐVT: {product.uom}</span>
                                                            <span>•</span>
                                                            <span>Đã nhập: {product.receivedQty}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeLines.length === 0 ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '60px 20px', color: '#9ca3af' }}>
                                    <Package size={64} strokeWidth={1.5} />
                                    <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Chưa có vật tư trả nào</p>
                                </div>
                            ) : (
                                <div className="table-container" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                <th style={{ textAlign: 'left' }}>Vật tư</th>
                                                <th style={{ width: '90px', textAlign: 'right' }}>SL đã nhập</th>
                                                <th style={{ width: '120px', textAlign: 'center' }}>SL trả</th>
                                                <th style={{ width: '120px', textAlign: 'right' }}>Đơn giá</th>
                                                <th style={{ width: '140px', textAlign: 'right' }}>Thành tiền</th>
                                                {isEditing && <th style={{ width: '50px' }}></th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeLines.map((line, index) => (
                                                <tr key={line.lineId || line.grnLineId}>
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                            <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                <Package size={20} color="#9ca3af" />
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                <span style={{ fontSize: 14, fontWeight: 500, color: '#2196F3' }}>{line.productName || '—'}</span>
                                                                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                                                    Mã: {line.sku || '—'} • ĐVT: {line.uom || '—'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', paddingRight: '12px' }}>
                                                        <span style={{ fontWeight: 500, color: '#374151' }}>{line.receivedQty ?? '—'}</span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {isEditing ? (
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={line.receivedQty}
                                                                    value={line.returnQty}
                                                                    onChange={(e) => updateLineReturnQty(line.lineId, e.target.value)}
                                                                    className="form-input"
                                                                    style={{ textAlign: 'right', width: '60px', padding: '4px 6px', fontSize: '13px' }}
                                                                />
                                                                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>/ {line.receivedQty}</span>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                <div className="form-input" style={{ textAlign: 'right', width: '60px', padding: '4px 6px', fontSize: '13px', backgroundColor: '#f5f5f5', minHeight: '30px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                                    {line.returnQty ?? '—'}
                                                                </div>
                                                                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>/ {line.receivedQty}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500, color: '#374151', paddingRight: '12px' }}>
                                                        {formatCurrency(line.unitPrice)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#2196F3' }}>
                                                        {formatCurrency(line.totalPrice)}
                                                    </td>
                                                    {isEditing && (
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button type="button" onClick={() => removeLine(line.lineId)} className="btn-icon-only" style={{ color: '#ef4444' }} title="Xóa dòng">
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Cột phải: Thông tin chung + Hoàn tiền */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '760px' }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Thông tin chung</h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div className="form-field">
                                        <label className="form-label">Người tạo</label>
                                        <div className="input-wrapper">
                                            <input type="text" value={detailData.createdByName || '—'} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ngày tạo</label>
                                        <div className="input-wrapper">
                                            <input type="text" value={formatDateTime(detailData.createdAt)} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Phiếu nhập tham chiếu</label>
                                        <div className="input-wrapper">
                                            <input type="text" value={detailData.relatedGRNCode || '—'} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ngày trả hàng <span className="required-mark">*</span></label>
                                        <div className="input-wrapper">
                                            <input
                                                type={isEditing ? 'date' : 'text'}
                                                name="returnDate"
                                                value={isEditing ? draft.returnDate : formatDate(detailData.returnDate)}
                                                onChange={isEditing ? handleDraftChange : undefined}
                                                min={isEditing ? (detailData.grnReceiptDate || '') : undefined}
                                                readOnly={!isEditing}
                                                className={`form-input ${errors.returnDate ? 'error' : ''}`}
                                                style={{ backgroundColor: isEditing ? '#fff' : '#f5f5f5' }}
                                            />
                                        </div>
                                        {errors.returnDate && <span className="error-message">{errors.returnDate}</span>}
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Kho trả</label>
                                        <div className="input-wrapper">
                                            <input type="text" value={detailData.warehouseName || '—'} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Người duyệt</label>
                                        <div className="input-wrapper">
                                            <input type="text" value={detailData.approvedBy || '—'} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ngày duyệt</label>
                                        <div className="input-wrapper">
                                            <input type="text" value={formatDateTime(detailData.approvedAt)} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Hoàn tiền</h2>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Trạng thái hoàn tiền</label>
                                    {isEditing ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                                                <input type="radio" name="refundReceiveStatus" value="received" checked={draft.refundReceiveStatus === 'received'} onChange={handleDraftChange} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                                Đã nhận hoàn tiền
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                                                <input type="radio" name="refundReceiveStatus" value="later" checked={draft.refundReceiveStatus === 'later'} onChange={handleDraftChange} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                                Nhận hoàn tiền sau
                                            </label>
                                        </div>
                                    ) : (
                                        <div className="input-wrapper">
                                            <input
                                                type="text"
                                                value={
                                                    detailData.refundReceiveStatus === 'received'
                                                        ? 'Đã nhận hoàn tiền'
                                                        : detailData.refundReceiveStatus === 'later'
                                                            ? 'Nhận hoàn tiền sau'
                                                            : '—'
                                                }
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {(isEditing ? draft.refundReceiveStatus : detailData.refundReceiveStatus) === 'received' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                                        <div className="form-field">
                                            <label className="form-label">Hình thức thanh toán</label>
                                            <div className="input-wrapper">
                                                {isEditing ? (
                                                    <select name="refundMethod" value={draft.refundMethod} onChange={handleDraftChange} className="form-input" style={{ paddingLeft: '16px' }}>
                                                        <option value="cash">Tiền mặt</option>
                                                        <option value="bank_transfer">Chuyển khoản</option>
                                                        <option value="card">Thanh toán thẻ</option>
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={
                                                            detailData.refundMethod === 'cash'
                                                                ? 'Tiền mặt'
                                                                : detailData.refundMethod === 'bank_transfer'
                                                                    ? 'Chuyển khoản'
                                                                    : detailData.refundMethod === 'card'
                                                                        ? 'Thanh toán thẻ'
                                                                        : '—'
                                                        }
                                                        readOnly
                                                        className="form-input"
                                                        style={{ backgroundColor: '#f5f5f5' }}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">Số tiền nhận hoàn</label>
                                            <div className="input-wrapper">
                                                <input
                                                    type="text"
                                                    value={formatCurrency(estimatedRefundAmount)}
                                                    readOnly
                                                    className="form-input"
                                                    style={{ backgroundColor: '#f5f5f5' }}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">Ngày ghi nhận</label>
                                            <div className="input-wrapper">
                                                <input
                                                    type={isEditing ? 'date' : 'text'}
                                                    name="refundRecordedDate"
                                                    value={isEditing ? draft.refundRecordedDate : formatDate(detailData.refundRecordedDate)}
                                                    onChange={isEditing ? handleDraftChange : undefined}
                                                    max={isEditing ? TODAY : undefined}
                                                    min={isEditing ? (detailData.grnReceiptDate || '') : undefined}
                                                    readOnly={!isEditing}
                                                    className={`form-input ${errors.refundRecordedDate ? 'error' : ''}`}
                                                    style={{ backgroundColor: isEditing ? '#fff' : '#f5f5f5' }}
                                                />
                                            </div>
                                            {errors.refundRecordedDate && <span className="error-message">{errors.refundRecordedDate}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PHẦN DƯỚI */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'stretch', marginTop: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Nhà cung cấp</h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: '#334155' }}>
                                    <div><span style={{ fontWeight: 600 }}>Tên NCC: </span><span>{detailData.supplierName || '—'}</span></div>
                                    <div><span style={{ fontWeight: 600 }}>SĐT: </span><span>{detailData.supplierPhone || '—'}</span></div>
                                    <div><span style={{ fontWeight: 600 }}>Email: </span><span>{detailData.supplierEmail || '—'}</span></div>
                                    <div><span style={{ fontWeight: 600 }}>Mã số thuế: </span><span>{detailData.supplierTaxCode || '—'}</span></div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 4 }}>
                                        {[
                                            { label: 'Tỉnh/Thành phố', value: detailData.supplierAddressProvince },
                                            { label: 'Quận/Huyện', value: detailData.supplierAddressDistrict },
                                            { label: 'Phường/Xã', value: detailData.supplierAddressWard },
                                            { label: 'Địa chỉ cụ thể', value: detailData.supplierAddressStreet },
                                        ].map(({ label, value }) => (
                                            <div key={label}>
                                                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>{label}</div>
                                                <div style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', minHeight: 32, display: 'flex', alignItems: 'center' }}>
                                                    {value || '—'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú trả hàng</h2>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Ghi chú trả hàng</label>
                                    <textarea
                                        name="reason"
                                        value={isEditing ? draft.reason : (detailData.reason || '—')}
                                        onChange={isEditing ? handleDraftChange : undefined}
                                        readOnly={!isEditing}
                                        rows={4}
                                        className={`form-input ${errors.reason ? 'error' : ''}`}
                                        style={{ resize: 'vertical', backgroundColor: isEditing ? '#fff' : '#f5f5f5' }}
                                    />
                                    {errors.reason && <span className="error-message">{errors.reason}</span>}
                                    {isEditing && (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '12px', color: draft.reason.length >= MAX_REASON_LENGTH ? '#ef4444' : '#6b7280', marginTop: '4px', fontWeight: 500 }}>
                                            {draft.reason.length}/{MAX_REASON_LENGTH} ký tự
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng hợp phiếu trả</h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>Tổng số lượng trả</div>
                                            <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>{totalReturnQuantity} sản phẩm</div>
                                        </div>
                                        <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>Giá trị hàng trả</div>
                                            <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>{formatCurrency(subtotal)}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div className="form-field">
                                            <label className="form-label">Phí xử lý trả hàng</label>
                                            <div className="input-wrapper">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        name="feeAmount"
                                                        value={draft.feeAmount}
                                                        onChange={handleDraftChange}
                                                        className={`form-input ${errors.feeAmount ? 'error' : ''}`}
                                                        style={{ paddingLeft: '16px', paddingRight: '34px' }}
                                                        placeholder="Nhập phí xử lý"
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={formatCurrency(detailData.feeAmount)}
                                                        className="form-input"
                                                        style={{ backgroundColor: '#f5f5f5', paddingLeft: '16px' }}
                                                    />
                                                )}
                                                {isEditing && (
                                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>
                                                        ₫
                                                    </span>
                                                )}
                                            </div>
                                            {errors.feeAmount && <span className="error-message">{errors.feeAmount}</span>}
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">Lý do giảm trừ</label>
                                            <div className="input-wrapper">
                                                <input
                                                    type="text"
                                                    name="deductionReason"
                                                    value={isEditing ? draft.deductionReason : (detailData.deductionReason || '—')}
                                                    onChange={isEditing ? handleDraftChange : undefined}
                                                    readOnly={!isEditing}
                                                    className="form-input"
                                                    style={{ backgroundColor: isEditing ? '#fff' : '#f5f5f5', paddingLeft: '16px' }}
                                                    placeholder={isEditing ? 'Nhập lý do giảm trừ' : undefined}
                                                />
                                            </div>
                                            {isEditing && (
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '12px', color: draft.deductionReason.length >= MAX_NOTE_LENGTH ? '#ef4444' : '#6b7280', marginTop: '2px', fontWeight: 500 }}>
                                                    {draft.deductionReason.length}/{MAX_NOTE_LENGTH}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ padding: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', marginBottom: '8px' }}>
                                            <span style={{ color: '#475569', fontWeight: 600 }}>Giá trị hàng trả</span>
                                            <span style={{ color: '#10b981', fontWeight: 700 }}>+ {formatCurrency(subtotal)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                                            <span style={{ color: '#475569', fontWeight: 600 }}>Phí xử lý</span>
                                            <span style={{ color: feeAmount > 0 ? '#ef4444' : '#64748b', fontWeight: 700 }}>- {formatCurrency(feeAmount)}</span>
                                        </div>
                                    </div>

                                    <div style={{ padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '12px', borderLeft: '4px solid #2196F3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#2196F3' }}>Số tiền hoàn dự kiến</span>
                                        <span style={{ fontSize: '22px', fontWeight: 700, color: '#2196F3' }}>{formatCurrency(estimatedRefundAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cột phải để trống theo layout Create */}
                        <div />
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
}
