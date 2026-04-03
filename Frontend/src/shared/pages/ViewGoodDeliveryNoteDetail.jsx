import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    X,
    FileText,
    Printer,
    Package,
    MapPin,
    Truck,
    Phone,
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import Toast from '../../components/Toast/Toast';
import '../styles/CreateSupplier.css';
import '../styles/CreateGoodDeliveryNote.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_NOTE_LENGTH = 1000;
const MAX_TRANSPORT_NOTE_LENGTH = 500;

const GDN_STATUS_META = {
    DRAFT: { label: 'Nháp', bg: 'rgba(107, 114, 128, 0.15)', color: '#4b5563' },
    PENDING: { label: 'Chờ duyệt', bg: 'rgba(251, 191, 36, 0.18)', color: '#b45309' },
    PENDING_ACC: { label: 'Chờ kế toán duyệt', bg: 'rgba(251, 191, 36, 0.18)', color: '#b45309' },
    APPROVED: { label: 'Đã duyệt', bg: 'rgba(16, 185, 129, 0.18)', color: '#047857' },
    POSTED: { label: 'Đã ghi sổ', bg: 'rgba(59, 130, 246, 0.18)', color: '#1d4ed8' },
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

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_GDN = {
    gdnId: 1001,
    gdnCode: 'PXH-2026-0001',
    status: 'POSTED',
    releaseRequestId: 1,
    releaseRequestCode: 'YCX-2026-001',
    warehouseId: 11,
    warehouseName: 'Kho Hà Nội',
    receiverId: 201,
    receiverName: 'Nguyễn Văn Minh',
    receiverPhone: '0901234567',
    receiverEmail: 'minhnv@gmail.com',
    receiverCompanyName: 'Công ty TNHH Thương mại ABC',
    receiverAddress: 'Số 45 Đường Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh',
    requestedByName: 'Trần Thị Lan',
    requestedDate: '2026-02-01',
    expectedDate: '2026-02-15',
    issueDate: '2026-02-12',
    createdByName: 'Nguyễn Văn A',
    note: 'Giao hàng trong giờ hành chính. Liên hệ trước 30 phút trước khi giao.',
    shippingFee: 150000,
    isPaid: true,
    paymentMethod: 'BANK_TRANSFER',
    carrierName: 'Giao Hàng Nhanh (GHN)',
    driverName: 'Trần Văn Bình',
    driverPhone: '0938123456',
    licensePlate: '59A-123.45',
    transportNote: 'Hàng dễ vỡ, cần bọc xốp cẩn thận.',
    lines: [
        {
            itemId: 1,
            itemCode: 'PEN-001',
            itemName: 'Bút bi Thiên Long TL-057',
            uomName: 'Cây',
            requestedQty: 50,
            allocatedQty: 50,
            issuedQty: 0,
            remainingQty: 50,
            actualQty: 50,
            availableQty: 200,
            unitPrice: 3500,
            lineTotal: 175000,
            requiresCertificateCopy: false,
            note: '',
        },
        {
            itemId: 2,
            itemCode: 'NOTE-001',
            itemName: 'Vở note 5 chấm A5',
            uomName: 'Quyển',
            requestedQty: 40,
            allocatedQty: 40,
            issuedQty: 0,
            remainingQty: 40,
            actualQty: 40,
            availableQty: 80,
            unitPrice: 22000,
            lineTotal: 880000,
            requiresCertificateCopy: true,
            note: 'Ưu tiên giao cùng đợt với giấy A4',
        },
        {
            itemId: 3,
            itemCode: 'PAPER-001',
            itemName: 'Giấy A4 Double A 80gsm',
            uomName: 'Ram',
            requestedQty: 30,
            allocatedQty: 30,
            issuedQty: 0,
            remainingQty: 30,
            actualQty: 25,
            availableQty: 60,
            unitPrice: 62000,
            lineTotal: 1550000,
            requiresCertificateCopy: true,
            note: 'Chỉ giao 25 ram, 5 ram còn lại chờ thêm hàng',
        },
    ],
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

const getStatusMeta = (status) =>
    GDN_STATUS_META[String(status || '').toUpperCase()]
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
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const gdn = MOCK_GDN;

    const statusMeta = getStatusMeta(gdn.status);

    const totalDeliveredQty = useMemo(
        () => gdn.lines.reduce((sum, line) => sum + toNumber(line.actualQty), 0),
        [gdn.lines]
    );
    const subtotal = useMemo(
        () => gdn.lines.reduce((sum, line) => sum + toNumber(line.lineTotal), 0),
        [gdn.lines]
    );
    const shippingFee = toNumber(gdn.shippingFee);
    const grandTotal = subtotal + shippingFee;

    const handlePrint = () => {
        showToast('Chức năng in đang được phát triển.', 'info');
    };

    const hasTransport = [gdn.carrierName, gdn.driverName, gdn.driverPhone, gdn.licensePlate].some(
        (v) => v && v.trim()
    );

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
                        onClick={() => navigate(-1)}
                        className="btn btn-cancel"
                    >
                        <X size={15} />
                        Đóng
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handlePrint}
                    >
                        <Printer size={15} />
                        In phiếu
                    </button>

                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate('/goods-delivery-notes/detail/' + gdn.gdnId)}
                    >
                        <FileText size={15} />
                        Chỉnh sửa
                    </button>
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

                                {gdn.receiverName ? (
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
                                            <span>{gdn.receiverName}</span>
                                        </div>
                                        {gdn.receiverPhone && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Phone size={14} color="#6b7280" />
                                                <span>{gdn.receiverPhone}</span>
                                            </div>
                                        )}
                                        {gdn.receiverCompanyName && (
                                            <div>
                                                <span style={{ fontWeight: 600 }}>Công ty: </span>
                                                <span>{gdn.receiverCompanyName}</span>
                                            </div>
                                        )}
                                        {gdn.receiverEmail && (
                                            <div>
                                                <span style={{ fontWeight: 600 }}>Email: </span>
                                                <span>{gdn.receiverEmail}</span>
                                            </div>
                                        )}
                                        {gdn.receiverAddress && (
                                            <div style={{ display: 'flex', alignItems: 'start', gap: '6px' }}>
                                                <MapPin size={14} color="#6b7280" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                <span>{gdn.receiverAddress}</span>
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
                                        {gdn.carrierName && (
                                            <div style={{ fontSize: '14px', color: '#374151' }}>
                                                <span style={{ fontWeight: 600 }}>Hãng vận chuyển: </span>
                                                <span>{gdn.carrierName}</span>
                                            </div>
                                        )}
                                        {gdn.driverName && (
                                            <div style={{ fontSize: '14px', color: '#374151' }}>
                                                <span style={{ fontWeight: 600 }}>Tài xế: </span>
                                                <span>{gdn.driverName}</span>
                                            </div>
                                        )}
                                        {gdn.driverPhone && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#374151' }}>
                                                <Phone size={14} color="#6b7280" />
                                                <span>{gdn.driverPhone}</span>
                                            </div>
                                        )}
                                        {gdn.licensePlate && (
                                            <div style={{ fontSize: '14px', color: '#374151' }}>
                                                <span style={{ fontWeight: 600 }}>Biển số: </span>
                                                <span>{gdn.licensePlate}</span>
                                            </div>
                                        )}
                                        {gdn.transportNote && (
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
                                                {gdn.transportNote}
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
        </div>
    );
}
