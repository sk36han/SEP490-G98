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
    Edit,
    Save,
    X,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateSupplier.css';

// Mock items for product selection
const MOCK_ITEMS = [
    { id: 1, code: 'ITEM-001', name: 'Vật tư A', uom: 'Cái', image: null, systemQty: 150 },
    { id: 2, code: 'ITEM-002', name: 'Vật tư B', uom: 'Cái', image: null, systemQty: 85 },
    { id: 3, code: 'ITEM-003', name: 'Vật tư C', uom: 'Kg', image: null, systemQty: 200 },
    { id: 4, code: 'ITEM-004', name: 'Vật tư D', uom: 'Thùng', image: null, systemQty: 50 },
    { id: 5, code: 'ITEM-005', name: 'Vật tư E', uom: 'Cái', image: null, systemQty: 120 },
];

// Mock data for stocktake detail
const MOCK_STOCKTAKE = {
    id: 1,
    code: 'KK-20240315-001',
    warehouseId: 1,
    warehouseName: 'Kho HCM',
    warehouseCode: 'WH-HCM',
    mode: 'PERIODIC',
    modeLabel: 'Định kỳ',
    plannedAt: '2024-03-20T08:00:00',
    note: 'Kiểm kê định kỳ hàng tháng',
    creatorName: 'Nguyễn Văn A',
    status: 'DRAFT',
    statusLabel: 'Bản nháp',
    createdAt: '2024-03-15T08:00:00',
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
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedLineIds, setSelectedLineIds] = useState([]);

    // Product search state
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState([]);

    // Mock data - trong thực tế sẽ gọi API
    const [stocktakeData, setStocktakeData] = useState(MOCK_STOCKTAKE);

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

    // Edit handlers
    const toggleEdit = () => {
        if (isEditing) {
            // Cancel editing - reset data
            setStocktakeData(MOCK_STOCKTAKE);
        }
        setIsEditing(!isEditing);
        setSelectedLineIds([]);
    };

    const toggleLineSelection = (lineId) => {
        setSelectedLineIds(prev =>
            prev.includes(lineId) ? prev.filter(id => id !== lineId) : [...prev, lineId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLineIds.length === stocktakeData.lines.length) {
            setSelectedLineIds([]);
        } else {
            setSelectedLineIds(stocktakeData.lines.map(l => l.id));
        }
    };

    const removeSelectedLines = () => {
        if (selectedLineIds.length === 0) return;
        const newLines = stocktakeData.lines.filter(line => !selectedLineIds.includes(line.id));
        setStocktakeData(prev => ({ ...prev, lines: newLines }));
        setSelectedLineIds([]);
    };

    // Update line data
    const updateLine = (index, field, value) => {
        setStocktakeData(prev => {
            const newLines = [...prev.lines];
            const updated = { ...newLines[index], [field]: value };

            // Auto calculate variance
            if (field === 'systemQty' || field === 'countedQty') {
                const sysQty = field === 'systemQty' ? parseFloat(value) || 0 : parseFloat(newLines[index].systemQty) || 0;
                const cntQty = field === 'countedQty' ? parseFloat(value) || 0 : parseFloat(newLines[index].countedQty) || 0;
                updated.varianceQty = cntQty - sysQty;
            }

            newLines[index] = updated;
            return { ...prev, lines: newLines };
        });
    };

    // Product search handlers
    const openProductSearch = () => {
        setShowProductSearch(true);
        setSearchKeyword('');
    };

    const closeProductSearch = () => {
        setShowProductSearch(false);
        setSearchKeyword('');
        setSelectedProductIds([]);
    };

    const toggleProductSelection = (productId) => {
        setSelectedProductIds(prev =>
            prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
        );
    };

    const toggleSelectAllProducts = () => {
        if (selectedProductIds.length === MOCK_ITEMS.length) {
            setSelectedProductIds([]);
        } else {
            setSelectedProductIds(MOCK_ITEMS.map(p => p.id));
        }
    };

    const handleAddSelectedProducts = () => {
        if (selectedProductIds.length === 0) {
            showToast('Vui lòng chọn ít nhất 1 vật tư!', 'warning');
            return;
        }

        const productsToAdd = MOCK_ITEMS.filter(p => selectedProductIds.includes(p.id));
        const newLines = [];
        const existingItemIds = stocktakeData.lines.map(l => l.itemId);

        productsToAdd.forEach(product => {
            if (existingItemIds.includes(product.id)) {
                return;
            }
            newLines.push({
                id: Date.now() + Math.random(),
                itemId: product.id,
                itemName: product.name,
                itemCode: product.code,
                itemImage: product.image,
                uom: product.uom,
                systemQty: product.systemQty || 0,
                countedQty: '',
                varianceQty: 0,
            });
        });

        if (newLines.length > 0) {
            setStocktakeData(prev => ({
                ...prev,
                lines: [...prev.lines, ...newLines]
            }));
            showToast(`Đã thêm ${newLines.length} vật tư vào danh sách`, 'success');
        }

        setSelectedProductIds([]);
        setShowProductSearch(false);
        setSearchKeyword('');
    };

    // Save changes
    const handleSave = async () => {
        try {
            setSubmitting(true);
            // API call would go here
            await new Promise(resolve => setTimeout(resolve, 1000));
            showToast('Lưu thay đổi thành công!', 'success');
            setIsEditing(false);
            setSelectedLineIds([]);
        } catch (error) {
            showToast('Có lỗi xảy ra khi lưu', 'error');
        } finally {
            setSubmitting(false);
        }
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
                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!isEditing && stocktakeData.status === 'DRAFT' && (
                        <button type="button" className="btn btn-secondary" onClick={toggleEdit}>
                            <Edit size={15} />
                            Chỉnh sửa
                        </button>
                    )}
                    {isEditing && (
                        <>
                            <button type="button" className="btn btn-cancel" onClick={toggleEdit} disabled={submitting}>
                                <X size={15} />
                                Hủy
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }}></span>
                                        Đang lưu...
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
                                    {isEditing && (
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            {selectedLineIds.length > 0 && (
                                                <button type="button" onClick={removeSelectedLines} className="btn btn-sm" style={{ fontWeight: 600, backgroundColor: '#ef4444', color: 'white', border: 'none' }}>
                                                    <Trash2 size={16} />
                                                    Xóa ({selectedLineIds.length})
                                                </button>
                                            )}
                                            <button type="button" onClick={openProductSearch} className="btn btn-sm" style={{ fontSize: '14px', fontWeight: 600 }}>
                                                <Plus size={16} />
                                                Thêm vật tư
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Search bar for editing */}
                                {isEditing && showProductSearch && (
                                    <div style={{ marginBottom: '16px', animation: 'slideDown 0.3s ease-out', position: 'relative' }}>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 1 }} />
                                            <input
                                                type="text"
                                                value={searchKeyword}
                                                onChange={(e) => setSearchKeyword(e.target.value)}
                                                placeholder="Tìm kiếm theo tên vật tư..."
                                                autoFocus
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 44px 12px 44px',
                                                    border: '2px solid #2196F3',
                                                    borderRadius: '10px',
                                                    fontSize: '14px',
                                                    outline: 'none',
                                                    boxSizing: 'border-box',
                                                }}
                                            />
                                            <button type="button" onClick={closeProductSearch} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: '#6b7280', zIndex: 1 }}>
                                                <X size={20} />
                                            </button>
                                        </div>

                                        {/* Dropdown Results with Checkbox */}
                                        {showProductSearch && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', maxHeight: '400px', overflowY: 'auto', zIndex: 100 }}>
                                                <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb', fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>{MOCK_ITEMS.length} vật tư</span>
                                                    {selectedProductIds.length > 0 && (
                                                        <span style={{ color: '#2196F3', fontWeight: 600 }}>Đã chọn: {selectedProductIds.length}</span>
                                                    )}
                                                </div>
                                                <div style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                                                        <input type="checkbox" checked={selectedProductIds.length === MOCK_ITEMS.length} onChange={toggleSelectAllProducts} style={{ cursor: 'pointer' }} />
                                                        Chọn tất cả
                                                    </label>
                                                </div>
                                                {MOCK_ITEMS.map(item => {
                                                    const isChecked = selectedProductIds.includes(item.id);
                                                    return (
                                                        <div key={item.id} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <input type="checkbox" checked={isChecked} onChange={() => toggleProductSelection(item.id)} style={{ cursor: 'pointer', flexShrink: 0 }} />
                                                            {isValidImageUrl(item.image) ? (
                                                                <img src={item.image} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                                                            ) : (
                                                                <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                    <ImageIcon size={20} color="#9ca3af" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div style={{ fontWeight: 500, color: '#111827', fontSize: '14px' }}>{item.name}</div>
                                                                <div style={{ fontSize: 12, color: '#6b7280' }}>Mã: {item.code} - ĐVT: {item.uom}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {selectedProductIds.length > 0 && (
                                                    <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                                        <button type="button" onClick={handleAddSelectedProducts} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                                                            Thêm {selectedProductIds.length} sản phẩm
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

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
                                                    {isEditing && <th style={{ width: '60px' }}></th>}
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
                                                        {isEditing && (
                                                            <td style={{ textAlign: 'center' }}>
                                                                <input type="checkbox" checked={selectedLineIds.includes(line.id)} onChange={() => toggleLineSelection(line.id)} style={{ cursor: 'pointer' }} />
                                                            </td>
                                                        )}
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
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                        <a
                                                                            href="#"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                navigate(`/items/${line.itemId}`);
                                                                            }}
                                                                            style={{
                                                                                color: '#2196F3',
                                                                                textDecoration: 'none',
                                                                                fontSize: 14,
                                                                                fontWeight: 500,
                                                                                flex: 1,
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.target.style.textDecoration = 'underline';
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.target.style.textDecoration = 'none';
                                                                            }}
                                                                        >
                                                                            {line.itemName}
                                                                        </a>
                                                                    </div>
                                                                    <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
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
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    value={line.countedQty ?? ''}
                                                                    onChange={(e) => updateLine(index, 'countedQty', e.target.value)}
                                                                    className="form-input"
                                                                    style={{ textAlign: 'right', fontSize: '13px', width: '100%' }}
                                                                    placeholder="0"
                                                                />
                                                            ) : (
                                                                <div style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 500, color: '#374151' }}>
                                                                    {line.countedQty || 0}
                                                                </div>
                                                            )}
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
                                    {isEditing ? (
                                        <textarea
                                            value={stocktakeData.note || ''}
                                            onChange={(e) => setStocktakeData(prev => ({ ...prev, note: e.target.value }))}
                                            className="form-textarea"
                                            rows={4}
                                            placeholder="Nhập ghi chú (nếu có)"
                                            style={{ width: '100%', minHeight: '100px' }}
                                        />
                                    ) : (
                                        <div className="form-textarea" style={{ width: '100%', minHeight: '100px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', color: '#374151' }}>
                                            {stocktakeData.note || '—'}
                                        </div>
                                    )}
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
                                {/* Ngày giờ tạo */}
                                <div className="form-field">
                                    <label className="form-label">Ngày giờ tạo</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input type="text" value={stocktakeData.createdAt ? new Date(stocktakeData.createdAt).toLocaleString('vi-VN') : ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
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

                                {/* Ngày giờ dự kiến */}
                                <div className="form-field">
                                    <label className="form-label">Ngày giờ dự kiến kiểm kê</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        {isEditing ? (
                                            <input
                                                type="datetime-local"
                                                value={stocktakeData.plannedAt ? stocktakeData.plannedAt.slice(0, 16) : ''}
                                                onChange={(e) => setStocktakeData(prev => ({ ...prev, plannedAt: e.target.value }))}
                                                className="form-input"
                                            />
                                        ) : (
                                            <input type="text" value={stocktakeData.plannedAt ? new Date(stocktakeData.plannedAt).toLocaleString('vi-VN') : ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        )}
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
