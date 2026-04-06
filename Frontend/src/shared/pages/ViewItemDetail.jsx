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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Autocomplete,
    Divider,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    ArrowLeft,
    Package,
    Edit3,
    Save,
    Plus,
    X,
    Layers,
    Tag,
    Scale,
    MapPin,
    Warehouse,
    CheckCircle,
} from 'lucide-react';
import authService from '../lib/authService';
import { getItemDetail, updateItem } from '../lib/itemService';
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
    return `${d.toLocaleDateString('vi-VN')} - ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
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

// StatusBadge — như PurchaseReturnDetail
const StatusBadge = ({ config }) => (
    <div style={{
        padding: '6px 14px', borderRadius: 20,
        backgroundColor: config.bg, color: config.color,
        fontWeight: 600, fontSize: '13px',
        display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
    }}>
        {config.icon}
        {config.label}
    </div>
);

// StatBox — stat card nhỏ cho side column
const StatBox = ({ label, value, color = '#0f172a', bg = '#f8fafc', borderColor = '#e2e8f0', icon: Icon }) => (
    <div style={{
        padding: '12px 14px', backgroundColor: bg,
        border: `1px solid ${borderColor}`, borderRadius: '10px',
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            {Icon && <Icon size={14} color="#64748b" />}
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{label}</div>
        </div>
        <div style={{ fontSize: '16px', fontWeight: 700, color }}>{value}</div>
    </div>
);

// PillBadge — cho CO/CQ view mode
const PillBadge = ({ value }) => {
    const isYes = Boolean(value);
    return (
        <div style={{
            padding: '3px 10px', borderRadius: 9999, display: 'inline-flex', alignItems: 'center',
            border: '1px solid', borderColor: isYes ? '#bbf7d0' : '#e2e8f0',
            backgroundColor: isYes ? '#f0fdf4' : EDIT_BG,
            fontSize: '12px', fontWeight: 600, color: isYes ? '#15803d' : '#94a3b8',
            width: 'fit-content', minWidth: 56,
        }}>
            {isYes ? 'Có' : 'Không'}
        </div>
    );
};

// BoolToggle — cho CO/CQ edit mode
const BoolToggle = ({ name, value, onChange }) => {
    const isYes = Boolean(value);
    const handleClick = (newVal) => {
        onChange({ target: { name, value: newVal, type: 'checkbox' } });
    };
    return (
        <div style={{
            display: 'inline-flex', borderRadius: EDIT_RADIUS,
            border: '1px solid', borderColor: EDIT_BORDER,
            overflow: 'hidden', backgroundColor: EDIT_BG, height: ROW_HEIGHT,
        }}>
            <button type="button" onClick={() => handleClick(true)} style={{
                padding: '0 14px', height: '100%', border: 'none', borderRight: '1px solid ' + EDIT_BORDER,
                cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                transition: 'all 0.15s ease',
                backgroundColor: isYes ? '#10b981' : 'transparent',
                color: isYes ? '#ffffff' : '#94a3b8',
            }}>Có</button>
            <button type="button" onClick={() => handleClick(false)} style={{
                padding: '0 14px', height: '100%', border: 'none',
                cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                transition: 'all 0.15s ease',
                backgroundColor: !isYes ? '#e2e8f0' : 'transparent',
                color: !isYes ? '#475569' : '#94a3b8',
            }}>Không</button>
        </div>
    );
};

// ReadOnlyBox
const ReadOnlyBox = ({ children, highlight = false }) => (
    <div style={{
        padding: '0 12px', borderRadius: EDIT_RADIUS,
        border: highlight ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
        backgroundColor: highlight ? '#eff6ff' : EDIT_BG,
        fontSize: '14px', fontWeight: highlight ? 600 : 500,
        color: highlight ? '#1d4ed8' : '#334155',
        minHeight: ROW_HEIGHT, display: 'flex', alignItems: 'center',
        flex: 1, wordBreak: 'break-word',
    }}>
        {children || '—'}
    </div>
);

// DescriptionBlock
const DescriptionBlock = ({ children }) => (
    <div style={{
        padding: '10px 12px', borderRadius: EDIT_RADIUS,
        border: '1px solid #e5e7eb', backgroundColor: EDIT_BG,
        fontSize: '14px', color: '#334155',
        lineHeight: 1.6, wordBreak: 'break-word',
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
            <div style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
                <div className="spinner" style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#2196F3', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
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

    const statusConfig = item.isActive
        ? { label: 'Đang giao dịch', color: '#047857', bg: 'rgba(16,185,129,0.18)', icon: <CheckCircle size={16} /> }
        : { label: 'Tạm dừng', color: '#b91c1c', bg: 'rgba(239,68,68,0.15)', icon: <X size={16} /> };

    // Computed stats
    const totalOnHand = itemWarehouses.reduce((s, w) => s + (w.onHandQty ?? 0), 0);
    const totalReserved = itemWarehouses.reduce((s, w) => s + (w.reservedQty ?? 0), 0);
    const totalAvailable = itemWarehouses.reduce((s, w) => s + (w.availableQty ?? Math.max(0, (w.onHandQty ?? 0) - (w.reservedQty ?? 0))), 0);
    const totalPreOrder = itemWarehouses.reduce((s, w) => s + (w.preOrderQty ?? 0), 0);

    // Side column width
    const SIDE_COL = '360px';

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
                    {canEdit && !isEditing && (
                        <button type="button" className="btn btn-primary" onClick={handleEdit}>
                            <Edit3 size={15} />
                            Chỉnh sửa
                        </button>
                    )}
                    {isEditing && (
                        <>
                            <button type="button" className="btn btn-outline" onClick={handleCancel} disabled={saving}>
                                <X size={15} />
                                Hủy
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? <CircularProgress size={14} color="inherit" /> : <Save size={15} />}
                                Lưu
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="form-card">
                <div className="form-wrapper">
                    {/* ─── PAGE INTRO ─── */}
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <h1 className="page-title">{isEditing ? 'Chỉnh sửa vật tư' : 'Chi tiết vật tư'}</h1>
                                {!isEditing && (
                                    <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                        Mã vật tư:{' '}
                                        <span style={{ fontWeight: 600, color: '#2196F3' }}>{item.itemCode}</span>
                                        {item.brandName || item.categoryName ? (
                                            <>&nbsp;&bull;&nbsp;{item.brandName || item.categoryName}</>
                                        ) : null}
                                    </p>
                                )}
                            </div>
                            <StatusBadge config={statusConfig} />
                        </div>
                    </div>

                    {/* ─── TOP ROW: Thông tin chung + Side column ─── */}
                    <div style={{ display: 'grid', gridTemplateColumns: `1fr ${SIDE_COL}`, gap: '24px', alignItems: 'start' }}>

                        {/* ── LEFT: Thông tin chung ── */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thông tin chung</h2>
                            </div>

                            {/* Hero row: thumbnail + 3-col grid */}
                            <div style={{ display: 'flex', gap: '20px', marginBottom: FIELD_GAP, flexWrap: 'wrap' }}>
                                {/* Thumbnail */}
                                <div style={{
                                    width: 88, minWidth: 88, height: 88, borderRadius: 10,
                                    border: '1px solid #e5e7eb', backgroundColor: '#f1f5f9',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                    <Package size={40} color="#cbd5e1" />
                                </div>

                                {/* 3-col grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                    gap: FIELD_GAP,
                                    flex: 1,
                                    minWidth: 0,
                                    alignContent: 'flex-start',
                                }}>
                                    {/* Mã vật tư */}
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Mã vật tư</div>
                                        <div style={{
                                            padding: '0 12px', borderRadius: EDIT_RADIUS, border: '1px solid #e5e7eb',
                                            backgroundColor: EDIT_BG, fontSize: '14px', fontWeight: 600, color: '#334155',
                                            fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em',
                                            minHeight: ROW_HEIGHT, display: 'flex', alignItems: 'center',
                                            flex: 1,
                                        }}>
                                            {item.itemCode || '—'}
                                        </div>
                                    </div>

                                    {/* Tên vật tư */}
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Tên vật tư</div>
                                        {isEditing ? (
                                            <TextField fullWidth size="small" name="itemName"
                                                value={formData.itemName || ''} onChange={handleChange} required
                                                InputLabelProps={{ shrink: true }} sx={editTextSx} />
                                        ) : (
                                            <ReadOnlyBox highlight>{item.itemName || '—'}</ReadOnlyBox>
                                        )}
                                    </div>

                                    {/* Dạng vật tư */}
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Dạng vật tư</div>
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
                                            <ReadOnlyBox>{item.itemType || '—'}</ReadOnlyBox>
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
                                            <ReadOnlyBox>{item.brandName || item.brandId || '—'}</ReadOnlyBox>
                                        )}
                                    </div>

                                    {/* Kho mặc định */}
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Kho mặc định</div>
                                        {isEditing ? (
                                            <TextField select fullWidth size="small" name="defaultWarehouseId"
                                                value={String(formData.defaultWarehouseId ?? '')} onChange={handleChange}
                                                sx={editSelectSx} InputLabelProps={{ shrink: true }}
                                                SelectProps={{
                                                    displayEmpty: true,
                                                    renderValue: (v) => v === '' ? (
                                                        <span style={{ color: '#9ca3af', fontSize: '14px' }}>Chọn kho</span>
                                                    ) : (
                                                        <span style={{ fontSize: '14px' }}>
                                                            {masterWarehouses.find((o) => String(o.warehouseId) === String(v))?.warehouseName ?? 'Chọn kho'}
                                                        </span>
                                                    ),
                                                    MenuProps: { PaperProps: { sx: { borderRadius: 2 } } },
                                                }}>
                                                <MenuItem value="" sx={{ fontSize: '14px' }}>Chọn kho</MenuItem>
                                                {masterWarehouses.map((o) => (
                                                    <MenuItem key={o.warehouseId} value={String(o.warehouseId)} sx={{ fontSize: '14px' }}>{o.warehouseName}</MenuItem>
                                                ))}
                                            </TextField>
                                        ) : (
                                            <ReadOnlyBox>{item.defaultWarehouseName || item.defaultWarehouseId || '—'}</ReadOnlyBox>
                                        )}
                                    </div>

                                    {/* Yêu cầu CO */}
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Yêu cầu CO</div>
                                        {isEditing ? (
                                            <BoolToggle name="requiresCO" value={formData.requiresCO} onChange={handleChange} />
                                        ) : (
                                            <PillBadge value={item.requiresCO} />
                                        )}
                                    </div>

                                    {/* Yêu cầu CQ */}
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Yêu cầu CQ</div>
                                        {isEditing ? (
                                            <BoolToggle name="requiresCQ" value={formData.requiresCQ} onChange={handleChange} />
                                        ) : (
                                            <PillBadge value={item.requiresCQ} />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Meta grid: Danh mục | Đơn vị tính | Quy cách đóng gói */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                gap: FIELD_GAP,
                                marginBottom: FIELD_GAP,
                            }}>
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
                                        <ReadOnlyBox>{item.categoryName || item.categoryId || '—'}</ReadOnlyBox>
                                    )}
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
                                        <ReadOnlyBox>{item.baseUomName || item.baseUomId || '—'}</ReadOnlyBox>
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
                                        <ReadOnlyBox>{item.packagingSpecName || item.packagingSpecId || '—'}</ReadOnlyBox>
                                    )}
                                </div>
                            </div>

                            {/* Mô tả — cuối card, full width */}
                            <div style={FIELD_WRAPPER}>
                                <div style={LABEL_STYLE}>Mô tả</div>
                                {isEditing ? (
                                    <TextField fullWidth size="small" name="description"
                                        value={formData.description || ''} onChange={handleChange}
                                        multiline rows={3} InputLabelProps={{ shrink: true }} sx={editTextareaSx} />
                                ) : item.description ? (
                                    <DescriptionBlock>{item.description}</DescriptionBlock>
                                ) : (
                                    <DescriptionBlock />
                                )}
                            </div>

                            {/* Tài khoản kho + doanh thu (chỉ accountant, read-only) */}
                            {!isEditing && showFullPrices && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                    gap: FIELD_GAP,
                                    marginTop: FIELD_GAP,
                                }}>
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Tài khoản kho</div>
                                        <div style={{
                                            padding: '0 12px', borderRadius: EDIT_RADIUS, border: '1px solid #e5e7eb',
                                            backgroundColor: EDIT_BG, fontSize: '14px', fontWeight: 500, color: '#334155',
                                            fontVariantNumeric: 'tabular-nums', minHeight: ROW_HEIGHT,
                                            display: 'flex', alignItems: 'center', flex: 1,
                                        }}>
                                            {item.inventoryAccount || '—'}
                                        </div>
                                    </div>
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Tài khoản doanh thu</div>
                                        <div style={{
                                            padding: '0 12px', borderRadius: EDIT_RADIUS, border: '1px solid #e5e7eb',
                                            backgroundColor: EDIT_BG, fontSize: '14px', fontWeight: 500, color: '#334155',
                                            fontVariantNumeric: 'tabular-nums', minHeight: ROW_HEIGHT,
                                            display: 'flex', alignItems: 'center', flex: 1,
                                        }}>
                                            {item.revenueAccount || '—'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── RIGHT: Side column — Tổng quan vật tư ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '16px' }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng quan vật tư</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {showStockBlock ? (
                                        <>
                                            <StatBox label="Tồn kho" value={formatQty(totalOnHand)} color="#0f172a" icon={Warehouse} />
                                            <StatBox label="Có thể bán" value={formatQty(totalAvailable)} color="#10b981" bg="#f0fdf4" borderColor="#bbf7d0" icon={Package} />
                                            {(totalReserved > 0 || totalPreOrder > 0) && (
                                                <StatBox label="Đặt trước" value={formatQty(totalPreOrder > 0 ? totalPreOrder : totalReserved)} color="#d97706" bg="#fffbeb" borderColor="#fde68a" icon={Layers} />
                                            )}
                                            <StatBox label="Đơn vị tính" value={item.baseUomName || '—'} color="#334155" icon={Scale} />
                                            {item.defaultWarehouseName && (
                                                <StatBox label="Kho mặc định" value={item.defaultWarehouseName} color="#334155" icon={MapPin} />
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <StatBox label="Dạng vật tư" value={item.itemType || '—'} color="#334155" icon={Tag} />
                                            <StatBox label="Đơn vị tính" value={item.baseUomName || '—'} color="#334155" icon={Scale} />
                                            {item.defaultWarehouseName && (
                                                <StatBox label="Kho mặc định" value={item.defaultWarehouseName} color="#334155" icon={MapPin} />
                                            )}
                                            {item.categoryName && (
                                                <StatBox label="Danh mục" value={item.categoryName} color="#334155" icon={Layers} />
                                            )}
                                            {item.brandName && (
                                                <StatBox label="Thương hiệu" value={item.brandName} color="#334155" icon={Tag} />
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── TỒN KHO TABLE ─── */}
                    {showStockBlock && itemWarehouses.length > 0 && (
                        <div className="info-section" style={{ marginTop: '24px' }}>
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
                                            <th>Mã Vật tư</th>
                                            <th>Tên Vật Tư</th>
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
                                                            <span style={{ fontWeight: 500, color: '#2196F3' }}>{wh.variantName || item.itemName}</span>
                                                            {isDefault && (
                                                                <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: 9999, backgroundColor: '#e0f2fe', color: '#2196F3' }}>Mặc định</span>
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

                    {/* ─── LỊCH SỬ TỒN KHO ─── */}
                    {canViewItemHistory && (
                        <div className="info-section" style={{ marginTop: '24px' }}>
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
                                                        <td style={{ fontWeight: 500, color: '#2196F3' }}>{h.docNo ?? '—'}</td>
                                                        <td>
                                                            <span style={{
                                                                fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
                                                                backgroundColor: `${sourceColor}15`, color: sourceColor, border: `1px solid ${sourceColor}40`,
                                                            }}>
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
