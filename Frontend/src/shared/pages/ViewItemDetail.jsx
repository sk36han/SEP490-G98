/*
 * ViewItemDetail — Chi tiết vật tư (xem + edit inline tại chỗ).
 * Đã kiểm duyệt với DB: Items, ItemPrices, InventoryOnHand.
 * Sửa vật tư (khớp API TK, KT, GD): WAREHOUSE_KEEPER, ACCOUNTANTS, DIRECTOR.
 * UI refactor theo design language của ViewPurchaseReturnDetail.
 */
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    TextField,
    Button,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Divider,
    Popover,
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
    CheckCircle,
    ChevronDown,
} from 'lucide-react';
import authService from '../lib/authService';
import { getItemDetail, updateItem } from '../lib/itemService';
import { getItemParameterList } from '../lib/itemParameterService';
import { MOCK_INVENTORY_LOTS, getGrnCodeFromLineId, formatLotMoney, formatLotQuantityInt } from '../utils/inventoryLotsMock';
import { getPermissionRole, getRawRoleFromUser, isAccountantView } from '../permissions/roleUtils';
import { useMasterData } from '../../app/context/MasterDataContext';
import { createUom } from '../lib/uomService';
import { createPackagingSpec, validatePackagingSpecFields, getPackagingSpecList } from '../lib/packagingSpecService';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateSupplier.css';

// ─── Role helpers ─────────────────────────────────────────────────────────
const isWarehouseKeeper = (role) => role === 'WAREHOUSE_KEEPER';
const canEditItem = (role) => ['WAREHOUSE_KEEPER', 'ACCOUNTANTS', 'DIRECTOR'].includes(role);
const canSeeFullPrices = (role) => role === 'ACCOUNTANTS' || role === 'DIRECTOR';
const showStockBlockForRole = (role) => ['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS', 'DIRECTOR'].includes(role);
const isActiveOption = (x) => (x?.isActive ?? x?.IsActive ?? true) === true;

/** Bổ sung option id+name của vật tư hiện tại để select không rơi về placeholder. */
function mergeIdNameOption(prev, idRaw, nameRaw) {
    if (idRaw == null || idRaw === '') return prev;
    const id = Number(idRaw);
    if (Number.isNaN(id)) return prev;
    if (prev.some((o) => Number(o.id) === id)) return prev;
    const name = nameRaw != null && String(nameRaw).trim() !== '' ? String(nameRaw) : `#${id}`;
    return [...prev, { id, name, isActive: true }];
}

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

/** Ngày (lô hàng — mock) */
const fmtLotDateOnly = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + (String(dateStr).endsWith('Z') ? '' : 'Z'));
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** Phân trang lịch sử tồn kho — khớp query API /Item/detail/{id} */
const ITEM_HISTORY_PAGE_SIZE = 10;

// ─── Edit form constants ──────────────────────────────────────────────────
const NUMBER_FIELDS = new Set([
    'categoryId', 'brandId', 'baseUomId', 'packagingSpecId', 'specId',
]);

/** Giá trị gửi API giữ nguyên (backend ItemType); label hiển thị tiếng Việt — cùng CreateItem */
const ITEM_TYPE_OPTIONS = [
    { value: 'Product', label: 'Sản phẩm' },
    { value: 'Material', label: 'Nguyên vật liệu' },
    { value: 'Service', label: 'Dịch vụ' },
];

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

// EditUnderline / EditSelectUnderline / CheckboxToggle — cùng style gạch chân với CreateItem
const EditUnderline = ({ value, onChange, placeholder, name, ...props }) => (
    <TextField
        fullWidth size="small"
        name={name}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        variant="standard"
        sx={{
            '& .MuiInput-root': {
                fontSize: '14px', fontWeight: 500, color: '#334155',
                minHeight: ROW_HEIGHT,
                padding: '0 0 6px 0',
                alignItems: 'center',
                '&:before': { borderBottom: '1px solid rgba(0,0,0,0.1)' },
                '&:hover:not(.Mui-disabled):before': { borderBottom: '1px solid #3b82f6' },
                '&:after': { borderBottom: '1px solid #3b82f6' },
            },
            '& .MuiInput-input': {
                padding: '0 0 0 0', fontSize: '14px', fontWeight: 500, color: '#334155',
                '&::placeholder': { color: '#9ca3af', opacity: 1 },
            },
        }}
        {...props}
    />
);

const CheckboxToggle = ({ checked, onChange, labelTrue, labelFalse, name, onValueChange }) => {
    const handleToggle = (e) => {
        e.preventDefault();
        const newVal = !checked;
        if (onValueChange) onValueChange(newVal);
        else if (onChange) onChange({ target: { name, value: newVal, type: 'checkbox', checked: newVal } });
    };
    return (
        <span
            onClick={handleToggle}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                cursor: 'pointer', userSelect: 'none', padding: '4px 0',
                fontSize: '14px', fontWeight: 500,
                color: checked ? '#1d4ed8' : '#334155',
            }}
        >
            <div style={{
                width: 18, height: 18, borderRadius: 4,
                border: '2px solid ' + (checked ? '#3b82f6' : '#cbd5e1'),
                backgroundColor: checked ? '#3b82f6' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', flexShrink: 0,
            }}>
                {checked && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>
            <span>{checked ? labelTrue : labelFalse}</span>
        </span>
    );
};

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
    const display = selected
        ? (renderValue ? renderValue(selected) : (selected.label ?? selected.name ?? selected))
        : (placeholder || 'Chọn...');
    return (
        <>
            <div
                onClick={handleClick}
                style={{
                    padding: '0 0 6px 0',
                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                    fontSize: '14px', fontWeight: 500,
                    color: selected ? '#334155' : '#9ca3af',
                    minHeight: ROW_HEIGHT,
                    display: 'flex', alignItems: 'center',
                    cursor: 'pointer', gap: 4,
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
                        <MenuItem
                            key={String(optVal)}
                            value={optVal}
                            onClick={() => handleSelect(optVal)}
                            sx={{ fontSize: '14px', fontWeight: isSelected ? 600 : 400, color: isSelected ? '#3b82f6' : '#334155', gap: 1 }}
                        >
                            {optLabel}
                        </MenuItem>
                    );
                })}
                {onAddNew && (
                    <>
                        <Divider sx={{ my: 0.5 }} />
                        <MenuItem
                            onClick={() => { handleClose(); onAddNew(); }}
                            sx={{ fontSize: '14px', color: '#3b82f6', gap: 1 }}
                        >
                            <Plus size={14} />
                            Thêm mới
                        </MenuItem>
                    </>
                )}
            </Popover>
        </>
    );
};

const DescriptionEditBlock = ({ value, onChange, maxLength = 500, placeholder = 'Nhập mô tả vật tư...' }) => (
    <TextField
        fullWidth size="small"
        name="description"
        value={value ?? ''}
        onChange={onChange}
        multiline rows={3} variant="standard"
        inputProps={{ maxLength }}
        placeholder={placeholder}
        sx={{
            '& .MuiInput-root': {
                fontSize: '14px', color: '#334155',
                lineHeight: 1.6,
                '&:before': { borderBottom: '1px solid rgba(0,0,0,0.1)' },
                '&:hover:not(.Mui-disabled):before': { borderBottom: '1px solid #3b82f6' },
                '&:after': { borderBottom: '1px solid #3b82f6' },
            },
            '& .MuiInput-inputMultiline': { padding: '0' },
        }}
    />
);

// ReadOnlyBox
const ReadOnlyBox = ({ children, highlight = false }) => (
    <div style={{
        padding: '2px 0 6px 0',
        borderBottom: highlight ? '2px solid #93c5fd' : '1px solid #cbd5e1',
        fontSize: '14px',
        fontWeight: highlight ? 600 : 500,
        color: highlight ? '#1d4ed8' : '#1e293b',
        minHeight: ROW_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        flex: 1,
        wordBreak: 'break-word',
        backgroundColor: 'transparent',
    }}>
        {children || '—'}
    </div>
);

// DescriptionBlock
const DescriptionBlock = ({ children }) => (
    <div style={{
        padding: '4px 0 8px 0',
        borderBottom: '1px solid #cbd5e1',
        fontSize: '14px',
        color: '#1e293b',
        lineHeight: 1.7,
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        minHeight: 42,
    }}>
        {children || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa có mô tả</span>}
    </div>
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
    const { showToast } = useToast();
    const [specName, setSpecName] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        if (open) {
            setSpecName('');
            setDescription('');
            setSubmitting(false);
            setFieldErrors({});
        }
    }, [open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const v = validatePackagingSpecFields(specName, description);
        if (!v.valid) {
            setFieldErrors(v.errors);
            const first = Object.values(v.errors)[0];
            if (first) showToast(first, 'error');
            return;
        }
        setFieldErrors({});
        setSubmitting(true);
        try {
            const result = await createPackagingSpec({
                specName: specName.trim(),
                description: description.trim(),
            });
            const newId = result?.packagingSpecId ?? result?.PackagingSpecId;
            const name = specName.trim();
            await Promise.resolve(
                onSubmit({
                    packagingSpecId: newId,
                    id: newId,
                    specName: name,
                    name,
                    description: description.trim(),
                }),
            );
            showToast('Tạo quy cách đóng gói thành công.', 'success');
            onClose();
        } catch (err) {
            showToast(err?.response?.data?.message ?? err?.message ?? 'Không tạo được quy cách đóng gói.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle>Tạo mới quy cách đóng gói</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ pt: 2, pb: 1 }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Tên quy cách"
                        value={specName}
                        onChange={(e) => setSpecName(e.target.value)}
                        required
                        placeholder="VD: Hộp, Thùng carton"
                        error={Boolean(fieldErrors.specName)}
                        helperText={fieldErrors.specName || ' '}
                        FormHelperTextProps={{ sx: { mt: 0, minHeight: 20 } }}
                        sx={editTextSx}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label="Mô tả"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        multiline
                        minRows={2}
                        placeholder="Mô tả quy cách (bắt buộc)"
                        error={Boolean(fieldErrors.description)}
                        helperText={fieldErrors.description || 'Tối thiểu 2 ký tự, tối đa 500 ký tự.'}
                        sx={editTextSx}
                        InputLabelProps={{ shrink: true }}
                    />
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
    const { uoms, categories, brands } = useMasterData() || {};
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
    const [historyPage, setHistoryPage] = useState(1);
    const [historyRefreshing, setHistoryRefreshing] = useState(false);
    const itemRef = useRef(null);
    itemRef.current = item;

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({});
    const [localUomOptions, setLocalUomOptions] = useState([]);
    const [localPackOptions, setLocalPackOptions] = useState([]);
    const [localSpecOptions, setLocalSpecOptions] = useState([]);
    const [createUomOpen, setCreateUomOpen] = useState(false);
    const [createPackOpen, setCreatePackOpen] = useState(false);

    /** Tab trong khối "Tồn kho & lô hàng": theo kho | các lô (mock) */
    const [stockSectionTab, setStockSectionTab] = useState('warehouse');

    const warehouseNameById = useMemo(() => {
        const m = new Map();
        const rows = item?.inventoryByWarehouse ?? [];
        for (const w of rows) {
            const wid = w.warehouseId ?? w.WarehouseId;
            if (wid != null && w.warehouseName) m.set(Number(wid), w.warehouseName);
        }
        return m;
    }, [item]);

    const lotsForItem = useMemo(() => {
        if (!item?.itemId) return [];
        const iid = Number(item.itemId);
        return MOCK_INVENTORY_LOTS.filter((l) => Number(l.itemId) === iid);
    }, [item?.itemId]);

    useLayoutEffect(() => {
        setHistoryPage(1);
    }, [id]);

    // ─── Load item + lịch sử tồn kho (phân trang server) ───────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const previous = itemRef.current;
            const paginationOnly = previous != null && Number(previous.itemId) === Number(id);
            const pageToFetch = paginationOnly ? historyPage : 1;
            try {
                setFetchError(null);
                if (!paginationOnly) {
                    setLoading(true);
                    setItem(null);
                } else {
                    setHistoryRefreshing(true);
                }
                const data = await getItemDetail(Number(id), pageToFetch, ITEM_HISTORY_PAGE_SIZE);
                if (!cancelled) setItem(data);
            } catch (err) {
                console.error('[ViewItemDetail] fetch error:', err);
                if (!cancelled) {
                    setFetchError(err?.response?.data?.message || err.message || 'Không thể tải chi tiết vật tư');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    setHistoryRefreshing(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id, historyPage]);

    useEffect(() => {
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);

    useEffect(() => {
        if (uoms) {
            setLocalUomOptions(
                uoms
                    .filter(isActiveOption)
                    .map((u) => ({ id: u.uomId ?? u.id, code: u.uomCode ?? u.code, name: u.uomName ?? u.name })),
            );
        }
    }, [uoms]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await getItemParameterList({ page: 1, pageSize: 100 });
                const rows = Array.isArray(res?.data?.items) ? res.data.items
                    : Array.isArray(res?.items) ? res.items
                    : Array.isArray(res?.data) ? res.data
                    : Array.isArray(res) ? res : [];
                if (!cancelled) {
                    setLocalSpecOptions(
                        rows
                            .filter(isActiveOption)
                            .map((s) => ({
                                id: s.specificationId ?? s.paramId ?? s.ParamId ?? s.specId ?? s.id,
                                name: s.specName ?? s.paramName ?? s.name,
                            })),
                    );
                }
            } catch { /* giữ rỗng nếu lỗi */ }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await getPackagingSpecList();
                const rows = Array.isArray(res?.items) ? res.items : [];
                if (!cancelled) {
                    setLocalPackOptions((prev) => {
                        const fromApi = rows
                            .filter(isActiveOption)
                            .map((p) => ({
                                id: Number(p.packagingSpecId ?? p.PackagingSpecId),
                                name: String(p.specName ?? p.SpecName ?? ''),
                                isActive: true,
                            }))
                            .filter((o) => !Number.isNaN(o.id));
                        const byId = new Map(fromApi.map((o) => [o.id, o]));
                        for (const o of prev) {
                            if (o?.id != null && !Number.isNaN(Number(o.id)) && !byId.has(Number(o.id))) {
                                byId.set(Number(o.id), { ...o, id: Number(o.id) });
                            }
                        }
                        return Array.from(byId.values());
                    });
                }
            } catch { /* giữ rỗng */ }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        setStockSectionTab('warehouse');
    }, [id]);

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
            specId: item.specId ?? '',
            requiresCO: item.requiresCO ?? false,
            requiresCQ: item.requiresCQ ?? false,
        });
        setLocalPackOptions((prev) => mergeIdNameOption(prev, item.packagingSpecId, item.packagingSpecName));
        setLocalSpecOptions((prev) => mergeIdNameOption(prev, item.specId, item.specName));
        setLocalUomOptions((prev) => mergeIdNameOption(prev, item.baseUomId, item.baseUomName));
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
                specId: formData.specId !== '' && formData.specId != null ? Number(formData.specId) : null,
                requiresCo: formData.requiresCO,
                requiresCq: formData.requiresCQ,
                defaultWarehouseId: item.defaultWarehouseId ?? null,
            });
            showToast('Cập nhật vật tư thành công!', 'success');
            setIsEditing(false);
            setIsDirty(false);
            const updated = await getItemDetail(Number(id), historyPage, ITEM_HISTORY_PAGE_SIZE);
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
    const allSpecOptions = [...localSpecOptions];

    const categorySelectOptions = useMemo(() => masterCategories
        .filter(isActiveOption)
        .map((o) => ({
            value: String(o.categoryId),
            label: o.categoryCode ? `${o.categoryCode} - ${o.categoryName}` : o.categoryName,
        })), [masterCategories]);

    const brandSelectOptions = useMemo(() => masterBrands
        .filter(isActiveOption)
        .map((o) => ({
            value: String(o.brandId),
            label: o.brandName,
        })), [masterBrands]);

    const uomSelectOptions = useMemo(() => allUomOptions.filter(isActiveOption).map((o) => ({
        value: String(o.id),
        label: o.name,
    })), [allUomOptions]);

    const packSelectOptions = useMemo(() => allPackOptions.map((o) => ({
        value: String(o.id),
        label: o.name,
    })), [allPackOptions]);

    const specSelectOptions = useMemo(() => allSpecOptions.filter(isActiveOption).map((o) => ({
        value: String(o.id),
        label: o.name,
    })), [allSpecOptions]);

    const itemTypeViewLabel = useMemo(() => {
        const v = item?.itemType;
        if (v == null || v === '') return '—';
        return ITEM_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v;
    }, [item?.itemType]);

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
    const historyTotal = item.historyTotalCount ?? 0;
    const historyRangeStart = historyTotal === 0 ? 0 : (historyPage - 1) * ITEM_HISTORY_PAGE_SIZE + 1;
    const historyRangeEnd = Math.min(historyPage * ITEM_HISTORY_PAGE_SIZE, historyTotal);
    const canPrevHistory = historyPage > 1;
    const canNextHistory = historyRangeEnd < historyTotal;

    const itemWarehouses =
        (item.inventoryByWarehouse ?? []).length > 0
            ? item.inventoryByWarehouse
            : [{ warehouseName: '—', onHandQty: item.onHandQty ?? 0, reservedQty: item.reservedQty ?? 0 }];

    const statusConfig = item.isActive
        ? { label: 'Đang giao dịch', color: '#047857', bg: 'rgba(16,185,129,0.18)', icon: <CheckCircle size={16} /> }
        : { label: 'Tạm dừng', color: '#b91c1c', bg: 'rgba(239,68,68,0.15)', icon: <X size={16} /> };

    return (
        <div className="create-supplier-page view-item-detail-page">
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
                    </div>

                    {/* ─── MAIN GRID: 6-4 như trang Create ─── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: '24px', alignItems: 'stretch' }}>
                        {/* LEFT CARD: Thông tin chung */}
                        <div className="info-section" style={{ margin: 0, height: '100%', boxSizing: 'border-box' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thông tin chung</h2>
                            </div>

                            <div style={{ display: 'flex', gap: FIELD_GAP, alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                    <div style={{
                                        width: 160, minWidth: 160, height: 160, borderRadius: 12,
                                        border: '1px solid #e5e7eb', backgroundColor: '#f1f5f9',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden', flexShrink: 0,
                                    }}>
                                        <Package size={72} color="#cbd5e1" />
                                    </div>
                                </div>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Tên vật tư</div>
                                        {isEditing ? (
                                            <EditUnderline
                                                name="itemName"
                                                value={formData.itemName}
                                                onChange={handleChange}
                                                placeholder="Nhập tên vật tư"
                                            />
                                        ) : (
                                            <ReadOnlyBox highlight>{item.itemName || '—'}</ReadOnlyBox>
                                        )}
                                    </div>

                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Loại vật tư</div>
                                        {isEditing ? (
                                            <EditSelectUnderline
                                                name="itemType"
                                                value={formData.itemType || 'Product'}
                                                onChange={handleChange}
                                                options={ITEM_TYPE_OPTIONS}
                                                placeholder="Chọn loại vật tư"
                                            />
                                        ) : (
                                            <ReadOnlyBox>{itemTypeViewLabel}</ReadOnlyBox>
                                        )}
                                    </div>

                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Thương hiệu</div>
                                        {isEditing ? (
                                            <EditSelectUnderline
                                                name="brandId"
                                                value={String(formData.brandId ?? '')}
                                                onChange={handleChange}
                                                options={brandSelectOptions}
                                                placeholder="Chọn nhãn hiệu"
                                            />
                                        ) : (
                                            <ReadOnlyBox>{item.brandName || item.brandId || '—'}</ReadOnlyBox>
                                        )}
                                    </div>

                                    <div style={FIELD_WRAPPER}>
                                        <div style={LABEL_STYLE}>Mô tả</div>
                                        {isEditing ? (
                                            <DescriptionEditBlock
                                                value={formData.description}
                                                onChange={handleChange}
                                            />
                                        ) : item.description ? (
                                            <DescriptionBlock>{item.description}</DescriptionBlock>
                                        ) : (
                                            <DescriptionBlock />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT CARD: Thông tin hệ thống */}
                        <div className="info-section" style={{ margin: 0, height: '100%', boxSizing: 'border-box' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thông tin hệ thống</h2>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={FIELD_WRAPPER}>
                                    <div style={LABEL_STYLE}>Trạng thái</div>
                                    <div style={{ minHeight: ROW_HEIGHT, display: 'flex', alignItems: 'center' }}>
                                        <StatusBadge config={statusConfig} />
                                    </div>
                                </div>

                                <div style={FIELD_WRAPPER}>
                                    <div style={LABEL_STYLE}>Danh mục</div>
                                    {isEditing ? (
                                        <EditSelectUnderline
                                            name="categoryId"
                                            value={String(formData.categoryId ?? '')}
                                            onChange={handleChange}
                                            options={categorySelectOptions}
                                            placeholder="Chọn danh mục"
                                        />
                                    ) : (
                                        <ReadOnlyBox>{item.categoryName || item.categoryId || '—'}</ReadOnlyBox>
                                    )}
                                </div>

                                <div style={FIELD_WRAPPER}>
                                    <div style={LABEL_STYLE}>Đơn vị tính</div>
                                    {isEditing ? (
                                        <EditSelectUnderline
                                            name="baseUomId"
                                            value={String(formData.baseUomId ?? '')}
                                            onChange={handleChange}
                                            options={uomSelectOptions}
                                            placeholder="Chọn đơn vị tính"
                                            onAddNew={() => setCreateUomOpen(true)}
                                        />
                                    ) : (
                                        <ReadOnlyBox>{item.baseUomName || item.baseUomId || '—'}</ReadOnlyBox>
                                    )}
                                </div>

                                <div style={FIELD_WRAPPER}>
                                    <div style={LABEL_STYLE}>Quy cách đóng gói</div>
                                    {isEditing ? (
                                        <EditSelectUnderline
                                            name="packagingSpecId"
                                            value={String(formData.packagingSpecId ?? '')}
                                            onChange={handleChange}
                                            options={packSelectOptions}
                                            placeholder="Chọn quy cách đóng gói"
                                            onAddNew={() => setCreatePackOpen(true)}
                                        />
                                    ) : (
                                        <ReadOnlyBox>{item.packagingSpecName || item.packagingSpecId || '—'}</ReadOnlyBox>
                                    )}
                                </div>

                                <div style={FIELD_WRAPPER}>
                                    <div style={LABEL_STYLE}>Thông số sản phẩm</div>
                                    {isEditing ? (
                                        <EditSelectUnderline
                                            name="specId"
                                            value={String(formData.specId ?? '')}
                                            onChange={handleChange}
                                            options={specSelectOptions}
                                            placeholder="Chọn thông số sản phẩm"
                                        />
                                    ) : (
                                        <ReadOnlyBox>{item.specName || item.specId || '—'}</ReadOnlyBox>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '10px 20px' }}>
                                    <div style={{ ...FIELD_WRAPPER, flex: '0 0 auto', minWidth: 0 }}>
                                        <div style={LABEL_STYLE}>Yêu cầu CO</div>
                                        {isEditing ? (
                                            <CheckboxToggle
                                                name="requiresCO"
                                                checked={Boolean(formData.requiresCO)}
                                                onChange={handleChange}
                                                labelTrue="Có"
                                                labelFalse="Không"
                                            />
                                        ) : (
                                            <PillBadge value={item.requiresCO} />
                                        )}
                                    </div>
                                    <div style={{ ...FIELD_WRAPPER, flex: '0 0 auto', minWidth: 0 }}>
                                        <div style={LABEL_STYLE}>Yêu cầu CQ</div>
                                        {isEditing ? (
                                            <CheckboxToggle
                                                name="requiresCQ"
                                                checked={Boolean(formData.requiresCQ)}
                                                onChange={handleChange}
                                                labelTrue="Có"
                                                labelFalse="Không"
                                            />
                                        ) : (
                                            <PillBadge value={item.requiresCQ} />
                                        )}
                                    </div>
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
                                    Tồn kho & lô hàng
                                </h2>
                            </div>
                            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: 16 }}>
                                <button
                                    type="button"
                                    onClick={() => setStockSectionTab('warehouse')}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: stockSectionTab === 'warehouse' ? '2px solid #2196F3' : '2px solid transparent',
                                        color: stockSectionTab === 'warehouse' ? '#2196F3' : '#6b7280',
                                        fontWeight: stockSectionTab === 'warehouse' ? 600 : 500,
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: -2,
                                        transition: 'all 0.2s',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    <Package size={16} />
                                    Số lượng theo kho
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStockSectionTab('lots')}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: stockSectionTab === 'lots' ? '2px solid #2196F3' : '2px solid transparent',
                                        color: stockSectionTab === 'lots' ? '#2196F3' : '#6b7280',
                                        fontWeight: stockSectionTab === 'lots' ? 600 : 500,
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: -2,
                                        transition: 'all 0.2s',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    <Layers size={16} />
                                    Các lô đang có ({lotsForItem.length})
                                </button>
                            </div>

                            {stockSectionTab === 'warehouse' && (
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
                            )}

                            {stockSectionTab === 'lots' && (
                                <div>
                                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px 0' }}>
                                        Các lô của vật tư này (dữ liệu mẫu — chờ API InventoryLots).
                                    </p>
                                    {lotsForItem.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', color: '#9ca3af' }}>
                                            <Layers size={48} strokeWidth={1.5} style={{ marginBottom: 8, opacity: 0.5 }} />
                                            <p style={{ fontSize: '14px', margin: 0 }}>Không có lô mẫu cho mã vật tư này</p>
                                        </div>
                                    ) : (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className="product-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: 56, textAlign: 'center' }}>STT</th>
                                                        <th style={{ minWidth: 140 }}>Mã phiếu nhập kho</th>
                                                        <th style={{ minWidth: 160 }}>Kho</th>
                                                        <th style={{ minWidth: 130 }}>Ngày nhập kho</th>
                                                        <th style={{ width: 110, textAlign: 'right' }}>Số lượng</th>
                                                        {showFullPrices && <th style={{ width: 120, textAlign: 'right' }}>Giá lô</th>}
                                                        <th style={{ minWidth: 130 }}>Hạn dùng</th>
                                                        <th style={{ width: 88, textAlign: 'center' }}>Hoạt động</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {lotsForItem.map((lot, idx) => {
                                                        const grnCode = getGrnCodeFromLineId(lot.grnLineId);
                                                        const whLabel = warehouseNameById.get(Number(lot.warehouseId)) ?? `Kho #${lot.warehouseId}`;
                                                        return (
                                                            <tr key={lot.lotId}>
                                                                <td style={{ textAlign: 'center', fontSize: 13 }}>{idx + 1}</td>
                                                                <td style={{ fontSize: 13, color: grnCode ? '#374151' : '#9ca3af', fontWeight: grnCode ? 600 : 400 }}>
                                                                    {grnCode ?? '—'}
                                                                </td>
                                                                <td style={{ fontSize: 13, color: '#374151' }}>{whLabel}</td>
                                                                <td style={{ fontSize: 12, color: '#374151' }}>{fmtLotDateOnly(lot.receiptDate)}</td>
                                                                <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 600 }}>{formatLotQuantityInt(lot.quantity)}</td>
                                                                {showFullPrices && (
                                                                    <td style={{ textAlign: 'right', fontSize: 13 }}>{formatLotMoney(lot.unitCost)}</td>
                                                                )}
                                                                <td style={{ fontSize: 12, color: '#374151' }}>{formatDateTimeFull(lot.expiryDate)}</td>
                                                                <td style={{ textAlign: 'center', fontSize: 13, color: lot.isActive ? '#059669' : '#6b7280', fontWeight: 600 }}>
                                                                    {lot.isActive ? 'Có' : 'Không'}
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
                    )}

                    {/* ─── LỊCH SỬ TỒN KHO ─── */}
                    {canViewItemHistory && (
                        <div className="info-section" style={{ marginTop: '24px' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Lịch sử tồn kho</h2>
                                {historyTotal > 0 && (
                                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        {historyTotal.toLocaleString('vi-VN')} bản ghi
                                    </span>
                                )}
                            </div>
                            {historyTotal === 0 && !stockHistory.length ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Chưa có lịch sử tồn kho.</div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    {historyRefreshing && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: 'rgba(255,255,255,0.65)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 2,
                                                borderRadius: 8,
                                            }}
                                        >
                                            <CircularProgress size={28} />
                                        </div>
                                    )}
                                    <div className="table-container item-history-table-wrap" style={{ overflowX: 'auto', overflowY: 'visible' }}>
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
                                                    const rowKey = `${h.docNo ?? ''}-${h.transactionAt ?? ''}-${idx}`;
                                                    return (
                                                        <tr key={rowKey}>
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
                                    {historyTotal > 0 && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-end',
                                                gap: 12,
                                                marginTop: 12,
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                                {historyRangeStart}–{historyRangeEnd} / {historyTotal.toLocaleString('vi-VN')}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                                                disabled={!canPrevHistory || historyRefreshing}
                                                style={{
                                                    padding: '4px 12px',
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    opacity: !canPrevHistory ? 0.4 : 1,
                                                    cursor: !canPrevHistory ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                Trước
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => setHistoryPage((p) => p + 1)}
                                                disabled={!canNextHistory || historyRefreshing}
                                                style={{
                                                    padding: '4px 12px',
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    opacity: !canNextHistory ? 0.4 : 1,
                                                    cursor: !canNextHistory ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                Sau
                                            </button>
                                        </div>
                                    )}
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
