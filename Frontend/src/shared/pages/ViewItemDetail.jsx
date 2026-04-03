/*
 * ViewItemDetail — Chi tiết vật tư (xem + edit inline tại chỗ).
 * Đã kiểm duyệt với DB: Items, ItemPrices, InventoryOnHand.
 * Full quyền Item (xem/sửa): WAREHOUSE_KEEPER, SALE_SUPPORT, SALE_ENGINEER, ACCOUNTANTS.
 * UI refactor theo design language của ViewPurchaseReturnDetail.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Typography,
    TextField,
    Button,
    MenuItem,
    Autocomplete,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TablePagination,
} from '@mui/material';
import {
    ArrowLeft,
    Package,
    Edit3,
    Save,
    Plus,
    X,
    Layers,
    Scale,
    MapPin,
    Warehouse,
    CheckCircle,
    Loader,
    Clock,
    RefreshCw,
} from 'lucide-react';
import authService from '../lib/authService';
import { getItemDetail, updateItem } from '../lib/itemService';
import apiClient from '../lib/axios';
import { getPermissionRole, getRawRoleFromUser, isAccountantView } from '../permissions/roleUtils';
import { useMasterData } from '../../app/context/MasterDataContext';
import { createUom } from '../lib/uomService';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateSupplier.css';

// ─── Role helpers ─────────────────────────────────────────────────────────
const isWarehouseKeeper = (role) => role === 'WAREHOUSE_KEEPER';
const canEditItem = (role) => ['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS'].includes(role);
const canSeeFullPrices = (role) => role === 'ACCOUNTANTS' || role === 'DIRECTOR';
const showStockBlockForRole = (role) => ['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS', 'DIRECTOR'].includes(role);

// ─── Formatters ───────────────────────────────────────────────────────────
const formatPrice = (value) => {
    if (value == null || value === '') return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));
};

const formatQty = (value) => (value != null ? Number(value).toLocaleString('vi-VN') : '—');

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

const formatDateTimeFull = (v) => {
    if (v == null || v === '') return '—';
    const d = parseUtcDate(v);
    if (!d) return String(v);
    return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

const formatDateFull = (v) => {
    if (v == null || v === '') return '—';
    const d = parseUtcDate(v);
    if (!d) return String(v);
    return d.toLocaleDateString('vi-VN');
};

// ─── Edit form constants ──────────────────────────────────────────────────
const NUMBER_FIELDS = new Set([
    'categoryId', 'brandId', 'baseUomId', 'packagingSpecId', 'specId', 'defaultWarehouseId',
]);

const CREATE_UOM_OPTION = { id: 'CREATE_UOM', code: '', name: 'Tạo mới đơn vị tính' };
const CREATE_PACK_OPTION = { id: 'CREATE_PACK', name: 'Tạo mới quy cách đóng gói' };

// ─── Design tokens ────────────────────────────────────────────────────────
const EDIT_BG = '#f8fafc';
const EDIT_BORDER = '#e2e8f0';
const EDIT_FOCUS_BORDER = '#94a3b8';
const EDIT_RADIUS = 8;
const FIELD_GAP = 16;
const ROW_HEIGHT = 32;

const LABEL_STYLE = { fontSize: '13px', color: '#64748b', fontWeight: 600 };
const FIELD_WRAPPER = { display: 'flex', flexDirection: 'column', gap: '4px' };

// ─── Shared edit input styles ─────────────────────────────────────────────
const baseEditInput = {
    borderRadius: EDIT_RADIUS,
    backgroundColor: EDIT_BG,
    '& fieldset': { borderColor: EDIT_BORDER, borderRadius: EDIT_RADIUS },
    '&:hover fieldset': { borderColor: '#cbd5e1' },
    '& .MuiOutlinedInput-root.Mui-focused': {
        boxShadow: '0 0 0 2px rgba(148,163,184,0.15)',
        '& fieldset': { borderColor: EDIT_FOCUS_BORDER + ' !important' },
    },
};

const editTextSx = {
    '& .MuiOutlinedInput-root': {
        ...baseEditInput,
        minHeight: ROW_HEIGHT,
        fontSize: '14px',
        padding: '0 12px',
        '& .MuiInputBase-input': {
            padding: '0', fontSize: '14px', color: '#334155',
        },
        '& .MuiInputBase-input::placeholder': { color: '#9ca3af', opacity: 1 },
    },
    '& .MuiInputLabel-root': {
        fontSize: '13px', color: '#64748b', fontWeight: 600,
        transform: 'none', position: 'relative', marginBottom: '2px',
        '&.Mui-focused': { color: '#64748b' },
    },
};

const editTextareaSx = {
    ...editTextSx,
    '& .MuiOutlinedInput-root': {
        ...baseEditInput,
        minHeight: 'auto',
        padding: '8px 12px',
        alignItems: 'flex-start',
        '& .MuiInputBase-input': {
            padding: '0', fontSize: '14px', color: '#334155', lineHeight: 1.6,
        },
        '& .MuiInputBase-input::placeholder': { color: '#9ca3af', opacity: 1 },
    },
};

const editSelectSx = {
    '& .MuiOutlinedInput-root': {
        ...baseEditInput,
        minHeight: ROW_HEIGHT,
        fontSize: '14px',
        padding: '0 32px 0 12px',
        '& .MuiSelect-select': {
            padding: '0', display: 'flex', alignItems: 'center',
            whiteSpace: 'normal', overflow: 'visible',
            fontSize: '14px', color: '#334155', minHeight: ROW_HEIGHT,
        },
    },
    '& .MuiInputLabel-root': {
        fontSize: '13px', color: '#64748b', fontWeight: 600,
        transform: 'none', position: 'relative', marginBottom: '2px',
        '&.Mui-focused': { color: '#64748b' },
    },
};

const selectMenuProps = {
    PaperProps: { sx: { borderRadius: 2, maxHeight: 280 } },
    disableScrollLock: true,
};

// ─── Shared UI components ─────────────────────────────────────────────────

// StatusBadge
const StatusBadge = ({ config }) => (
    <div style={{
        padding: '6px 14px', borderRadius: 20,
        backgroundColor: config.bg, color: config.color,
        fontWeight: 600, fontSize: '13px',
        display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
    }}>
        {config.icon}
        {config.label}
    </div>
);

// StatBox — stat card cho right column
const StatBox = ({ label, value, color = '#0f172a', bg = '#f8fafc', borderColor = '#e2e8f0', icon: Icon }) => (
    <div style={{
        padding: '10px 14px', backgroundColor: bg,
        border: `1px solid ${borderColor}`, borderRadius: '10px',
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {Icon && <Icon size={13} color="#64748b" />}
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700, color }}>{value}</div>
    </div>
);

// ReadOnlyUnderline
const ReadOnlyUnderline = ({ children, highlight = false }) => (
    <div style={{
        padding: '0 0 6px 0',
        borderBottom: `1px solid ${highlight ? '#3b82f6' : 'rgba(0, 0, 0, 0.1)'}`,
        fontSize: '14px',
        fontWeight: highlight ? 600 : 500,
        color: highlight ? '#1d4ed8' : '#334155',
        minHeight: ROW_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        flex: 1,
        wordBreak: 'break-word',
    }}>
        {children || <span style={{ color: '#9ca3af' }}>—</span>}
    </div>
);

// DescriptionBlock
const DescriptionBlock = ({ children }) => (
    <div style={{
        padding: '0 0 6px 0',
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        fontSize: '14px', color: '#334155',
        lineHeight: 1.6, wordBreak: 'break-word',
        minHeight: '28px',
    }}>
        {children || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa có mô tả</span>}
    </div>
);

// CreateOptionContent
const CreateOptionContent = ({ label }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Plus size={16} strokeWidth={2.5} />
        </Box>
        <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</Typography>
    </Box>
);

// Inline CreateUomDialog
function InlineCreateUomDialog({ open, onClose, onSubmit }) {
    const [uomCode, setUomCode] = useState('');
    const [uomName, setUomName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) { setUomCode(''); setUomName(''); setSubmitting(false); setError(null); }
    }, [open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const code = (uomCode || '').trim();
        const name = (uomName || '').trim();
        if (!code || !name) return;
        setSubmitting(true);
        setError(null);
        try {
            const response = await createUom({ uomCode: code, uomName: name });
            const data = response?.data ?? response;
            const id = data?.uomId ?? data?.UomId ?? data?.id;
            if (id == null) { setError('Không nhận được ID đơn vị tính từ server.'); setSubmitting(false); return; }
            onSubmit({ id, code: data?.uomCode ?? code, name: data?.uomName ?? name });
            onClose();
        } catch (err) {
            setError(err?.response?.data?.message ?? err?.message ?? 'Không thể tạo đơn vị tính.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle>Tạo mới đơn vị tính</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ pt: 2, pb: 1 }}>
                    <TextField fullWidth size="small" label="Mã đơn vị tính" value={uomCode}
                        onChange={(e) => setUomCode(e.target.value)} required placeholder="VD: CAI, HOP"
                        sx={editTextSx} InputLabelProps={{ shrink: true }} />
                    <TextField fullWidth size="small" label="Tên đơn vị tính" value={uomName}
                        onChange={(e) => setUomName(e.target.value)} required placeholder="VD: Cái, Hộp"
                        error={Boolean(error)} helperText={error} sx={editTextSx} InputLabelProps={{ shrink: true }} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={onClose} sx={{ textTransform: 'none' }} disabled={submitting}>Hủy</Button>
                    <Button type="submit" variant="contained" sx={{ textTransform: 'none' }} disabled={submitting}>
                        {submitting ? 'Đang tạo…' : 'Tạo'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

// Inline CreatePackagingSpecDialog
function InlineCreatePackagingSpecDialog({ open, onClose, onSubmit }) {
    const [specName, setSpecName] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) { setSpecName(''); setDescription(''); setSubmitting(false); }
    }, [open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const name = (specName || '').trim();
        if (!name) return;
        setSubmitting(true);
        try {
            await Promise.resolve(onSubmit({ packagingSpecId: null, specName: name, name, description: (description || '').trim() || null }));
            onClose();
        } catch (_) {} finally { setSubmitting(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle>Tạo mới quy cách đóng gói</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ pt: 2, pb: 1 }}>
                    <TextField fullWidth size="small" label="Tên quy cách" value={specName}
                        onChange={(e) => setSpecName(e.target.value)} required placeholder="VD: Hộp, Thùng carton"
                        sx={editTextSx} InputLabelProps={{ shrink: true }} />
                    <TextField fullWidth size="small" label="Mô tả (tùy chọn)" value={description}
                        onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả quy cách"
                        sx={editTextSx} InputLabelProps={{ shrink: true }} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={onClose} sx={{ textTransform: 'none' }} disabled={submitting}>Hủy</Button>
                    <Button type="submit" variant="contained" sx={{ textTransform: 'none' }} disabled={submitting}>
                        {submitting ? 'Đang tạo…' : 'Tạo'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function ViewItemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const timerRef = useRef(null);
    const { uoms, categories, brands, warehouses } = useMasterData() || {};
    const masterWarehouses = warehouses || [];
    const masterCategories = categories || [];
    const masterBrands = brands || [];

    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const isAccountant = isAccountantView(permissionRole);
    const canEdit = canEditItem(permissionRole);
    const showStockBlock = showStockBlockForRole(permissionRole);
    const canViewItemHistory = showStockBlock || isAccountant;
    const showFullPrices = canSeeFullPrices(permissionRole);

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({});
    const [localUomOptions, setLocalUomOptions] = useState([]);
    const [localPackOptions, setLocalPackOptions] = useState([]);
    const [createUomOpen, setCreateUomOpen] = useState(false);
    const [createPackOpen, setCreatePackOpen] = useState(false);

    // History pagination (0-based for MUI TablePagination)
    const [historyPage, setHistoryPage] = useState(0);
    const [historyPageSize, setHistoryPageSize] = useState(10);
    const [historyTotal, setHistoryTotal] = useState(0);

    // Reset page khi đổi item
    useEffect(() => { setHistoryPage(0); }, [id]);

    // ─── Load item ────────────────────────────────────────────────────────
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

    // ─── Load history riêng khi đổi trang ────────────────────────────────
    useEffect(() => {
        if (!item) return;
        apiClient.get(`/Item/detail/${item.itemId}?historyPage=${historyPage + 1}&historyPageSize=${historyPageSize}`)
            .then((res) => {
                const payload = res?.data?.data ?? res?.data ?? {};
                const rawHistory = payload.inventoryHistory ?? payload.InventoryHistory ?? [];
                const mapped = (rawHistory || []).map((h) => ({
                    docNo: h.docNo ?? h.DocNo ?? '',
                    movementSign: h.movementSign ?? h.MovementSign ?? '+',
                    qty: h.qty ?? h.Qty ?? 0,
                    transactionAt: h.transactionAt ?? h.TransactionAt ?? null,
                    actorName: h.actorName ?? h.ActorName ?? null,
                    note: h.note ?? h.Note ?? null,
                    sourceType: h.sourceType ?? h.SourceType ?? '',
                }));
                setItem((prev) => ({ ...prev, inventoryHistory: mapped }));
                setHistoryTotal(payload.historyTotalCount ?? payload.HistoryTotalCount ?? 0);
            })
            .catch(() => {});
    }, [item?.itemId, historyPage, historyPageSize]);

    useEffect(() => {
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);

    useEffect(() => {
        if (uoms) setLocalUomOptions(uoms.map((u) => ({ id: u.uomId ?? u.id, code: u.uomCode ?? u.code, name: u.uomName ?? u.name })));
    }, [uoms]);


    // ─── Edit handlers ───────────────────────────────────────────────────
    const handleEdit = () => {
        if (!item) return;
        setFormData({
            itemName: item.itemName ?? '',
            itemType: item.itemType ?? 'Product',
            description: item.description ?? '',
            categoryId: item.categoryId ?? '',
            brandId: item.brandId ?? '',
            baseUomId: item.baseUomId ?? '',
            packagingSpecId: item.packagingSpecId ?? '',
            specification: item.specification ?? '',
            requiresCO: item.requiresCO ?? false,
            requiresCQ: item.requiresCQ ?? false,
            defaultWarehouseId: item.defaultWarehouseId ?? '',
        });
        setIsEditing(true);
        setIsDirty(false);
    };

    const handleCancel = () => {
        if (isDirty) {
            if (!window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy?')) return;
        }
        setIsEditing(false);
        setIsDirty(false);
        setFormData({});
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let nextValue;
        if (type === 'checkbox') nextValue = checked;
        else if (NUMBER_FIELDS.has(name)) nextValue = value === '' ? '' : Number(value);
        else nextValue = value;
        setFormData((prev) => ({ ...prev, [name]: nextValue }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        if (!item) return;
        try {
            setSaving(true);
            await updateItem(item.itemId, {
                itemName: formData.itemName,
                itemType: formData.itemType,
                description: formData.description,
                categoryId: formData.categoryId,
                brandId: formData.brandId || null,
                baseUomId: formData.baseUomId,
                packagingSpecId: formData.packagingSpecId || null,
                requiresCo: formData.requiresCO,
                requiresCq: formData.requiresCQ,
                defaultWarehouseId: formData.defaultWarehouseId || null,
            });
            showToast('Cập nhật vật tư thành công!', 'success');
            setIsEditing(false);
            setIsDirty(false);
            const updated = await getItemDetail(Number(id));
            setItem(updated);
        } catch (err) {
            showToast(err?.response?.data?.message || err.message || 'Không thể cập nhật vật tư', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleBack = () => {
        if (isDirty && isEditing) {
            if (!window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời đi?')) return;
        }
        navigate('/products');
    };

    const allUomOptions = [...localUomOptions];
    const allPackOptions = [...localPackOptions];

    // ─── Render helpers ───────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="create-supplier-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280' }}>
                    <Loader size={18} className="spinner" />
                    Đang tải chi tiết vật tư...
                </div>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="create-supplier-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ color: '#dc2626', textAlign: 'center' }}>
                    <X size={28} style={{ marginBottom: 8 }} />
                    <div>{fetchError}</div>
                </div>
            </div>
        );
    }

    if (item == null) {
        return (
            <div className="create-supplier-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ color: '#6b7280', textAlign: 'center' }}>
                    <Package size={28} style={{ marginBottom: 8 }} />
                    <div>Không tìm thấy vật tư</div>
                </div>
            </div>
        );
    }

    const stockHistory = item.inventoryHistory ?? [];
    const itemWarehouses =
        (item.inventoryByWarehouse ?? []).length > 0
            ? item.inventoryByWarehouse
            : [{ warehouseName: item.defaultWarehouseName || 'Kho chính', onHandQty: item.onHandQty ?? 0, reservedQty: item.reservedQty ?? 0 }];
    const totalPages = Math.ceil((item.historyTotalCount ?? 0) / historyPageSize) || 1;

    const statusConfig = item.isActive
        ? { label: 'Đang giao dịch', color: '#047857', bg: 'rgba(16,185,129,0.18)', icon: <CheckCircle size={16} /> }
        : { label: 'Tạm dừng', color: '#b91c1c', bg: 'rgba(239,68,68,0.15)', icon: <X size={16} /> };

    // Computed stats
    const totalOnHand = itemWarehouses.reduce((s, w) => s + (w.onHandQty ?? 0), 0);
    const totalReserved = itemWarehouses.reduce((s, w) => s + (w.reservedQty ?? 0), 0);
    const totalAvailable = itemWarehouses.reduce((s, w) => s + (w.availableQty ?? Math.max(0, (w.onHandQty ?? 0) - (w.reservedQty ?? 0))), 0);
    const totalPreOrder = itemWarehouses.reduce((s, w) => s + (w.preOrderQty ?? 0), 0);

    return (
        <div className="create-supplier-page">
            {/* ─── PAGE HEADER ─── */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={handleBack} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại danh sách</span>
                    </button>
                </div>

                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isEditing && (
                        <>
                            <button type="button" className="btn btn-cancel" onClick={handleCancel} disabled={saving}>
                                <X size={15} />
                                Hủy
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader size={15} className="spinner" />
                                        Đang xử lý...
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

                    {!isEditing && canEdit && (
                        <button type="button" className="btn btn-primary" onClick={handleEdit}>
                            <Edit3 size={15} />
                            Chỉnh sửa
                        </button>
                    )}
                </div>
            </div>

            <div className="form-card">
                <div className="form-wrapper">
                    {/* ─── FORM CARD INTRO ─── */}
                    <div className="form-card-intro">
                        <div>
                            <h1 className="page-title">{isEditing ? 'Chỉnh sửa vật tư' : 'Chi tiết vật tư'}</h1>
                            <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                Mã vật tư:{' '}
                                <span style={{ fontWeight: 600, color: '#2196F3' }}>{item.itemCode}</span>
                            </p>
                        </div>
                    </div>

                    {/* ─── MAIN GRID ─── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>

                        {/* ══════════════════════════════════════════════ */}
                        {/* LEFT COLUMN                                     */}
                        {/* ══════════════════════════════════════════════ */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                            {/* ── CARD 1: Thông tin chung ── */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Thông tin chung</h2>
                                </div>

                                {/* Ảnh to bên trái | Info bên phải */}
                                <div style={{ display: 'flex', gap: FIELD_GAP, alignItems: 'flex-start' }}>
                                    {/* Ảnh vật tư */}
                                    <div style={{
                                        width: 160, minWidth: 160, height: 160, borderRadius: 12,
                                        border: '1px solid #e5e7eb', backgroundColor: '#f1f5f9',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        <Package size={72} color="#cbd5e1" />
                                    </div>

                                    {/* Info panel */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        {/* Tên vật tư — to, nổi bật */}
                                        <div style={FIELD_WRAPPER}>
                                            <div style={LABEL_STYLE}>Tên vật tư</div>
                                            {isEditing ? (
                                                <TextField fullWidth size="small" name="itemName"
                                                    value={formData.itemName || ''} onChange={handleChange} required
                                                    InputLabelProps={{ shrink: true }} sx={editTextSx} />
                                            ) : (
                                                <ReadOnlyUnderline highlight>{item.itemName || '—'}</ReadOnlyUnderline>
                                            )}
                                        </div>

                                        {/* Thương hiệu */}
                                        <div style={FIELD_WRAPPER}>
                                            <div style={LABEL_STYLE}>Thương hiệu</div>
                                            {isEditing ? (
                                                <TextField select fullWidth size="small" name="brandId"
                                                    value={String(formData.brandId ?? '')} onChange={handleChange}
                                                    sx={editSelectSx} InputLabelProps={{ shrink: true }}
                                                    SelectProps={{
                                                        displayEmpty: true,
                                                        renderValue: (v) => v === '' ? (
                                                            <span style={{ color: '#9ca3af', fontSize: '14px' }}>Chọn nhãn hiệu</span>
                                                        ) : (
                                                            <span style={{ fontSize: '14px' }}>
                                                                {masterBrands.find((o) => String(o.brandId) === String(v))?.brandName ?? ''}
                                                            </span>
                                                        ),
                                                        MenuProps: selectMenuProps,
                                                    }}>
                                                    <MenuItem value="" sx={{ fontSize: '14px' }}>Chọn nhãn hiệu</MenuItem>
                                                    {masterBrands.map((o) => (
                                                        <MenuItem key={o.brandId} value={String(o.brandId)} sx={{ fontSize: '14px' }}>{o.brandName}</MenuItem>
                                                    ))}
                                                </TextField>
                                            ) : (
                                                <ReadOnlyUnderline>{item.brandName || '—'}</ReadOnlyUnderline>
                                            )}
                                        </div>

                                        {/* Mô tả */}
                                        <div style={FIELD_WRAPPER}>
                                            <div style={LABEL_STYLE}>Mô tả</div>
                                            {isEditing ? (
                                                <TextField fullWidth size="small" name="description"
                                                    value={formData.description || ''} onChange={handleChange}
                                                    multiline rows={3} InputLabelProps={{ shrink: true }} sx={editTextareaSx} />
                                            ) : (
                                                <DescriptionBlock>{item.description}</DescriptionBlock>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── CARD 2: Tồn kho theo kho ── */}
                            {showStockBlock && itemWarehouses.length > 0 && (
                                <div className="info-section" style={{ margin: 0 }}>
                                    <div className="section-header-with-toggle">
                                        <h2 className="section-title">
                                            <Warehouse size={16} style={{ marginRight: 6 }} />
                                            Tồn kho theo kho
                                        </h2>
                                    </div>

                                    {/* Mini summary row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                                        <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Tổng tồn</div>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{formatQty(totalOnHand)}</div>
                                        </div>
                                        <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px' }}>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Có thể bán</div>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#10b981' }}>{formatQty(totalAvailable)}</div>
                                        </div>
                                        {(totalReserved > 0 || totalPreOrder > 0) && (
                                            <div style={{ padding: '10px 14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px' }}>
                                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Đang giữ</div>
                                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#d97706' }}>{formatQty(totalPreOrder > 0 ? totalPreOrder : totalReserved)}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bảng tồn kho theo kho */}
                                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                                        Item đang có trong <strong style={{ color: '#374151' }}>{itemWarehouses.length}</strong> kho
                                    </div>
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th>Kho</th>
                                                <th style={{ textAlign: 'right' }}>Tồn kho</th>
                                                <th style={{ textAlign: 'right' }}>Có thể bán</th>
                                                <th style={{ textAlign: 'right' }}>Đang giữ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itemWarehouses.map((wh, idx) => {
                                                const onHand = wh.onHandQty ?? 0;
                                                const reserved = wh.reservedQty ?? 0;
                                                const available = wh.availableQty ?? Math.max(0, onHand - reserved);
                                                const preOrder = wh.preOrderQty ?? 0;
                                                const held = preOrder > 0 ? preOrder : reserved > 0 ? reserved : 0;
                                                return (
                                                    <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? '#fafafa' : 'transparent' }}>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <MapPin size={13} color="#94a3b8" />
                                                                <span style={{ fontWeight: 500, fontSize: '13px' }}>{wh.warehouseName}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{onHand.toLocaleString('vi-VN')}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{available.toLocaleString('vi-VN')}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600, color: held > 0 ? '#d97706' : '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>{held > 0 ? held.toLocaleString('vi-VN') : '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* ── CARD 3: Lịch sử tồn kho ── */}
                            {canViewItemHistory && (
                                <div className="info-section" style={{ margin: 0 }}>
                                    <div className="section-header-with-toggle">
                                        <h2 className="section-title">Lịch sử tồn kho</h2>
                                    </div>
                                    {stockHistory.length === 0 ? (
                                        <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                                            <RefreshCw size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                                            <p style={{ margin: 0 }}>Chưa có lịch sử tồn kho.</p>
                                        </div>
                                    ) : (
                                        <div className="table-container" style={{ overflowY: 'auto', maxHeight: 320 }}>
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
                                                            <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? '#fafafa' : 'transparent' }}>
                                                                <td style={{ fontWeight: 500, color: '#2196F3', fontSize: '13px' }}>{h.docNo ?? '—'}</td>
                                                                <td>
                                                                    <span style={{
                                                                        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
                                                                        backgroundColor: `${sourceColor}15`, color: sourceColor, border: `1px solid ${sourceColor}40`,
                                                                    }}>
                                                                        {sourceLabel}
                                                                    </span>
                                                                </td>
                                                                <td style={{ textAlign: 'center', fontWeight: 700, color: signColor, backgroundColor: signBg, borderRadius: 4 }}>{sign}</td>
                                                                <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: signColor }}>{Number(h.qty ?? 0).toLocaleString('vi-VN')}</td>
                                                                <td style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>{h.actorName ?? '—'}</td>
                                                                <td style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDateTimeFull(h.transactionAt)}</td>
                                                                <td style={{ fontSize: '12px', color: '#6b7280', maxWidth: 160 }}>
                                                                    {h.note ? <span style={{ wordBreak: 'break-word' }}>{h.note}</span> : '—'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            <TablePagination
                                                component="div"
                                                count={historyTotal}
                                                page={historyPage}
                                                rowsPerPage={historyPageSize}
                                                onPageChange={(e, newPage) => setHistoryPage(newPage)}
                                                onRowsPerPageChange={(e) => { setHistoryPageSize(Number(e.target.value)); setHistoryPage(0); }}
                                                rowsPerPageOptions={[5, 10, 15, 20]}
                                                labelRowsPerPage="Số dòng / trang"
                                                labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
                                                sx={{ borderTop: 'none', '& .MuiTablePagination-toolbar': { minHeight: '40px' }, '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '13px' } }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ══════════════════════════════════════════════ */}
                        {/* RIGHT COLUMN                                    */}
                        {/* ══════════════════════════════════════════════ */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                            {/* ── CARD: Tồn kho nhanh ── */}
                            

                            {/* ── CARD: Thông tin hệ thống ── */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Thông tin hệ thống</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {/* Trạng thái */}
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Trạng thái</div>
                                        <StatusBadge config={statusConfig} />
                                    </div>

                                    {/* Đơn vị tính */}
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Đơn vị tính</div>
                                        {isEditing ? (
                                            <Autocomplete size="small" fullWidth
                                                options={[CREATE_UOM_OPTION, ...allUomOptions]}
                                                getOptionLabel={(opt) => (opt && opt.name) || ''}
                                                value={allUomOptions.find((o) => String(o.id) === String(formData.baseUomId)) ?? null}
                                                onChange={(e, newValue) => {
                                                    if (newValue && newValue.id === 'CREATE_UOM') { setCreateUomOpen(true); return; }
                                                    handleChange({ target: { name: 'baseUomId', value: newValue?.id ?? '' } });
                                                }}
                                                isOptionEqualToValue={(opt, val) => String(opt?.id) === String(val?.id)}
                                                renderOption={(props, option) => {
                                                    if (option && option.id === 'CREATE_UOM') return (
                                                        <li {...props} key={option.id}>
                                                            <CreateOptionContent label={option.name} />
                                                            <Divider sx={{ mt: 1 }} />
                                                        </li>
                                                    );
                                                    return <li {...props} key={option.id} style={{ fontSize: '14px' }}>{option.name}</li>;
                                                }}
                                                ListboxProps={{ sx: { minWidth: 320, '& li': { fontSize: '14px' } } }}
                                                renderInput={(params) => (
                                                    <TextField {...params}
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': {
                                                                ...baseEditInput,
                                                                minHeight: ROW_HEIGHT,
                                                                '& .MuiInputBase-input': { fontSize: '14px', padding: '0 32px 0 12px', minHeight: ROW_HEIGHT },
                                                            },
                                                            '& .MuiInputLabel-root': { fontSize: '13px', color: '#64748b', fontWeight: 600, transform: 'none', position: 'relative', marginBottom: '2px' },
                                                        }} />
                                                )}
                                            />
                                        ) : (
                                            <div style={{ padding: '0 0 6px 0', borderBottom: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                                                {item.baseUomName || '—'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Loại vật tư */}
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Loại vật tư</div>
                                        {isEditing ? (
                                            <TextField select fullWidth size="small" name="itemType"
                                                value={formData.itemType || 'Product'} onChange={handleChange}
                                                sx={editSelectSx} InputLabelProps={{ shrink: true }}
                                                SelectProps={{ MenuProps: selectMenuProps }}>
                                                <MenuItem value="Product" sx={{ fontSize: '14px' }}>Product</MenuItem>
                                                <MenuItem value="Material" sx={{ fontSize: '14px' }}>Material</MenuItem>
                                                <MenuItem value="Service" sx={{ fontSize: '14px' }}>Service</MenuItem>
                                            </TextField>
                                        ) : (
                                            <div style={{ padding: '0 0 6px 0', borderBottom: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                                                {item.itemType || '—'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Danh mục */}
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Danh mục</div>
                                        {isEditing ? (
                                            <TextField select fullWidth size="small" name="categoryId"
                                                value={String(formData.categoryId ?? '')} onChange={handleChange}
                                                sx={editSelectSx} InputLabelProps={{ shrink: true }}
                                                SelectProps={{
                                                    displayEmpty: true,
                                                    MenuProps: selectMenuProps,
                                                    renderValue: (v) => {
                                                        if (v === '') return <span style={{ color: '#9ca3af', fontSize: '14px' }}>Chọn danh mục</span>;
                                                        const found = masterCategories.find((o) => String(o.categoryId) === String(v));
                                                        return found ? (
                                                            <span style={{ fontSize: '14px', color: '#334155' }}>
                                                                {found.categoryCode ? `${found.categoryCode} - ${found.categoryName}` : found.categoryName}
                                                            </span>
                                                        ) : '';
                                                    },
                                                }}>
                                                <MenuItem value="" sx={{ fontSize: '14px' }}>Chọn danh mục</MenuItem>
                                                {masterCategories.map((o) => (
                                                    <MenuItem key={o.categoryId} value={String(o.categoryId)} sx={{ fontSize: '14px' }}>
                                                        {o.categoryCode ? `${o.categoryCode} - ${o.categoryName}` : o.categoryName}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        ) : (
                                            <div style={{ padding: '0 0 6px 0', borderBottom: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                                                {item.categoryName || '—'}
                                            </div>
                                        )}
                                    </div>

                                    

                                    {/* Quy cách đóng gói */}
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Quy cách đóng gói</div>
                                        {isEditing ? (
                                            <Autocomplete size="small" fullWidth
                                                options={[CREATE_PACK_OPTION, ...allPackOptions]}
                                                getOptionLabel={(opt) => (opt && opt.name) || ''}
                                                value={allPackOptions.find((o) => String(o.id) === String(formData.packagingSpecId)) ?? null}
                                                onChange={(e, newValue) => {
                                                    if (newValue && newValue.id === 'CREATE_PACK') { setCreatePackOpen(true); return; }
                                                    handleChange({ target: { name: 'packagingSpecId', value: newValue?.id ?? '' } });
                                                }}
                                                isOptionEqualToValue={(opt, val) => String(opt?.id) === String(val?.id)}
                                                renderOption={(props, option) => {
                                                    if (option && option.id === 'CREATE_PACK') return (
                                                        <li {...props} key={option.id}>
                                                            <CreateOptionContent label={option.name} />
                                                            <Divider sx={{ mt: 1 }} />
                                                        </li>
                                                    );
                                                    return <li {...props} key={option.id} style={{ fontSize: '14px' }}>{option.name}</li>;
                                                }}
                                                ListboxProps={{ sx: { minWidth: 320, '& li': { fontSize: '14px' } } }}
                                                renderInput={(params) => (
                                                    <TextField {...params}
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': {
                                                                ...baseEditInput,
                                                                minHeight: ROW_HEIGHT,
                                                                '& .MuiInputBase-input': { fontSize: '14px', padding: '0 32px 0 12px', minHeight: ROW_HEIGHT },
                                                            },
                                                            '& .MuiInputLabel-root': { fontSize: '13px', color: '#64748b', fontWeight: 600, transform: 'none', position: 'relative', marginBottom: '2px' },
                                                        }} />
                                                )}
                                            />
                                        ) : (
                                            <div style={{ padding: '0 0 6px 0', borderBottom: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                                                {item.packagingSpecName || '—'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Thông số */}
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Thông số</div>
                                        {isEditing ? (
                                            <TextField fullWidth size="small" name="specification"
                                                value={formData.specification || ''} onChange={handleChange}
                                                InputLabelProps={{ shrink: true }} sx={editTextSx} />
                                        ) : (
                                            <div style={{ padding: '0 0 6px 0', borderBottom: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                                                {item.specification || '—'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Yêu cầu CO + CQ trên cùng 1 hàng */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: FIELD_GAP }}>
                                        {/* CO */}
                                        <div style={FIELD_WRAPPER}>
                                            <div style={LABEL_STYLE}>Yêu cầu CO</div>
                                            {isEditing ? (
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', padding: '4px 0', fontSize: '14px', fontWeight: 500, color: formData.requiresCO ? '#1d4ed8' : '#334155' }}>
                                                    <div style={{
                                                        width: 18, height: 18, borderRadius: 4,
                                                        border: `2px solid ${formData.requiresCO ? '#3b82f6' : '#cbd5e1'}`,
                                                        backgroundColor: formData.requiresCO ? '#3b82f6' : 'transparent',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0,
                                                    }}>
                                                        {formData.requiresCO && (
                                                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                                                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span>{formData.requiresCO ? 'Có' : 'Không'}</span>
                                                    <input type="checkbox" name="requiresCO" checked={!!formData.requiresCO} onChange={handleChange} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                                                </label>
                                            ) : (
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default', userSelect: 'none', padding: '4px 0', fontSize: '14px', fontWeight: 500, color: item.requiresCO ? '#1d4ed8' : '#334155' }}>
                                                    <div style={{
                                                        width: 18, height: 18, borderRadius: 4,
                                                        border: `2px solid ${item.requiresCO ? '#3b82f6' : '#cbd5e1'}`,
                                                        backgroundColor: item.requiresCO ? '#3b82f6' : 'transparent',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0,
                                                    }}>
                                                        {item.requiresCO && (
                                                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                                                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span>{item.requiresCO ? 'Có' : 'Không'}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* CQ */}
                                        <div style={FIELD_WRAPPER}>
                                            <div style={LABEL_STYLE}>Yêu cầu CQ</div>
                                            {isEditing ? (
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', padding: '4px 0', fontSize: '14px', fontWeight: 500, color: formData.requiresCQ ? '#1d4ed8' : '#334155' }}>
                                                    <div style={{
                                                        width: 18, height: 18, borderRadius: 4,
                                                        border: `2px solid ${formData.requiresCQ ? '#3b82f6' : '#cbd5e1'}`,
                                                        backgroundColor: formData.requiresCQ ? '#3b82f6' : 'transparent',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0,
                                                    }}>
                                                        {formData.requiresCQ && (
                                                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                                                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span>{formData.requiresCQ ? 'Có' : 'Không'}</span>
                                                    <input type="checkbox" name="requiresCQ" checked={!!formData.requiresCQ} onChange={handleChange} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                                                </label>
                                            ) : (
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default', userSelect: 'none', padding: '4px 0', fontSize: '14px', fontWeight: 500, color: item.requiresCQ ? '#1d4ed8' : '#334155' }}>
                                                    <div style={{
                                                        width: 18, height: 18, borderRadius: 4,
                                                        border: `2px solid ${item.requiresCQ ? '#3b82f6' : '#cbd5e1'}`,
                                                        backgroundColor: item.requiresCQ ? '#3b82f6' : 'transparent',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0,
                                                    }}>
                                                        {item.requiresCQ && (
                                                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                                                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span>{item.requiresCQ ? 'Có' : 'Không'}</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {/* Ngày tạo */}
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Ngày tạo</div>
                                        <div style={{ padding: '0 0 6px 0', borderBottom: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: 500, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Clock size={13} color="#94a3b8" />
                                            {formatDateTimeFull(item.createdAt)}
                                        </div>
                                    </div>

                                    {/* Ngày cập nhật */}
                                    {item.updatedAt && (
                                        <div style={FIELD_WRAPPER}>
                                            <div style={LABEL_STYLE}>Ngày cập nhật</div>
                                            <div style={{ padding: '0 0 6px 0', borderBottom: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: 500, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <RefreshCw size={13} color="#94a3b8" />
                                                {formatDateTimeFull(item.updatedAt)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── CARD 6: Thông tin kế toán (conditional) ── */}
                            {!isEditing && showFullPrices && (
                                <div className="info-section" style={{ margin: 0 }}>
                                    <div className="section-header-with-toggle">
                                        <h2 className="section-title">Thông tin kế toán</h2>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <div style={FIELD_WRAPPER}>
                                            <div style={LABEL_STYLE}>Tài khoản kho</div>
                                            <div style={{
                                                padding: '0 0 6px 0',
                                                borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                                                fontSize: '14px', fontWeight: 500, color: '#334155',
                                                display: 'flex', alignItems: 'center',
                                            }}>
                                                {item.inventoryAccount || '—'}
                                            </div>
                                        </div>
                                        <div style={FIELD_WRAPPER}>
                                            <div style={LABEL_STYLE}>Tài khoản doanh thu</div>
                                            <div style={{
                                                padding: '0 0 6px 0',
                                                borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                                                fontSize: '14px', fontWeight: 500, color: '#334155',
                                                display: 'flex', alignItems: 'center',
                                            }}>
                                                {item.revenueAccount || '—'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialogs */}
            <InlineCreateUomDialog
                open={createUomOpen}
                onClose={() => setCreateUomOpen(false)}
                onSubmit={(newUom) => {
                    setLocalUomOptions((prev) => [...prev, { id: newUom.id, code: newUom.code, name: newUom.name }]);
                    handleChange({ target: { name: 'baseUomId', value: newUom.id } });
                    setCreateUomOpen(false);
                }}
            />
            <InlineCreatePackagingSpecDialog
                open={createPackOpen}
                onClose={() => setCreatePackOpen(false)}
                onSubmit={(newItem) => {
                    const newId = newItem.id ?? newItem.packagingSpecId;
                    setLocalPackOptions((prev) => [...prev, { id: newId, name: newItem.specName ?? newItem.name }]);
                    handleChange({ target: { name: 'packagingSpecId', value: newId } });
                    setCreatePackOpen(false);
                }}
            />

            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={clearToast} />
            )}
        </div>
    );
}
