/**
 * ViewWarehouseDetail - Chi tiết kho
 * Hiển thị thông tin kho, vật tư (kèm lô theo từng vật tư) và lịch sử biến động
 *
 * API:
 *   GET  /api/Warehouse/{id}/detail          → WarehouseDetailResponse (kèm items)
 *   PUT  /api/Warehouse/update-warehouse/{id}
 *   PATCH /api/Warehouse/toggle-status/{id}
 *   GET  /api/Warehouse/history?warehouseId=...
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Typography,
} from '@mui/material';
import { ConfirmDialog } from '@ui/dialogs';
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
    Edit,
    Save,
    RefreshCw,
    History,
    FileText,
} from 'lucide-react';
import { getWarehouseDetail, getWarehouseHistory, updateWarehouse, toggleWarehouseStatus } from '../lib/warehouseService';
import { useToastContext } from '../../app/context/ToastContext';
import '../styles/CreateSupplier.css';

const STATUS_CONFIG = {
    true: { bgColor: 'rgba(16,185,129,0.2)', label: 'Hoạt động', color: '#059669' },
    false: { bgColor: 'rgba(239,68,68,0.2)', label: 'Tắt', color: '#dc2626' },
};

/** Ngưỡng tồn tối thiểu cho lọc “Còn hàng” / “Sắp hết” (UI) */
const LOW_STOCK_THRESHOLD = 20;

/** Số bản ghi / trang tab “Lịch sử biến động” — cố định, tránh bảng quá cao gây cuộn kép (trang + khung bảng) */
const WAREHOUSE_HISTORY_PAGE_SIZE = 5;

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => (v == null ? '0' : Number(v).toLocaleString('vi-VN'));

const fmtDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    if (isNaN(d.getTime())) return dateStr;
    return (
        d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' ' +
        d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    );
};

const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtQty = (v) => {
    const n = Number(v) || 0;
    if (n > 0) return `+${n.toLocaleString('vi-VN')}`;
    if (n < 0) return n.toLocaleString('vi-VN');
    return '0';
};

const ACTION_COLORS = {
    IMPORT: { bg: 'rgba(16,185,129,0.15)', color: '#059669', label: 'Nhập kho' },
    EXPORT: { bg: 'rgba(239,68,68,0.15)', color: '#dc2626', label: 'Xuất kho' },
    ADJUST: { bg: 'rgba(245,158,11,0.15)', color: '#d97706', label: 'Điều chỉnh' },
    RETURN_IN: { bg: 'rgba(59,130,246,0.15)', color: '#2563eb', label: 'Trả về' },
    RETURN_OUT: { bg: 'rgba(139,92,246,0.15)', color: '#7c3aed', label: 'Xuất trả' },
};

/** Mock InventoryLots — khớp seed `DTB 14.4.sql` (MKIWMS5), chờ API thật */

/**
 * Mã phiếu nhập kho từ GRNLineId: mỗi GRNLineId i trong seed gắn GRNId i → GRNCode GRN000i
 * (khi không có dòng GRN → null)
 */
const getGrnCodeFromLineId = (grnLineId) => {
    if (grnLineId == null || grnLineId === '') return null;
    const n = Number(grnLineId);
    if (!Number.isFinite(n) || n < 1 || n > 20) return null;
    return `GRN${String(n).padStart(4, '0')}`;
};

const getLotLocationCode = (lot) => {
    return (
        lot.locationCode ??
        lot.LocationCode ??
        lot.location?.locationCode ??
        lot.location?.LocationCode ??
        lot.Location?.locationCode ??
        lot.Location?.LocationCode ??
        null
    );
};

// ── Map backend response → component state ────────────────────────────────────
const mapDetail = (data) => ({
    warehouseId: data.warehouseId ?? data.WarehouseId ?? data.id,
    warehouseCode: data.warehouseCode ?? data.WarehouseCode ?? '',
    warehouseName: data.warehouseName ?? data.WarehouseName ?? '',
    address: data.address ?? data.Address ?? '-',
    isActive: data.isActive ?? data.IsActive ?? true,
    createdAt: data.createdAt ?? data.CreatedAt ?? '',
    createdByName: data.createdByName ?? data.CreatedByName ?? '',
    phone: data.phone ?? data.Phone ?? '',
    email: data.email ?? data.Email ?? '',
    managerName: data.managerName ?? data.ManagerName ?? '',
    description: data.description ?? data.Description ?? '',
    itemCount: data.itemCount ?? data.ItemCount ?? data.Items?.length ?? 0,
    // items: raw WarehouseItemDto[]
    items: (data.items ?? data.Items ?? []).map((it, idx) => ({
        id: it.itemId ?? it.ItemId ?? idx + 1,
        itemId: it.itemId ?? it.ItemId ?? idx + 1,
        itemName: it.itemName ?? it.ItemName ?? '',
        itemCode: it.itemCode ?? it.ItemCode ?? '',
        uom: it.unitName ?? it.UnitName ?? it.uom ?? '',
        categoryName: it.categoryName ?? it.CategoryName ?? '',
        brandName: it.brandName ?? it.BrandName ?? '',
        systemQty: it.systemQty ?? it.SystemQty ?? 0,
        onHandQty: it.onHandQty ?? it.OnHandQty ?? 0,
        reservedQty: it.reservedQty ?? it.ReservedQty ?? 0,
        qcdg: it.qcdg ?? it.QCDG ?? it.minimumQty ?? 0,
        hasInventoryRecord: it.hasInventoryRecord ?? it.HasInventoryRecord ?? false,
    })),
    lots: (data.lots ?? data.Lots ?? []).map((lot) => ({
        lotId: lot.lotId ?? lot.LotId,
        itemId: lot.itemId ?? lot.ItemId,
        warehouseId: lot.warehouseId ?? lot.WarehouseId,
        grnId: lot.grnid ?? lot.Grnid ?? lot.grnId ?? lot.GrnId ?? null,
        grnLineId: lot.grnlineId ?? lot.GrnlineId ?? lot.grnLineId ?? lot.GrnLineId ?? null,
        grnCode: lot.grnCode ?? lot.GrnCode ?? null,
        locationCode: lot.locationCode ?? lot.LocationCode ?? null,
        receiptDate: lot.receiptDate ?? lot.ReceiptDate ?? null,
        quantity: lot.quantity ?? lot.Quantity ?? 0,
        unitCost: lot.unitCost ?? lot.UnitCost ?? 0,
        expiryDate: lot.expiryDate ?? lot.ExpiryDate ?? null,
        isActive: lot.isActive ?? lot.IsActive ?? false,
    })),
});

const mapHistory = (item, idx) => ({
    id: item.historyId ?? item.HistoryId ?? item.id ?? idx,
    actionType: item.actionType ?? item.ActionType ?? item.type ?? '',
    description: item.description ?? item.Description ?? '',
    quantity: item.quantity ?? item.Quantity ?? null,
    referenceNo: item.referenceNo ?? item.ReferenceNo ?? '',
    voucherCode: item.voucherCode ?? item.VoucherCode ?? '',
    itemName: item.itemName ?? item.ItemName ?? '',
    transactionDate: item.transactionDate ?? item.TransactionDate ?? item.createdAt ?? item.CreatedAt ?? '',
    approverName: item.approverName ?? item.ApproverName ?? item.approvedByName ?? item.ApprovedByName ?? '',
    performedByName: item.performedByName ?? item.PerformedByName ?? '',
    itemName: item.itemName ?? item.ItemName ?? '',
    transactionDate: item.transactionDate ?? item.TransactionDate ?? '',
    approverName: item.approverName ?? item.ApproverName ?? '',
    createdAt: item.createdAt ?? item.CreatedAt ?? '',
});

const ViewWarehouseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToastContext();

    const [warehouse, setWarehouse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Line filter / search
    const [lineSearchKeyword, setLineSearchKeyword] = useState('');
    const [stockFilter, setStockFilter] = useState('all');

    // Edit mode
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ warehouseName: '', address: '' });
    const [submitting, setSubmitting] = useState(false);
    const [isFormDirty, setIsFormDirty] = useState(false);

    // Unsaved changes dialog
    const [unsavedDialogConfig, setUnsavedDialogConfig] = useState({ open: false, action: null }); // action: 'back' | 'cancel'

    // Status toggle dialog
    const [statusDialogConfig, setStatusDialogConfig] = useState({ open: false, action: null });
    const [statusSubmitting, setStatusSubmitting] = useState(false);

    // Tab: items vs history
    const [activeTab, setActiveTab] = useState('items');

    // History state
    const [historyList, setHistoryList] = useState([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(0);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(null);
    const [lotPopup, setLotPopup] = useState({ open: false, itemName: '', itemCode: '', lots: [] });

    // ── Load warehouse detail ────────────────────────────────────────────────
    const fetchWarehouseDetail = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getWarehouseDetail(Number(id));
            if (data) {
                setWarehouse(mapDetail(data));
            }
        } catch (err) {
            console.error('Lỗi khi tải chi tiết kho:', err);
            const msg = err?.response?.data?.message || err?.message || 'Không thể tải thông tin kho';
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }, [id, showToast]);

    // ── Load history ────────────────────────────────────────────────────────
    const fetchHistory = useCallback(async (pageNum = 0) => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const result = await getWarehouseHistory({
                warehouseId: Number(id),
                pageNumber: pageNum + 1,
                pageSize: WAREHOUSE_HISTORY_PAGE_SIZE,
            });
            setHistoryList((result.items ?? []).map((item, idx) => mapHistory(item, idx)));
            setHistoryTotal(result.totalItems ?? 0);
            setHistoryPage(pageNum);
        } catch (err) {
            console.error('Lỗi khi tải lịch sử kho:', err);
            const msg =
                typeof err === 'string'
                    ? err
                    : err?.message || err?.Message || 'Không thể tải lịch sử kho';
            setHistoryError(msg);
        } finally {
            setHistoryLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchWarehouseDetail();
    }, [fetchWarehouseDetail]);

    // Đổi kho (route id) → xóa cache lịch sử, tránh hiển thị lịch sử kho khác
    useEffect(() => {
        setHistoryList([]);
        setHistoryTotal(0);
        setHistoryPage(0);
        setHistoryError(null);
    }, [id]);

    // Tab Lịch sử hoặc đổi kho khi đang ở tab Lịch sử → tải lại trang 1
    useEffect(() => {
        if (activeTab !== 'history') return;
        fetchHistory(0);
    }, [id, activeTab, fetchHistory]);

    // ── Filtered items ───────────────────────────────────────────────────────
    const filteredLines = useMemo(() => {
        if (!warehouse?.items) return [];
        return warehouse.items.filter((item) => {
            if (stockFilter === 'out-of-stock') return Number(item.onHandQty) === 0;
            if (stockFilter === 'low-stock') {
                return Number(item.onHandQty) > 0 && Number(item.onHandQty) < LOW_STOCK_THRESHOLD;
            }
            if (stockFilter === 'available') return Number(item.onHandQty) >= LOW_STOCK_THRESHOLD;
            return true;
        }).filter((item) => {
            if (!lineSearchKeyword.trim()) return true;
            const kw = lineSearchKeyword.toLowerCase();
            return (
                (item.itemName ?? '').toLowerCase().includes(kw) ||
                (item.itemCode ?? '').toLowerCase().includes(kw) ||
                (item.categoryName ?? '').toLowerCase().includes(kw)
            );
        });
    }, [warehouse, stockFilter, lineSearchKeyword]);

    /** Các lô thuộc đúng kho đang xem (chỉ dùng dữ liệu backend) */
    const lotsForWarehouse = useMemo(() => {
        if (!warehouse?.warehouseId) return [];
        const wid = Number(warehouse.warehouseId);
        const backendLots = Array.isArray(warehouse.lots) ? warehouse.lots : [];
        return backendLots.filter((l) => Number(l.warehouseId) === wid);
    }, [warehouse]);

    const lotsByItemId = useMemo(() => {
        const grouped = new Map();
        lotsForWarehouse.forEach((lot) => {
            const itemKey = Number(lot.itemId);
            if (!Number.isFinite(itemKey)) return;
            if (!grouped.has(itemKey)) grouped.set(itemKey, []);
            grouped.get(itemKey).push(lot);
        });
        grouped.forEach((value, key) => {
            grouped.set(
                key,
                value.sort((a, b) => new Date(b.receiptDate) - new Date(a.receiptDate)),
            );
        });
        return grouped;
    }, [lotsForWarehouse]);

    const openLotPopup = (line, itemLots) => {
        setLotPopup({
            open: true,
            itemName: line.itemName ?? 'Vật tư',
            itemCode: line.itemCode ?? '',
            lots: Array.isArray(itemLots) ? itemLots : [],
        });
    };

    const closeLotPopup = () => {
        setLotPopup({ open: false, itemName: '', itemCode: '', lots: [] });
    };

    const handleCreatePrnFromLot = (lot) => {
        const grnIdFromLot = Number(lot?.grnId);
        const grnId = Number.isFinite(grnIdFromLot) && grnIdFromLot > 0 ? grnIdFromLot : null;

        if (!grnId) {
            showToast('Không xác định được GRN nguồn từ lô này để tạo phiếu trả.', 'warning');
            return;
        }

        const params = new URLSearchParams();
        params.set('grnId', String(grnId));
        if (lot?.grnLineId != null) params.set('grnLineId', String(lot.grnLineId));
        if (lot?.lotId != null) params.set('lotId', String(lot.lotId));
        if (lot?.locationCode) params.set('locationCode', String(lot.locationCode));
        if (lot?.quantity != null) params.set('qty', String(lot.quantity));

        closeLotPopup();
        navigate(`/purchase-returns/create?${params.toString()}`);
    };

    // ── Edit handlers ────────────────────────────────────────────────────────
    const handleEditClick = () => {
        setEditForm({ warehouseName: warehouse.warehouseName, address: warehouse.address });
        setIsFormDirty(false);
        setIsEditing(true);
    };

    const handleSaveClick = async () => {
        if (!editForm.warehouseName.trim()) {
            showToast('Vui lòng nhập tên kho', 'error');
            return;
        }
        if (!editForm.address.trim()) {
            showToast('Vui lòng nhập địa chỉ kho', 'error');
            return;
        }
        setSubmitting(true);
        try {
            const res = await updateWarehouse({
                id: warehouse.warehouseId,
                warehouseName: editForm.warehouseName.trim(),
                address: editForm.address.trim(),
                isActive: warehouse.isActive,
            });
            const name = editForm.warehouseName.trim();
            const addr = editForm.address.trim();
            setWarehouse((prev) => ({
                ...prev,
                warehouseName: name,
                address: addr,
            }));
            setIsEditing(false);
            setIsFormDirty(false);
            const serverMsg = res?.message || res?.Message || res?.data?.message || 'Cập nhật thông tin kho thành công!';
            showToast(serverMsg, 'success');
        } catch (err) {
            console.error('Lỗi khi cập nhật kho:', err);
            const serverMsg = err?.response?.data?.message || err?.response?.data?.Message || err?.message || 'Có lỗi xảy ra khi cập nhật';
            showToast(serverMsg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelClick = () => {
        if (isFormDirty) {
            setUnsavedDialogConfig({ open: true, action: 'cancel' });
        } else {
            setIsEditing(false);
        }
    };

    const handleBackWithChanges = () => {
        setUnsavedDialogConfig({ open: true, action: 'back' });
    };

    // ── Status toggle handlers ────────────────────────────────────────────────
    const handleStatusClick = (currentIsActive) => {
        setStatusDialogConfig({ open: true, action: currentIsActive ? 'disable' : 'enable' });
    };

    const handleStatusConfirm = async () => {
        setStatusSubmitting(true);
        try {
            await toggleWarehouseStatus(warehouse.warehouseId);
            setWarehouse((prev) => ({ ...prev, isActive: !prev.isActive }));
            setStatusDialogConfig({ open: false, action: null });
            showToast(
                statusDialogConfig.action === 'disable'
                    ? 'Kho đã bị vô hiệu hóa!'
                    : 'Kho đã được kích hoạt!',
                'success'
            );
        } catch (err) {
            console.error('Lỗi khi toggle trạng thái kho:', err);
            showToast(err?.response?.data?.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setStatusSubmitting(false);
        }
    };

    // ── Loading state ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !warehouse) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="error" sx={{ mb: 2 }}>{error || 'Không tìm thấy kho'}</Typography>
                <button type="button" onClick={() => navigate('/inventory')} className="back-button">
                    <ArrowLeft size={20} />
                    Quay lại danh sách kho
                </button>
            </Box>
        );
    }

    const statusConfig = STATUS_CONFIG[warehouse.isActive] ?? STATUS_CONFIG[true];

    return (
        <div className="create-supplier-page view-warehouse-detail-page">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => isEditing ? handleBackWithChanges() : navigate('/inventory')} className="back-button">
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

            {/* ── Form Card ───────────────────────────────────────────────── */}
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
                                <button
                                    type="button"
                                    onClick={() => handleStatusClick(warehouse.isActive)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: 20,
                                        border: 'none',
                                        backgroundColor: statusConfig.bgColor,
                                        color: statusConfig.color,
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    {statusConfig.label}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 2-column layout */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'flex-start' }}>
                        {/* Left: Items + History tabs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Tab header */}
                            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb' }}>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('items')}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'items' ? '2px solid #2196F3' : '2px solid transparent',
                                        color: activeTab === 'items' ? '#2196F3' : '#6b7280',
                                        fontWeight: activeTab === 'items' ? 600 : 500,
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: -2,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <Package size={16} />
                                    Vật tư ({warehouse.items?.length ?? 0})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setActiveTab('history'); }}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'history' ? '2px solid #2196F3' : '2px solid transparent',
                                        color: activeTab === 'history' ? '#2196F3' : '#6b7280',
                                        fontWeight: activeTab === 'history' ? 600 : 500,
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: -2,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <History size={16} />
                                    Lịch sử biến động ({historyTotal})
                                </button>
                            </div>

                            {/* ── Items tab ─────────────────────────────────────── */}
                            {activeTab === 'items' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div className="info-section" style={{ margin: 0 }}>
                                        <div className="section-header-with-toggle">
                                            <h2 className="section-title">Danh sách vật tư trong kho</h2>
                                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                                {filteredLines.length} / {warehouse.items?.length ?? 0} vật tư
                                            </span>
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
                                                ].map((opt) => (
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
                                                        <th style={{ minWidth: '260px', textAlign: 'left' }}>Các lô theo vật tư</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredLines.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                                                <Package size={48} strokeWidth={1.5} style={{ marginBottom: 8, opacity: 0.5 }} />
                                                                <p style={{ fontSize: '14px', margin: 0 }}>
                                                                    {warehouse.items?.length > 0 ? 'Không có vật tư phù hợp' : 'Chưa có vật tư trong kho'}
                                                                </p>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredLines.map((line, index) => {
                                                            const itemLots = lotsByItemId.get(Number(line.itemId)) ?? [];
                                                            return (
                                                                <tr key={line.id}>
                                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                                    <td>
                                                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                                            <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                                <ImageIcon size={20} color="#9ca3af" />
                                                                            </div>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                                <span
                                                                                    style={{ fontSize: 14, fontWeight: 500, color: '#2196F3', cursor: 'pointer', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                                                                                    onClick={() => navigate(`/items/${line.itemId}`)}
                                                                                    title={line.itemName}
                                                                                >
                                                                                    {line.itemName}
                                                                                </span>
                                                                                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                                                                    Mã: {line.itemCode} • ĐVT: {line.uom || '-'} • QCĐG: {fmt(line.qcdg)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div style={{
                                                                            textAlign: 'right',
                                                                            paddingRight: '8px',
                                                                            fontWeight: 600,
                                                                            color: Number(line.onHandQty) === 0 ? '#dc2626' : Number(line.onHandQty) < LOW_STOCK_THRESHOLD ? '#f59e0b' : '#374151',
                                                                        }}>
                                                                            {fmt(line.onHandQty)}
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 500, color: '#f59e0b' }}>
                                                                            {fmt(line.reservedQty)}
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                                                                        {fmt(Math.max(0, Number(line.onHandQty) - Number(line.reservedQty)))}
                                                                    </td>
                                                                    <td>
                                                                        {itemLots.length === 0 ? (
                                                                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>Chưa có lô</span>
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => openLotPopup(line, itemLots)}
                                                                                className="btn btn-secondary"
                                                                                style={{
                                                                                    minWidth: '110px',
                                                                                    height: '32px',
                                                                                    borderRadius: '8px',
                                                                                    fontSize: '12px',
                                                                                    fontWeight: 600,
                                                                                    padding: '0 10px',
                                                                                }}
                                                                            >
                                                                                Xem lô ({itemLots.length})
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Description */}
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
                            )}

                            {/* ── History tab ──────────────────────────────────── */}
                            {activeTab === 'history' && (
                                <div>
                                    <div className="info-section" style={{ margin: 0 }}>
                                        <div className="section-header-with-toggle">
                                            <h2 className="section-title">Lịch sử biến động kho</h2>
                                        </div>

                                        {historyLoading ? (
                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                                                <CircularProgress size={28} />
                                            </div>
                                        ) : historyError ? (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
                                                <p>{historyError}</p>
                                                <button type="button" className="btn btn-secondary" onClick={() => fetchHistory(historyPage)}>
                                                    <RefreshCw size={14} /> Thử lại
                                                </button>
                                            </div>
                                        ) : historyList.length === 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px', color: '#9ca3af' }}>
                                                <History size={48} strokeWidth={1.5} style={{ marginBottom: 8, opacity: 0.5 }} />
                                                <p style={{ fontSize: '14px', margin: 0 }}>Chưa có lịch sử biến động kho</p>
                                            </div>
                                        ) : (
                                            <div className="table-container warehouse-history-table-wrap">
                                                <table className="product-table">
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: 40, textAlign: 'center' }}>STT</th>
                                                            <th>Phiếu</th>
                                                            <th>Vật tư</th>
                                                            <th style={{ width: 100, textAlign: 'right' }}>Số lượng</th>
                                                            <th style={{ width: 160 }}>Ngày giao dịch</th>
                                                            <th>Người duyệt</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {historyList.map((item, index) => {
                                                            const qtyColor = Number(item.quantity) >= 0 ? '#059669' : '#dc2626';
                                                            return (
                                                                <tr key={item.id ?? index}>
                                                                    <td style={{ textAlign: 'center', fontSize: 13 }}>{historyPage * WAREHOUSE_HISTORY_PAGE_SIZE + index + 1}</td>
                                                                    <td>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                            <FileText size={14} color="#9ca3af" />
                                                                            <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                                                                                {item.referenceNo || item.voucherCode || '—'}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ fontSize: 13 }}>{item.itemName || '—'}</td>
                                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: qtyColor, fontSize: 13 }}>
                                                                        {fmtQty(item.quantity)}
                                                                    </td>
                                                                    <td style={{ fontSize: 12, color: '#6b7280' }}>{fmtDateTime(item.transactionDate ?? item.createdAt)}</td>
                                                                    <td style={{ fontSize: 13, color: '#374151' }}>{item.approverName || item.performedByName || '—'}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>

                                                {/* Pagination */}
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                                                        {historyPage * WAREHOUSE_HISTORY_PAGE_SIZE + 1}–{Math.min((historyPage + 1) * WAREHOUSE_HISTORY_PAGE_SIZE, historyTotal)} / {historyTotal}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchHistory(historyPage - 1)}
                                                        disabled={historyPage <= 0}
                                                        style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: historyPage <= 0 ? 'not-allowed' : 'pointer', fontSize: 12, opacity: historyPage <= 0 ? 0.4 : 1 }}
                                                    >
                                                        ← Trước
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchHistory(historyPage + 1)}
                                                        disabled={(historyPage + 1) * WAREHOUSE_HISTORY_PAGE_SIZE >= historyTotal}
                                                        style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: (historyPage + 1) * WAREHOUSE_HISTORY_PAGE_SIZE >= historyTotal ? 'not-allowed' : 'pointer', fontSize: 12, opacity: (historyPage + 1) * WAREHOUSE_HISTORY_PAGE_SIZE >= historyTotal ? 0.4 : 1 }}
                                                    >
                                                        Sau →
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Info panel */}
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
                                                onChange={(e) => { setEditForm((prev) => ({ ...prev, warehouseName: e.target.value })); setIsFormDirty(true); }}
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
                                                onChange={(e) => { setEditForm((prev) => ({ ...prev, address: e.target.value })); setIsFormDirty(true); }}
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
                                        <input type="text" value={fmtDate(warehouse.createdAt)} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                {/* Summary */}
                                <div style={{ padding: '14px', backgroundColor: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd', marginTop: '4px' }}>
                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600, marginBottom: '4px' }}>SỐ LOẠI VẬT TƯ</div>
                                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0c4a6e' }}>{warehouse.itemCount}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <Dialog
                open={lotPopup.open}
                onClose={closeLotPopup}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle style={{ fontWeight: 700 }}>
                    Danh sách lô - {lotPopup.itemName}
                    {lotPopup.itemCode ? ` (${lotPopup.itemCode})` : ''}
                </DialogTitle>
                <DialogContent dividers>
                    {lotPopup.lots.length === 0 ? (
                        <div style={{ padding: '12px 0', color: '#9ca3af', fontSize: '14px' }}>
                            Chưa có lô cho vật tư này.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
                            <table className="product-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 60, textAlign: 'center' }}>STT</th>
                                        <th>Mã Phiếu Nhập Kho</th>
                                        <th>Vị trí</th>
                                        <th>Ngày nhập</th>
                                        <th style={{ width: 120, textAlign: 'right' }}>Số lượng</th>
                                        <th style={{ width: 90, textAlign: 'center' }}>IsActive</th>
                                        <th style={{ width: 150, textAlign: 'center' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lotPopup.lots.map((lot, idx) => {
                                        const lotLocation = getLotLocationCode(lot) ?? '—';
                                        const lotGrn = lot.grnCode ?? getGrnCodeFromLineId(lot.grnLineId) ?? '—';
                                        return (
                                            <tr key={lot.lotId ?? `${lot.itemId}-${idx}`}>
                                                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                                <td>{lotGrn}</td>
                                                <td>{lotLocation}</td>
                                                <td>{fmtDate(lot.receiptDate)}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(lot.quantity)}</td>
                                                <td style={{ textAlign: 'center', color: lot.isActive ? '#059669' : '#6b7280', fontWeight: 600 }}>
                                                    {lot.isActive ? '1' : '0'}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary"
                                                        style={{ minWidth: '120px', height: '32px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, padding: '0 10px' }}
                                                        onClick={() => handleCreatePrnFromLot(lot)}
                                                    >
                                                        Tạo phiếu trả
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DialogContent>
                <DialogActions>
                    <button
                        type="button"
                        onClick={closeLotPopup}
                        className="btn btn-secondary"
                        style={{ minWidth: '90px', height: '36px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}
                    >
                        Đóng
                    </button>
                </DialogActions>
            </Dialog>

            {/* Unsaved Changes Dialog */}
            <ConfirmDialog
                open={unsavedDialogConfig.open}
                onClose={() => setUnsavedDialogConfig({ open: false, action: null })}
                onConfirm={() => {
                    setUnsavedDialogConfig({ open: false, action: null });
                    if (unsavedDialogConfig.action === 'back') {
                        navigate('/inventory');
                    } else {
                        setIsEditing(false);
                    }
                }}
                title="Có thay đổi chưa được lưu"
                message={`Bạn có thay đổi chưa lưu. Bạn có muốn ${unsavedDialogConfig.action === 'back' ? 'rời khỏi trang này' : 'hủy bỏ các thay đổi'} không?`}
                confirmText={unsavedDialogConfig.action === 'back' ? 'Rời đi' : 'Hủy thay đổi'}
                cancelText="Ở lại"
                actions={
                    <>
                        <button type="button" onClick={() => setUnsavedDialogConfig({ open: false, action: null })} className="btn btn-secondary" style={{ minWidth: '80px', height: '40px', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}>Ở lại</button>
                        <button type="button" className="btn btn-primary" onClick={() => { setUnsavedDialogConfig({ open: false, action: null }); if (unsavedDialogConfig.action === 'back') { navigate('/inventory'); } else { setIsEditing(false); } }} style={{ minWidth: '110px', height: '40px', borderRadius: '12px', fontSize: '14px', fontWeight: 700 }}>{unsavedDialogConfig.action === 'back' ? 'Rời đi' : 'Hủy thay đổi'}</button>
                    </>
                }
            />

            {/* Status Confirmation Dialog */}
            <ConfirmDialog
                open={statusDialogConfig.open}
                onClose={() => setStatusDialogConfig({ open: false, action: null })}
                onConfirm={handleStatusConfirm}
                title={statusDialogConfig.action === 'disable' ? 'Vô hiệu hóa kho' : 'Kích hoạt kho'}
                message={
                    statusDialogConfig.action === 'disable'
                        ? `Bạn có chắc chắn muốn vô hiệu hóa kho "${warehouse?.warehouseName}"? Sau khi vô hiệu hóa, kho sẽ không còn hoạt động.`
                        : `Bạn có chắc chắn muốn kích hoạt lại kho "${warehouse?.warehouseName}"? Kho sẽ hoạt động trở lại.`
                }
                confirmText="Xác nhận"
                cancelText="Hủy"
                loading={statusSubmitting}
                confirmDanger={statusDialogConfig.action === 'disable'}
                actions={
                    <>
                        <button type="button" onClick={() => setStatusDialogConfig({ open: false, action: null })} className="btn btn-cancel" style={{ minWidth: '72px', height: '40px', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}>Hủy</button>
                        <button type="button" className="btn btn-primary" onClick={handleStatusConfirm} disabled={statusSubmitting} style={{ minWidth: '110px', height: '40px', borderRadius: '12px', fontSize: '14px', fontWeight: 700 }}>{statusSubmitting ? 'Đang xử lý…' : 'Xác nhận'}</button>
                    </>
                }
            />
        </div>
    );
};

export default ViewWarehouseDetail;
