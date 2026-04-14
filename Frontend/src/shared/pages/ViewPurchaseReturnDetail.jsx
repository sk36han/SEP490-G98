/**
 * ViewPurchaseReturnDetail - Chi tiết phiếu trả hàng (xem + chỉnh sửa tại chỗ)
 * Hỗ trợ 2 trạng thái độc lập: Trạng thái hoàn & Trạng thái thanh toán
 */
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    Truck,
    CheckCheck,
    User,
    Calendar,
    FileText,
    MapPin,
    Phone,
    Mail,
    ReceiptText,
    Building2,
    CreditCard,
    Send,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import { getPurchaseReturnDetail, approvePurchaseReturn, refundPurchaseReturn, updatePurchaseReturn } from '../lib/purchaseReturnNoteService';
import { getGRNDetail } from '../lib/goodReceiptNoteService';
import GRNListPopup from '../components/GRNListPopup';
import '../styles/CreateSupplier.css';

const TODAY = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
const MAX_REASON_LENGTH = 250;
const MAX_NOTE_LENGTH = 250;

// --- Return status constants ---
const RETURN_STATUS = {
    DRAFT: 'draft_return',
    SUBMITTED: 'submitted_return', // Chờ hoàn hàng
    PARTIAL: 'partial_return',  // Hoàn hàng một phần
    COMPLETE: 'complete_return', // Hoàn hàng toàn bộ
};

// --- Payment status constants ---
const PAYMENT_STATUS = {
    PENDING: 'pending',  // Chờ hoàn tiền
    RECEIVED: 'received', // Đã hoàn tiền
};

// --- Return status config ---
const RETURN_STATUS_CONFIG = {
    [RETURN_STATUS.DRAFT]:     { label: 'Nháp', color: '#6b7280', bg: '#e5e7eb', icon: <Clock size={16} /> },
    [RETURN_STATUS.SUBMITTED]: { label: 'Chờ hoàn hàng', color: '#d97706', bg: '#fef3c7', icon: <Clock size={16} /> },
    [RETURN_STATUS.PARTIAL]:   { label: 'Hoàn hàng một phần', color: '#7c3aed', bg: '#ede9fe', icon: <Truck size={16} /> },
    [RETURN_STATUS.COMPLETE]:  { label: 'Hoàn hàng toàn bộ', color: '#10b981', bg: '#d1fae5', icon: <CheckCheck size={16} /> },
};

// --- Payment status config ---
const PAYMENT_STATUS_CONFIG = {
    [PAYMENT_STATUS.PENDING]:  { label: 'Chờ hoàn tiền', color: '#d97706', bg: 'rgba(245,158,11,0.15)', icon: <Clock size={16} /> },
    [PAYMENT_STATUS.RECEIVED]: { label: 'Đã hoàn tiền', color: '#047857', bg: 'rgba(16,185,129,0.18)', icon: <CheckCircle size={16} /> },
};

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
    supplierCode: 'NCC-ABC',
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

    // --- Two independent confirmation flags ---
    // returnConfirmed: false = Chờ trả hàng; true = Hoàn một phần / Hoàn toàn bộ
    returnConfirmed: false,
    // paymentConfirmed: false = Chờ hoàn tiền; true = Đã hoàn tiền
    paymentConfirmed: false,

    createdById: 1,
    createdByName: 'Nguyễn Văn A',
    createdAt: '2025-01-14T08:00:00',
    approvedBy: null,
    approvedAt: null,

    returnDate: '2025-01-15',
    reason: 'Hàng có lỗi in mờ và sai màu mực.',

    feeAmount: 10000,
    deductionReason: 'Trừ phí vận chuyển chiều trả.',

    refundReceiveStatus: 'later',
    refundMethod: 'cash',
    refundRecordedDate: null,

    lines: [
        { grnLineId: 1, productId: 1, sku: 'PEN-001', productName: 'Bút bi Thiên Long TL-057', uom: 'Cây', receivedQty: 50, returnQty: 5, unitPrice: 3500, totalPrice: 17500 },
        { grnLineId: 2, productId: 2, sku: 'NOTE-001', productName: 'Vở note 5 chấm A5', uom: 'Quyển', receivedQty: 20, returnQty: 2, unitPrice: 22000, totalPrice: 44000 },
        { grnLineId: 3, productId: 3, sku: 'PAPER-001', productName: 'Giấy A4 Double A 80gsm', uom: 'Ram', receivedQty: 10, returnQty: 1, unitPrice: 62000, totalPrice: 62000 },
    ],
};

const toNumber = (val) => {
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
};

const displaySupplierField = (v) => {
    if (v === null || v === undefined) return '—';
    const s = String(v).trim();
    return s.length ? s : '—';
};

const generateLineId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const mapApiToLegacyState = (api) => {
    const lines = (api?.lines || []).map((line) => {
        const actual = toNumber(line.receivedQty || line.expectedQty || line.returnQty || 0);
        return {
            grnLineId: line.relatedGrnlineId,
            productId: line.itemId,
            sku: line.itemCode || '-',
            productName: line.itemName || '-',
            uom: line.uomName || '-',
            receivedQty: actual,
            qtyCommittedForReturn: toNumber(line.qtyCommittedForReturn ?? 0),
            maxReturnQty: toNumber(line.maxReturnQty ?? actual),
            returnQty: toNumber(line.returnQty),
            unitPrice: toNumber(line.unitPrice),
            totalPrice: toNumber(line.lineTotal ?? toNumber(line.returnQty) * toNumber(line.unitPrice)),
        };
    });

    const status = api?.status || 'DRAFT';
    const refundStatus = (api?.refundStatus || 'NotRefunded').toLowerCase();

    return {
        purchaseReturnId: api?.purchaseReturnId,
        returnCode: api?.returnCode || '',
        relatedGRNId: api?.relatedGrnId,
        relatedGRNCode: api?.relatedGrnCode || '',
        grnReceiptDate: '',

        supplierId: api?.supplierId ?? api?.SupplierId,
        supplierCode: api?.supplierCode ?? api?.SupplierCode ?? '',
        supplierName: api?.supplierName ?? api?.SupplierName ?? '',
        supplierPhone: api?.supplierPhone ?? api?.SupplierPhone ?? '',
        supplierEmail: api?.supplierEmail ?? api?.SupplierEmail ?? '',
        supplierTaxCode: api?.supplierTaxCode ?? api?.SupplierTaxCode ?? '',
        supplierAddressProvince: api?.supplierAddressProvince ?? api?.SupplierAddressProvince ?? '',
        supplierAddressDistrict: api?.supplierAddressDistrict ?? api?.SupplierAddressDistrict ?? '',
        supplierAddressWard: api?.supplierAddressWard ?? api?.SupplierAddressWard ?? '',
        supplierAddressStreet: api?.supplierAddressStreet ?? api?.SupplierAddressStreet ?? '',

        warehouseId: api?.warehouseId,
        warehouseName: api?.warehouseName || '',

        returnConfirmed: status === 'APPROVED', // APPROVED = đã xác nhận trả (Hoàn một phần / Hoàn toàn bộ)
        paymentConfirmed: refundStatus === 'refunded',
        workflowStatus: status,

        createdById: api?.createdBy,
        createdByName: api?.createdByName || '',
        createdAt: api?.createdAt,
        approvedBy: api?.approvedByName || null,
        approvedAt: api?.approvedAt || null,

        returnDate: api?.returnDate ? String(api.returnDate).slice(0, 10) : '',
        reason: api?.reason || '',

        feeAmount: toNumber(api?.feeAmount),
        deductionReason: api?.note || '',

        refundReceiveStatus: refundStatus === 'refunded' ? 'received' : 'later',
        refundMethod: api?.refundMethod === 'bank_transfer' || api?.refundMethod === 'card' || api?.refundMethod === 'cash'
            ? api.refundMethod
            : 'cash',
        refundRecordedDate: api?.refundedAt ? new Date(api.refundedAt).toLocaleDateString('en-CA') : null,

        lines,
    };
};

const mapGrnToProductSource = (grn) => {
    const code = grn?.grnCode || grn?.GrnCode || '';
    const lines = grn?.lines || grn?.Lines || [];
    return {
        code,
        lines: lines.map((item) => {
            const actual = toNumber(item.actualQty ?? item.ActualQty ?? item.expectedQty ?? item.ExpectedQty ?? 0);
            const committed = toNumber(item.qtyCommittedForReturn ?? item.QtyCommittedForReturn ?? 0);
            const availRaw = item.qtyAvailableForReturn ?? item.QtyAvailableForReturn;
            const available =
                availRaw !== null && availRaw !== undefined && availRaw !== ''
                    ? toNumber(availRaw)
                    : Math.max(0, actual - committed);
            return {
                grnLineId: item.grnlineId ?? item.GrnlineId,
                productId: item.itemId ?? item.ItemId,
                sku: item.itemCode ?? item.ItemCode ?? '-',
                productName: item.itemName ?? item.ItemName ?? '-',
                uom: item.uomName ?? item.UomName ?? '-',
                receivedQty: actual,
                qtyCommittedForReturn: committed,
                maxReturnQty: Math.max(0, available),
                unitPrice: toNumber(item.unitPrice ?? item.UnitPrice ?? 0),
            };
        }),
        receiptDate: grn?.receiptDate || grn?.ReceiptDate || '',
    };
};

// --- Validation helpers (mirrors CreatePurchaseReturn) ---

/**
 * Validate returnDate.
 * Required + not before grnReceiptDate.
 * KHÔNG có rule "not in future" vì Create không có.
 */
const validateReturnDate = (value, grnReceiptDate) => {
    if (!value) return 'Ngày trả hàng là bắt buộc';
    if (grnReceiptDate && value < grnReceiptDate) return 'Ngày trả hàng không được trước ngày nhập của GRN';
    return null;
};

/**
 * Validate refundRecordedDate.
 * Chỉ required khi refundReceiveStatus === 'received'.
 * Khi required: not in future + phải >= grnReceiptDate.
 */
const validateRefundRecordedDate = (value, refundReceiveStatus, grnReceiptDate) => {
    if (refundReceiveStatus !== 'received') return null;
    if (!value) return 'Ngày ghi nhận là bắt buộc';
    if (value > TODAY) return 'Ngày ghi nhận không được ở tương lai';
    if (grnReceiptDate && value < grnReceiptDate) return 'Ngày ghi nhận không được sớm hơn Ngày nhập của GRN';
    return null;
};

const lineReturnCap = (line) => toNumber(line.maxReturnQty ?? line.receivedQty);

/**
 * Validate lines for save.
 * Bám đúng rule của Create (giới hạn theo SL còn có thể trả trên GRN).
 */
const validateLines = (lines) => {
    if (!lines.length) return 'Vui lòng thêm ít nhất 1 vật tư trả';
    const invalidLine = lines.find(
        (line) => toNumber(line.returnQty) <= 0 || toNumber(line.returnQty) > lineReturnCap(line)
    );
    if (invalidLine) return 'Số lượng trả phải lớn hơn 0 và không vượt quá số lượng còn có thể trả trên phiếu nhập';
    return null;
};

// --- Business helpers ---

/**
 * Tính trạng thái hoàn dựa trên workflowStatus.
 * Quy tắc:
 * - workflowStatus === DRAFT => Nháp
 * - workflowStatus === SUBMITTED => Chờ hoàn hàng
 * - workflowStatus === APPROVED:
 *   - totalReturnQty < totalReceivedQty => Hoàn hàng một phần
 *   - totalReturnQty >= totalReceivedQty => Hoàn hàng toàn bộ
 */
const getReturnStatus = (lines, isDraft = false, isSubmitted = false) => {
    if (isDraft) return RETURN_STATUS.DRAFT;
    if (isSubmitted) return RETURN_STATUS.SUBMITTED;
    // APPROVED: phân biệt theo số lượng
    const totalReceived = lines.reduce((s, l) => s + toNumber(l.receivedQty), 0);
    const totalReturn = lines.reduce((s, l) => s + toNumber(l.returnQty), 0);
    if (totalReturn >= totalReceived) return RETURN_STATUS.COMPLETE;
    return RETURN_STATUS.PARTIAL;
};

/**
 * Tính trạng thái thanh toán dựa trên paymentConfirmed.
 */
const getPaymentStatus = (paymentConfirmed) => {
    return paymentConfirmed ? PAYMENT_STATUS.RECEIVED : PAYMENT_STATUS.PENDING;
};

/**
 * Có thể xác nhận thanh toán khi:
 * - Phần thanh toán chưa được xác nhận
 * KHÔNG phụ thuộc vào trạng thái hoàn hàng.
 */
const canConfirmPayment = (paymentConfirmed) => {
    if (paymentConfirmed) return false;
    return true;
};

/**
 * Phần trả hàng bị khóa khi returnConfirmed === true.
 * Khi khóa: không cho sửa lines, returnDate, reason.
 * feeAmount & deductionReason VẪN cho sửa sau khi xác nhận trả hàng (vì là phần xử lý phí).
 */
const isReturnSectionLocked = (returnConfirmed) => returnConfirmed;

/**
 * Phần hoàn tiền bị khóa khi paymentConfirmed === true.
 * Khi khóa: không cho sửa refundReceiveStatus, refundMethod, refundRecordedDate.
 */
const isPaymentSectionLocked = (paymentConfirmed) => paymentConfirmed;

// --- Formatting helpers ---
const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    if (Number.isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    if (Number.isNaN(d.getTime())) return dateStr;
    return `${formatDate(dateStr)} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(toNumber(val));
};

// --- Data helpers ---
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
        qtyCommittedForReturn: toNumber(line.qtyCommittedForReturn ?? 0),
        maxReturnQty: toNumber(line.maxReturnQty ?? line.receivedQty),
        unitPrice: toNumber(line.unitPrice),
        totalPrice: toNumber(line.returnQty) * toNumber(line.unitPrice),
    })),
});

/** Payload PUT /PurchaseReturnNote/update — cung kieu CreatePurchaseReturn (PascalCase). */
const buildPrnUpdateApiPayload = (draft) => ({
    ReturnDate: draft.returnDate,
    Reason: draft.reason.trim() || null,
    Note: draft.deductionReason?.trim() || null,
    FeeAmount: toNumber(draft.feeAmount),
    Lines: draft.lines.map((line) => ({
        RelatedGrnlineId: Number(line.grnLineId),
        ReturnQty: toNumber(line.returnQty),
        Reason: draft.reason.trim() || null,
        Note: draft.deductionReason?.trim() || null,
    })),
});

// --- Simple Confirm Dialog Component ---
const ConfirmDialog = ({ title, message, onConfirm, onCancel, confirmLabel = 'Xác nhận', confirmDanger = false }) => {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
                maxWidth: '420px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: '#1f2937' }}>
                    {title}
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', lineHeight: 1.6 }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            padding: '8px 16px', borderRadius: '8px',
                            border: '1px solid #e5e7eb', backgroundColor: '#fff',
                            color: '#374151', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        style={{
                            padding: '8px 16px', borderRadius: '8px',
                            border: 'none',
                            backgroundColor: confirmDanger ? '#ef4444' : '#2196F3',
                            color: '#fff', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Status Badge component ---
const StatusBadge = ({ config }) => (
    <div
        style={{
            padding: '6px 14px',
            borderRadius: 20,
            backgroundColor: config.bg,
            color: config.color,
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
        }}
    >
        {config.icon}
        {config.label}
    </div>
);

export default function ViewPurchaseReturnDetail() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();

    const [detailData, setDetailData] = useState(MOCK_DETAIL);
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingPayment, setIsEditingPayment] = useState(false); // edit riêng phần hoàn tiền
    const [draft, setDraft] = useState(() => getInitialDraftFromData(MOCK_DETAIL));
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [grnSource, setGrnSource] = useState(MOCK_GRN_SOURCE);

    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedSearchProductIds, setSelectedSearchProductIds] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm, confirmLabel }
    const [showGRNListPopup, setShowGRNListPopup] = useState(false);

    const fetchDetail = useCallback(async () => {
        if (!id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setLoadError('');

            // Gọi API lấy chi tiết PR
            const detail = await getPurchaseReturnDetail(Number(id));

            // Khởi tạo GRN call SONG SONG ngay khi có relatedGrnId
            // (chạy nền trong khi vẫn đang xử lý mapping)
            let grnCallDone = false;
            let mappedGrn = null;
            const grnCallPromise = (async () => {
                if (!detail?.relatedGrnId) return null;
                try {
                    const grnData = await getGRNDetail(detail.relatedGrnId);
                    return mapGrnToProductSource(grnData);
                } catch {
                    return null;
                } finally {
                    grnCallDone = true;
                }
            })();

            // Map PR data (chạy SONG SONG với grnCall)
            const mapped = mapApiToLegacyState(detail);

            // Chờ GRN call xong
            mappedGrn = await grnCallPromise;

            // Gộp GRN data vào mapped nếu có
            if (mappedGrn) {
                const grnLineMeta = new Map(
                    mappedGrn.lines.map((x) => [
                        Number(x.grnLineId),
                        {
                            received: toNumber(x.receivedQty),
                            committed: toNumber(x.qtyCommittedForReturn),
                            max: toNumber(x.maxReturnQty),
                        },
                    ])
                );
                mapped.lines = mapped.lines.map((line) => {
                    const g = grnLineMeta.get(Number(line.grnLineId));
                    if (!g) return line;
                    const ownReturn = toNumber(line.returnQty);
                    // GRN API: committed/available gom ca PRN hien tai; cap sua phai = con cho phep + SL dang ghi tren PRN nay (giong backend UpdatePRN).
                    const maxReturnQty = Math.max(0, g.max + ownReturn);
                    const othersCommitted = Math.max(0, g.committed - ownReturn);
                    return {
                        ...line,
                        receivedQty: g.received,
                        qtyCommittedForReturn: othersCommitted,
                        maxReturnQty,
                    };
                });
                mapped.grnReceiptDate = mappedGrn.receiptDate
                    ? new Date(mappedGrn.receiptDate).toLocaleDateString('en-CA')
                    : '';
                setGrnSource((prev) => ({
                    ...prev,
                    [mapped.relatedGRNCode || mappedGrn.code]: mappedGrn.lines,
                }));
            }

            // Set state 1 lần duy nhất với dữ liệu đã gộp đầy đủ
            setDetailData(mapped);
            setDraft(getInitialDraftFromData(mapped));
        } catch (err) {
            setLoadError(err?.response?.data?.message || err?.message || 'Không tải được chi tiết phiếu trả hàng');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    // --- Derived state ---
    const returnConfirmed = detailData.returnConfirmed;
    const paymentConfirmed = detailData.paymentConfirmed;
    const isDraftStatus = detailData.workflowStatus === 'DRAFT';
    const isSubmittedStatus = detailData.workflowStatus === 'SUBMITTED';

    const returnStatus = useMemo(
        () => getReturnStatus(detailData.lines, isDraftStatus, isSubmittedStatus),
        [detailData.lines, isDraftStatus, isSubmittedStatus]
    );
    const paymentStatus = useMemo(
        () => getPaymentStatus(paymentConfirmed),
        [paymentConfirmed]
    );

    const returnStatusConfig = RETURN_STATUS_CONFIG[returnStatus] || RETURN_STATUS_CONFIG[RETURN_STATUS.SUBMITTED];
    const paymentStatusConfig = PAYMENT_STATUS_CONFIG[paymentStatus] || PAYMENT_STATUS_CONFIG[PAYMENT_STATUS.PENDING];

    const isReturnLocked = !isDraftStatus && !isSubmittedStatus; // APPROVED => khóa phần trả hàng
    const isPaymentLocked = isPaymentSectionLocked(paymentConfirmed);

    // Nút "Tạo phiếu trả hàng" chỉ hiện khi trạng thái Draft
    const canCreateReturnBtn = isDraftStatus;
    // Nút "Bắt đầu trả hàng" chỉ hiện khi trạng thái SUBMITTED (Chờ hoàn hàng)
    const canStartReturnBtn = isSubmittedStatus;

    // Nút "Xác nhận thanh toán": hiện khi SUBMITTED/APPROVED và payment chưa confirm
    const canConfirmPaymentBtn = !isDraftStatus && canConfirmPayment(paymentConfirmed);

    const activeLines = isEditing ? draft.lines : detailData.lines;
    const subtotal = activeLines.reduce((sum, line) => sum + toNumber(line.totalPrice), 0);
    const feeAmount = isEditing ? toNumber(draft.feeAmount) : toNumber(detailData.feeAmount);
    const isFeeAmountExceedSubtotal = feeAmount > subtotal;
    const totalReturnQuantity = activeLines.reduce((sum, line) => sum + toNumber(line.returnQty), 0);
    const estimatedRefundAmount = Math.max(subtotal - feeAmount, 0);

    const availableProducts = useMemo(() => {
        const source = grnSource[detailData.relatedGRNCode] || [];
        const selectedIds = new Set(draft.lines.map((line) => line.productId));
        return source.filter(
            (item) =>
                !selectedIds.has(item.productId) &&
                toNumber(item.maxReturnQty ?? item.receivedQty) > 0
        );
    }, [grnSource, detailData.relatedGRNCode, draft.lines]);

    const filteredProducts = useMemo(() => {
        const q = searchKeyword.trim().toLowerCase();
        if (!q) return availableProducts;
        return availableProducts.filter(
            (item) =>
                (item.productName || '').toLowerCase().includes(q) ||
                (item.sku || '').toLowerCase().includes(q)
        );
    }, [availableProducts, searchKeyword]);

    const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every((p) => selectedSearchProductIds.includes(p.productId));
    const someFilteredSelected = filteredProducts.some((p) => selectedSearchProductIds.includes(p.productId));

    // --- Edit mode handlers ---
    const enterEditMode = () => {
        if (isReturnLocked) return;
        setDraft(getInitialDraftFromData(detailData));
        setErrors({});
        setShowProductSearch(false);
        setSearchKeyword('');
        setSelectedSearchProductIds([]);
        setIsEditingPayment(false);
        setIsEditing(true);
    };

    const cancelEditMode = () => {
        setDraft(getInitialDraftFromData(detailData));
        setErrors({});
        setShowProductSearch(false);
        setSearchKeyword('');
        setSelectedSearchProductIds([]);
        setIsEditingPayment(false);
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

        // Enforce max length for text fields — mirrors Create
        if (name === 'reason' && value.length > MAX_REASON_LENGTH) return;
        if (name === 'deductionReason' && value.length > MAX_NOTE_LENGTH) return;

        // returnDate onChange — mirrors Create
        if (name === 'returnDate') {
            if (value && detailData.grnReceiptDate && value < detailData.grnReceiptDate) {
                setFieldError('returnDate', 'Ngày trả hàng không được trước ngày nhập của GRN');
            } else {
                clearFieldError('returnDate');
            }
        }

        // refundRecordedDate onChange — not future + must be >= grnReceiptDate
        if (name === 'refundRecordedDate') {
            if (value && value > TODAY) {
                setFieldError('refundRecordedDate', 'Ngày ghi nhận không được ở tương lai');
            } else if (value && detailData.grnReceiptDate && value < detailData.grnReceiptDate) {
                setFieldError('refundRecordedDate', 'Ngày ghi nhận không được sớm hơn Ngày nhập của GRN');
            } else {
                clearFieldError('refundRecordedDate');
            }
        }

        // feeAmount: digits only — mirrors Create
        if (name === 'feeAmount') {
            const digitsOnly = value.replace(/\D/g, '');
            const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
            setDraft((prev) => ({ ...prev, feeAmount: normalized }));
            if (errors.feeAmount) {
                clearFieldError('feeAmount');
            }
            return;
        }

        setDraft((prev) => ({ ...prev, [name]: value }));

        // Clear field error on change — mirrors Create
        if (errors[name]) {
            clearFieldError(name);
        }
    };

    const updateLineReturnQty = (lineId, value) => {
        setDraft((prev) => ({
            ...prev,
            lines: prev.lines.map((line) => {
                if (line.lineId !== lineId) return line;
                const qty = Math.min(Math.max(toNumber(value), 0), lineReturnCap(line));
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
        setSelectedSearchProductIds([]);
    };

    const closeProductSearch = () => {
        setShowProductSearch(false);
        setSearchKeyword('');
        setSelectedSearchProductIds([]);
    };

    const addLineFromGrn = (product) => {
        const exists = draft.lines.some((line) => line.productId === product.productId);
        if (exists) {
            showToast('Vật tư đã có trong danh sách trả.', 'warning');
            return;
        }
        const unitPrice = toNumber(product.unitPrice);
        const maxReturnQty = toNumber(product.maxReturnQty ?? product.receivedQty);
        const rq = maxReturnQty > 0 ? Math.min(1, maxReturnQty) : 0;
        const newLine = {
            lineId: generateLineId(),
            grnLineId: product.grnLineId,
            productId: product.productId,
            sku: product.sku,
            productName: product.productName,
            uom: product.uom,
            receivedQty: toNumber(product.receivedQty),
            qtyCommittedForReturn: toNumber(product.qtyCommittedForReturn ?? 0),
            maxReturnQty,
            returnQty: rq,
            unitPrice,
            totalPrice: rq * unitPrice,
        };
        setDraft((prev) => ({ ...prev, lines: [...prev.lines, newLine] }));
        clearFieldError('lines');
        setShowProductSearch(false);
        setSearchKeyword('');
        setSelectedSearchProductIds([]);
    };

    const toggleSearchProductSelection = (productId) => {
        setSelectedSearchProductIds((prev) =>
            prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
        );
    };

    const addSelectedProducts = () => {
        if (!selectedSearchProductIds.length) return;
        const productsToAdd = filteredProducts.filter((p) => selectedSearchProductIds.includes(p.productId));
        if (!productsToAdd.length) return;
        productsToAdd.forEach((product) => addLineFromGrn(product));
        setSelectedSearchProductIds([]);
    };

    const toggleSelectAllFilteredProducts = (checked) => {
        if (checked) {
            setSelectedSearchProductIds((prev) => {
                const set = new Set(prev);
                filteredProducts.forEach((p) => set.add(p.productId));
                return [...set];
            });
        } else {
            const filteredIds = new Set(filteredProducts.map((p) => p.productId));
            setSelectedSearchProductIds((prev) => prev.filter((id) => !filteredIds.has(id)));
        }
    };

    // Toggle "Trả toàn bộ" — set all returnQty = cap (con co the tra), clear all if already all
    const toggleReturnAll = (checked) => {
        if (checked) {
            setDraft((prev) => ({
                ...prev,
                lines: prev.lines.map((line) => {
                    const cap = lineReturnCap(line);
                    return {
                        ...line,
                        returnQty: cap,
                        totalPrice: cap * toNumber(line.unitPrice),
                    };
                }),
            }));
        } else {
            setDraft((prev) => ({
                ...prev,
                lines: prev.lines.map((line) => ({
                    ...line,
                    returnQty: 0,
                    totalPrice: 0,
                })),
            }));
        }
        clearFieldError('lines');
    };

    const removeLine = (lineId) => {
        setDraft((prev) => ({
            ...prev,
            lines: prev.lines.filter((line) => line.lineId !== lineId),
        }));
    };

    // --- Validate for "Lưu cập nhật" ---
    const validateDraft = () => {
        const newErrors = {};
        const returnDateError = validateReturnDate(draft.returnDate, detailData.grnReceiptDate);
        if (returnDateError) newErrors.returnDate = returnDateError;
        const linesError = validateLines(draft.lines);
        if (linesError) newErrors.lines = linesError;
        const fee = toNumber(draft.feeAmount);
        const sub = draft.lines.reduce((sum, line) => sum + toNumber(line.totalPrice), 0);
        if (fee < 0) {
            newErrors.feeAmount = 'Phí xử lý phải lớn hơn hoặc bằng 0';
        } else if (fee > sub) {
            newErrors.feeAmount = 'Phí xử lý không được cao hơn Giá trị hoàn trả';
        }
        const refundRecordedDateError = validateRefundRecordedDate(
            draft.refundRecordedDate,
            draft.refundReceiveStatus,
            detailData.grnReceiptDate
        );
        if (refundRecordedDateError) newErrors.refundRecordedDate = refundRecordedDateError;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // --- "Lưu cập nhật" ---
    const saveUpdate = async () => {
        if (submitting) return;
        if (!validateDraft()) {
            showToast('Vui lòng kiểm tra lại thông tin.', 'error');
            return;
        }
        try {
            setSubmitting(true);
            await updatePurchaseReturn(detailData.purchaseReturnId, buildPrnUpdateApiPayload(draft));
            await fetchDetail();
            setIsEditing(false);
            setShowProductSearch(false);
            showToast('Cập nhật phiếu trả hàng thành công!', 'success');
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.detail ||
                (typeof err?.response?.data === 'string' ? err.response.data : null) ||
                err?.message ||
                'Có lỗi xảy ra';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // --- "Tạo phiếu trả hàng" (chuyển từ Nháp sang SUBMITTED) ---
    const handleCreateReturn = () => {
        setConfirmDialog({
            title: 'Tạo phiếu trả hàng',
            message: 'Xác nhận tạo phiếu trả hàng? Trạng thái sẽ chuyển từ Nháp sang Chờ hoàn hàng.',
            confirmLabel: 'Tạo phiếu trả hàng',
            confirmDanger: false,
            onConfirm: async () => {
                setConfirmDialog(null);
                setSubmitting(true);
                try {
                    await approvePurchaseReturn(detailData.purchaseReturnId);
                    await fetchDetail();
                    showToast('Đã tạo phiếu trả hàng thành công!', 'success');
                } catch (err) {
                    showToast(err?.response?.data?.message || err?.message || 'Không thể tạo phiếu trả hàng', 'error');
                } finally {
                    setSubmitting(false);
                }
            },
        });
    };

    // --- Xử lý chọn GRN từ popup ---
    const handleSelectGRN = (grn) => {
        setShowGRNListPopup(false);
        navigate(`/purchase-returns/create?grnId=${grn.grnId || grn.GrnId}&grnCode=${grn.grnCode || grn.GrnCode || ''}`);
    };

    // --- "Bắt đầu trả hàng" (SUBMITTED -> APPROVED) ---
    const handleStartReturn = () => {
        setConfirmDialog({
            title: 'Bắt đầu trả hàng',
            message: 'Xác nhận bắt đầu quy trình trả hàng? Sau bước này, phần thông tin trả hàng (vật tư trả, ngày trả, ghi chú) sẽ bị khóa và không thể chỉnh sửa.',
            confirmLabel: 'Bắt đầu trả hàng',
            onConfirm: async () => {
                setConfirmDialog(null);
                setSubmitting(true);
                try {
                    // Dùng endpoint approve hiện có để chuyển khỏi Draft
                    await approvePurchaseReturn(detailData.purchaseReturnId);
                    await fetchDetail();
                    showToast('Đã bắt đầu trả hàng!', 'success');
                } catch (err) {
                    showToast(err?.response?.data?.message || err?.message || 'Không thể bắt đầu trả hàng', 'error');
                } finally {
                    setSubmitting(false);
                }
            },
        });
    };

        // --- "Xác nhận thanh toán" ---
        const handleConfirmPayment = () => {
            // Chỉ mở payment edit mode, chưa confirm ngay
            setDraft((prev) => ({
                ...prev,
                refundReceiveStatus: 'received',
                refundRecordedDate: detailData.refundRecordedDate || TODAY,
            }));

            setErrors((prev) => {
                const next = { ...prev };
                delete next.refundRecordedDate;
                return next;
            });

            setIsEditingPayment(true);
        };

    // "Lưu và xác nhận" từ chế độ edit payment
    const handleSaveAndConfirmPayment = () => {
        // Validate refundRecordedDate khi đang ở received
        const refundRecordedDateError = validateRefundRecordedDate(
            draft.refundRecordedDate,
            'received',
            detailData.grnReceiptDate
        );
        if (refundRecordedDateError) {
            setErrors({ refundRecordedDate: refundRecordedDateError });
            showToast('Vui lòng kiểm tra lại ngày ghi nhận hoàn tiền.', 'error');
            return;
        }

        setConfirmDialog({
            title: 'Xác nhận hoàn tiền',
            message: 'Xác nhận đã hoàn tiền cho phiếu trả này? Sau khi xác nhận, thông tin hoàn tiền sẽ không thể chỉnh sửa nữa.',
            confirmLabel: 'Xác nhận đã hoàn tiền',
            onConfirm: async () => {
                setConfirmDialog(null);
                setSubmitting(true);
                try {
                    await refundPurchaseReturn(detailData.purchaseReturnId, {
                        RefundMethod: draft.refundMethod,
                        RefundReference: detailData.refundReference || '',
                        RefundedAmount: estimatedRefundAmount,
                        RefundStatus: 'Refunded',
                        Note: detailData.deductionReason || '',
                    });
                    await fetchDetail();
                    setIsEditingPayment(false);
                    showToast('Đã xác nhận hoàn tiền!', 'success');
                } catch (err) {
                    showToast(err?.response?.data?.message || err?.message || 'Không thể xác nhận hoàn tiền', 'error');
                } finally {
                    setSubmitting(false);
                }
            },
        });
    };

    // Hủy edit payment
    const handleCancelEditPayment = () => {
        setDraft((prev) => ({
            ...prev,
            refundReceiveStatus: detailData.refundReceiveStatus || 'later',
            refundRecordedDate: detailData.refundRecordedDate || TODAY,
        }));
        setIsEditingPayment(false);
        setErrors((prev) => {
            const next = { ...prev };
            delete next.refundRecordedDate;
            return next;
        });
    };

    // Thực tế trạng thái hiển thị refund: dựa vào paymentConfirmed
    const currentRefundStatus = paymentConfirmed ? 'received' : 'later';
    const currentRefundDisplay = currentRefundStatus === 'received' ? 'Đã nhận hoàn tiền' : 'Nhận hoàn tiền sau';

    if (loading) {
        return (
            <div className="create-supplier-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280' }}>
                    <Loader size={18} className="spinner" />
                    Đang tải chi tiết phiếu trả hàng...
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="create-supplier-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ color: '#dc2626', textAlign: 'center' }}>
                    <XCircle size={28} style={{ marginBottom: 8 }} />
                    <div>{loadError}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="create-supplier-page">
            {confirmDialog && (
                <ConfirmDialog
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmLabel={confirmDialog.confirmLabel}
                    confirmDanger={false}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}

            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate('/purchase-returns')} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại danh sách</span>
                    </button>
                </div>

                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isEditing && (
                        <>
                            <button type="button" className="btn btn-cancel" onClick={cancelEditMode} disabled={submitting}>
                                Hủy
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
                                        Lưu
                                    </>
                                )}
                            </button>
                        </>
                    )}

                    {!isEditing && !isReturnLocked && (
                        <button type="button" className="btn btn-primary" onClick={enterEditMode}>
                            Chỉnh sửa
                        </button>
                    )}

                    {!isEditing && canCreateReturnBtn && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleCreateReturn}
                            disabled={submitting}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Send size={16} />
                            Tạo phiếu trả hàng
                        </button>
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
                                    Mã Phiếu:{' '}
                                    <span style={{ fontWeight: 600, color: '#2196F3' }}>{detailData.returnCode}</span>
                                </p>
                            </div>

                            {/* 2 badge trạng thái độc lập */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <StatusBadge config={returnStatusConfig} />
                                <StatusBadge config={paymentStatusConfig} />
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
                                    {isEditing && !isReturnLocked && (
                                        <>
                                        <label
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151', fontWeight: 600 }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={activeLines.length > 0 && activeLines.every((line) => toNumber(line.returnQty) === lineReturnCap(line))}
                                                onChange={(e) => toggleReturnAll(e.target.checked)}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                            />
                                            Trả toàn bộ
                                        </label>
                                        <button
                                            type="button"
                                            onClick={openProductSearch}
                                            className="btn btn-sm"
                                            style={{ fontSize: '14px', fontWeight: 600 }}
                                        >
                                            <Plus size={16} />
                                            Thêm vật tư
                                        </button>
                                        </>
                                    )}
                                    {canStartReturnBtn && !isEditing && (
                                        <button
                                            type="button"
                                            className="btn btn-sm"
                                            onClick={handleStartReturn}
                                            disabled={submitting}
                                            style={{
                                                fontSize: '14px', fontWeight: 600,
                                                backgroundColor: '#10b981', color: '#fff',
                                                border: 'none',
                                            }}
                                        >
                                            <CheckCheck size={16} />
                                            Bắt đầu trả hàng
                                        </button>
                                    )}
                                </div>
                            </div>

                            {errors.lines && (
                                <div className="error-message" style={{ marginBottom: '16px' }}>
                                    {errors.lines}
                                </div>
                            )}

                            {isEditing && !isReturnLocked && showProductSearch && (
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
                                                width: '100%', padding: '12px 44px 12px 44px',
                                                border: '2px solid #2196F3', borderRadius: '10px',
                                                fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                                                boxShadow: '0 0 0 4px rgba(33, 150, 243, 0.1)',
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={closeProductSearch}
                                            style={{
                                                position: 'absolute', right: '8px', top: '50%',
                                                transform: 'translateY(-50%)', background: 'transparent',
                                                border: 'none', cursor: 'pointer', padding: '4px',
                                                display: 'flex', alignItems: 'center', color: '#6b7280', zIndex: 1,
                                            }}
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '350px', overflowY: 'auto', zIndex: 100 }}>
                                        {filteredProducts.length === 0 ? (
                                            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                                                <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                                                <p style={{ margin: 0, fontSize: '13px' }}>Không tìm thấy vật tư phù hợp</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#f8fafc' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={allFilteredSelected}
                                                            ref={(el) => {
                                                                if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected;
                                                            }}
                                                            onChange={(e) => toggleSelectAllFilteredProducts(e.target.checked)}
                                                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                        />
                                                        Chọn tất cả ({filteredProducts.length})
                                                    </label>
                                                </div>
                                                {filteredProducts.map((product) => {
                                                    const isChecked = selectedSearchProductIds.includes(product.productId);
                                                    return (
                                                        <div
                                                            key={product.grnLineId}
                                                            style={{
                                                                padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
                                                                display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                                                                backgroundColor: isChecked ? '#eff6ff' : 'transparent',
                                                            }}
                                                            onClick={() => toggleSearchProductSelection(product.productId)}
                                                            onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isChecked ? '#eff6ff' : 'transparent'; }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => toggleSearchProductSelection(product.productId)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                                                            />
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
                                                                    <span>•</span>
                                                                    <span>Còn trả: {toNumber(product.maxReturnQty ?? product.receivedQty)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                                                        Đã chọn: {selectedSearchProductIds.length} vật tư
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm"
                                                        onClick={addSelectedProducts}
                                                        disabled={selectedSearchProductIds.length === 0}
                                                        style={{ fontSize: '13px', fontWeight: 600 }}
                                                    >
                                                        Thêm đã chọn
                                                    </button>
                                                </div>
                                            </>
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
                                                <th style={{ width: '110px', textAlign: 'right' }}>SL nhập / còn trả</th>
                                                <th style={{ width: '120px', textAlign: 'center' }}>SL trả</th>
                                                <th style={{ width: '120px', textAlign: 'right' }}>Đơn giá</th>
                                                <th style={{ width: '140px', textAlign: 'right' }}>Thành tiền</th>
                                                {isEditing && !isReturnLocked && <th style={{ width: '50px' }}></th>}
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
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                                            <span style={{ fontWeight: 500, color: '#374151' }}>{line.receivedQty ?? '—'}</span>
                                                            {toNumber(line.qtyCommittedForReturn) > 0 && (
                                                                <span style={{ fontSize: '11px', color: '#d97706' }}>Đang giữ trả: {line.qtyCommittedForReturn}</span>
                                                            )}
                                                            <span style={{ fontSize: '11px', color: '#059669' }}>Tối đa: {lineReturnCap(line)}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {isEditing && !isReturnLocked ? (
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={lineReturnCap(line)}
                                                                    value={line.returnQty}
                                                                    onChange={(e) => updateLineReturnQty(line.lineId, e.target.value)}
                                                                    className="form-input"
                                                                    style={{ textAlign: 'right', width: '60px', padding: '4px 6px', fontSize: '13px' }}
                                                                />
                                                                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>/ {lineReturnCap(line)}</span>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                <div style={{ textAlign: 'right', width: '60px', padding: '4px 6px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                                                                    {line.returnQty ?? '—'}
                                                                </div>
                                                                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>/ {lineReturnCap(line)}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500, color: '#374151', paddingRight: '12px' }}>
                                                        {formatCurrency(line.unitPrice)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#2196F3' }}>
                                                        {formatCurrency(line.totalPrice)}
                                                    </td>
                                                    {isEditing && !isReturnLocked && (
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
                                            <User className="input-icon" size={16} />
                                            <input type="text" value={detailData.createdByName || '—'} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ngày tạo</label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            <input type="text" value={formatDateTime(detailData.createdAt)} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Phiếu nhập tham chiếu</label>
                                        <div className="input-wrapper">
                                            <FileText className="input-icon" size={16} />
                                            <input type="text" value={detailData.relatedGRNCode || '—'} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ngày trả hàng <span className="required-mark">*</span></label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            <input
                                                type={isEditing && !isReturnLocked ? 'date' : 'text'}
                                                name="returnDate"
                                                value={isEditing && !isReturnLocked ? draft.returnDate : formatDate(detailData.returnDate)}
                                                onChange={isEditing && !isReturnLocked ? handleDraftChange : undefined}
                                                min={isEditing && !isReturnLocked ? (detailData.grnReceiptDate || '') : undefined}
                                                readOnly={isReturnLocked || !isEditing}
                                                className={`form-input ${errors.returnDate ? 'error' : ''}`}
                                                style={{ backgroundColor: (isReturnLocked || !isEditing) ? '#f5f5f5' : '#fff' }}
                                            />
                                        </div>
                                        {errors.returnDate && <span className="error-message">{errors.returnDate}</span>}
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Kho trả</label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <input type="text" value={detailData.warehouseName || '—'} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>

                                    

                                    <div className="form-field">
                                        <label className="form-label">Ngày duyệt</label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            <input type="text" value={formatDateTime(detailData.approvedAt)} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Hoàn tiền */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Hoàn tiền</h2>
                                    {!isEditing && !isEditingPayment && canConfirmPaymentBtn && (
                                        <button
                                            type="button"
                                            className="btn btn-sm"
                                            onClick={handleConfirmPayment}
                                            style={{
                                                fontSize: '14px', fontWeight: 600,
                                                backgroundColor: '#10b981', color: '#fff',
                                                border: 'none',
                                            }}
                                        >
                                            <CheckCircle size={16} />
                                            Xác nhận thanh toán
                                        </button>
                                    )}
                                    {isEditingPayment && (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                className="btn btn-sm"
                                                onClick={handleCancelEditPayment}
                                                style={{ fontSize: '14px', fontWeight: 600 }}
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm"
                                                onClick={handleSaveAndConfirmPayment}
                                                style={{
                                                    fontSize: '14px', fontWeight: 600,
                                                    backgroundColor: '#10b981', color: '#fff',
                                                    border: 'none',
                                                }}
                                            >
                                                <CheckCircle size={16} />
                                                Xác nhận
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Trạng thái hoàn tiền</label>
                                    <div className="input-wrapper">
                                        <CreditCard className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={isEditingPayment ? 'Đã nhận hoàn tiền' : currentRefundDisplay}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>

                                {isEditingPayment && !isPaymentLocked && draft.refundReceiveStatus === 'received' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                                        <div className="form-field">
                                            <label className="form-label">Hình thức thanh toán</label>
                                            <div className="input-wrapper">
                                                <CreditCard className="input-icon" size={16} />
                                                <select
                                                    name="refundMethod"
                                                    value={draft.refundMethod}
                                                    onChange={handleDraftChange}
                                                    className="form-input"
                                                    style={{ paddingLeft: '16px' }}
                                                >
                                                    <option value="cash">Tiền mặt</option>
                                                    <option value="bank_transfer">Chuyển khoản</option>
                                                    <option value="card">Thanh toán thẻ</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">Số tiền nhận hoàn</label>
                                            <div className="input-wrapper">
                                                <ReceiptText className="input-icon" size={16} />
                                                <input
                                                    type="text"
                                                    value={formatCurrency(estimatedRefundAmount)}
                                                    readOnly
                                                    className="form-input"
                                                    style={{ backgroundColor: '#f5f5f5', paddingLeft: '40px' }}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">Ngày ghi nhận</label>
                                            <div className="input-wrapper">
                                                <Calendar className="input-icon" size={16} />
                                                <input
                                                    type="date"
                                                    name="refundRecordedDate"
                                                    value={draft.refundRecordedDate}
                                                    onChange={handleDraftChange}
                                                    max={TODAY}
                                                    min={detailData.grnReceiptDate || ''}
                                                    className={`form-input ${errors.refundRecordedDate ? 'error' : ''}`}
                                                    style={{ backgroundColor: '#fff', paddingLeft: '40px' }}
                                                />
                                            </div>
                                            {errors.refundRecordedDate && <span className="error-message">{errors.refundRecordedDate}</span>}
                                        </div>
                                    </div>
                                )}

                                {!isEditingPayment && currentRefundStatus === 'received' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                                        <div className="form-field">
                                            <label className="form-label">Hình thức thanh toán</label>
                                            <div className="input-wrapper">
                                                <CreditCard className="input-icon" size={16} />
                                                <input
                                                    type="text"
                                                    value={
                                                        detailData.refundMethod === 'cash' ? 'Tiền mặt' :
                                                        detailData.refundMethod === 'bank_transfer' ? 'Chuyển khoản' :
                                                        detailData.refundMethod === 'card' ? 'Thanh toán thẻ' : '—'
                                                    }
                                                    readOnly
                                                    className="form-input"
                                                    style={{ backgroundColor: '#f5f5f5' }}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">Số tiền nhận hoàn</label>
                                            <div className="input-wrapper">
                                                <ReceiptText className="input-icon" size={16} />
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
                                                <Calendar className="input-icon" size={16} />
                                                <input
                                                    type="text"
                                                    value={formatDate(detailData.refundRecordedDate)}
                                                    readOnly
                                                    className="form-input"
                                                    style={{ backgroundColor: '#f5f5f5', paddingLeft: '40px' }}
                                                />
                                            </div>
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

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: '#334155' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Building2 size={14} color="#6b7280" />
                                            <span style={{ fontWeight: 600 }}>Tên NCC: </span>
                                            <span>{displaySupplierField(detailData.supplierName)}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <ReceiptText size={14} color="#6b7280" />
                                            <span style={{ fontWeight: 600 }}>Mã NCC: </span>
                                            <span>{displaySupplierField(detailData.supplierCode)}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Phone size={14} color="#6b7280" />
                                            <span style={{ fontWeight: 600 }}>SĐT: </span>
                                            <span>{displaySupplierField(detailData.supplierPhone)}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Mail size={14} color="#6b7280" />
                                            <span style={{ fontWeight: 600 }}>Email: </span>
                                            <span>{displaySupplierField(detailData.supplierEmail)}</span>
                                        </div>
                                        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <ReceiptText size={14} color="#6b7280" />
                                            <span style={{ fontWeight: 600 }}>Mã số thuế: </span>
                                            <span>{displaySupplierField(detailData.supplierTaxCode)}</span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Địa chỉ</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                                        {[
                                            { label: 'Tỉnh/Thành phố', value: detailData.supplierAddressProvince },
                                            { label: 'Quận/Huyện', value: detailData.supplierAddressDistrict },
                                            { label: 'Phường/Xã', value: detailData.supplierAddressWard },
                                            { label: 'Địa chỉ cụ thể', value: detailData.supplierAddressStreet },
                                        ].map(({ label, value }) => (
                                            <div key={label}>
                                                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>{label}</div>
                                                <div style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', minHeight: 32, display: 'flex', alignItems: 'center' }}>
                                                    {displaySupplierField(value)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: 13, color: '#475569' }}>
                                        <span style={{ fontWeight: 600 }}>Địa chỉ gộp: </span>
                                        {[
                                            detailData.supplierAddressStreet,
                                            detailData.supplierAddressWard,
                                            detailData.supplierAddressDistrict,
                                            detailData.supplierAddressProvince,
                                        ]
                                            .map((p) => (p != null && String(p).trim() !== '' ? String(p).trim() : null))
                                            .filter(Boolean)
                                            .join(', ') || '—'}
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
                                        value={isEditing && !isReturnLocked ? draft.reason : (detailData.reason || '—')}
                                        onChange={isEditing && !isReturnLocked ? handleDraftChange : undefined}
                                        readOnly={isReturnLocked || !isEditing}
                                        rows={4}
                                        className={`form-input ${errors.reason ? 'error' : ''}`}
                                        style={{ resize: 'vertical', backgroundColor: (isReturnLocked || !isEditing) ? '#f5f5f5' : '#fff' }}
                                    />
                                    {errors.reason && <span className="error-message">{errors.reason}</span>}
                                    {isEditing && !isReturnLocked && (
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
                                            {!errors.feeAmount && isFeeAmountExceedSubtotal && (
                                                <span className="error-message">Phí xử lí trả hàng không được phép lớn hơn Giá trị hàng trả</span>
                                            )}
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

                        <div />
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
}
