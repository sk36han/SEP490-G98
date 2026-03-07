import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Typography,
    IconButton,
    Tooltip,
    useTheme,
    useMediaQuery,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Popover,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Paper,
    Chip,
    FormControl,
    Select,
    MenuItem,
} from '@mui/material';
import { Filter, CloudOff, Columns, Plus, GripVertical } from 'lucide-react';
import { getSuppliers } from '../lib/supplierService';
import { removeDiacritics } from '../utils/stringUtils';
import SearchInput from '../components/SearchInput';
import SupplierFilterPopup from '../components/SupplierFilterPopup';
import ViewSupplierDetail from '../components/ViewSupplierDetail';
import '../styles/ListView.css';

// ── LocalStorage keys ──────────────────────────────────────────────────────
const LS_COL_ORDER  = 'supplierColumnOrder';
const LS_SORT       = 'supplierSortConfig';

// ── Constants ──────────────────────────────────────────────────────────────
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const STATUS_STYLE = {
    true:  { bgColor: 'rgba(16,185,129,0.18)',  label: 'Hoạt động', dot: '•' },
    false: { bgColor: 'rgba(239,68,68,0.15)',   label: 'Ngừng HĐ',  dot: '•' },
};

const SUPPLIER_COLUMNS = [
    { id: 'stt',          label: 'STT',              sortable: false },
    { id: 'supplierCode', label: 'Mã NCC',            sortable: true  },
    { id: 'supplierName', label: 'Tên nhà cung cấp',  sortable: true  },
    { id: 'taxCode',      label: 'Mã số thuế',         sortable: false },
    { id: 'phone',        label: 'Điện thoại',         sortable: false },
    { id: 'email',        label: 'Email',              sortable: true  },
    { id: 'city',         label: 'Tỉnh/Thành phố',    sortable: true  },
    { id: 'district',     label: 'Quận/Huyện',         sortable: false },
    { id: 'ward',         label: 'Phường/Xã',          sortable: false },
    { id: 'isActive',     label: 'Trạng thái',         sortable: true  },
];

const DEFAULT_VISIBLE_COLUMN_IDS = SUPPLIER_COLUMNS.map((c) => c.id);
const SORTABLE_COLUMN_IDS        = SUPPLIER_COLUMNS.filter((c) => c.sortable).map((c) => c.id);

// ── Shared cell sx (matches ViewPurchaseOrderList exactly) ─────────────────
const BODY_CELL_SX = {
    py: 1.75,
    px: 2,
    fontSize: '13px',
    lineHeight: '20px',
    verticalAlign: 'middle',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
};

const CHECKBOX_CELL_SX = {
    ...BODY_CELL_SX,
    width: 56,
    minWidth: 56,
    maxWidth: 56,
};

// ── Component ──────────────────────────────────────────────────────────────
export default function ViewSupplierList() {
    const theme    = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();

    // Data / loading
    const [rows, setRows]           = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);

    // Pagination
    const [page, setPage]         = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Search & filter
    const [searchTerm, setSearchTerm]     = useState('');
    const [filterOpen, setFilterOpen]     = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const activeFilterCount = useMemo(
        () => Object.values(filterValues).filter((v) => v !== undefined && v !== null && v !== '').length,
        [filterValues],
    );

    // Sorting — 3-state: asc → desc → null (reset)
    const [orderBy, setOrderBy] = useState(() => {
        try { const s = JSON.parse(localStorage.getItem(LS_SORT)); return s?.orderBy || null; } catch { return null; }
    });
    const [order, setOrder] = useState(() => {
        try { const s = JSON.parse(localStorage.getItem(LS_SORT)); return s?.order || 'asc'; } catch { return 'asc'; }
    });

    // Row selection
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Column visibility + order
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(DEFAULT_VISIBLE_COLUMN_IDS));
    const [columnOrder, setColumnOrder]   = useState(() => {
        try {
            const allIds   = SUPPLIER_COLUMNS.map((c) => c.id);
            const saved    = JSON.parse(localStorage.getItem(LS_COL_ORDER));
            if (Array.isArray(saved) && saved.length > 0) {
                const validIds = new Set(allIds);
                const filtered = saved.filter((id) => validIds.has(id));
                // append any new columns that weren't in the saved order yet
                const missing  = allIds.filter((id) => !filtered.includes(id));
                return [...filtered, ...missing];
            }
            return allIds;
        } catch { return SUPPLIER_COLUMNS.map((c) => c.id); }
    });
    const [tempColumnOrder, setTempColumnOrder]       = useState(columnOrder);
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

    // Drag (table header columns)
    const [draggedColumn, setDraggedColumn]           = useState(null);
    // Drag within popup
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);

    // Detail popup
    const [detailOpen, setDetailOpen]         = useState(false);
    const [detailSupplier, setDetailSupplier] = useState(null);

    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    // When popup opens, sync tempColumnOrder
    useEffect(() => {
        if (columnSelectorOpen) setTempColumnOrder(columnOrder);
    }, [columnSelectorOpen, columnOrder]);

    // Visible columns in current order
    const visibleColumns = useMemo(
        () => columnOrder
            .map((id) => SUPPLIER_COLUMNS.find((c) => c.id === id))
            .filter((c) => c && visibleColumnIds.has(c.id)),
        [columnOrder, visibleColumnIds],
    );

    // ── Drag — table header ───────────────────────────────────────
    // Use dataTransfer as the reliable source of truth (React state may be stale at drop time)
    const handleDragStart = (e, colId) => {
        setDraggedColumn(colId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colId);
    };
    const handleDragEnd  = () => setDraggedColumn(null);
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop     = (e, targetId) => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('text/plain') || draggedColumn;
        if (!sourceId || sourceId === targetId) { setDraggedColumn(null); return; }
        const arr = [...columnOrder];
        const from = arr.indexOf(sourceId);
        const to   = arr.indexOf(targetId);
        if (from === -1 || to === -1) { setDraggedColumn(null); return; }
        arr.splice(from, 1);
        arr.splice(to, 0, sourceId);
        setColumnOrder(arr);
        localStorage.setItem(LS_COL_ORDER, JSON.stringify(arr));
        setDraggedColumn(null);
    };

    // ── Drag — column selector popup ─────────────────────────────
    const handlePopupDragStart = (e, colId) => {
        setDraggedPopupColumn(colId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colId);
    };
    const handlePopupDragEnd   = () => setDraggedPopupColumn(null);
    const handlePopupDragOver  = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handlePopupDrop      = (e, targetId) => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('text/plain') || draggedPopupColumn;
        if (!sourceId || sourceId === targetId) { setDraggedPopupColumn(null); return; }
        const arr = [...tempColumnOrder];
        const from = arr.indexOf(sourceId);
        const to   = arr.indexOf(targetId);
        if (from === -1 || to === -1) { setDraggedPopupColumn(null); return; }
        arr.splice(from, 1);
        arr.splice(to, 0, sourceId);
        setTempColumnOrder(arr);
        setDraggedPopupColumn(null);
    };

    const handleSaveColumnOrder = () => {
        setColumnOrder(tempColumnOrder);
        localStorage.setItem(LS_COL_ORDER, JSON.stringify(tempColumnOrder));
        setColumnSelectorAnchor(null);
    };
    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setColumnSelectorAnchor(null);
    };

    // ── Sort — 3 states ───────────────────────────────────────────
    const handleSortRequest = (colId) => {
        if (!SORTABLE_COLUMN_IDS.includes(colId)) return;
        let newOrderBy, newOrder;
        if (orderBy === colId) {
            if (order === 'asc') { newOrderBy = colId;  newOrder = 'desc'; }
            else                 { newOrderBy = null;   newOrder = 'asc';  }
        } else {
            newOrderBy = colId; newOrder = 'asc';
        }
        setOrderBy(newOrderBy);
        setOrder(newOrder);
        setPage(0);
        localStorage.setItem(LS_SORT, JSON.stringify({ orderBy: newOrderBy, order: newOrder }));
    };

    // ── Row selection ─────────────────────────────────────────────
    const handleSelectAll = (checked) => {
        setSelectedIds(checked ? new Set(rows.map((r) => r.supplierId)) : new Set());
    };
    const handleSelectRow = (id, checked) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    };
    const isAllSelected  = rows.length > 0 && rows.every((r) => selectedIds.has(r.supplierId));
    const isSomeSelected = rows.some((r) => selectedIds.has(r.supplierId)) && !isAllSelected;

    // ── API fetch ─────────────────────────────────────────────────
    const getApiParams = useCallback(() => {
        const fv = filterValues || {};
        const normalize = (s) => (s ? removeDiacritics(String(s).toLowerCase()) : '');
        const supplierName =
            fv.supplierName?.trim()
                ? fv.supplierName.trim()
                : searchTerm.trim();
        return {
            page:         page + 1,
            pageSize,
            supplierCode: fv.supplierCode?.trim() || '',
            supplierName: supplierName || '',
            taxCode:      fv.taxCode?.trim()      || '',
            isActive:     fv.isActive   ?? null,
            fromDate:     fv.fromDate   || null,
            toDate:       fv.toDate     || null,
        };
    }, [page, pageSize, searchTerm, filterValues]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getSuppliers(getApiParams());
            setRows(Array.isArray(res?.items) ? res.items : []);
            setTotalRows(res?.totalItems ?? 0);
        } catch (err) {
            const status = err?.response?.status;
            let msg = err?.response?.data?.message ?? err?.message;
            if (status === 404)                   msg = 'API trả 404. Kiểm tra backend đang chạy.';
            else if (!msg || typeof msg !== 'string') msg = 'Không thể kết nối đến server.';
            setError(msg);
            setRows([]);
            setTotalRows(0);
        } finally {
            setLoading(false);
        }
    }, [getApiParams]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { setPage(0); setSelectedIds(new Set()); }, [searchTerm, filterValues]);

    // Client-side sort on current page data
    const sortedRows = useMemo(() => {
        if (!orderBy) return rows;
        return [...rows].sort((a, b) => {
            const aVal = a[orderBy];
            const bVal = b[orderBy];
            let cmp = 0;
            if (typeof aVal === 'boolean') {
                cmp = (aVal === bVal) ? 0 : aVal ? -1 : 1;
            } else {
                const strA = String(aVal ?? '').toLowerCase();
                const strB = String(bVal ?? '').toLowerCase();
                cmp = strA.localeCompare(strB, 'vi');
            }
            return order === 'asc' ? cmp : -cmp;
        });
    }, [rows, orderBy, order]);

    const handleFilterApply = (values) => { setFilterValues(values); setPage(0); };
    const handlePageSizeChange = (e) => { setPageSize(Number(e.target.value)); setPage(0); };

    const start      = totalRows === 0 ? 0 : page * pageSize + 1;
    const end        = Math.min((page + 1) * pageSize, totalRows);
    const totalPages = pageSize > 0 ? Math.max(0, Math.ceil(totalRows / pageSize)) : 0;
    const showEmpty  = !loading && !error && rows.length === 0;

    // ── Render ────────────────────────────────────────────────────
    return (
        <Box sx={{
            height: '100%', minHeight: 0, minWidth: 0,
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            bgcolor: '#fafafa',
        }}>
            {/* Popups */}
            <ViewSupplierDetail
                open={detailOpen}
                onClose={() => { setDetailOpen(false); setDetailSupplier(null); }}
                supplier={detailSupplier}
            />
            <SupplierFilterPopup
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                initialValues={filterValues}
                onApply={handleFilterApply}
            />

            {/* Page Header */}
            <Box sx={{ flexShrink: 0, px: { xs: 2, sm: 2 }, py: 2.5, bgcolor: '#fafafa' }}>
                <Typography variant="h5" component="h1" fontWeight="600" sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}>
                    Danh sách nhà cung cấp
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Suppliers
                </Typography>
            </Box>

            {/* Main Content Wrapper */}
            <Box sx={{ flex: 1, px: { xs: 2, sm: 2 }, pb: 2, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Paper
                    className="list-view"
                    elevation={0}
                    sx={{
                        flex: 1, minHeight: 0, overflow: 'hidden',
                        display: 'flex', flexDirection: 'column',
                        border: '1px solid #e5e7eb', borderRadius: '12px', bgcolor: '#ffffff',
                    }}
                >
                    {/* ── Toolbar ── */}
                    <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid #f3f4f6' }}>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
                            <SearchInput
                                placeholder="Tìm theo mã NCC, tên nhà cung cấp, mã số thuế…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{
                                    flex: '1 1 200px',
                                    minWidth: isMobile ? '100%' : 200,
                                    maxWidth: isMobile ? '100%' : 480,
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: '#f3f4f6',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        '& fieldset': { border: 'none' },
                                        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                        '&.Mui-focused': {
                                            bgcolor: '#ffffff',
                                            borderColor: '#0284c7',
                                            boxShadow: '0 0 0 3px rgba(2,132,199,0.10)',
                                        },
                                        '& input::placeholder': { color: '#9ca3af', fontSize: '13px' },
                                    },
                                }}
                            />

                            <Tooltip title="Bộ lọc">
                                <IconButton
                                    color="primary"
                                    onClick={() => setFilterOpen(true)}
                                    aria-label="Bộ lọc"
                                    sx={{
                                        border: '1px solid #e5e7eb',
                                        bgcolor: '#ffffff',
                                        borderRadius: '10px',
                                        position: 'relative',
                                        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                    }}
                                >
                                    <Filter size={18} />
                                    {activeFilterCount > 0 && (
                                        <Box sx={{
                                            position: 'absolute', top: 4, right: 4,
                                            width: 8, height: 8, borderRadius: '50%',
                                            bgcolor: '#0284c7',
                                        }} />
                                    )}
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton
                                    color="primary"
                                    onClick={(e) => setColumnSelectorAnchor(e.currentTarget)}
                                    aria-label="Chọn cột"
                                    sx={{
                                        border: '1px solid #e5e7eb',
                                        bgcolor: '#ffffff',
                                        borderRadius: '10px',
                                        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                    }}
                                >
                                    <Columns size={18} />
                                </IconButton>
                            </Tooltip>

                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                <Button
                                    className="list-page-btn"
                                    variant="contained"
                                    startIcon={<Plus size={18} />}
                                    onClick={() => navigate('/suppliers/create')}
                                    sx={{
                                        fontSize: '13px', fontWeight: 500,
                                        textTransform: 'none', borderRadius: '10px',
                                        height: 38, px: 2.5,
                                        bgcolor: '#0284c7',
                                        boxShadow: '0 1px 2px rgba(2,132,199,0.25)',
                                        '&:hover': {
                                            bgcolor: '#0369a1',
                                            boxShadow: '0 4px 12px rgba(2,132,199,0.30)',
                                        },
                                    }}
                                >
                                    Thêm nhà cung cấp
                                </Button>
                            </Box>
                        </Box>
                    </Box>

                    {/* ── Column Selector Popover ── */}
                    <Popover
                        open={columnSelectorOpen}
                        anchorEl={columnSelectorAnchor}
                        onClose={handleCancelColumnOrder}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        slotProps={{
                            paper: {
                                elevation: 0,
                                sx: {
                                    mt: 1, width: 340, maxHeight: '70vh',
                                    borderRadius: '14px',
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                                    overflow: 'hidden', display: 'flex', flexDirection: 'column',
                                },
                            },
                        }}
                    >
                        {/* Header */}
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>
                                Chọn cột & Sắp xếp
                            </Typography>
                        </Box>

                        {/* Body */}
                        <Box sx={{
                            px: 2.5, py: 2, flex: 1, minHeight: 0, overflowY: 'auto',
                            '&::-webkit-scrollbar': { width: '6px' },
                            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                            '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px', '&:hover': { bgcolor: '#9ca3af' } },
                        }}>
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={visibleColumnIds.size === SUPPLIER_COLUMNS.length}
                                            indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < SUPPLIER_COLUMNS.length}
                                            onChange={(e) => setVisibleColumnIds(e.target.checked ? new Set(DEFAULT_VISIBLE_COLUMN_IDS) : new Set())}
                                            sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#0284c7' }, '&.MuiCheckbox-indeterminate': { color: '#0284c7' } }}
                                        />
                                    }
                                    label={<Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Tất cả</Typography>}
                                    sx={{ mb: 1, py: 0.5 }}
                                />
                                {SUPPLIER_COLUMNS
                                    .slice()
                                    .sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id))
                                    .map((col) => (
                                        <Box
                                            key={col.id}
                                            sx={{
                                                display: 'flex', alignItems: 'center', gap: 1,
                                                bgcolor: draggedPopupColumn === col.id ? '#f9fafb' : 'transparent',
                                                opacity: draggedPopupColumn === col.id ? 0.5 : 1,
                                                transition: 'all 0.2s',
                                                borderRadius: '8px', px: 0.75, py: 0.25,
                                                '&:hover': { bgcolor: '#f9fafb' },
                                            }}
                                            onDragOver={handlePopupDragOver}
                                            onDrop={(e) => handlePopupDrop(e, col.id)}
                                        >
                                            <Box
                                                draggable
                                                onDragStart={(e) => handlePopupDragStart(e, col.id)}
                                                onDragEnd={handlePopupDragEnd}
                                                sx={{
                                                    display: 'flex', alignItems: 'center',
                                                    cursor: 'grab', '&:active': { cursor: 'grabbing' },
                                                    color: '#9ca3af', '&:hover': { color: '#6b7280' },
                                                }}
                                            >
                                                <GripVertical size={14} />
                                            </Box>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={visibleColumnIds.has(col.id)}
                                                        onChange={(e) => {
                                                            setVisibleColumnIds((prev) => {
                                                                const next = new Set(prev);
                                                                e.target.checked ? next.add(col.id) : next.delete(col.id);
                                                                return next;
                                                            });
                                                        }}
                                                        sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#0284c7' } }}
                                                    />
                                                }
                                                label={<Typography sx={{ fontSize: '13px', color: '#374151' }}>{col.label}</Typography>}
                                                sx={{ flex: 1, m: 0, py: 0.5 }}
                                            />
                                        </Box>
                                    ))
                                }
                            </FormGroup>
                        </Box>

                        {/* Footer */}
                        <Box sx={{ px: 2.5, py: 2, display: 'flex', gap: 1.5, borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
                            <Button
                                variant="outlined"
                                onClick={handleCancelColumnOrder}
                                sx={{
                                    flex: 1, textTransform: 'none',
                                    fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px',
                                    borderColor: '#e5e7eb', color: '#6b7280',
                                    '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' },
                                }}
                            >
                                Hủy
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleSaveColumnOrder}
                                sx={{
                                    flex: 1, textTransform: 'none',
                                    fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px',
                                    bgcolor: '#0284c7', boxShadow: 'none',
                                    '&:hover': { bgcolor: '#0369a1', boxShadow: '0 2px 8px rgba(2,132,199,0.25)' },
                                }}
                            >
                                Lưu
                            </Button>
                        </Box>
                    </Popover>

                    {/* ── Table / State area ── */}
                    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, py: 8 }}>
                                <Typography sx={{ fontSize: '14px', color: '#9ca3af' }}>Đang tải…</Typography>
                            </Box>
                        ) : error ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 1.5 }}>
                                <CloudOff size={40} style={{ color: '#d1d5db' }} />
                                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Không thể kết nối đến máy chủ</Typography>
                                <Typography sx={{ fontSize: '13px', color: '#9ca3af' }}>{error}</Typography>
                                <Button
                                    size="small" variant="outlined" onClick={fetchData}
                                    sx={{
                                        mt: 0.5, fontSize: '13px', textTransform: 'none',
                                        borderRadius: '8px', borderColor: 'rgba(2,132,199,0.30)',
                                        color: '#0284c7', '&:hover': { bgcolor: 'rgba(2,132,199,0.06)' },
                                    }}
                                >
                                    Thử lại
                                </Button>
                            </Box>
                        ) : showEmpty ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 1, color: 'text.secondary' }}>
                                <CloudOff size={48} style={{ marginBottom: 8, opacity: 0.35 }} />
                                <Typography sx={{ fontSize: '13px' }}>Chưa có dữ liệu nhà cung cấp</Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {/* Checkbox */}
                                            <TableCell
                                                padding="checkbox"
                                                sx={{
                                                    fontWeight: 600, bgcolor: '#fafafa',
                                                    width: 56, minWidth: 56, maxWidth: 56,
                                                    borderBottom: '2px solid #e5e7eb',
                                                    fontSize: '12px', px: 2,
                                                }}
                                            >
                                                <Checkbox
                                                    checked={isAllSelected}
                                                    indeterminate={isSomeSelected}
                                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                                    size="small"
                                                />
                                            </TableCell>

                                            {visibleColumns.map((col) => (
                                                <TableCell
                                                    key={col.id}
                                                    sx={{
                                                        fontWeight: 600,
                                                        bgcolor: draggedColumn === col.id ? 'action.hover' : '#fafafa',
                                                        whiteSpace: 'nowrap',
                                                        opacity: draggedColumn === col.id ? 0.5 : 1,
                                                        transition: 'all 0.2s',
                                                        borderBottom: '2px solid #e5e7eb',
                                                        fontSize: '12px', color: '#6b7280',
                                                        py: 1.5, px: 2,
                                                    }}
                                                    align={col.id === 'stt' ? 'center' : 'left'}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, col.id)}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, '&:hover .drag-icon': { opacity: 0.6 } }}>
                                                        <Box
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, col.id)}
                                                            onDragEnd={handleDragEnd}
                                                            className="drag-icon"
                                                            sx={{
                                                                display: 'flex', alignItems: 'center',
                                                                cursor: 'grab', '&:active': { cursor: 'grabbing' },
                                                                color: '#9ca3af', opacity: 0, transition: 'opacity 0.2s',
                                                            }}
                                                        >
                                                            <GripVertical size={14} />
                                                        </Box>
                                                        {col.sortable ? (
                                                            <TableSortLabel
                                                                active={orderBy === col.id}
                                                                direction={orderBy === col.id ? order : 'asc'}
                                                                onClick={() => handleSortRequest(col.id)}
                                                                sx={{
                                                                    flex: 1,
                                                                    '& .MuiTableSortLabel-icon': {
                                                                        fontSize: '14px',
                                                                        opacity: orderBy === col.id ? 1 : 0,
                                                                    },
                                                                }}
                                                                hideSortIcon={false}
                                                            >
                                                                {col.label}
                                                            </TableSortLabel>
                                                        ) : (
                                                            <Typography variant="inherit" sx={{ flex: 1 }}>
                                                                {col.label}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        {sortedRows.map((row, index) => (
                                            <TableRow
                                                key={row.supplierId}
                                                hover
                                                sx={{
                                                    height: 56,
                                                    '&:last-child td': { borderBottom: 0 },
                                                    '&:hover': { bgcolor: '#f9fafb' },
                                                    '& .MuiTableCell-root': BODY_CELL_SX,
                                                    '& .MuiTableCell-paddingCheckbox': CHECKBOX_CELL_SX,
                                                }}
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={selectedIds.has(row.supplierId)}
                                                        onChange={(e) => handleSelectRow(row.supplierId, e.target.checked)}
                                                        size="small"
                                                    />
                                                </TableCell>

                                                {visibleColumns.map((col) => {
                                                    // STT
                                                    if (col.id === 'stt') {
                                                        return (
                                                            <TableCell key={col.id} align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                                                {page * pageSize + index + 1}
                                                            </TableCell>
                                                        );
                                                    }

                                                    // Supplier name — simple blue link (same color as orderCode in ViewPO)
                                                    if (col.id === 'supplierName') {
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Box
                                                                        component="a"
                                                                        href="#"
                                                                        onClick={(e) => { e.preventDefault(); setDetailSupplier(row); setDetailOpen(true); }}
                                                                        sx={{
                                                                            color: '#3b82f6',
                                                                            textDecoration: 'none',
                                                                            cursor: 'pointer',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                            '&:hover': { textDecoration: 'underline' },
                                                                        }}
                                                                        title={row.supplierName ?? ''}
                                                                    >
                                                                        {row.supplierName ?? ''}
                                                                    </Box>
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }

                                                    // Status chip
                                                    if (col.id === 'isActive') {
                                                        const style = STATUS_STYLE[String(row.isActive)] ?? { bgColor: 'rgba(107,114,128,0.15)', label: '-', dot: '•' };
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Chip
                                                                        label={`${style.dot} ${style.label}`}
                                                                        size="small"
                                                                        sx={{
                                                                            fontWeight: 500,
                                                                            fontSize: '12px',
                                                                            lineHeight: '16px',
                                                                            borderRadius: '999px',
                                                                            minWidth: 90,
                                                                            height: '26px',
                                                                            bgcolor: style.bgColor,
                                                                            color: '#374151',
                                                                            border: 'none',
                                                                            boxShadow: 'none',
                                                                            '& .MuiChip-label': { px: 1.5, py: 0, textAlign: 'left', display: 'block', width: '100%' },
                                                                        }}
                                                                    />
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }

                                                    // Default text columns
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="left"
                                                            sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                            title={String(row[col.id] ?? '')}
                                                        >
                                                            {String(row[col.id] ?? '')}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>

                    {/* ── Pagination ── */}
                    <Box sx={{
                        flexShrink: 0, px: 2, py: 2,
                        borderTop: '1px solid #f3f4f6',
                        display: 'flex', flexWrap: 'wrap',
                        alignItems: 'center', justifyContent: 'flex-end',
                        gap: 2,
                    }}>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                            Số dòng / trang:
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 72 }}>
                            <Select
                                value={pageSize}
                                onChange={handlePageSizeChange}
                                sx={{
                                    height: 32, fontSize: '13px', borderRadius: '8px',
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.1)' },
                                }}
                            >
                                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                    <MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>{n}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                            {start}–{end} / {totalRows} (Tổng {totalPages} trang)
                        </Typography>
                        <Button
                            size="small" variant="outlined"
                            disabled={page <= 0}
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            sx={{
                                minWidth: 36, textTransform: 'none', fontSize: '13px',
                                borderRadius: '8px', borderColor: 'rgba(0,0,0,0.1)',
                                '&:hover': { borderColor: 'rgba(0,0,0,0.2)' },
                            }}
                        >
                            Trước
                        </Button>
                        <Button
                            size="small" variant="outlined"
                            disabled={end >= totalRows || totalRows === 0}
                            onClick={() => setPage((p) => p + 1)}
                            sx={{
                                minWidth: 36, textTransform: 'none', fontSize: '13px',
                                borderRadius: '8px', borderColor: 'rgba(0,0,0,0.1)',
                                '&:hover': { borderColor: 'rgba(0,0,0,0.2)' },
                            }}
                        >
                            Sau
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
