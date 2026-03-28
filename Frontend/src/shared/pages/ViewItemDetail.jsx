/*
 * ViewItemDetail — Chi tiết vật tư (xem, KHÔNG chỉnh sửa tại chỗ).
 * Đã kiểm duyệt với DB: Items, ItemPrices, InventoryOnHand.
 * Full quyền Item (xem/sửa): WAREHOUSE_KEEPER, SALE_SUPPORT, SALE_ENGINEER, ACCOUNTANTS (trừ ADMIN, Giám đốc).
 * SALE_SUPPORT / SALE_ENGINEER: xem block Thông tin tồn kho.
 * ACCOUNTANTS: + block Thông tin kế toán.
 * KHÔNG đổi business logic, chỉ refactor UI/UX.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Edit3, Settings, TrendingUp } from 'lucide-react';
import authService from '../lib/authService';
import { getItemDetail } from '../lib/itemService';
import { getPermissionRole, getRawRoleFromUser, isAccountantView } from '../permissions/roleUtils';
import '../styles/CreateSupplier.css';

// ─── Role helpers (GIỮ NGUYÊN) ─────────────────────────────────────────────
const isWarehouseKeeper = (role) => role === 'WAREHOUSE_KEEPER';
const canEditItem = (role) => ['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS'].includes(role);
const canSeeFullPrices = (role) => role === 'ACCOUNTANTS' || role === 'DIRECTOR';
const showStockBlockForRole = (role) => ['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS', 'DIRECTOR'].includes(role);

// ─── Formatters (GIỮ NGUYÊN) ───────────────────────────────────────────────
const formatPrice = (value) => {
    if (value == null || value === '') return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));
};

const formatQty = (value) => (value != null ? Number(value).toLocaleString('vi-VN') : '—');

const getAverageWarehousePrice = (item) => {
    const p = item?.purchasePrice != null ? Number(item.purchasePrice) : 0;
    const s = item?.salePrice != null ? Number(item.salePrice) : 0;
    if (p === 0 && s === 0) return null;
    return (p + s) / 2;
};

const getSellableQty = (row) => {
    const onHand = row.onHandQty != null ? Number(row.onHandQty) : 0;
    const reserved = row.reservedQty != null ? Number(row.reservedQty) : 0;
    return Math.max(0, onHand - reserved);
};

const parseUtcDate = (v) => {
    if (v == null || v === '') return null;
    const d = new Date(v + (v.endsWith('Z') ? '' : 'Z'));
    return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateTime = (v) => {
    if (v == null || v === '') return '—';
    const d = parseUtcDate(v);
    return !d
        ? String(v)
        : `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

const formatDateTimeFull = (v) => {
    if (v == null || v === '') return '—';
    const d = parseUtcDate(v);
    if (!d) return String(v);
    const date = d.toLocaleDateString('vi-VN');
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${date} - ${time}`;
};

// ─── Status badge ──────────────────────────────────────────────────────────
const ITEM_STATUS_CONFIG = {
    active: { label: 'Đang giao dịch', bg: 'rgba(16, 185, 129, 0.18)', color: '#047857' },
    inactive: { label: 'Tạm dừng', bg: 'rgba(239, 68, 68, 0.15)', color: '#b91c1c' },
};

const StatusBadge = ({ config }) => (
    <span
        style={{
            padding: '4px 12px',
            borderRadius: 9999,
            backgroundColor: config.bg,
            color: config.color,
            fontWeight: 600,
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
            border: `1px solid ${config.color}30`,
        }}
    >
        {config.label}
    </span>
);

const StatCard = ({ label, value, color = '#0f172a', highlight = false }) => (
    <div
        style={{
            padding: '12px',
            backgroundColor: highlight ? '#f0f9ff' : '#f8fafc',
            border: `1px solid ${highlight ? '#0284c7' : '#e2e8f0'}`,
            borderRadius: '10px',
        }}
    >
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: highlight ? '#0284c7' : color }}>{value}</div>
    </div>
);

const FieldRow = ({ label, value, highlight = false, mono = false }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{label}</div>
        <div
            style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: highlight ? '1px solid #0284c7' : '1px solid #e5e7eb',
                backgroundColor: highlight ? '#f0f9ff' : '#f9fafb',
                fontSize: '14px',
                fontWeight: highlight ? 600 : 500,
                color: highlight ? '#0284c7' : '#374151',
                fontVariantNumeric: mono ? 'tabular-nums' : undefined,
                minHeight: '36px',
                display: 'flex',
                alignItems: 'center',
                wordBreak: 'break-word',
            }}
        >
            {value || '—'}
        </div>
    </div>
);

// ─── Field config (GIỮ NGUYÊN nghiệp vụ) ───────────────────────────────────
const TOP_ROW_FIELD_IDS = ['itemCode', 'itemName', 'itemType', 'brandName'];
const PRICE_FIELD_IDS = ['purchasePrice', 'salePrice'];
const EXCLUDED_FROM_DESC = ['description', 'defaultWarehouseName', 'onHandQty', 'reservedQty', 'sellableQty', ...PRICE_FIELD_IDS];
const ACCOUNT_IDS = ['inventoryAccount', 'revenueAccount'];

const FULL_WAREHOUSE_KEEPER_FIELDS = [
    { id: 'itemCode', label: 'Mã vật tư', getValue: (item) => item.itemCode ?? '—' },
    { id: 'itemName', label: 'Tên vật tư', getValue: (item) => item.itemName ?? '—' },
    { id: 'itemType', label: 'Dạng vật tư', getValue: (item) => item.itemType ?? '—' },
    { id: 'description', label: 'Mô tả', getValue: (item) => item.description || '—' },
    { id: 'categoryName', label: 'Danh mục', getValue: (item) => (item.categoryName || item.categoryId) ?? '—' },
    { id: 'brandName', label: 'Thương hiệu', getValue: (item) => (item.brandName || item.brandId) ?? '—' },
    { id: 'baseUomName', label: 'Đơn vị tính', getValue: (item) => (item.baseUomName || item.baseUomId) ?? '—' },
    { id: 'packagingSpec', label: 'Quy cách đóng gói', getValue: (item) => (item.packagingSpecName || item.packagingSpecId) ?? '—' },
    { id: 'requiresCO', label: 'Yêu cầu CO', getValue: (item) => (item.requiresCO ? 'Có' : 'Không') },
    { id: 'requiresCQ', label: 'Yêu cầu CQ', getValue: (item) => (item.requiresCQ ? 'Có' : 'Không') },
    { id: 'isActive', label: 'Trạng thái giao dịch', getValue: (item) => (item.isActive ? 'Đang giao dịch' : 'Tạm dừng') },
    { id: 'defaultWarehouseName', label: 'Kho mặc định', getValue: (item) => (item.defaultWarehouseName || item.defaultWarehouseId) ?? '—' },
    { id: 'inventoryAccount', label: 'Tài khoản kho', getValue: (item) => item.inventoryAccount ?? '—', mono: true },
    { id: 'revenueAccount', label: 'Tài khoản doanh thu', getValue: (item) => item.revenueAccount ?? '—', mono: true },
    { id: 'purchasePrice', label: 'Giá nhập', getValue: (item) => formatPrice(item.purchasePrice), highlight: true, mono: true },
    { id: 'salePrice', label: 'Giá bán', getValue: (item) => formatPrice(item.salePrice), highlight: true, mono: true },
    { id: 'onHandQty', label: 'Số lượng tồn kho', getValue: (item) => formatQty(item.onHandQty), highlight: true, mono: true },
    { id: 'reservedQty', label: 'Số lượng đặt trước', getValue: (item) => formatQty(item.reservedQty), mono: true },
    { id: 'sellableQty', label: 'Số lượng có thể bán', getValue: (item) => formatQty(getSellableQty(item)), highlight: true, mono: true },
    { id: 'createdAt', label: 'Ngày tạo', getValue: (item) => formatDateTime(item.createdAt) },
    { id: 'updatedAt', label: 'Ngày cập nhật', getValue: (item) => formatDateTime(item.updatedAt) },
];

const ACCOUNTANT_DETAIL_FIELDS = [
    { id: 'inventoryAccount', label: 'Tài khoản kho', getValue: (item) => item.inventoryAccount ?? '—', mono: true },
    { id: 'revenueAccount', label: 'Tài khoản doanh thu', getValue: (item) => item.revenueAccount ?? '—', mono: true },
    { id: 'salePrice', label: 'Giá bán', getValue: (item) => formatPrice(item.salePrice), highlight: true, mono: true },
    { id: 'onHandQty', label: 'Số lượng tồn', getValue: (item) => formatQty(item.onHandQty), mono: true },
    {
        id: 'inventoryValue',
        label: 'Giá trị tồn kho (ước tính)',
        getValue: (item) => (item.onHandQty != null && item.salePrice != null)
            ? formatPrice(Number(item.onHandQty) * Number(item.salePrice))
            : '—',
        highlight: true,
        mono: true,
    },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function ViewItemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));

    const isAccountant = isAccountantView(permissionRole);
    const isWhKeeper = isWarehouseKeeper(permissionRole);
    const canEdit = canEditItem(permissionRole);
    const showStockBlock = showStockBlockForRole(permissionRole);
    const canViewItemHistory = showStockBlock || isAccountant;
    const showFullPrices = canSeeFullPrices(permissionRole);

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        setLoading(true);
        setFetchError(null);
        setItem(null);
        getItemDetail(Number(id))
            .then((data) => setItem(data))
            .catch((err) => {
                console.error('[ViewItemDetail] fetch error:', err);
                setFetchError(err?.response?.data?.message || err.message || 'Không thể tải chi tiết vật tư');
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
                <div className="spinner" style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
        );
    }

    if (fetchError) {
        return (
            <div style={{ minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 48, backgroundColor: '#f8fafc' }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={32} color="#ef4444" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>{fetchError}</div>
                <button type="button" onClick={() => navigate('/products')} className="btn btn-primary">
                    <ArrowLeft size={16} />
                    Quay lại danh sách
                </button>
            </div>
        );
    }

    if (item == null) {
        return (
            <div style={{ minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 48, backgroundColor: '#f8fafc' }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={32} color="#9ca3af" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#6b7280' }}>Không tìm thấy vật tư</div>
                <div style={{ fontSize: 14, color: '#9ca3af' }}>Mã hoặc ID không tồn tại. Vui lòng quay lại danh sách.</div>
                <button type="button" onClick={() => navigate('/products')} className="btn btn-primary">
                    <ArrowLeft size={16} />
                    Quay lại danh sách
                </button>
            </div>
        );
    }

    const stockHistory = item.inventoryHistory ?? [];
    const itemWarehouses =
        (item.inventoryByWarehouse ?? []).length > 0
            ? item.inventoryByWarehouse
            : [{ warehouseName: item.defaultWarehouseName || 'Kho chính', onHandQty: item.onHandQty ?? 0, reservedQty: item.reservedQty ?? 0 }];

    const statusConfig = item.isActive ? ITEM_STATUS_CONFIG.active : ITEM_STATUS_CONFIG.inactive;

    const baseFields = isWhKeeper ? FULL_WAREHOUSE_KEEPER_FIELDS : [];
    const visibleFields = baseFields.filter((f) => {
        if (TOP_ROW_FIELD_IDS.includes(f.id)) return false;
        if (EXCLUDED_FROM_DESC.includes(f.id)) return false;
        if (!showFullPrices && ACCOUNT_IDS.includes(f.id)) return false;
        return true;
    });
    const topFields = baseFields.filter((f) => TOP_ROW_FIELD_IDS.includes(f.id));
    const accFields = isAccountant ? ACCOUNTANT_DETAIL_FIELDS : [];

    const avgWarehousePrice = getAverageWarehousePrice(item);

    return (
        <div className="create-supplier-page">
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate('/products')} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    {canEdit && (
                        <button type="button" className="btn btn-primary" onClick={() => navigate(`/items/edit/${item.itemId}`)}>
                            <Edit3 size={15} />
                            Chỉnh sửa
                        </button>
                    )}
                </div>
            </div>

            <div className="form-card">
                <div className="form-wrapper">
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <h1 className="page-title">Chi tiết vật tư</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    Mã vật tư: <strong style={{ color: '#0284c7', fontSize: '15px' }}>{item.itemCode}</strong>
                                    &nbsp;&bull;&nbsp;
                                    {item.brandName || item.categoryName || '—'}
                                </p>
                            </div>
                            <StatusBadge config={statusConfig} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '24px', alignItems: 'start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Thông tin chung</h2>
                                </div>

                                {isWhKeeper ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                            <div
                                                style={{
                                                    width: 120,
                                                    minWidth: 120,
                                                    height: 120,
                                                    borderRadius: 12,
                                                    border: '2px solid #e5e7eb',
                                                    backgroundColor: '#f3f4f6',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <Package size={48} color="#9ca3af" />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: 0 }}>
                                                {topFields.map((f) => (
                                                    <div key={f.id}>
                                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '3px' }}>{f.label}</div>
                                                        <div
                                                            style={{
                                                                padding: '6px 10px',
                                                                borderRadius: '8px',
                                                                border: f.highlight ? '1px solid #0284c7' : '1px solid #e5e7eb',
                                                                backgroundColor: f.highlight ? '#f0f9ff' : '#f9fafb',
                                                                fontSize: '14px',
                                                                fontWeight: f.highlight ? 600 : 500,
                                                                color: f.highlight ? '#0284c7' : '#374151',
                                                            }}
                                                        >
                                                            {f.getValue(item)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {item.description && (
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Mô tả</div>
                                                <div
                                                    style={{
                                                        padding: '12px',
                                                        borderRadius: '10px',
                                                        border: '1px solid #e5e7eb',
                                                        backgroundColor: '#f9fafb',
                                                        fontSize: '14px',
                                                        color: '#374151',
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word',
                                                        lineHeight: 1.6,
                                                    }}
                                                >
                                                    {item.description}
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                                            {visibleFields.map((f) => (
                                                <FieldRow key={f.id} label={f.label} value={f.getValue(item)} highlight={f.highlight} mono={f.mono} />
                                            ))}
                                        </div>

                                        {!showFullPrices && avgWarehousePrice && (
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Giá trung bình trong kho</div>
                                                <div
                                                    style={{
                                                        padding: '12px',
                                                        backgroundColor: '#f8fafc',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '10px',
                                                        fontSize: '16px',
                                                        fontWeight: 700,
                                                        color: '#0284c7',
                                                        fontVariantNumeric: 'tabular-nums',
                                                    }}
                                                >
                                                    {formatPrice(avgWarehousePrice)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                            <div
                                                style={{
                                                    width: 120,
                                                    minWidth: 120,
                                                    height: 120,
                                                    borderRadius: 12,
                                                    border: '2px solid #e5e7eb',
                                                    backgroundColor: '#f3f4f6',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <Package size={48} color="#9ca3af" />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: 0 }}>
                                                <FieldRow label="Tên vật tư" value={item.itemName || '—'} highlight />
                                                <FieldRow label="Thương hiệu / Loại" value={item.brandName || item.itemType || item.categoryName || '—'} />
                                                <FieldRow label="Danh mục" value={item.categoryName || '—'} />
                                            </div>
                                        </div>

                                        {item.description && (
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Mô tả</div>
                                                <div style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}>
                                                    {item.description}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {isWhKeeper && (
                                <div className="info-section" style={{ margin: 0 }}>
                                    <div className="section-header-with-toggle">
                                        <h2 className="section-title">
                                            <TrendingUp size={16} style={{ marginRight: 6 }} />
                                            Thông tin tồn kho
                                        </h2>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <StatCard label="Số lượng tồn" value={formatQty(item.onHandQty)} highlight />
                                        <StatCard label="Số lượng đặt trước" value={formatQty(item.reservedQty)} />
                                        <StatCard label="Số lượng có thể bán" value={formatQty(getSellableQty(item))} color="#10b981" highlight />
                                        {showFullPrices && (
                                            <>
                                                <StatCard label="Giá bán" value={formatPrice(item.salePrice)} highlight />
                                                <StatCard label="Giá nhập" value={formatPrice(item.purchasePrice)} />
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {isAccountant && (
                                <div className="info-section" style={{ margin: 0 }}>
                                    <div className="section-header-with-toggle">
                                        <h2 className="section-title">
                                            <Settings size={16} style={{ marginRight: 6 }} />
                                            Thông tin giá và kế toán
                                        </h2>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {accFields.map((f) => (
                                            <FieldRow key={f.id} label={f.label} value={f.getValue(item)} highlight={f.highlight} mono={f.mono} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!isWhKeeper && (
                                <div className="info-section" style={{ margin: 0 }}>
                                    <div className="section-header-with-toggle">
                                        <h2 className="section-title">Thông tin bổ sung</h2>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <FieldRow label="Đơn vị tính" value={item.baseUomName || item.baseUomId || '—'} />
                                        <FieldRow label="Quy cách đóng gói" value={item.packagingSpecName || item.packagingSpecId || '—'} />
                                        <FieldRow label="Yêu cầu CO" value={item.requiresCO ? 'Có' : 'Không'} />
                                        <FieldRow label="Yêu cầu CQ" value={item.requiresCQ ? 'Có' : 'Không'} />
                                        <FieldRow label="Kho mặc định" value={item.defaultWarehouseName || item.defaultWarehouseId || '—'} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {showStockBlock && itemWarehouses.length > 0 && (
                        <div className="info-section" style={{ margin: '24px 0 0 0' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">
                                    <Package size={16} style={{ marginRight: 6 }} />
                                    Số lượng sản phẩm trong kho
                                </h2>
                            </div>
                            <div className="table-container" style={{ overflowY: 'auto', maxHeight: 320 }}>
                                <table className="product-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 50 }}></th>
                                            <th>Mã SKU</th>
                                            <th>Tên phiên bản</th>
                                            <th style={{ textAlign: 'right' }}>Tồn kho</th>
                                            <th style={{ textAlign: 'right' }}>Có thể bán</th>
                                            <th style={{ textAlign: 'right' }}>Đặt trước</th>
                                            <th>Kho</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itemWarehouses.map((wh, idx) => {
                                            const onHand = wh.onHandQty ?? 0;
                                            const reserved = wh.reservedQty ?? 0;
                                            const available = wh.availableQty ?? Math.max(0, onHand - reserved);
                                            const preOrder = wh.preOrderQty ?? 0;
                                            const isDefault = wh.isDefaultWarehouse ?? false;

                                            return (
                                                <tr key={idx}>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Package size={18} color="#9ca3af" />
                                                        </div>
                                                    </td>
                                                    <td style={{ fontWeight: 500 }}>{wh.sku || item.itemCode}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{ fontWeight: 500, color: '#0284c7' }}>{wh.variantName || item.itemName}</span>
                                                            {isDefault && (
                                                                <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: 9999, backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                                                                    Mặc định
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{onHand.toLocaleString('vi-VN')}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{available.toLocaleString('vi-VN')}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: preOrder > 0 || reserved > 0 ? '#d97706' : '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>
                                                        {preOrder > 0 ? preOrder.toLocaleString('vi-VN') : reserved > 0 ? reserved.toLocaleString('vi-VN') : '—'}
                                                    </td>
                                                    <td>{wh.warehouseName}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {canViewItemHistory && (
                        <div className="info-section" style={{ margin: '24px 0 0 0' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Lịch sử tồn kho</h2>
                            </div>

                            {stockHistory.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Chưa có lịch sử tồn kho.</div>
                            ) : (
                                <div className="table-container" style={{ overflowY: 'auto', maxHeight: 360 }}>
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th>Mã phiếu</th>
                                                <th>Loại phiếu</th>
                                                <th style={{ textAlign: 'center' }}>+/-</th>
                                                <th style={{ textAlign: 'right' }}>Số lượng</th>
                                                <th>Người thực hiện</th>
                                                <th>Thời gian</th>
                                                <th>Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stockHistory.map((h, idx) => {
                                                const sign = h.movementSign ?? '+';
                                                const isIn = sign === '+' || sign === 'IN';
                                                const isOut = sign === '-' || sign === 'OUT';
                                                const signColor = isIn ? '#10b981' : isOut ? '#ef4444' : '#374151';
                                                const signBg = isIn ? '#f0fdf4' : isOut ? '#fef2f2' : 'transparent';

                                                const sourceLabel = { GRN: 'Nhập kho', GDN: 'Xuất kho', ADJ: 'Điều chỉnh', STK: 'Kiểm kê' }[h.sourceType] ?? h.sourceType ?? '—';
                                                const sourceColor = { GRN: '#2563eb', GDN: '#d97706', ADJ: '#7c3aed', STK: '#0891b2' }[h.sourceType] ?? '#6b7280';

                                                return (
                                                    <tr key={idx}>
                                                        <td style={{ fontWeight: 500, color: '#0284c7' }}>{h.docNo ?? '—'}</td>
                                                        <td>
                                                            <span
                                                                style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: 600,
                                                                    padding: '2px 8px',
                                                                    borderRadius: 9999,
                                                                    backgroundColor: `${sourceColor}15`,
                                                                    color: sourceColor,
                                                                    border: `1px solid ${sourceColor}40`,
                                                                }}
                                                            >
                                                                {sourceLabel}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center', fontWeight: 700, color: signColor, backgroundColor: signBg }}>{sign}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{Number(h.qty ?? 0).toLocaleString('vi-VN')}</td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>{h.actorName ?? '—'}</td>
                                                        <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>{formatDateTimeFull(h.transactionAt)}</td>
                                                        <td style={{ fontSize: '12px', color: '#6b7280', maxWidth: 160 }}>
                                                            {h.note ? <span style={{ wordBreak: 'break-word' }}>{h.note}</span> : '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
