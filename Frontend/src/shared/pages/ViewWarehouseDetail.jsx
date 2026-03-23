import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    CircularProgress,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    ArrowLeft,
    Warehouse as WarehouseIcon,
    MapPin,
    Calendar,
    User,
    Package,
    ImageIcon,
    Search,
    X,
    Phone,
    Mail,
    Building2,
    Edit,
    Save,
} from 'lucide-react';
import { getWarehouseDetail } from '../lib/warehouseService';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateSupplier.css';

// Mock data for items in warehouse
const MOCK_WAREHOUSE_ITEMS = [
    { id: 1, itemId: 1, itemName: 'Vật tư A', itemCode: 'ITEM-001', uom: 'Cái', categoryName: 'Vật tư điện', brandName: 'Brand A', systemQty: 150, onHandQty: 145, reservedQty: 10, qcdg: 50 },
    { id: 2, itemId: 2, itemName: 'Vật tư B', itemCode: 'ITEM-002', uom: 'Cái', categoryName: 'Vật tư cơ khí', brandName: 'Brand B', systemQty: 85, onHandQty: 90, reservedQty: 5, qcdg: 30 },
    { id: 3, itemId: 3, itemName: 'Vật tư C', itemCode: 'ITEM-003', uom: 'Kg', categoryName: 'Vật tư xây dựng', brandName: 'Brand C', systemQty: 200, onHandQty: 200, reservedQty: 0, qcdg: 20 },
    { id: 4, itemId: 4, itemName: 'Vật tư D', itemCode: 'ITEM-004', uom: 'Thùng', categoryName: 'Vật tư điện', brandName: 'Brand D', systemQty: 50, onHandQty: 48, reservedQty: 2, qcdg: 15 },
    { id: 5, itemId: 5, itemName: 'Vật tư E', itemCode: 'ITEM-005', uom: 'Cái', categoryName: 'Vật tư cơ khí', brandName: 'Brand E', systemQty: 120, onHandQty: 120, reservedQty: 0, qcdg: 40 },
    { id: 6, itemId: 6, itemName: 'Vật tư F', itemCode: 'ITEM-006', uom: 'Cái', categoryName: 'Vật tư xây dựng', brandName: 'Brand F', systemQty: 75, onHandQty: 75, reservedQty: 0, qcdg: 25 },
    { id: 7, itemId: 7, itemName: 'Vật tư G', itemCode: 'ITEM-007', uom: 'Hộp', categoryName: 'Vật tư điện', brandName: 'Brand G', systemQty: 300, onHandQty: 295, reservedQty: 8, qcdg: 100 },
    { id: 8, itemId: 8, itemName: 'Vật tư H', itemCode: 'ITEM-008', uom: 'Kg', categoryName: 'Vật tư cơ khí', brandName: 'Brand H', systemQty: 180, onHandQty: 185, reservedQty: 0, qcdg: 60 },
    { id: 9, itemId: 9, itemName: 'Vật tư I', itemCode: 'ITEM-009', uom: 'Cái', categoryName: 'Vật tư xây dựng', brandName: 'Brand I', systemQty: 95, onHandQty: 95, reservedQty: 0, qcdg: 30 },
    { id: 10, itemId: 10, itemName: 'Vật tư J', itemCode: 'ITEM-010', uom: 'Thùng', categoryName: 'Vật tư điện', brandName: 'Brand J', systemQty: 45, onHandQty: 45, reservedQty: 3, qcdg: 10 },
    { id: 11, itemId: 11, itemName: 'Vật tư K', itemCode: 'ITEM-011', uom: 'Cái', categoryName: 'Vật tư cơ khí', brandName: 'Brand K', systemQty: 220, onHandQty: 218, reservedQty: 5, qcdg: 80 },
    { id: 12, itemId: 12, itemName: 'Vật tư L', itemCode: 'ITEM-012', uom: 'Kg', categoryName: 'Vật tư xây dựng', brandName: 'Brand L', systemQty: 160, onHandQty: 165, reservedQty: 0, qcdg: 50 },
    { id: 13, itemId: 13, itemName: 'Vật tư M', itemCode: 'ITEM-013', uom: 'Hộp', categoryName: 'Vật tư điện', brandName: 'Brand M', systemQty: 88, onHandQty: 88, reservedQty: 0, qcdg: 30 },
    { id: 14, itemId: 14, itemName: 'Vật tư N', itemCode: 'ITEM-014', uom: 'Cái', categoryName: 'Vật tư cơ khí', brandName: 'Brand N', systemQty: 112, onHandQty: 110, reservedQty: 4, qcdg: 35 },
    { id: 15, itemId: 15, itemName: 'Vật tư O', itemCode: 'ITEM-015', uom: 'Thùng', categoryName: 'Vật tư xây dựng', brandName: 'Brand O', systemQty: 60, onHandQty: 60, reservedQty: 0, qcdg: 20 },
    { id: 16, itemId: 16, itemName: 'Vật tư P', itemCode: 'ITEM-016', uom: 'Cái', categoryName: 'Vật tư điện', brandName: 'Brand P', systemQty: 135, onHandQty: 138, reservedQty: 2, qcdg: 45 },
    { id: 17, itemId: 17, itemName: 'Vật tư Q', itemCode: 'ITEM-017', uom: 'Kg', categoryName: 'Vật tư cơ khí', brandName: 'Brand Q', systemQty: 99, onHandQty: 99, reservedQty: 0, qcdg: 30 },
    { id: 18, itemId: 18, itemName: 'Vật tư R', itemCode: 'ITEM-018', uom: 'Hộp', categoryName: 'Vật tư xây dựng', brandName: 'Brand R', systemQty: 250, onHandQty: 248, reservedQty: 6, qcdg: 80 },
    { id: 19, itemId: 19, itemName: 'Vật tư S', itemCode: 'ITEM-019', uom: 'Cái', categoryName: 'Vật tư điện', brandName: 'Brand S', systemQty: 42, onHandQty: 42, reservedQty: 0, qcdg: 15 },
    { id: 20, itemId: 20, itemName: 'Vật tư T', itemCode: 'ITEM-020', uom: 'Thùng', categoryName: 'Vật tư cơ khí', brandName: 'Brand T', systemQty: 78, onHandQty: 80, reservedQty: 1, qcdg: 25 },
    { id: 4, itemId: 4, itemName: 'Vật tư D', itemCode: 'ITEM-004', uom: 'Thùng', categoryName: 'Vật tư điện', brandName: 'Brand D', systemQty: 50, onHandQty: 48, reservedQty: 2 },
    { id: 5, itemId: 5, itemName: 'Vật tư E', itemCode: 'ITEM-005', uom: 'Cái', categoryName: 'Vật tư cơ khí', brandName: 'Brand E', systemQty: 120, onHandQty: 120, reservedQty: 0 },
    { id: 6, itemId: 6, itemName: 'Vật tư F', itemCode: 'ITEM-006', uom: 'Cái', categoryName: 'Vật tư xây dựng', brandName: 'Brand F', systemQty: 75, onHandQty: 75, reservedQty: 0 },

];

// Mock warehouse data
const MOCK_WAREHOUSE = {
    warehouseId: 1,
    warehouseCode: 'WH-HCM',
    warehouseName: 'Kho Hồ Chí Minh',
    address: '123 Đường Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh',
    isActive: true,
    createdAt: '2024-01-15T08:00:00',
    createdByName: 'Nguyễn Văn A',
    phone: '028 1234 5678',
    email: 'kho.hcm@company.vn',
    managerName: 'Trần Thị B',
    description: 'Kho hàng chính phục vụ khu vực TP. Hồ Chí Minh và các tỉnh miền Nam',
    totalItems: 10,
    totalQty: 1278,
};

const STATUS_CONFIG = {
    true: { bgColor: 'rgba(16,185,129,0.2)', label: 'Hoạt động', color: '#059669' },
    false: { bgColor: 'rgba(239,68,68,0.2)', label: 'Tắt', color: '#dc2626' },
};

const ViewWarehouseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();

    const [warehouse, setWarehouse] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lineSearchKeyword, setLineSearchKeyword] = useState('');
    const [stockFilter, setStockFilter] = useState('all');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ warehouseName: '', address: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchWarehouseDetail = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Try API first, fallback to mock
            let data;
            try {
                data = await getWarehouseDetail(Number(id));
            } catch {
                data = MOCK_WAREHOUSE;
            }
            setWarehouse({
                warehouseId: data.warehouseId ?? data.WarehouseId,
                warehouseCode: data.warehouseCode ?? data.WarehouseCode ?? '',
                warehouseName: data.warehouseName ?? data.WarehouseName ?? '',
                address: data.address ?? data.Address ?? '-',
                isActive: data.isActive ?? data.IsActive ?? true,
                createdAt: data.createdAt ?? data.CreatedAt,
                createdByName: data.createdByName ?? data.CreatedByName ?? '',
                phone: data.phone ?? data.Phone ?? '',
                email: data.email ?? data.Email ?? '',
                managerName: data.managerName ?? data.ManagerName ?? '',
                description: data.description ?? data.Description ?? '',
                totalItems: data.totalItems ?? 0,
                totalQty: data.totalQty ?? 0,
            });

            // Items from API or mock
            const warehouseItems = (data.items ?? data.Items ?? MOCK_WAREHOUSE_ITEMS).map((item, idx) => ({
                id: item.itemId ?? item.ItemId ?? idx + 1,
                itemId: item.itemId ?? item.ItemId ?? idx + 1,
                itemName: item.itemName ?? item.ItemName ?? '',
                itemCode: item.itemCode ?? item.ItemCode ?? '',
                uom: item.unitName ?? item.UnitName ?? item.uom ?? '',
                categoryName: item.categoryName ?? item.CategoryName ?? '',
                brandName: item.brandName ?? item.BrandName ?? '',
                systemQty: item.systemQty ?? item.SystemQty ?? 0,
                onHandQty: item.onHandQty ?? item.OnHandQty ?? 0,
                reservedQty: item.reservedQty ?? item.ReservedQty ?? 0,
                qcdg: item.qcdg ?? item.QCDG ?? item.minimumQty ?? 0,
            }));
            setItems(warehouseItems);
        } catch (err) {
            console.error('Error fetching warehouse detail:', err);
            setError(err?.message || 'Không thể tải thông tin kho');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchWarehouseDetail();
    }, [fetchWarehouseDetail]);

    const filteredLines = useMemo(() => {
        return items.filter(item => {
            if (stockFilter === 'out-of-stock') return item.onHandQty === 0;
            if (stockFilter === 'low-stock') return item.onHandQty > 0 && item.onHandQty < 20;
            if (stockFilter === 'available') return item.onHandQty >= 20;
            return true;
        }).filter(item => {
            if (!lineSearchKeyword.trim()) return true;
            const kw = lineSearchKeyword.toLowerCase();
            return (
                item.itemName?.toLowerCase().includes(kw) ||
                item.itemCode?.toLowerCase().includes(kw) ||
                item.categoryName?.toLowerCase().includes(kw)
            );
        });
    }, [items, stockFilter, lineSearchKeyword]);

    const handleEditClick = () => {
        setEditForm({
            warehouseName: warehouse.warehouseName,
            address: warehouse.address,
        });
        setIsEditing(true);
    };

    const handleSaveClick = async () => {
        if (!editForm.warehouseName.trim()) {
            showToast('Vui lòng nhập tên kho', 'error');
            return;
        }
        if (!editForm.address.trim()) {
            showToast('Vui lòng nhập địa chỉ', 'error');
            return;
        }
        setSubmitting(true);
        try {
            // API call would go here
            await new Promise(resolve => setTimeout(resolve, 500));
            setWarehouse(prev => ({
                ...prev,
                warehouseName: editForm.warehouseName,
                address: editForm.address,
            }));
            setIsEditing(false);
            showToast('Cập nhật thông tin kho thành công!', 'success');
        } catch (err) {
            showToast('Có lỗi xảy ra khi cập nhật', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelClick = () => {
        setIsEditing(false);
    };

    const [statusDialogConfig, setStatusDialogConfig] = useState({ open: false, action: null });

    const handleStatusClick = (isActive) => {
        setStatusDialogConfig({ open: true, action: isActive ? 'disable' : 'enable' });
    };

    const handleStatusConfirm = async () => {
        setSubmitting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (statusDialogConfig.action === 'disable') {
                setWarehouse(prev => ({ ...prev, isActive: false }));
                showToast('Kho đã bị vô hiệu hóa!', 'success');
            } else {
                setWarehouse(prev => ({ ...prev, isActive: true }));
                showToast('Kho đã được kích hoạt!', 'success');
            }
            setStatusDialogConfig({ open: false, action: null });
        } catch (err) {
            showToast('Có lỗi xảy ra', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatNumber = (num) => {
        if (num == null || num === '') return '0';
        return Number(num).toLocaleString('vi-VN');
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="error">{error}</Typography>
                <Button onClick={() => navigate('/inventory')} sx={{ mt: 2 }}>
                    Quay lại
                </Button>
            </Box>
        );
    }

    if (!warehouse) return null;

    const statusConfig = STATUS_CONFIG[warehouse.isActive] ?? STATUS_CONFIG[true];

    return (
        <div className="create-supplier-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate('/inventory')} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!isEditing ? (
                        <button type="button" className="btn btn-secondary" onClick={handleEditClick}>
                            <Edit size={15} />
                            Chỉnh sửa
                        </button>
                    ) : (
                        <>
                            <button type="button" className="btn btn-secondary" onClick={handleCancelClick} disabled={submitting}>
                                Hủy
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleSaveClick} disabled={submitting}>
                                <Save size={15} />
                                Lưu
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
                                <h1 className="page-title">Chi tiết kho</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    Mã kho:{' '}
                                    <span style={{ fontWeight: 600, color: '#2196F3' }}>{warehouse.warehouseCode}</span>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div
                                    onClick={() => handleStatusClick(warehouse.isActive)}
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
                                        cursor: warehouse.isActive ? 'pointer' : 'default',
                                        userSelect: 'none',
                                    }}
                                >
                                    {statusConfig.label}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Layout 2 cột */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'flex-start' }}>
                        {/* Trái: Warehouse Lines */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Danh sách vật tư trong kho */}
                            <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Danh sách vật tư trong kho</h2>
                                </div>

                                {/* Search + Filter */}
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                                    <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                                        <input
                                            type="text"
                                            value={lineSearchKeyword}
                                            onChange={(e) => setLineSearchKeyword(e.target.value)}
                                            placeholder="Tìm vật tư theo tên, mã, danh mục..."
                                            className="form-input line-search-input"
                                        />
                                        {lineSearchKeyword && (
                                            <button
                                                type="button"
                                                onClick={() => setLineSearchKeyword('')}
                                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: '#9ca3af' }}
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {[
                                            { value: 'all', label: 'Tất cả' },
                                            { value: 'available', label: 'Còn hàng' },
                                            { value: 'low-stock', label: 'Sắp hết' },
                                            { value: 'out-of-stock', label: 'Hết hàng' },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setStockFilter(opt.value)}
                                                className={`variance-chip ${stockFilter === opt.value ? 'active' : ''}`}
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
                                                <th style={{ width: '100px', textAlign: 'right' }}>Tồn kho</th>
                                                <th style={{ width: '100px', textAlign: 'right' }}>Đang giao dịch</th>
                                                <th style={{ width: '100px', textAlign: 'right' }}>Khả dụng</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredLines.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                                        <Package size={48} strokeWidth={1.5} style={{ marginBottom: 8, opacity: 0.5 }} />
                                                        <p style={{ fontSize: '14px', margin: 0 }}>Không có vật tư nào</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredLines.map((line, index) => (
                                                    <tr key={line.id}>
                                                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                                <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                    <ImageIcon size={20} color="#9ca3af" />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                    <span
                                                                        style={{ fontSize: 14, fontWeight: 500, color: '#2196F3', cursor: 'pointer' }}
                                                                        onClick={() => navigate(`/items/${line.itemId}`)}
                                                                    >
                                                                        {line.itemName}
                                                                    </span>
                                                                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                                                        Mã: {line.itemCode} • ĐVT: {line.uom} • QCĐG: {line.qcdg || line.minimumQty || 0}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 600, color: line.onHandQty === 0 ? '#dc2626' : line.onHandQty < 20 ? '#f59e0b' : '#374151' }}>
                                                                {formatNumber(line.onHandQty)}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 500, color: '#f59e0b' }}>
                                                                {formatNumber(line.reservedQty)}
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                                                            {formatNumber(Math.max(0, line.onHandQty - line.reservedQty))}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Mô tả */}
                            {warehouse.description && (
                                <div className="info-section" style={{ margin: 0 }}>
                                    <div className="section-header-with-toggle">
                                        <h2 className="section-title">Mô tả</h2>
                                    </div>
                                    <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', color: '#374151', minHeight: '60px' }}>
                                        {warehouse.description}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Phải: Thông tin kho */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thông tin kho</h2>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                

                                <div className="form-field">
                                    <label className="form-label">Tên kho</label>
                                    <div className="input-wrapper">
                                        <WarehouseIcon className="input-icon" size={16} />
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editForm.warehouseName}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, warehouseName: e.target.value }))}
                                                className="form-input"
                                                placeholder="Nhập tên kho"
                                            />
                                        ) : (
                                            <input type="text" value={warehouse.warehouseName} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        )}
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Địa chỉ</label>
                                    <div className="input-wrapper">
                                        <MapPin className="input-icon" size={16} />
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editForm.address}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                                                className="form-input"
                                                placeholder="Nhập địa chỉ"
                                            />
                                        ) : (
                                            <input type="text" value={warehouse.address} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        )}
                                    </div>
                                </div>

                                {warehouse.phone && (
                                    <div className="form-field">
                                        <label className="form-label">Số điện thoại</label>
                                        <div className="input-wrapper">
                                            <Phone className="input-icon" size={16} />
                                            <input type="text" value={warehouse.phone} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>
                                )}

                                {warehouse.email && (
                                    <div className="form-field">
                                        <label className="form-label">Email</label>
                                        <div className="input-wrapper">
                                            <Mail className="input-icon" size={16} />
                                            <input type="text" value={warehouse.email} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>
                                )}

                                {warehouse.managerName && (
                                    <div className="form-field">
                                        <label className="form-label">Người quản lý</label>
                                        <div className="input-wrapper">
                                            <User className="input-icon" size={16} />
                                            <input type="text" value={warehouse.managerName} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>
                                )}

                                <div className="form-field">
                                    <label className="form-label">Ngày tạo</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input type="text" value={formatDateTime(warehouse.createdAt)} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Người tạo</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input type="text" value={warehouse.createdByName || '—'} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
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

            {/* Status Confirmation Dialog */}
            <Dialog
                open={statusDialogConfig.open}
                onClose={() => setStatusDialogConfig({ open: false, action: null })}
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
                    {statusDialogConfig.action === 'disable' ? 'Vô hiệu hóa kho' : 'Kích hoạt kho'}
                </DialogTitle>
                <DialogContent sx={{ px: 3, pb: 2 }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>
                        {statusDialogConfig.action === 'disable'
                            ? `Bạn có chắc chắn muốn vô hiệu hóa kho "${warehouse?.warehouseName}"? Sau khi vô hiệu hóa, kho sẽ không còn hoạt động.`
                            : `Bạn có chắc chắn muốn kích hoạt lại kho "${warehouse?.warehouseName}"? Kho sẽ hoạt động trở lại.`
                        }
                    </p>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
                    <button
                        type="button"
                        onClick={() => setStatusDialogConfig({ open: false, action: null })}
                        className="btn btn-cancel"
                        style={{ minWidth: '72px', height: '40px', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleStatusConfirm}
                        disabled={submitting}
                        style={{ minWidth: '110px', height: '40px', borderRadius: '12px', fontSize: '14px', fontWeight: 700 }}
                    >
                        Xác nhận
                    </button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default ViewWarehouseDetail;
