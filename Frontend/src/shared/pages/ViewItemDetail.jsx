/*
 * ViewItemDetail — Chi tiết vật tư (xem + edit inline tại chỗ).
 * Đã kiểm duyệt với DB: Items, ItemPrices, InventoryOnHand.
 * Full quyền Item (xem/sửa): WAREHOUSE_KEEPER, SALE_SUPPORT, SALE_ENGINEER, ACCOUNTANTS.
 * UI refactor theo design language của ViewPurchaseReturnDetail.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Popover,
    IconButton,
    Chip,
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
    ChevronDown,
    ImagePlus,
    Trash2,
    Settings2,
    Upload,
} from 'lucide-react';
import authService from '../lib/authService';
import { getItemDetail, updateItem } from '../lib/itemService';
import apiClient from '../lib/axios';
import { getPermissionRole, getRawRoleFromUser, isAccountantView } from '../permissions/roleUtils';
import { getItemParameterList } from '../lib/itemParameterService';
import { useMasterData } from '../../app/context/MasterDataContext';
import { createUom } from '../lib/uomService';
import { createCategory } from '../lib/categoryService';
import { createBrand } from '../lib/brandService';
import { createItemParameter } from '../lib/itemParameterService';
import UomFormDialog from '../components/UomFormDialog';
import CreateBrandDialog from '../components/CreateBrandDialog';
import CreatePackagingSpecDialog from '../components/CreatePackagingSpecDialog';
import CreateSpecDialog from '../components/CreateSpecDialog';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import { ImageDialog } from '../components/ImageDialog';
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

// EditUnderline - TextField dạng đường kẻ, giống ReadOnlyUnderline
const EditUnderline = ({ value, onChange, placeholder, name, ...props }) => (
    <TextField
        fullWidth
        size="small"
        name={name}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        variant="standard"
        InputProps={{ disableUnderline: false }}
        sx={{
            '& .MuiInput-root': {
                fontSize: '14px',
                fontWeight: 500,
                color: '#334155',
                minHeight: ROW_HEIGHT,
                padding: '0 0 6px 0',
                alignItems: 'center',
                '&:before': { borderBottom: '1px solid rgba(0,0,0,0.1)' },
                '&:hover:not(.Mui-disabled):before': { borderBottom: '1px solid #3b82f6' },
                '&:after': { borderBottom: '1px solid #3b82f6' },
            },
            '& .MuiInput-input': {
                padding: '0 0 0 0',
                fontSize: '14px',
                fontWeight: 500,
                color: '#334155',
                '&::placeholder': { color: '#9ca3af', opacity: 1 },
            },
        }}
        {...props}
    />
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

// EditSelectUnderline - Select dạng đường kẻ, click mở popup
const EditSelectUnderline = ({ value, onChange, options, placeholder, renderValue, name = '', onAddNew }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (e) => setAnchorEl(e.currentTarget);
    const handleClose = () => setAnchorEl(null);
    const handleSelect = (val) => {
        onChange({ target: { name, value: val } });
        handleClose();
    };

    const selected = options.find((o) => String(o.value ?? o.id ?? o) === String(value));
    const display = selected ? (renderValue ? renderValue(selected) : (selected.label ?? selected.name ?? selected)) : (placeholder || 'Chọn...');

    return (
        <>
            <div
                onClick={handleClick}
                style={{
                    padding: '0 0 6px 0',
                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: selected ? '#334155' : '#9ca3af',
                    minHeight: ROW_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    gap: 4,
                    position: 'relative',
                }}
            >
                <span style={{ flex: 1 }}>{display}</span>
                <ChevronDown size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
            </div>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                PaperProps={{ sx: { borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: anchorEl?.offsetWidth || 220 } }}
            >
                {options.map((opt) => {
                    const optVal = opt.value ?? opt.id ?? opt;
                    const optLabel = opt.label ?? opt.name ?? opt;
                    const isSelected = String(optVal) === String(value);
                    return (
                        <MenuItem key={optVal} value={optVal} onClick={() => handleSelect(optVal)}
                            sx={{ fontSize: '14px', fontWeight: isSelected ? 600 : 400, color: isSelected ? '#3b82f6' : '#334155', gap: 1 }}>
                            {optLabel}
                        </MenuItem>
                    );
                })}
                {onAddNew && (
                    <>
                        <Divider sx={{ my: 0.5 }} />
                        <MenuItem onClick={() => { handleClose(); onAddNew(); }}
                            sx={{ fontSize: '14px', color: '#3b82f6', gap: 1 }}>
                            <Plus size={14} />
                            Thêm mới
                        </MenuItem>
                    </>
                )}
            </Popover>
        </>
    );
};

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

// Inline CreateCategoryDialog
function InlineCreateCategoryDialog({ open, onClose, onSubmit }) {
    const [categoryName, setCategoryName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) { setCategoryName(''); setSubmitting(false); setError(null); }
    }, [open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const name = (categoryName || '').trim();
        if (!name) return;
        setSubmitting(true);
        setError(null);
        try {
            await onSubmit({ categoryName: name });
            onClose();
        } catch (err) {
            setError(err?.response?.data?.message ?? err?.message ?? 'Không thể tạo danh mục.');
        } finally { setSubmitting(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' } }}>
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ px: 3, py: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px', color: 'text.primary' }}>Thêm danh mục</Typography>
                    <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}><X size={20} /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 2.5, pb: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5 }}>Tên danh mục</Typography>
                    <Box
                        component="input" type="text" value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                        placeholder="VD: Vật tư điện tử" autoFocus
                        sx={{
                            width: '100%', border: 'none', outline: 'none',
                            borderBottom: `1px solid ${error ? '#ef4444' : 'rgba(0,0,0,0.1)'}`,
                            pb: 1, fontSize: '14px', color: 'text.primary', bgcolor: 'transparent',
                            '&:focus': { borderBottom: error ? '#ef4444' : '#0284c7' },
                            '&::placeholder': { color: '#9ca3af', fontSize: '14px' },
                        }}
                    />
                    {error && <Typography sx={{ fontSize: '12px', color: '#ef4444', mt: 0.5 }}>{error}</Typography>}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1px solid rgba(0,0,0,0.06)', gap: 1.5 }}>
                    <Button onClick={onClose} size="small" sx={{ textTransform: 'none', fontWeight: 500, fontSize: '13px', color: 'text.secondary', px: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}>Hủy</Button>
                    <Button type="submit" variant="contained" disabled={submitting || !categoryName.trim()} size="small" sx={{ textTransform: 'none', fontWeight: 500, fontSize: '13px', px: 3, py: 0.75, borderRadius: '8px', boxShadow: 'none', '&:hover': { boxShadow: '0 2px 8px rgba(25,118,210,0.24)' } }}>
                        {submitting ? 'Đang lưu…' : 'Thêm'}
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
    const [createBrandOpen, setCreateBrandOpen] = useState(false);
    const [createPackOpen, setCreatePackOpen] = useState(false);
    const [createSpecOpen, setCreateSpecOpen] = useState(false);
    const [createCategoryOpen, setCreateCategoryOpen] = useState(false);

    // Local options for create-new
    const [localMasterBrands, setLocalMasterBrands] = useState([]);
    const [localMasterCategories, setLocalMasterCategories] = useState([]);

    // History pagination (0-based for MUI TablePagination)
    const [historyPage, setHistoryPage] = useState(0);
    const [historyPageSize, setHistoryPageSize] = useState(10);
    const [historyTotal, setHistoryTotal] = useState(0);

    // Item parameters
    const [specOptions, setSpecOptions] = useState([]);

    // Image states
    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const [imageDialogTempUrl, setImageDialogTempUrl] = useState('');
    const [imageFileName, setImageFileName] = useState('');

    // Reset page khi đổi item
    useEffect(() => { setHistoryPage(0); }, [id]);

    // Load spec options
    useEffect(() => {
        getItemParameterList({ pageSize: 100, isActive: true })
            .then((res) => setSpecOptions(res.items || []))
            .catch(() => {});
    }, []);

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
                    referenceId: h.referenceId ?? h.ReferenceId ?? 0,
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
            isActive: item.isActive ?? true,
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
                categoryId: Number(formData.categoryId),
                brandId: formData.brandId ? Number(formData.brandId) : null,
                baseUomId: Number(formData.baseUomId),
                packagingSpecId: formData.packagingSpecId ? Number(formData.packagingSpecId) : null,
                specification: formData.specification || null,
                requiresCo: formData.requiresCO,
                requiresCq: formData.requiresCQ,
                isActive: formData.isActive,
                defaultWarehouseId: formData.defaultWarehouseId ? Number(formData.defaultWarehouseId) : null,
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

    // ─── Image handlers ──────────────────────────────────────────────────────
    const handleOpenImageDialog = () => {
        setImageDialogTempUrl(imagePreviewUrl);
        setImageDialogOpen(true);
    };

    const handleDialogBrowseFile = (file) => {
        const url = URL.createObjectURL(file);
        if (imageDialogTempUrl && imageDialogTempUrl !== imagePreviewUrl && imageDialogTempUrl !== '') {
            URL.revokeObjectURL(imageDialogTempUrl);
        }
        setImageDialogTempUrl(url);
        setImageFileName(file.name);
    };

    const handleApplyImage = (croppedDataUrl) => {
        setImagePreviewUrl(croppedDataUrl);
        setImageDialogOpen(false);
        setIsDirty(true);
    };

    const handleRemoveImage = () => {
        if (imageDialogTempUrl && imageDialogTempUrl !== '' && imageDialogTempUrl !== imagePreviewUrl) {
            URL.revokeObjectURL(imageDialogTempUrl);
        }
        if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreviewUrl);
        }
        setImagePreviewUrl('');
        setImageDialogOpen(false);
        setImageDialogTempUrl('');
        setIsDirty(true);
    };

    const handleCloseImageDialog = () => {
        if (imageDialogTempUrl && imageDialogTempUrl !== imagePreviewUrl && imageDialogTempUrl !== '' && !imageDialogTempUrl.startsWith('data:')) {
            URL.revokeObjectURL(imageDialogTempUrl);
        }
        setImageDialogOpen(false);
    };

    // Load item image when item loads
    useEffect(() => {
        if (!item) return;
        const imgUrl = item.itemImage ?? '';
        setImagePreviewUrl(imgUrl);
    }, [item]);

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
    const specName = item.specification
        ? (specOptions.find((o) => String(o.paramId) === String(item.specification))?.paramName || item.specification)
        : '—';

    const isActiveValue = isEditing ? formData.isActive : item.isActive;
    const statusConfig = isActiveValue
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
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                        {/* Ô ảnh */}
                                        <div style={{
                                            width: 160, minWidth: 160, height: 160, borderRadius: 12,
                                            border: '1px solid #e5e7eb', backgroundColor: '#f1f5f9',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            overflow: 'hidden', flexShrink: 0,
                                        }}>
                                            {imagePreviewUrl ? (
                                                <img src={imagePreviewUrl} alt="Vật tư" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <Package size={72} color="#cbd5e1" />
                                            )}
                                        </div>

                                        {isEditing && (
                                            <button
                                                type="button"
                                                className={`btn-image-action ${imagePreviewUrl ? 'btn-image-primary' : 'btn-image-primary'}`}
                                                onClick={handleOpenImageDialog}
                                                style={{ maxWidth: '100%' }}
                                            >
                                                <ImagePlus size={13} />
                                                {imagePreviewUrl ? 'Đổi ảnh' : 'Thêm ảnh'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Info panel */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        {/* Tên vật tư */}
                                        <div style={FIELD_WRAPPER}>
                                            <div style={LABEL_STYLE}>Tên vật tư</div>
                                            {isEditing ? (
                                                <EditUnderline name="itemName" value={formData.itemName || ''} onChange={handleChange} />
                                            ) : (
                                                <ReadOnlyUnderline highlight>{item.itemName || '—'}</ReadOnlyUnderline>
                                            )}
                                        </div>

                                        {/* Thương hiệu */}
                                        <div style={FIELD_WRAPPER}>
                                            <div style={LABEL_STYLE}>Thương hiệu</div>
                                            {isEditing ? (
                                                <EditSelectUnderline
                                                    name="brandId"
                                                    value={String(formData.brandId ?? '')}
                                                    onChange={handleChange}
                                                    options={[...masterBrands, ...localMasterBrands].map((o) => ({ value: String(o.brandId ?? o.id), label: o.brandName ?? o.name }))}
                                                    placeholder="Chọn nhãn hiệu"
                                                    onAddNew={() => setCreateBrandOpen(true)}
                                                />
                                            ) : (
                                                <ReadOnlyUnderline>{item.brandName || '—'}</ReadOnlyUnderline>
                                            )}
                                        </div>

                                        {/* Mô tả */}
                                        <div style={FIELD_WRAPPER}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={LABEL_STYLE}>Mô tả</div>
                                                <span style={{ fontSize: '12px', color: (formData.description?.length ?? 0) > 250 ? '#ef4444' : '#94a3b8' }}>
                                                    {formData.description?.length ?? 0}/250
                                                </span>
                                            </div>
                                            {isEditing ? (
                                                <TextField fullWidth size="small" name="description"
                                                    value={formData.description || ''} onChange={handleChange}
                                                    multiline rows={3} variant="standard"
                                                    inputProps={{ maxLength: 250 }}
                                                    sx={{
                                                        '& .MuiInput-root': { fontSize: '14px', fontWeight: 500, color: '#334155' },
                                                        '& .MuiInput-underline:before': { borderBottom: '1px solid rgba(0,0,0,0.1)' },
                                                        '& .MuiInput-underline:hover:before': { borderBottom: '1px solid #3b82f6' },
                                                        '& .MuiInput-underline:after': { borderBottom: '1px solid #3b82f6' },
                                                        '& .MuiInput-inputMultiline': { padding: '0 0 6px 0' },
                                                    }} />
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
                                                                <td>
                                                                    {(() => {
                                                                        const pathMap = { GRN: '/goods-receipts/', GDN: '/goods-delivery-notes/', ADJ: '/inventory-adjustments/', STK: '/stocktakes/' };
                                                                        const path = pathMap[h.sourceType];
                                                                        return path && h.referenceId ? (
                                                                            <span
                                                                                onClick={() => navigate(`${path}${h.referenceId}`)}
                                                                                style={{ fontWeight: 500, color: '#2196F3', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                                                                            >
                                                                                {h.docNo}
                                                                            </span>
                                                                        ) : (
                                                                            <span style={{ fontWeight: 500, color: '#2196F3', fontSize: '13px' }}>{h.docNo ?? '—'}</span>
                                                                        );
                                                                    })()}
                                                                </td>
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
                                        {isEditing ? (
                                            <label
                                                onClick={() => {
                                                    const newVal = !formData.isActive;
                                                    setFormData((prev) => ({ ...prev, isActive: newVal }));
                                                    setIsDirty(true);
                                                }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', padding: '4px 0' }}
                                            >
                                                <div style={{
                                                    width: 18, height: 18, borderRadius: 4,
                                                    border: `2px solid ${formData.isActive ? '#3b82f6' : '#cbd5e1'}`,
                                                    backgroundColor: formData.isActive ? '#3b82f6' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0,
                                                }}>
                                                    {formData.isActive && (
                                                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '14px', fontWeight: 500, color: formData.isActive ? '#047857' : '#b91c1c' }}>
                                                    {formData.isActive ? 'Đang giao dịch' : 'Tạm dừng'}
                                                </span>
                                            </label>
                                        ) : (
                                            <StatusBadge config={statusConfig} />
                                        )}
                                    </div>

                                    {/* Đơn vị tính */}
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Đơn vị tính</div>
                                        {isEditing ? (
                                            <EditSelectUnderline
                                                name="baseUomId"
                                                value={String(formData.baseUomId ?? '')}
                                                onChange={handleChange}
                                                options={allUomOptions.map((o) => ({ ...o, value: String(o.id), label: o.name }))}
                                                placeholder="Chọn đơn vị tính"
                                                onAddNew={() => setCreateUomOpen(true)}
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
                                            <EditSelectUnderline
                                                name="itemType"
                                                value={formData.itemType || 'Product'}
                                                onChange={handleChange}
                                                options={[
                                                    { value: 'Product', label: 'Product' },
                                                    { value: 'Material', label: 'Material' },
                                                    { value: 'Service', label: 'Service' },
                                                ]}
                                                placeholder="Chọn loại vật tư"
                                            />
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
                                            <EditSelectUnderline
                                                name="categoryId"
                                                value={String(formData.categoryId ?? '')}
                                                onChange={handleChange}
                                                options={[...masterCategories, ...localMasterCategories].map((o) => ({ ...o, value: String(o.categoryId ?? o.id), label: o.categoryCode ? `${o.categoryCode} - ${o.categoryName ?? o.name}` : (o.categoryName ?? o.name) }))}
                                                placeholder="Chọn danh mục"
                                                onAddNew={() => setCreateCategoryOpen(true)}
                                            />
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
                                            <EditSelectUnderline
                                                name="packagingSpecId"
                                                value={String(formData.packagingSpecId ?? '')}
                                                onChange={handleChange}
                                                options={allPackOptions.map((o) => ({ ...o, value: String(o.id), label: o.name }))}
                                                placeholder="Chọn quy cách đóng gói"
                                                onAddNew={() => setCreatePackOpen(true)}
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
                                            <EditSelectUnderline
                                                name="specification"
                                                value={formData.specification || ''}
                                                onChange={(e) => {
                                                    setFormData((prev) => ({ ...prev, specification: e.target.value }));
                                                    setIsDirty(true);
                                                }}
                                                options={specOptions.map((o) => ({ value: String(o.paramId), label: o.paramName }))}
                                                placeholder="Chọn thông số"
                                                onAddNew={() => setCreateSpecOpen(true)}
                                            />
                                        ) : (
                                            <div style={{ padding: '0 0 6px 0', borderBottom: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                                                {specName}
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
            <UomFormDialog
                open={createUomOpen}
                onClose={() => setCreateUomOpen(false)}
                mode="create"
                onSuccess={async ({ uomName }) => {
                    const response = await createUom({ uomName });
                    const data = response?.data ?? response;
                    const newId = data?.uomId ?? data?.UomId ?? data?.id;
                    if (newId) {
                        const newUom = { id: newId, code: data?.uomCode ?? '', name: data?.uomName ?? uomName };
                        setLocalUomOptions((prev) => [...prev, newUom]);
                        handleChange({ target: { name: 'baseUomId', value: String(newId) } });
                    }
                }}
            />
            <CreatePackagingSpecDialog
                open={createPackOpen}
                onClose={() => setCreatePackOpen(false)}
                onSubmit={async (item) => {
                    const data = item?.data ?? item;
                    const newId = data?.packagingSpecId ?? data?.id;
                    if (newId) {
                        setLocalPackOptions((prev) => [...prev, { id: newId, name: data?.specName ?? data?.name ?? '' }]);
                        handleChange({ target: { name: 'packagingSpecId', value: String(newId) } });
                    }
                }}
            />
            <CreateBrandDialog
                open={createBrandOpen}
                onClose={() => setCreateBrandOpen(false)}
                onSuccess={async ({ id, name }) => {
                    if (id) {
                        const newBrand = { brandId: id, brandName: name };
                        setLocalMasterBrands((prev) => [...prev, newBrand]);
                        handleChange({ target: { name: 'brandId', value: String(id) } });
                    }
                }}
            />
            <InlineCreateCategoryDialog
                open={createCategoryOpen}
                onClose={() => setCreateCategoryOpen(false)}
                onSubmit={async ({ categoryName }) => {
                    const response = await createCategory({ categoryName });
                    const data = response?.data ?? response;
                    const newId = data?.categoryId ?? data?.id;
                    const newCategory = { categoryId: newId, categoryName: data?.categoryName ?? data?.name ?? categoryName, categoryCode: data?.categoryCode ?? '' };
                    setLocalMasterCategories((prev) => [...prev, newCategory]);
                    if (newId) {
                        handleChange({ target: { name: 'categoryId', value: String(newId) } });
                    }
                }}
            />
            <CreateSpecDialog
                open={createSpecOpen}
                onClose={() => setCreateSpecOpen(false)}
                onSubmit={async (item) => {
                    const data = item?.data ?? item;
                    const newId = data?.paramId ?? data?.id;
                    if (newId) {
                        setSpecOptions((prev) => [...prev, { paramId: newId, paramName: data?.paramName ?? data?.name ?? '' }]);
                        handleChange({ target: { name: 'specification', value: String(newId) } });
                    }
                }}
            />

            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={clearToast} />
            )}

            <ImageDialog
                open={imageDialogOpen}
                onClose={handleCloseImageDialog}
                previewUrl={imageDialogTempUrl}
                fileName={imageFileName}
                onBrowseFile={handleDialogBrowseFile}
                onApply={handleApplyImage}
                onRemove={handleRemoveImage}
            />
        </div>
    );
}
