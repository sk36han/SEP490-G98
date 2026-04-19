import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    FileText,
    Warehouse,
    Calendar,
    User,
    Printer,
    Search,
    X,
    ImageIcon,
    CheckCircle,
    XCircle,
    Clock,
    Send,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import authService from '../lib/authService';
import { formatDateTime } from '../lib/dateUtils';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import { fetchInventoryAdjustmentDetail } from '../lib/inventoryAdjustmentService';
import '../styles/CreateSupplier.css';

const STATUS_CONFIG = {
    DRAFT: {
        bgColor: 'rgba(107, 114, 128, 0.2)',
        label: 'Nháp',
        color: '#374151',
        Icon: FileText,
    },
    PENDING_DIR: {
        bgColor: 'rgba(251, 191, 36, 0.2)',
        label: 'Chờ duyệt',
        color: '#d97706',
        Icon: Clock,
    },
    APPROVED: {
        bgColor: 'rgba(16, 185, 129, 0.2)',
        label: 'Đã duyệt',
        color: '#059669',
        Icon: CheckCircle,
    },
    POSTED: {
        bgColor: 'rgba(16, 185, 129, 0.2)',
        label: 'Đã ghi sổ',
        color: '#059669',
        Icon: CheckCircle,
    },
    REJECTED: {
        bgColor: 'rgba(239, 68, 68, 0.2)',
        label: 'Từ chối',
        color: '#dc2626',
        Icon: XCircle,
    },
};

const ViewInventoryAdjustmentDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();
    const [adjustment, setAdjustment] = useState(null);
    const [lines, setLines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [varianceFilter, setVarianceFilter] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!id) {
                setError('Thiếu mã phiếu');
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const { adjustment: adj, lines: rawLines } = await fetchInventoryAdjustmentDetail(id);
                if (cancelled) return;
                setAdjustment(adj);
                setLines(Array.isArray(rawLines) ? rawLines : []);
            } catch (e) {
                if (!cancelled) {
                    const msg =
                        e?.response?.data?.message ||
                        e?.response?.data?.Message ||
                        e?.message ||
                        'Không tải được chi tiết phiếu điều chỉnh';
                    setError(typeof msg === 'string' ? msg : 'Không tải được chi tiết phiếu điều chỉnh');
                    setAdjustment(null);
                    setLines([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id]);

    // Permission: Only Director can approve/reject
    const permissionRole = getPermissionRole(getRawRoleFromUser(authService.getUser()));
    const canApprove = permissionRole === 'DIRECTOR';
    const showApprovalActions = canApprove && adjustment?.status === 'PENDING_DIR';

    const statusConfig = adjustment ? (STATUS_CONFIG[adjustment.status] || STATUS_CONFIG.DRAFT) : STATUS_CONFIG.DRAFT;
    const StatusIcon = statusConfig.Icon;

    const filteredLines = useMemo(() => lines.filter(l => {
        if (varianceFilter === 'negative') return l.varianceQty < 0;
        if (varianceFilter === 'positive') return l.varianceQty > 0;
        if (varianceFilter === 'sufficient') return l.varianceQty === 0;
        return true;
    }).filter(l => {
        if (!searchKeyword.trim()) return true;
        const kw = searchKeyword.toLowerCase();
        return l.itemName?.toLowerCase().includes(kw) || l.itemCode?.toLowerCase().includes(kw);
    }).sort((a, b) => {
        const getSortOrder = (line) => {
            const v = line.varianceQty || 0;
            if (v === 0) return 3;
            if (v < 0) return 1;
            return 2;
        };
        const orderA = getSortOrder(a);
        const orderB = getSortOrder(b);
        if (orderA !== orderB) return orderA - orderB;
        return a.varianceQty - b.varianceQty;
    }), [lines, varianceFilter, searchKeyword]);

    const formatDate = (dateStr) => formatDateTime(dateStr);

    const totalLines = lines.length;
    const negativeLines = lines.filter(l => l.varianceQty < 0).length;
    const positiveLines = lines.filter(l => l.varianceQty > 0).length;
    const sufficientLines = lines.filter(l => l.varianceQty === 0).length;

    if (loading) {
        return (
            <div className="create-supplier-page">
                <div className="page-header">
                    <div className="page-header-left">
                        <button type="button" onClick={() => navigate('/inventory/adjustments')} className="back-button">
                            <ArrowLeft size={20} />
                            <span>Quay lại</span>
                        </button>
                    </div>
                </div>
                <div style={{ padding: '48px 16px', textAlign: 'center', color: '#6b7280' }}>Đang tải chi tiết phiếu…</div>
            </div>
        );
    }

    if (error || !adjustment) {
        return (
            <div className="create-supplier-page">
                <div className="page-header">
                    <div className="page-header-left">
                        <button type="button" onClick={() => navigate('/inventory/adjustments')} className="back-button">
                            <ArrowLeft size={20} />
                            <span>Quay lại</span>
                        </button>
                    </div>
                </div>
                <div style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>{error || 'Không tìm thấy phiếu'}</div>
            </div>
        );
    }

    const note = adjustment.reason || adjustment.note || '';
    const warehouseLabel = adjustment.warehouseCode
        ? `${adjustment.warehouseName} - ${adjustment.warehouseCode}`
        : (adjustment.warehouseName || '—');

    return (
        <div className="create-supplier-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate('/inventory/adjustments')} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {showApprovalActions && (
                        <>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => showToast('Đã duyệt điều chỉnh tồn kho', 'success')}
                                style={{ backgroundColor: '#16a34a', boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)' }}
                            >
                                <CheckCircle size={15} />
                                Duyệt
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => showToast('Đã từ chối điều chỉnh tồn kho', 'warning')}
                                style={{ color: '#dc2626', borderColor: '#dc2626' }}
                            >
                                <XCircle size={15} />
                                Từ chối
                            </button>
                        </>
                    )}
                    <button type="button" className="btn btn-secondary" onClick={() => showToast('Đang in...', 'info')}>
                        <Printer size={15} />
                        In PDF
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => showToast('Đang in...', 'info')}>
                        <Printer size={15} />
                        In A4
                    </button>
                </div>
            </div>

            {/* Form Card */}
            <div className="form-card">
                <form className="form-wrapper">
                    {/* Intro */}
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <h1 className="page-title">Chi tiết điều chỉnh tồn kho</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    Mã điều chỉnh:{' '}
                                    <span style={{ fontWeight: 600, color: '#2196F3' }}>{adjustment.adjustmentCode}</span>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: 20,
                                        backgroundColor: statusConfig.bgColor,
                                        color: statusConfig.color,
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    <StatusIcon size={14} />
                                    {statusConfig.label}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Layout 2 cột */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'flex-start' }}>
                        {/* Trái: Danh sách vật tư + Ghi chú */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Danh sách vật tư */}
                            <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Danh sách vật tư điều chỉnh</h2>
                                </div>

                                {/* Search + Filter */}
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                                    <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                                        <input
                                            type="text"
                                            value={searchKeyword}
                                            onChange={(e) => setSearchKeyword(e.target.value)}
                                            placeholder="Tìm vật tư theo tên, mã..."
                                            className="form-input line-search-input"
                                        />
                                        {searchKeyword && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchKeyword('')}
                                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: '#9ca3af' }}
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {[
                                            { value: 'all', label: 'Tất cả' },
                                            { value: 'negative', label: 'Thiếu' },
                                            { value: 'positive', label: 'Thừa' },
                                            { value: 'sufficient', label: 'Đủ' },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setVarianceFilter(opt.value)}
                                                className={`variance-chip ${varianceFilter === opt.value ? 'active' : ''}`}
                                                data-variance={opt.value}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                <th style={{ textAlign: 'left' }}>Vật tư</th>
                                                <th style={{ width: '100px', textAlign: 'right' }}>SL hệ thống</th>
                                                <th style={{ width: '120px', textAlign: 'right' }}>SL điều chỉnh</th>
                                                <th style={{ width: '120px', textAlign: 'right' }}>Chênh lệch</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredLines.map((line, index) => (
                                                <tr key={line.id}>
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                            <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                <ImageIcon size={20} color="#9ca3af" />
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{line.itemName}</span>
                                                                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                                                    Mã: {line.itemCode} • ĐVT: {line.uom}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 500, color: '#374151' }}>
                                                            {line.systemQty}
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: line.adjustmentQty < 0 ? '#dc2626' : line.adjustmentQty > 0 ? '#2196F3' : '#374151' }}>
                                                        {line.adjustmentQty === 0 ? '—' : line.adjustmentQty > 0 ? `+${line.adjustmentQty}` : line.adjustmentQty}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: line.varianceQty < 0 ? '#dc2626' : line.varianceQty > 0 ? '#2196F3' : '#16a34a' }}>
                                                        {line.varianceQty < 0 ? `Thiếu ${Math.abs(line.varianceQty)}` : line.varianceQty > 0 ? `Thừa ${line.varianceQty}` : 'Đủ'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Ghi chú */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div style={{ width: '100%', minHeight: '100px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', color: '#374151' }}>
                                    {note || '—'}
                                </div>
                            </div>
                        </div>

                        {/* Phải: Thông tin phiếu */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thông tin điều chỉnh tồn kho</h2>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                

                                <div className="form-field">
                                    <label className="form-label">Mã kiểm kê tham chiếu</label>
                                    <div className="input-wrapper">
                                        <FileText className="input-icon" size={16} />
                                        <input type="text" value={adjustment.stocktakeCode || '—'} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Kho</label>
                                    <div className="input-wrapper">
                                        <Warehouse className="input-icon" size={16} />
                                        <input type="text" value={warehouseLabel} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Người đề xuất</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input type="text" value={adjustment.submittedByName} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Ngày tạo</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input type="text" value={formatDate(adjustment.submittedAt)} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                {adjustment.approvedAt && (
                                    <div className="form-field">
                                        <label className="form-label">Ngày duyệt</label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            <input type="text" value={formatDate(adjustment.approvedAt)} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>
                                )}

                                {adjustment.postedAt && (
                                    <div className="form-field">
                                        <label className="form-label">Ngày kiểm kê</label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            <input type="text" value={formatDate(adjustment.postedAt)} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>
                                )}

                                
                                {/* Tóm tắt kết quả */}
                                <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '12px', borderLeft: '4px solid #2196F3' }}>
                                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#374151' }}>Tóm tắt điều chỉnh</h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                        <span style={{ color: '#64748b' }}>Tổng vật tư:</span>
                                        <span style={{ fontWeight: 600 }}>{totalLines}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                        <span style={{ color: '#64748b' }}>Vật tư thiếu:</span>
                                        <span style={{ fontWeight: 600, color: '#dc2626' }}>{negativeLines}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                        <span style={{ color: '#64748b' }}>Vật tư thừa:</span>
                                        <span style={{ fontWeight: 600, color: '#2196F3' }}>{positiveLines}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span style={{ color: '#64748b' }}>Vật tư đủ:</span>
                                        <span style={{ fontWeight: 600, color: '#16a34a' }}>{sufficientLines}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={clearToast} />
            )}
        </div>
    );
};

export default ViewInventoryAdjustmentDetail;
