import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Package,
    ImageIcon,
    User,
    Warehouse,
    Calendar,
    CheckCircle,
    Clock,
    XCircle,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateSupplier.css';

// Mock data for stocktake detail
const MOCK_STOCKTAKE = {
    id: 1,
    code: 'KK-20240315-001',
    warehouseId: 1,
    warehouseName: 'Kho HCM',
    warehouseCode: 'WH-HCM',
    mode: 'PERIODIC',
    modeLabel: 'Định kỳ',
    plannedAt: '2024-03-20',
    note: 'Kiểm kê định kỳ hàng tháng',
    creatorName: 'Nguyễn Văn A',
    status: 'DRAFT',
    statusLabel: 'Bản nháp',
    createdAt: '2024-03-15',
    lines: [
        { id: 1, itemId: 1, itemName: 'Vật tư A', itemCode: 'ITEM-001', uom: 'Cái', systemQty: 150, countedQty: 145, varianceQty: -5 },
        { id: 2, itemId: 2, itemName: 'Vật tư B', itemCode: 'ITEM-002', uom: 'Cái', systemQty: 85, countedQty: 85, varianceQty: 0 },
        { id: 3, itemId: 3, itemName: 'Vật tư C', itemCode: 'ITEM-003', uom: 'Kg', systemQty: 200, countedQty: 210, varianceQty: 10 },
        { id: 4, itemId: 4, itemName: 'Vật tư D', itemCode: 'ITEM-004', uom: 'Thùng', systemQty: 50, countedQty: 48, varianceQty: -2 },
        { id: 5, itemId: 5, itemName: 'Vật tư E', itemCode: 'ITEM-005', uom: 'Cái', systemQty: 120, countedQty: 120, varianceQty: 0 },
        { id: 6, itemId: 6, itemName: 'Vật tư F', itemCode: 'ITEM-006', uom: 'Cái', systemQty: 75, countedQty: 75, varianceQty: 0 },
        { id: 7, itemId: 7, itemName: 'Vật tư G', itemCode: 'ITEM-007', uom: 'Hộp', systemQty: 300, countedQty: 295, varianceQty: -5 },
        { id: 8, itemId: 8, itemName: 'Vật tư H', itemCode: 'ITEM-008', uom: 'Kg', systemQty: 180, countedQty: 180, varianceQty: 0 },
        { id: 9, itemId: 9, itemName: 'Vật tư I', itemCode: 'ITEM-009', uom: 'Cái', systemQty: 95, countedQty: 100, varianceQty: 5 },
        { id: 10, itemId: 10, itemName: 'Vật tư J', itemCode: 'ITEM-010', uom: 'Thùng', systemQty: 45, countedQty: 45, varianceQty: 0 },
        { id: 11, itemId: 11, itemName: 'Vật tư K', itemCode: 'ITEM-011', uom: 'Cái', systemQty: 220, countedQty: 215, varianceQty: -5 },
        { id: 12, itemId: 12, itemName: 'Vật tư L', itemCode: 'ITEM-012', uom: 'Kg', systemQty: 160, countedQty: 170, varianceQty: 10 },
        { id: 13, itemId: 13, itemName: 'Vật tư M', itemCode: 'ITEM-013', uom: 'Hộp', systemQty: 88, countedQty: 88, varianceQty: 0 },
        { id: 14, itemId: 14, itemName: 'Vật tư N', itemCode: 'ITEM-014', uom: 'Cái', systemQty: 112, countedQty: 110, varianceQty: -2 },
        { id: 15, itemId: 15, itemName: 'Vật tư O', itemCode: 'ITEM-015', uom: 'Thùng', systemQty: 60, countedQty: 60, varianceQty: 0 },
        { id: 16, itemId: 16, itemName: 'Vật tư P', itemCode: 'ITEM-016', uom: 'Cái', systemQty: 135, countedQty: 140, varianceQty: 5 },
        { id: 17, itemId: 17, itemName: 'Vật tư Q', itemCode: 'ITEM-017', uom: 'Kg', systemQty: 99, countedQty: 99, varianceQty: 0 },
        { id: 18, itemId: 18, itemName: 'Vật tư R', itemCode: 'ITEM-018', uom: 'Hộp', systemQty: 250, countedQty: 245, varianceQty: -5 },
        { id: 19, itemId: 19, itemName: 'Vật tư S', itemCode: 'ITEM-019', uom: 'Cái', systemQty: 42, countedQty: 42, varianceQty: 0 },
        { id: 20, itemId: 20, itemName: 'Vật tư T', itemCode: 'ITEM-020', uom: 'Thùng', systemQty: 78, countedQty: 80, varianceQty: 2 },
    ]
};

const STATUS_MAP = {
    'DRAFT': { label: 'Bản nháp', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.2)' },
    'IN_PROGRESS': { label: 'Đang thực hiện', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.2)' },
    'PENDING_APPROVAL': { label: 'Chờ duyệt', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.2)' },
    'APPROVED': { label: 'Đã duyệt', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.2)' },
    'COMPLETED': { label: 'Hoàn thành', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.2)' },
    'CANCELLED': { label: 'Đã hủy', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.2)' },
};

const MODE_MAP = {
    'PERIODIC': { label: 'Định kỳ', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.2)' },
    'ADHOC': { label: 'Đột xuất', color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.2)' },
};

const ViewStocktakeDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();
    const [loading] = useState(false);

    // Mock data - trong thực tế sẽ gọi API
    const [stocktakeData] = useState(MOCK_STOCKTAKE);

    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    // Calculate summary
    const summary = useMemo(() => {
        if (!stocktakeData.lines || stocktakeData.lines.length === 0) {
            return { totalItems: 0, totalSystemQty: 0, totalCountedQty: 0, totalVariance: 0 };
        }

        const totalSystemQty = stocktakeData.lines.reduce((sum, line) => sum + (line.systemQty || 0), 0);
        const totalCountedQty = stocktakeData.lines.reduce((sum, line) => sum + (line.countedQty || 0), 0);
        const totalVariance = stocktakeData.lines.reduce((sum, line) => sum + (line.varianceQty || 0), 0);

        return {
            totalItems: stocktakeData.lines.length,
            totalSystemQty,
            totalCountedQty,
            totalVariance
        };
    }, [stocktakeData.lines]);

    if (loading) {
        return (
            <div className="create-supplier-page">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <div style={{ fontSize: '16px', color: '#6b7280' }}>Đang tải dữ liệu...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="create-supplier-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={handleCancel} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions">
                </div>
            </div>

            {/* Form Card */}
            <div className="form-card">
                <form className="form-wrapper">
                    {/* Intro */}
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <h1 className="page-title">Chi tiết phiếu kiểm kê kho</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    Mã phiếu:{' '}
                                    <span style={{ fontWeight: 600, color: '#2196F3' }}>{stocktakeData.code}</span>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {stocktakeData.mode && MODE_MAP[stocktakeData.mode] && (
                                    <div
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: 20,
                                            backgroundColor: MODE_MAP[stocktakeData.mode].bgColor,
                                            color: MODE_MAP[stocktakeData.mode].color,
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        {MODE_MAP[stocktakeData.mode].label}
                                    </div>
                                )}
                                {stocktakeData.status && STATUS_MAP[stocktakeData.status] && (
                                    <div
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: 20,
                                            backgroundColor: STATUS_MAP[stocktakeData.status].bgColor,
                                            color: STATUS_MAP[stocktakeData.status].color,
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        {stocktakeData.status === 'COMPLETED' && <CheckCircle size={16} />}
                                        {stocktakeData.status === 'CANCELLED' && <XCircle size={16} />}
                                        {(stocktakeData.status === 'DRAFT' || stocktakeData.status === 'PENDING_APPROVAL' || stocktakeData.status === 'IN_PROGRESS') && <Clock size={16} />}
                                        {STATUS_MAP[stocktakeData.status].label}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Layout 2 cột: Line items (trái) + Thông tin chung (phải) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'flex-start' }}>
                        {/* Trái: Danh sách vật tư + Ghi chú + Tổng kết */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* 1. Danh sách vật tư */}
                            <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Danh sách vật tư kiểm kê</h2>
                                </div>

                                {/* Empty state */}
                                {stocktakeData.lines && stocktakeData.lines.length === 0 && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '60px 20px', color: '#9ca3af' }}>
                                        <Package size={64} strokeWidth={1.5} />
                                        <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Chưa có vật tư nào</p>
                                    </div>
                                )}

                                {/* Lines table */}
                                {stocktakeData.lines && stocktakeData.lines.length > 0 && (
                                    <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                        <table className="product-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                    <th style={{ textAlign: 'left' }}>Vật tư</th>
                                                    <th style={{ width: '100px', textAlign: 'right' }}>SL hệ thống</th>
                                                    <th style={{ width: '100px', textAlign: 'right' }}>SL đã kiểm kê</th>
                                                    <th style={{ width: '80px', textAlign: 'right' }}>Chênh lệch</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stocktakeData.lines.map((line, index) => (
                                                    <tr key={line.id}>
                                                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                                {isValidImageUrl(line.itemImage) ? (
                                                                    <img src={line.itemImage} alt={line.itemName} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                                                                ) : (
                                                                    <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                        <ImageIcon size={20} color="#9ca3af" />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div style={{ fontWeight: 500, color: '#111827', fontSize: '14px' }}>{line.itemName}</div>
                                                                    <div style={{ fontWeight: 500, fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                                                        Mã: {line.itemCode} • ĐVT: {line.uom}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 500, color: '#374151' }}>
                                                                {line.systemQty || 0}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 500, color: '#374151' }}>
                                                                {line.countedQty || 0}
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600, color: line.varianceQty > 0 ? '#2196F3' : line.varianceQty < 0 ? '#dc2626' : '#16a34a' }}>
                                                            {line.varianceQty || 0}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* 2. Ghi chú */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div className="form-field">
                                    <div className="form-textarea" style={{ width: '100%', minHeight: '100px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', color: '#374151' }}>
                                        {stocktakeData.note || '—'}
                                    </div>
                                </div>
                            </div>

                            {/* 3. Tổng kết */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng kết phiếu kiểm kê kho</h2>
                                </div>
                                <div style={{ padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '12px', borderLeft: '4px solid #2196F3' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Tổng số vật tư:</span>
                                        <span style={{ fontWeight: 600 }}>{summary.totalItems}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Tổng số lượng hệ thống:</span>
                                        <span style={{ fontWeight: 600 }}>{summary.totalSystemQty}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>Tổng số lượng kiểm kê:</span>
                                        <span style={{ fontWeight: 600 }}>{summary.totalCountedQty}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #d1d5db' }}>
                                        <span style={{ fontSize: '18px', fontWeight: 700, color: summary.totalVariance > 0 ? '#2196F3' : summary.totalVariance < 0 ? '#dc2626' : '#16a34a' }}>
                                            Tổng chênh lệch:
                                        </span>
                                        <span style={{ fontSize: '24px', fontWeight: 700, color: summary.totalVariance > 0 ? '#2196F3' : summary.totalVariance < 0 ? '#dc2626' : '#16a34a' }}>
                                            {summary.totalVariance > 0 ? '+' : ''}{summary.totalVariance}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Phải: Thông tin chung */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thông tin chung</h2>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Ngày tạo */}
                                <div className="form-field">
                                    <label className="form-label">Ngày tạo</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input type="text" value={stocktakeData.createdAt || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                {/* Nhân viên tạo */}
                                <div className="form-field">
                                    <label className="form-label">Nhân viên tạo</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input type="text" value={stocktakeData.creatorName || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                {/* Kho */}
                                <div className="form-field">
                                    <label className="form-label">Kho</label>
                                    <div className="input-wrapper">
                                        <Warehouse className="input-icon" size={16} />
                                        <input type="text" value={stocktakeData.warehouseName || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                {/* Ngày dự kiến */}
                                <div className="form-field">
                                    <label className="form-label">Ngày dự kiến kiểm kê</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input type="text" value={stocktakeData.plannedAt || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Toast Notification */}
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={clearToast} />
            )}
        </div>
    );
};

export default ViewStocktakeDetail;
