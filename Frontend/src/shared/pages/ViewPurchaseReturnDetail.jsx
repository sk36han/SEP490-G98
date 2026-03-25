/**
 * ViewPurchaseReturnDetail - Chi tiết phiếu trả hàng (read-only)
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    User,
    Calendar,
    FileText,
    MapPin,
    CheckCircle,
    XCircle,
    Clock,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateSupplier.css';

const MOCK_DETAIL = {
    purchaseReturnId: 1,
    returnCode: 'PR-2025-001',
    relatedGRNCode: 'GRN-2025-001',
    supplierId: 101,
    supplierName: 'Công ty TNHH Vật tư ABC',
    supplierPhone: '024.12345678',
    supplierEmail: 'abc@vattu.com',
    supplierTaxCode: '0101234567',
    supplierAddressProvince: 'Hà Nội',
    status: 'PENDING',
    createdByName: 'Nguyễn Văn A',
    createdAt: '2025-01-14T08:00:00',
    returnDate: '2025-01-15',
    warehouseName: 'Kho Hà Nội',
    approvedBy: null,
    approvedAt: null,
    lines: [
        { grnLineId: 1, sku: 'PEN-001', productName: 'Bút bi Thiên Long TL-057', uom: 'Cây', receiveQty: 50, returnQty: 5, unitPrice: 3500, totalPrice: 17500 },
        { grnLineId: 2, sku: 'NOTE-001', productName: 'Vở note 5 chấm A5', uom: 'Quyển', receiveQty: 20, returnQty: 2, unitPrice: 22000, totalPrice: 44000 },
        { grnLineId: 3, sku: 'PAPER-001', productName: 'Giấy A4 Double A 80gsm', uom: 'Ram', receiveQty: 10, returnQty: 1, unitPrice: 62000, totalPrice: 62000 },
    ],
};

const STATUS_CONFIG = {
    PENDING:   { label: 'Chờ duyệt', color: '#f59e0b', bg: '#fef3c7', icon: <Clock size={16} /> },
    APPROVED:  { label: 'Đã duyệt',  color: '#10b981', bg: '#d1fae5', icon: <CheckCircle size={16} /> },
    REJECTED:  { label: 'Từ chối',   color: '#ef4444', bg: '#fee2e2', icon: <XCircle size={16} /> },
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return formatDate(dateStr) + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatCurrency = (val) => {
    if (!val && val !== 0) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

export default function ViewPurchaseReturnDetail() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();

    const data = MOCK_DETAIL;
    const statusClf = STATUS_CONFIG[data.status] || STATUS_CONFIG.PENDING;

    const linesColumns = [
        { label: 'STT', width: '50px', align: 'center' },
        { label: 'Mã vật tư', width: '120px', align: 'left' },
        { label: 'Vật tư', width: 'auto', align: 'left' },
        { label: 'ĐVT', width: '70px', align: 'center' },
        { label: 'SL nhận', width: '90px', align: 'right' },
        { label: 'SL trả', width: '90px', align: 'right' },
        { label: 'Đơn giá', width: '120px', align: 'right' },
        { label: 'Thành tiền', width: '140px', align: 'right' },
    ];

    return (
        <div className="create-supplier-page">
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate('/purchase-returns')} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại danh sách</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 14px',
                        borderRadius: '999px',
                        backgroundColor: statusClf.bg,
                        color: statusClf.color,
                        fontWeight: 600,
                        fontSize: '13px',
                    }}>
                        {statusClf.icon}
                        {statusClf.label}
                    </div>
                </div>
            </div>

            <div className="form-card">
                <div className="form-wrapper">
                    <div className="form-card-intro">
                        <h1 className="page-title">Chi tiết phiếu trả hàng</h1>
                        <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                            Mã phiếu: <strong style={{ color: '#0284c7' }}>{data.returnCode}</strong>
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        {/* Left column */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Danh sách vật tư trả</h2>
                                <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
                                    {data.lines.length} vật tư trong phiếu
                                </span>
                            </div>

                            <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                <table className="product-table">
                                    <thead>
                                        <tr>
                                            {linesColumns.map((col, i) => (
                                                <th key={i} style={{ width: col.width, textAlign: col.align || 'left' }}>
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.lines.map((line, index) => (
                                            <tr key={line.grnLineId}>
                                                <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                <td style={{ fontWeight: 500, color: '#0284c7' }}>{line.sku}</td>
                                                <td style={{ fontWeight: 500 }}>{line.productName}</td>
                                                <td style={{ textAlign: 'center' }}>{line.uom}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{line.receiveQty}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>{line.returnQty}</td>
                                                <td style={{ textAlign: 'right' }}>{formatCurrency(line.unitPrice)}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>{formatCurrency(line.totalPrice)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Tổng cộng */}
                            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', display: 'flex', justifyContent: 'flex-end', gap: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                    <span style={{ fontSize: '14px', color: '#64748b' }}>Tổng số vật tư: <strong>{data.lines.length}</strong></span>
                                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#0284c7' }}>Tổng tiền: {formatCurrency(data.lines.reduce((sum, l) => sum + (l.totalPrice || 0), 0))}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right column */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thông tin chung</h2>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-field">
                                    <label className="form-label">Người tạo</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input type="text" value={data.createdByName} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Ngày tạo</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input type="text" value={formatDateTime(data.createdAt)} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Phiếu nhập kho liên quan</label>
                                    <div className="input-wrapper">
                                        <FileText className="input-icon" size={16} />
                                        <input type="text" value={data.relatedGRNCode} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5', color: '#0284c7', fontWeight: 600 }} />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Ngày trả hàng</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input type="text" value={formatDate(data.returnDate)} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Kho trả hàng</label>
                                    <div className="input-wrapper">
                                        <MapPin className="input-icon" size={16} />
                                        <input type="text" value={data.warehouseName} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                {data.approvedBy && (
                                    <>
                                        <div className="form-field">
                                            <label className="form-label">Người duyệt</label>
                                            <div className="input-wrapper">
                                                <User className="input-icon" size={16} />
                                                <input type="text" value={data.approvedBy} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                            </div>
                                        </div>
                                        {data.approvedAt && (
                                            <div className="form-field">
                                                <label className="form-label">Ngày duyệt</label>
                                                <div className="input-wrapper">
                                                    <Calendar className="input-icon" size={16} />
                                                    <input type="text" value={formatDateTime(data.approvedAt)} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
}
