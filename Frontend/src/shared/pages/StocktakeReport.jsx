import React, { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    ArrowLeft,
    Send,
    Download,
    FileText,
    Warehouse,
    Calendar,
    CheckCircle,
    Printer,
    ImageIcon,
    Search,
    X,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import '../styles/CreateSupplier.css';

// Mock data
const MOCK_LINES = [
    { id: 1, itemName: 'Vật tư A', itemCode: 'ITEM-001', uom: 'Cái', systemQty: 150, countedQty: 145, varianceQty: -5 },
    { id: 2, itemName: 'Vật tư B', itemCode: 'ITEM-002', uom: 'Cái', systemQty: 85, countedQty: 90, varianceQty: 5 },
    { id: 3, itemName: 'Vật tư C', itemCode: 'ITEM-003', uom: 'Kg', systemQty: 200, countedQty: 200, varianceQty: 0 },
    { id: 4, itemName: 'Vật tư D', itemCode: 'ITEM-004', uom: 'Thùng', systemQty: 50, countedQty: 48, varianceQty: -2 },
    { id: 5, itemName: 'Vật tư E', itemCode: 'ITEM-005', uom: 'Cái', systemQty: 120, countedQty: 120, varianceQty: 0 },
    { id: 6, itemName: 'Vật tư F', itemCode: 'ITEM-006', uom: 'Cái', systemQty: 75, countedQty: 75, varianceQty: 0 },
    { id: 7, itemName: 'Vật tư G', itemCode: 'ITEM-007', uom: 'Hộp', systemQty: 300, countedQty: 295, varianceQty: -5 },
    { id: 8, itemName: 'Vật tư H', itemCode: 'ITEM-008', uom: 'Kg', systemQty: 180, countedQty: 185, varianceQty: 5 },
    { id: 9, itemName: 'Vật tư I', itemCode: 'ITEM-009', uom: 'Cái', systemQty: 95, countedQty: 95, varianceQty: 0 },
    { id: 10, itemName: 'Vật tư J', itemCode: 'ITEM-010', uom: 'Thùng', systemQty: 45, countedQty: 45, varianceQty: 0 },
    { id: 11, itemName: 'Vật tư K', itemCode: 'ITEM-011', uom: 'Cái', systemQty: 220, countedQty: 218, varianceQty: -2 },
    { id: 12, itemName: 'Vật tư L', itemCode: 'ITEM-012', uom: 'Kg', systemQty: 160, countedQty: 165, varianceQty: 5 },
    { id: 13, itemName: 'Vật tư M', itemCode: 'ITEM-013', uom: 'Hộp', systemQty: 88, countedQty: 88, varianceQty: 0 },
    { id: 14, itemName: 'Vật tư N', itemCode: 'ITEM-014', uom: 'Cái', systemQty: 112, countedQty: 110, varianceQty: -2 },
    { id: 15, itemName: 'Vật tư O', itemCode: 'ITEM-015', uom: 'Thùng', systemQty: 60, countedQty: 60, varianceQty: 0 },
    { id: 16, itemName: 'Vật tư P', itemCode: 'ITEM-016', uom: 'Cái', systemQty: 135, countedQty: 138, varianceQty: 3 },
    { id: 17, itemName: 'Vật tư Q', itemCode: 'ITEM-017', uom: 'Kg', systemQty: 99, countedQty: 99, varianceQty: 0 },
    { id: 18, itemName: 'Vật tư R', itemCode: 'ITEM-018', uom: 'Hộp', systemQty: 250, countedQty: 248, varianceQty: -2 },
    { id: 19, itemName: 'Vật tư S', itemCode: 'ITEM-019', uom: 'Cái', systemQty: 42, countedQty: 42, varianceQty: 0 },
    { id: 20, itemName: 'Vật tư T', itemCode: 'ITEM-020', uom: 'Thùng', systemQty: 78, countedQty: 80, varianceQty: 2 },
];

const StocktakeReport = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();
    const permissionRole = getPermissionRole(getRawRoleFromUser(authService.getUser()));
    const isWarehouseKeeper = permissionRole === 'WAREHOUSE_KEEPER';
    const [submitting, setSubmitting] = useState(false);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);
    const [reportSent, setReportSent] = useState(false);
    const [note, setNote] = useState('');
    const [varianceFilter, setVarianceFilter] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');

    const filteredLines = MOCK_LINES.filter(l => {
        const hasValue = l.countedQty !== null && l.countedQty !== undefined;
        if (varianceFilter === 'negative') return hasValue && l.varianceQty < 0;
        if (varianceFilter === 'positive') return hasValue && l.varianceQty > 0;
        if (varianceFilter === 'sufficient') return hasValue && l.varianceQty === 0;
        return true;
    }).filter(l => {
        if (!searchKeyword.trim()) return true;
        const kw = searchKeyword.toLowerCase();
        return l.itemName?.toLowerCase().includes(kw) || l.itemCode?.toLowerCase().includes(kw);
    }).sort((a, b) => {
        // Sort categories: 1=Thiếu, 2=Thừa, 3=Đủ, 4=Null
        const getSortOrder = (line) => {
            const hasValue = line.countedQty !== null && line.countedQty !== undefined;
            if (!hasValue) return 4;
            const v = line.varianceQty || 0;
            if (v === 0) return 3;
            if (v < 0) return 1;
            return 2;
        };
        const orderA = getSortOrder(a);
        const orderB = getSortOrder(b);
        if (orderA !== orderB) return orderA - orderB;
        const vA = a.varianceQty || 0;
        const vB = b.varianceQty || 0;
        return vA - vB;
    });

    const handleSendReport = async () => {
        try {
            setSubmitting(true);
            await new Promise(resolve => setTimeout(resolve, 1500));
            showToast('Gửi báo cáo thành công!', 'success');
        } catch (error) {
            showToast('Có lỗi xảy ra khi gửi báo cáo', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="create-supplier-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => showToast('Đang in...', 'info')}>
                        <Printer size={15} />
                        In PDF
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => showToast('Đang in...', 'info')}>
                        <Printer size={15} />
                        In A4
                    </button>
                    {isWarehouseKeeper && !reportSent && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setSendDialogOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                height: '42px',
                                padding: '0 20px',
                                fontSize: '14px',
                                fontWeight: 700,
                                borderRadius: '12px',
                                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                            }}
                        >
                            <Send size={16} />
                            Gửi báo cáo
                        </button>
                    )}
                    {isWarehouseKeeper && reportSent && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                height: '42px',
                                padding: '0 20px',
                                fontSize: '14px',
                                fontWeight: 700,
                                borderRadius: '12px',
                                opacity: 0.6,
                                cursor: 'not-allowed',
                            }}
                        >
                            <CheckCircle size={16} />
                            Đã gửi báo cáo
                        </button>
                    )}
                    {!isWarehouseKeeper && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setSendDialogOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                height: '42px',
                                padding: '0 20px',
                                fontSize: '14px',
                                fontWeight: 700,
                                borderRadius: '12px',
                                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                            }}
                        >
                            <CheckCircle size={16} />
                            Xác nhận điều chỉnh tồn kho
                        </button>
                    )}
                </div>
            </div>

            {/* Form Card */}
            <div className="form-card">
                <form className="form-wrapper">
                    {/* Intro */}
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <h1 className="page-title">{reportSent ? 'Báo cáo kiểm kê kho' : (isWarehouseKeeper ? 'Gửi báo cáo kiểm kê kho' : 'Báo cáo kiểm kê kho')}</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    Mã phiếu:{' '}
                                    <span style={{ fontWeight: 600, color: '#2196F3' }}>KK-20240315-001</span>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <div
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: 20,
                                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                        color: '#3b82f6',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    Định kỳ
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
                                    <h2 className="section-title">Danh sách vật tư kiểm kê</h2>
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
                                                <th style={{ width: '100px', textAlign: 'right' }}>SL đã kiểm kê</th>
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
                                                    <td>
                                                        <div style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 500, color: '#374151' }}>
                                                            {line.countedQty ?? '-'}
                                                        </div>
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
                                {isWarehouseKeeper ? (
                                    <div className="form-textarea" style={{ width: '100%', minHeight: '100px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', color: '#374151' }}>
                                        {note || '—'}
                                    </div>
                                ) : (
                                    <div className="form-field" style={{ position: 'relative' }}>
                                        <textarea
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            className="form-textarea"
                                            rows={4}
                                            placeholder="Nhập ghi chú (nếu có)"
                                            style={{ width: '100%', minHeight: '100px' }}
                                        />
                                        <span style={{ position: 'absolute', bottom: '8px', right: '12px', fontSize: '12px', color: '#9ca3af' }}>
                                            {note.length} / 500
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Phải: Thông tin phiếu */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thông tin phiếu kiểm kê</h2>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-field">
                                    <label className="form-label">Mã phiếu</label>
                                    <div className="input-wrapper">
                                        <FileText className="input-icon" size={16} />
                                        <input type="text" value="KK-20240315-001" readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Kho</label>
                                    <div className="input-wrapper">
                                        <Warehouse className="input-icon" size={16} />
                                        <input type="text" value="Kho HCM - WH-HCM" readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Ngày kiểm kê</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input type="text" value="01/04/2026 08:00" readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Nhân viên tạo</label>
                                    <div className="input-wrapper">
                                        <FileText className="input-icon" size={16} />
                                        <input type="text" value="Nguyễn Văn A" readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                {/* Tóm tắt kết quả */}
                                <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '12px', borderLeft: '4px solid #2196F3' }}>
                                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#374151' }}>Kết quả kiểm kê</h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                        <span style={{ color: '#64748b' }}>Tổng vật tư:</span>
                                        <span style={{ fontWeight: 600 }}>20</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                        <span style={{ color: '#64748b' }}>Vật tư thiếu:</span>
                                        <span style={{ fontWeight: 600, color: '#dc2626' }}>6</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                        <span style={{ color: '#64748b' }}>Vật tư thừa:</span>
                                        <span style={{ fontWeight: 600, color: '#2196F3' }}>5</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span style={{ color: '#64748b' }}>Vật tư đủ:</span>
                                        <span style={{ fontWeight: 600, color: '#16a34a' }}>9</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Toast Notification */}
            {/* Confirm Dialog - Xác nhận điều chỉnh tồn kho */}
            <Dialog
                open={sendDialogOpen}
                onClose={() => setSendDialogOpen(false)}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    sx: {
                        width: '100%',
                        maxWidth: '480px',
                        borderRadius: '16px',
                        border: '1px solid var(--slate-200, #e5e7eb)',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                    },
                }}
            >
                <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5, fontSize: '18px', fontWeight: 600 }}>
                    Xác nhận điều chỉnh tồn kho
                </DialogTitle>
                <DialogContent sx={{ px: 3, pb: 2 }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>
                        Xác nhận đủ số lượng và điều chỉnh số lượng tồn kho. Bạn có muốn tiếp tục?
                    </p>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
                    <button
                        type="button"
                        onClick={() => setSendDialogOpen(false)}
                        className="btn btn-cancel"
                        style={{ minWidth: '72px', height: '40px', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={async () => {
                            setSendDialogOpen(false);
                            try {
                                setSubmitting(true);
                                await new Promise(resolve => setTimeout(resolve, 1500));
                                showToast('Xác nhận điều chỉnh số lượng tồn kho thành công!', 'success');
                            } catch (error) {
                                showToast('Có lỗi xảy ra khi xác nhận', 'error');
                            } finally {
                                setSubmitting(false);
                            }
                        }}
                        style={{ minWidth: '110px', height: '40px', borderRadius: '12px', fontSize: '14px', fontWeight: 700 }}
                    >
                        Xác nhận
                    </button>
                </DialogActions>
            </Dialog>

            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={clearToast} />
            )}
        </div>
    );
};

export default StocktakeReport;
