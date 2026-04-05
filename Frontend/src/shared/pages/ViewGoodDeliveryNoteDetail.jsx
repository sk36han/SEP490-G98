import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getGoodsDeliveryNoteDetail, approveGoodsDeliveryNote } from '../lib/goodsDeliveryNoteService';
import authService from '../lib/authService';
import { getPermissionRole } from '../permissions/roleUtils';
import {
    ArrowLeft,
    X,
    FileText,
    Printer,
    Package,
    MapPin,
    Truck,
    Phone,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import Toast from '../../components/Toast/Toast';
import '../styles/CreateSupplier.css';
import '../styles/CreateGoodDeliveryNote.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_NOTE_LENGTH = 1000;
const MAX_TRANSPORT_NOTE_LENGTH = 500;

const STATUS_META = {
    DRAFT: { label: 'Nháp', bg: 'rgba(107, 114, 128, 0.15)', color: '#4b5563' },
    PENDING_ACC: { label: 'Chờ kế toán duyệt', bg: 'rgba(251, 191, 36, 0.18)', color: '#b45309' },
    PENDING_DIR: { label: 'Chờ giám đốc duyệt', bg: 'rgba(251, 191, 36, 0.18)', color: '#b45309' },
    PENDING_ISSUE: { label: 'Chờ xuất hàng', bg: 'rgba(14, 165, 233, 0.18)', color: '#0369a1' },
    ISSUED: { label: 'Đã xuất hàng', bg: 'rgba(139, 92, 246, 0.18)', color: '#6d28d9' },
    POSTED: { label: 'Đã ghi sổ', bg: 'rgba(59, 130, 246, 0.18)', color: '#1d4ed8' },
    APPROVED: { label: 'Đã duyệt', bg: 'rgba(16, 185, 129, 0.18)', color: '#047857' },
    REJECTED: { label: 'Từ chối', bg: 'rgba(239, 68, 68, 0.18)', color: '#b91c1c' },
    CANCELLED: { label: 'Đã hủy', bg: 'rgba(239, 68, 68, 0.18)', color: '#b91c1c' },
};

const PAYMENT_METHOD_LABEL = {
    CASH: 'Tiền mặt',
    BANK_TRANSFER: 'Chuyển khoản',
    CARD: 'Thẻ thanh toán',
    E_WALLET: 'Ví điện tử',
    OTHER: 'Khác',
};


// ─── Helpers ─────────────────────────────────────────────────────────────────
const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(toNumber(value));

const formatQuantity = (value) =>
    toNumber(value).toLocaleString('vi-VN', { maximumFractionDigits: 3 });

// ─── Normalize backend camelCase → frontend camelCase ─────────────────────────
const normalize = (d) => {
    if (!d) return null;
    const lines = (d.lines || []).map(l => ({
        itemId: l.itemId,
        itemCode: l.itemCode,
        itemName: l.itemName,
        requestedQty: l.requestedQty,
        actualQty: l.actualQty,
        uomId: l.uomId,
        uomName: l.uomName,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
        requiresCertificateCopy: l.requiresCertificateCopy,
        releaseRequestLineId: l.releaseRequestLineId,
        lotId: l.lotId,
        note: l.note,
        stockQty: l.stockQty,
        approvedQty: l.approvedQty,
        previouslyDeliveredQty: l.previouslyDeliveredQty,
        remainingQty: l.remainingQty,
    }));

    const receiver = d.receiver ? {
        receiverId: d.receiver.receiverId,
        receiverName: d.receiver.receiverName,
        phone: d.receiver.phone,
        email: d.receiver.email,
        companyId: d.receiver.companyId,
        companyName: d.receiver.companyName,
        notes: d.receiver.notes,
        address: d.receiver.address,
        city: d.receiver.city,
        district: d.receiver.district,
        ward: d.receiver.ward,
    } : null;

    const transportInfo = d.transportInfo ? {
        transportId: d.transportInfo.transportId,
        carrierName: d.transportInfo.carrierName,
        driverName: d.transportInfo.driverName,
        driverPhone: d.transportInfo.driverPhone,
        licensePlate: d.transportInfo.licensePlate,
        note: d.transportInfo.note,
    } : null;

    const approvals = (d.approvals || []).map(a => ({
        approvalId: a.approvalId,
        stageNo: a.stageNo,
        decision: a.decision,
        reason: a.reason,
        actionBy: a.actionBy,
        actionByName: a.actionByName,
        actionAt: a.actionAt,
    }));

    return {
        gdnId: d.gdnId,
        gdnCode: d.gdnCode,
        issueDate: d.issueDate,
        status: d.status,
        isPaid: d.isPaid,
        paymentMethod: d.paymentMethod,
        releaseRequestId: d.releaseRequestId,
        releaseRequestCode: d.releaseRequestCode,
        warehouseId: d.warehouseId,
        warehouseName: d.warehouseName,
        createdBy: d.createdBy,
        createdByName: d.createdByName,
        totalDeliveredQty: d.totalDeliveredQty,
        totalDeliveredAmount: d.totalDeliveredAmount,
        shippingFee: d.shippingFee,
        netAmount: d.netAmount,
        submittedAt: d.submittedAt,
        approvedAt: d.approvedAt,
        postedAt: d.postedAt,
        note: d.note,
        requesterName: d.requesterName,
        requestDate: d.requestDate,
        expectedDate: d.expectedDate,
        lines,
        receiver,
        transportInfo,
        approvals,
    };
};

const getStatusMeta = (status) =>
    STATUS_META[String(status || '').toUpperCase()]
    ?? { label: status || '-', bg: 'rgba(107, 114, 128, 0.15)', color: '#4b5563' };

// ─── Sub-components ───────────────────────────────────────────────────────────
const ReadOnlyField = ({ label, value, spanFull = false }) => (
    <div className="form-field">
        <label className="form-label">{label}</label>
        <div className="input-wrapper">
            <div
                style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb',
                    fontSize: '14px',
                    color: '#374151',
                    minHeight: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    whiteSpace: value && value.length > 40 ? 'normal' : 'nowrap',
                    overflow: 'hidden',
                    textOverflow: value && value.length > 40 ? 'ellipsis' : 'clip',
                }}
            >
            </div>
        </div>
    </div>
);

const ReadOnlyFieldValue = ({ label, value, highlight = false, children }) => (
    <div className="form-field">
        <label className="form-label">{label}</label>
        <div className="input-wrapper">
            {children || (
                <div
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: highlight ? '1px solid #0284c7' : '1px solid #e5e7eb',
                        backgroundColor: highlight ? '#f0f9ff' : '#f9fafb',
                        fontSize: '14px',
                        color: highlight ? '#0284c7' : '#374151',
                        fontWeight: highlight ? 600 : 400,
                        minHeight: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        wordBreak: 'break-word',
                    }}
                >
                    {value || '—'}
                </div>
            )}
        </div>
    </div>
);

const ReadOnlyTextarea = ({ label, value, maxLength }) => {
    const hasValue = value && value.trim().length > 0;
    return (
        <div className="form-field">
            <label className="form-label">{label}</label>
            <div
                style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb',
                    fontSize: '14px',
                    color: '#374151',
                    minHeight: hasValue ? 'auto' : '80px',
                    whiteSpace: hasValue ? 'pre-wrap' : 'nowrap',
                    overflow: 'hidden',
                    textOverflow: hasValue ? 'clip' : 'ellipsis',
                    display: 'flex',
                    alignItems: hasValue ? 'flex-start' : 'center',
                    lineHeight: '1.5',
                    fontStyle: hasValue ? 'normal' : 'italic',
                    cursor: hasValue ? 'text' : 'default',
                }}
            >
                {hasValue ? value : 'Không có ghi chú'}
            </div>
            {hasValue && maxLength && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '12px', color: '#6b7280', marginTop: '4px', fontWeight: 500 }}>
                    {value.length}/{maxLength} ký tự
                </div>
            )}
        </div>
    );
};

const DetailCard = ({ title, children }) => (
    <div className="info-section" style={{ margin: 0 }}>
        <div className="section-header-with-toggle">
            <h2 className="section-title">{title}</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {children}
        </div>
    </div>
);

const SummaryRow = ({ label, value, isPositive = false, isTotal = false }) => (
    <div
        style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: isTotal ? '16px' : '14px',
            marginBottom: isTotal ? '0' : '8px',
        }}
    >
        <span
            style={{
                color: isTotal ? '#1f2937' : '#475569',
                fontWeight: isTotal ? 700 : 600,
            }}
        >
            {label}
        </span>
        <span
            style={{
                color: isPositive ? '#10b981' : isTotal ? '#0284c7' : '#64748b',
                fontWeight: isTotal ? 700 : 600,
                fontSize: isTotal ? '18px' : '14px',
            }}
        >
            {value}
        </span>
    </div>
);

const SummaryCard = ({ title, value }) => (
    <div
        style={{
            padding: '12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
        }}
    >
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>
            {title}
        </div>
        <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>{value}</div>
    </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function ViewGoodDeliveryNoteDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();

    const [gdn, setGdn] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [approveReason, setApproveReason] = useState('');
    const [processing, setProcessing] = useState(false);

    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(userInfo?.roleCode);

    const canApproveStage1 = gdn?.status === 'PENDING_ACC' && permissionRole === 'ACCOUNTANTS';
    const canApproveStage2 = gdn?.status === 'PENDING_DIR' && permissionRole === 'DIRECTOR';
    const canAct = canApproveStage1 || canApproveStage2;

    const handleApprove = async () => {
        setProcessing(true);
        try {
            await approveGoodsDeliveryNote(gdn.gdnId, {
                IsApproved: true,
                Reason: approveReason.trim() || null,
            });
            showToast('Duyệt phiếu xuất kho thành công.', 'success');
            setApproveDialogOpen(false);
            setApproveReason('');
            fetchData();
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Không duyệt được phiếu xuất kho.';
            showToast(msg, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        setProcessing(true);
        try {
            await approveGoodsDeliveryNote(gdn.gdnId, {
                IsApproved: false,
                Reason: approveReason.trim() || null,
            });
            showToast('Đã từ chối phiếu xuất kho.', 'success');
            setRejectDialogOpen(false);
            setApproveReason('');
            fetchData();
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Không thể từ chối phiếu xuất kho.';
            showToast(msg, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getGoodsDeliveryNoteDetail(id);
            setGdn(normalize(data));
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Không tải được chi tiết phiếu xuất hàng';
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }, [id, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Derived values (hooks phải gọi trước mọi early return) ──────────────
    const statusMeta = getStatusMeta(gdn?.status);
    const gdnLines = useMemo(() => gdn?.lines || [], [gdn?.lines]);

    const totalDeliveredQty = useMemo(
        () => gdnLines.reduce((sum, line) => sum + toNumber(line.actualQty), 0),
        [gdnLines]
    );
    const subtotal = useMemo(
        () => gdnLines.reduce((sum, line) => sum + toNumber(line.lineTotal), 0),
        [gdnLines]
    );
    const shippingFee = toNumber(gdn?.shippingFee);
    const grandTotal = subtotal + shippingFee;

    const handlePrint = () => {
        showToast('Chức năng in đang được phát triển.', 'info');
    };

    const ti = gdn?.transportInfo || {};
    const gdnReceiver = gdn?.receiver || {};
    const hasTransport = [ti.carrierName, ti.driverName, ti.driverPhone, ti.licensePlate].some(
        (v) => v && v.trim()
    );

    // ── Early returns (sau hooks) ─────────────────────────────────────────────
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>⟳</div>
                    <div>Đang tải dữ liệu...</div>
                </div>
            </div>
        );
    }

    if (error || !gdn) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ color: '#b91c1c', marginBottom: 16 }}>{error || 'Không tìm thấy dữ liệu'}</div>
                <button onClick={() => navigate(-1)}>← Quay lại</button>
            </div>
        );
    }

    return (
        <div className="create-supplier-page">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handlePrint}
                    >
                        <Printer size={15} />
                        In phiếu
                    </button>

                    {canAct && (
                        <>
                            <button
                                type="button"
                                className="btn btn-danger"
                                disabled={processing}
                                onClick={() => setRejectDialogOpen(true)}
                            >
                                <XCircle size={15} />
                                Từ chối
                            </button>
                            <button
                                type="button"
                                className="btn btn-success"
                                disabled={processing}
                                onClick={() => setApproveDialogOpen(true)}
                            >
                                <CheckCircle size={15} />
                                Duyệt
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="form-card">
                <div className="form-wrapper">
                    {/* Form Intro */}
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <h1 className="page-title">Chi tiết phiếu xuất hàng</h1>
                            <span
                                style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    padding: '3px 12px',
                                    borderRadius: '9999px',
                                    backgroundColor: statusMeta.bg,
                                    color: statusMeta.color,
                                    border: `1px solid ${statusMeta.color}30`,
                                }}
                            >
                                {statusMeta.label}
                            </span>
                        </div>
                        <p className="form-card-required-note">
                            Mã phiếu: <strong style={{ color: '#0284c7', fontSize: '15px' }}>{gdn.gdnCode}</strong>
                            &nbsp;&bull;&nbsp; Ngày xuất: <strong>{gdn.issueDate}</strong>
                            &nbsp;&bull;&nbsp; Kho: <strong>{gdn.warehouseName}</strong>
                        </p>
                    </div>

                    {/* Main Grid */}
                    <div className="gdn-create-main-grid" style={{ height: '760px' }}>
                        {/* LEFT: Product lines */}
                        <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '760px' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết vật tư xuất</h2>
                            </div>

                            {!gdn.lines || gdn.lines.length === 0 ? (
                                <div
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '60px 20px',
                                        color: '#9ca3af',
                                        textAlign: 'center',
                                    }}
                                >
                                    <Package size={64} strokeWidth={1.5} />
                                    <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>
                                        Chưa có vật tư trong phiếu xuất
                                    </p>
                                </div>
                            ) : (
                                <div className="table-container" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                <th style={{ minWidth: '260px' }}>Vật tư</th>
                                                <th style={{ width: '80px', textAlign: 'right' }}>SL YC</th>
                                                <th style={{ width: '80px', textAlign: 'right' }}>Đã cấp</th>
                                                <th style={{ width: '80px', textAlign: 'right' }}>Đã xuất</th>
                                                <th style={{ width: '80px', textAlign: 'right' }}>Còn xuất</th>
                                                <th style={{ width: '100px', textAlign: 'right' }}>SL thực xuất</th>
                                                <th style={{ width: '120px', textAlign: 'right' }}>Đơn giá</th>
                                                <th style={{ width: '130px', textAlign: 'right' }}>Thành tiền</th>
                                                <th style={{ width: '80px', textAlign: 'center' }}>Bản sao CC</th>
                                                <th style={{ width: '160px' }}>Ghi chú dòng</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {gdn.lines.map((line, index) => (
                                                <tr key={line.itemId || index}>
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                            <div
                                                                style={{
                                                                    width: '40px',
                                                                    height: '40px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #e5e7eb',
                                                                    backgroundColor: '#f3f4f6',
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                <Package size={20} color="#9ca3af" />
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                                                <span style={{ fontSize: 14, fontWeight: 500, color: '#0284c7' }}>
                                                                    {line.itemName}
                                                                </span>
                                                                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                                                    Mã: {line.itemCode || '-'} • DVT: {line.uomName || '-'}
                                                                </span>
                                                                <span style={{ fontSize: 12, color: '#6b7280' }}>
                                                                    Tồn: {formatQuantity(line.availableQty)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                        {formatQuantity(line.requestedQty)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                        {formatQuantity(line.allocatedQty)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                        {formatQuantity(line.issuedQty)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>
                                                        {formatQuantity(line.remainingQty)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>
                                                        {formatQuantity(line.actualQty)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                        {formatCurrency(line.unitPrice)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>
                                                        {formatCurrency(line.lineTotal)}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {line.requiresCertificateCopy ? (
                                                            <span
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    width: '20px',
                                                                    height: '20px',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                                                    color: '#dc2626',
                                                                    fontSize: '12px',
                                                                    fontWeight: 700,
                                                                }}
                                                                title="Yêu cầu bản sao chứng chỉ"
                                                            >
                                                                ✓
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {line.note ? (
                                                            <span
                                                                style={{
                                                                    fontSize: '13px',
                                                                    color: '#6b7280',
                                                                    display: 'block',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    maxWidth: '150px',
                                                                }}
                                                                title={line.note}
                                                            >
                                                                {line.note}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#d1d5db', fontSize: '13px' }}>—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Info panels */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '760px', overflowY: 'auto' }}>
                            {/* General Info */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Thông tin chung</h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* Mã phiếu xuất - nổi bật */}
                                    <div className="form-field">
                                        <label className="form-label">Mã phiếu xuất</label>
                                        <div
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: '2px solid #0284c7',
                                                backgroundColor: '#f0f9ff',
                                                fontSize: '15px',
                                                fontWeight: 700,
                                                color: '#0284c7',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                            }}
                                        >
                                            <FileText size={16} />
                                            {gdn.gdnCode}
                                        </div>
                                    </div>

                                    {/* Yêu cầu xuất tham chiếu */}
                                    <div className="form-field">
                                        <label className="form-label">Yêu cầu xuất tham chiếu</label>
                                        <div
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #e5e7eb',
                                                backgroundColor: '#f0fdf4',
                                                fontSize: '14px',
                                                color: '#15803d',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            {gdn.releaseRequestCode}
                                            <span
                                                style={{
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    padding: '1px 6px',
                                                    borderRadius: '9999px',
                                                    backgroundColor: statusMeta.bg,
                                                    color: statusMeta.color,
                                                    marginLeft: '4px',
                                                }}
                                            >
                                                {statusMeta.label}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Người tạo</label>
                                        <div className="input-wrapper">
                                            <div
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e7eb',
                                                    backgroundColor: '#f9fafb',
                                                    fontSize: '14px',
                                                    color: '#374151',
                                                    minHeight: '36px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {gdn.createdByName}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ngày xuất hàng</label>
                                        <div className="input-wrapper">
                                            <div
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e7eb',
                                                    backgroundColor: '#f9fafb',
                                                    fontSize: '14px',
                                                    color: '#374151',
                                                    minHeight: '36px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {gdn.issueDate}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Kho xuất</label>
                                        <div className="input-wrapper">
                                            <div
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e7eb',
                                                    backgroundColor: '#f9fafb',
                                                    fontSize: '14px',
                                                    color: '#374151',
                                                    minHeight: '36px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {gdn.warehouseName}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Người yêu cầu</label>
                                        <div className="input-wrapper">
                                            <div
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e7eb',
                                                    backgroundColor: '#f9fafb',
                                                    fontSize: '14px',
                                                    color: '#374151',
                                                    minHeight: '36px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {gdn.requestedByName}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ngày yêu cầu</label>
                                        <div className="input-wrapper">
                                            <div
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e7eb',
                                                    backgroundColor: '#f9fafb',
                                                    fontSize: '14px',
                                                    color: '#374151',
                                                    minHeight: '36px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {gdn.requestedDate || '—'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ngày dự kiến</label>
                                        <div className="input-wrapper">
                                            <div
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e7eb',
                                                    backgroundColor: '#f9fafb',
                                                    fontSize: '14px',
                                                    color: '#374151',
                                                    minHeight: '36px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {gdn.expectedDate || '—'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Receiver Info */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Người nhận hàng</h2>
                                </div>

                                {gdnReceiver.receiverName ? (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px',
                                            fontSize: '14px',
                                            color: '#334155',
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontWeight: 600 }}>Tên: </span>
                                            <span>{gdnReceiver.receiverName}</span>
                                        </div>
                                        {gdnReceiver.phone && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Phone size={14} color="#6b7280" />
                                                <span>{gdnReceiver.phone}</span>
                                            </div>
                                        )}
                                        {gdnReceiver.companyName && (
                                            <div>
                                                <span style={{ fontWeight: 600 }}>Công ty: </span>
                                                <span>{gdnReceiver.companyName}</span>
                                            </div>
                                        )}
                                        {gdnReceiver.email && (
                                            <div>
                                                <span style={{ fontWeight: 600 }}>Email: </span>
                                                <span>{gdnReceiver.email}</span>
                                            </div>
                                        )}
                                        {gdnReceiver.address && (
                                            <div style={{ display: 'flex', alignItems: 'start', gap: '6px' }}>
                                                <MapPin size={14} color="#6b7280" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                <span>{gdnReceiver.address}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ color: '#9ca3af', fontSize: '14px', fontStyle: 'italic' }}>
                                        Không có thông tin người nhận
                                    </div>
                                )}
                            </div>

                            {/* Transport Info */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <Truck size={16} style={{ marginRight: '6px' }} />
                                        Vận chuyển
                                    </h2>
                                </div>

                                {hasTransport ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {ti.carrierName && (
                                            <div style={{ fontSize: '14px', color: '#374151' }}>
                                                <span style={{ fontWeight: 600 }}>Hãng vận chuyển: </span>
                                                <span>{ti.carrierName}</span>
                                            </div>
                                        )}
                                        {ti.driverName && (
                                            <div style={{ fontSize: '14px', color: '#374151' }}>
                                                <span style={{ fontWeight: 600 }}>Tài xế: </span>
                                                <span>{ti.driverName}</span>
                                            </div>
                                        )}
                                        {ti.driverPhone && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#374151' }}>
                                                <Phone size={14} color="#6b7280" />
                                                <span>{ti.driverPhone}</span>
                                            </div>
                                        )}
                                        {ti.licensePlate && (
                                            <div style={{ fontSize: '14px', color: '#374151' }}>
                                                <span style={{ fontWeight: 600 }}>Biển số: </span>
                                                <span>{ti.licensePlate}</span>
                                            </div>
                                        )}
                                        {ti.note && (
                                            <div
                                                style={{
                                                    padding: '8px 10px',
                                                    backgroundColor: '#f9fafb',
                                                    borderRadius: '6px',
                                                    border: '1px solid #e5e7eb',
                                                    fontSize: '13px',
                                                    color: '#6b7280',
                                                    fontStyle: 'italic',
                                                    lineHeight: '1.5',
                                                }}
                                            >
                                                <span style={{ fontWeight: 600, fontStyle: 'normal' }}>Ghi chú: </span>
                                                {ti.note}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ color: '#9ca3af', fontSize: '14px', fontStyle: 'italic' }}>
                                        Chưa có thông tin vận chuyển
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="gdn-create-bottom-grid">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
                            {/* Note */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú phiếu xuất</h2>
                                </div>
                                <div
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                        backgroundColor: '#f9fafb',
                                        fontSize: '14px',
                                        color: '#374151',
                                        minHeight: '80px',
                                        whiteSpace: gdn.note ? 'pre-wrap' : 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: gdn.note ? 'clip' : 'ellipsis',
                                        display: 'flex',
                                        alignItems: gdn.note ? 'flex-start' : 'center',
                                        lineHeight: '1.6',
                                        fontStyle: gdn.note ? 'normal' : 'italic',
                                    }}
                                >
                                    {gdn.note || 'Không có ghi chú'}
                                </div>
                                {gdn.note && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '12px', color: '#6b7280', marginTop: '4px', fontWeight: 500 }}>
                                        {gdn.note.length}/{MAX_NOTE_LENGTH} ký tự
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng hợp phiếu xuất</h2>
                                </div>
                                <div className="gdn-summary-cards">
                                    <SummaryCard title="Tổng số lượng xuất" value={`${totalDeliveredQty} sản phẩm`} />
                                    <SummaryCard title="Số dòng vật tư" value={`${gdn.lines.length} dòng`} />
                                </div>

                                <div style={{ marginTop: '16px' }}>
                                    <div
                                        style={{
                                            padding: '14px',
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '10px',
                                        }}
                                    >
                                        <SummaryRow label="Tổng tiền hàng" value={formatCurrency(subtotal)} isPositive />
                                        <SummaryRow label="Phí vận chuyển" value={`+ ${formatCurrency(shippingFee)}`} />
                                    </div>

                                    <div
                                        style={{
                                            padding: '16px',
                                            backgroundColor: '#e0f2fe',
                                            borderRadius: '12px',
                                            borderLeft: '4px solid #0284c7',
                                            marginTop: '12px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#0284c7' }}>
                                            Tổng tiền
                                        </span>
                                        <span style={{ fontSize: '22px', fontWeight: 700, color: '#0284c7' }}>
                                            {formatCurrency(grandTotal)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thanh toán</h2>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Trạng thái thanh toán */}
                                <div className="form-field">
                                    <label className="form-label">Trạng thái</label>
                                    <div className="input-wrapper">
                                        <div
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: `1px solid ${gdn.isPaid ? '#10b981' : '#f59e0b'}`,
                                                backgroundColor: gdn.isPaid ? '#f0fdf4' : '#fffbeb',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                color: gdn.isPaid ? '#15803d' : '#b45309',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    backgroundColor: gdn.isPaid ? '#10b981' : '#f59e0b',
                                                    flexShrink: 0,
                                                }}
                                            />
                                            {gdn.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                        </div>
                                    </div>
                                </div>

                                {gdn.isPaid && gdn.paymentMethod && (
                                    <div className="form-field">
                                        <label className="form-label">Phương thức thanh toán</label>
                                        <div className="input-wrapper">
                                            <div
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e7eb',
                                                    backgroundColor: '#f9fafb',
                                                    fontSize: '14px',
                                                    color: '#374151',
                                                    minHeight: '36px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {PAYMENT_METHOD_LABEL[gdn.paymentMethod] || gdn.paymentMethod}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="form-field">
                                    <label className="form-label">Phí vận chuyển</label>
                                    <div className="input-wrapper">
                                        <div
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #e5e7eb',
                                                backgroundColor: '#f9fafb',
                                                fontSize: '14px',
                                                color: '#374151',
                                                fontWeight: 500,
                                                minHeight: '36px',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            {formatCurrency(shippingFee)}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        padding: '14px',
                                        backgroundColor: '#f0fdf4',
                                        border: '1px solid #bbf7d0',
                                        borderRadius: '10px',
                                    }}
                                >
                                    <SummaryRow label="Tiền hàng" value={formatCurrency(subtotal)} isPositive />
                                    <SummaryRow label="Phí vận chuyển" value={`+ ${formatCurrency(shippingFee)}`} />
                                </div>

                                <div
                                    style={{
                                        padding: '16px',
                                        backgroundColor: '#dcfce7',
                                        borderRadius: '12px',
                                        borderLeft: '4px solid #16a34a',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#15803d' }}>
                                        Thành tiền
                                    </span>
                                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#15803d' }}>
                                        {formatCurrency(grandTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

            {/* Dialog: Duyệt */}
            <Dialog open={approveDialogOpen} onClose={() => !processing && setApproveDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600, fontSize: '16px' }}>
                    Duyệt phiếu xuất kho
                </DialogTitle>
                <DialogContent>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                        Bạn có chắc chắn muốn duyệt phiếu xuất hàng <strong>{gdn?.gdnCode}</strong> không?
                    </div>
                    <div className="form-field">
                        <label className="form-label">Lý do (không bắt buộc)</label>
                        <textarea
                            className="form-input"
                            rows={3}
                            value={approveReason}
                            onChange={(e) => setApproveReason(e.target.value)}
                            placeholder="Nhập lý do duyệt (nếu có)..."
                        />
                    </div>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <button type="button" onClick={() => setApproveDialogOpen(false)} className="btn btn-cancel" disabled={processing}>Hủy</button>
                    <button type="button" onClick={handleApprove} className="btn btn-success" disabled={processing}>
                        {processing ? 'Đang xử lý...' : 'Duyệt'}
                    </button>
                </DialogActions>
            </Dialog>

            {/* Dialog: Từ chối */}
            <Dialog open={rejectDialogOpen} onClose={() => !processing && setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600, fontSize: '16px', color: '#b91c1c' }}>
                    Từ chối phiếu xuất kho
                </DialogTitle>
                <DialogContent>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                        Bạn có chắc chắn muốn từ chối phiếu xuất hàng <strong>{gdn?.gdnCode}</strong> không?
                    </div>
                    <div className="form-field">
                        <label className="form-label">Lý do từ chối</label>
                        <textarea
                            className="form-input"
                            rows={3}
                            value={approveReason}
                            onChange={(e) => setApproveReason(e.target.value)}
                            placeholder="Nhập lý do từ chối..."
                        />
                    </div>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <button type="button" onClick={() => setRejectDialogOpen(false)} className="btn btn-cancel" disabled={processing}>Hủy</button>
                    <button type="button" onClick={handleReject} className="btn btn-danger" disabled={processing}>
                        {processing ? 'Đang xử lý...' : 'Từ chối'}
                    </button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
