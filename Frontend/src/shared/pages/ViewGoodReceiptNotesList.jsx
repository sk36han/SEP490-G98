import React, { useState, useEffect, useMemo } from 'react';
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
    Popover,
    FormGroup,
    FormControlLabel,
    Checkbox,
    FormControl,
    Select,
    MenuItem,
    Chip,
    TableSortLabel,
    Paper,
} from '@mui/material';
import {
    FileText,
    Filter,
    Columns,
    Plus,
    GripVertical,
    PackageOpen,
} from 'lucide-react';
import { removeDiacritics } from '../utils/stringUtils';
import SearchInput from '../components/SearchInput';
import GoodReceiptNoteFilterPopup from '../components/GoodReceiptNoteFilterPopup';
import '../styles/ListView.css';

// ── Constants ────────────────────────────────────────────────────────────────
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
const LS_COL_ORDER  = 'grnColumnOrder';
const LS_SORT       = 'grnSortConfig';

// ── Status styles ─────────────────────────────────────────────────────────────
const STATUS_STYLE = {
    Draft:     { bgColor: 'rgba(107,114,128,0.15)', label: 'Nháp',         dot: '•' },
    Submitted: { bgColor: 'rgba(59,130,246,0.15)',  label: 'Đã gửi duyệt', dot: '•' },
    Approved:  { bgColor: 'rgba(16,185,129,0.18)',  label: 'Đã duyệt',     dot: '•' },
    Rejected:  { bgColor: 'rgba(239,68,68,0.15)',   label: 'Từ chối',      dot: '•' },
    Posted:    { bgColor: 'rgba(139,92,246,0.15)',  label: 'Đã ghi sổ',    dot: '•' },
};

const RECEIVING_STATUS_STYLE = {
    NotStarted: { bgColor: 'rgba(107,114,128,0.15)', label: 'Chưa nhập',       dot: '•' },
    Partial:    { bgColor: 'rgba(251,191,36,0.20)',  label: 'Nhập một phần',   dot: '•' },
    Completed:  { bgColor: 'rgba(16,185,129,0.18)',  label: 'Đã nhập đủ',      dot: '•' },
};

// ── Column definitions ────────────────────────────────────────────────────────
const GRN_COLUMNS = [
    { id: 'stt',              label: 'STT',              sortable: false, getValue: (row, idx, { pageNumber, pageSize }) => (pageNumber - 1) * pageSize + idx + 1 },
    { id: 'grnCode',          label: 'Mã phiếu nhập',   sortable: true,  getValue: (row) => row.grnCode        ?? '' },
    { id: 'receiptDate',      label: 'Ngày nhập',        sortable: true,  getValue: (row) => row.receiptDate    ?? '' },
    { id: 'warehouseName',    label: 'Kho nhập',         sortable: true,  getValue: (row) => row.warehouseName  ?? '' },
    { id: 'supplierName',     label: 'Nhà cung cấp',     sortable: true,  getValue: (row) => row.supplierName   ?? '' },
    { id: 'status',           label: 'Trạng thái',       sortable: true,  getValue: (row) => STATUS_STYLE[row.status]?.label ?? row.status ?? '' },
    { id: 'actualQtyTotal',   label: 'Số lượng nhập',    sortable: true,  getValue: (row) => row.actualQtyTotal ?? 0 },
    { id: 'totalValue',       label: 'Giá trị đơn',      sortable: true,  getValue: (row) => row.totalValue     ?? 0 },
    { id: 'createdByName',    label: 'Nhân viên tạo',    sortable: true,  getValue: (row) => row.createdByName  ?? '' },
    { id: 'createdAt',        label: 'Ngày tạo',         sortable: true,  getValue: (row) => row.createdAt      ?? '' },
];

const DEFAULT_VISIBLE_COLUMN_IDS = GRN_COLUMNS.map((c) => c.id);
const SORTABLE_COLUMN_IDS = GRN_COLUMNS.filter((c) => c.sortable).map((c) => c.id);
const NUMBER_COLUMN_IDS   = ['actualQtyTotal', 'totalValue'];
const CURRENCY_COLUMN_IDS = ['totalValue'];
const DATE_COLUMN_IDS     = ['receiptDate', 'createdAt'];

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_GRN = [
    {
        grnId: 1, grnCode: 'GRN-2025-001', receiptDate: '2025-02-10',
        warehouseName: 'Kho Hà Nội',      supplierName: 'Công ty TNHH ABC',
        status: 'Approved',   receivingStatus: 'Completed',
        actualQtyTotal: 498,  totalValue: 74700000,
        createdByName: 'Nguyễn Văn A', createdAt: '2025-02-09T08:00:00',
    },
    {
        grnId: 2, grnCode: 'GRN-2025-002', receiptDate: '2025-02-12',
        warehouseName: 'Kho Đà Nẵng',     supplierName: 'Công ty CP XYZ',
        status: 'Submitted',  receivingStatus: 'NotStarted',
        actualQtyTotal: 0,    totalValue: 0,
        createdByName: 'Lê Văn C', createdAt: '2025-02-11T09:00:00',
    },
    {
        grnId: 3, grnCode: 'GRN-2025-003', receiptDate: '2025-02-14',
        warehouseName: 'Kho Hồ Chí Minh', supplierName: 'Công ty TNHH ABC',
        status: 'Draft',       receivingStatus: 'NotStarted',
        actualQtyTotal: 0,    totalValue: 0,
        createdByName: 'Nguyễn Văn A', createdAt: '2025-02-13T14:00:00',
    },
    {
        grnId: 4, grnCode: 'GRN-2025-004', receiptDate: '2025-02-18',
        warehouseName: 'Kho Hà Nội',      supplierName: 'Công ty CP XYZ',
        status: 'Rejected',    receivingStatus: 'NotStarted',
        actualQtyTotal: 0,    totalValue: 0,
        createdByName: 'Phạm Thị D', createdAt: '2025-02-17T16:00:00',
    },
    {
        grnId: 5, grnCode: 'GRN-2025-005', receiptDate: '2025-02-20',
        warehouseName: 'Kho Đà Nẵng',     supplierName: 'Công ty TNHH MNO',
        status: 'Posted',      receivingStatus: 'Partial',
        actualQtyTotal: 150,  totalValue: 22500000,
        createdByName: 'Trần Thị B', createdAt: '2025-02-19T10:00:00',
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN');
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return (
        d.toLocaleDateString('vi-VN') +
        '\n' +
        d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    );
};

// ── Shared cell sx (matches ViewPurchaseOrderList) ────────────────────────────
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
    width: 48,
    minWidth: 48,
    maxWidth: 48,
};

// ── Status Chip ───────────────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
    const style = STATUS_STYLE[status] ?? { bgColor: 'rgba(107,114,128,0.15)', label: status ?? '-', dot: '•' };
    return (
        <Chip
            label={`${style.dot} ${style.label}`}
            size="small"
            sx={{
                fontWeight: 500,
                fontSize: '12px',
                lineHeight: '16px',
                borderRadius: '999px',
                minWidth: 100,
                height: '26px',
                bgcolor: style.bgColor,
                color: '#374151',
                border: 'none',
                boxShadow: 'none',
                '& .MuiChip-label': { px: 1.5, py: 0, textAlign: 'left', display: 'block', width: '100%' },
            }}
        />
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function ViewGoodReceiptNotes() {
    const theme   = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();

    const [list, setList]             = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const [page, setPage]             = useState(0);
    const [pageSize, setPageSize]     = useState(20);
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(DEFAULT_VISIBLE_COLUMN_IDS));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [orderBy, setOrderBy]       = useState(null);
    const [order, setOrder]           = useState('asc');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [columnOrder, setColumnOrder] = useState(() => {
        const saved = localStorage.getItem(LS_COL_ORDER);
        return saved ? JSON.parse(saved) : GRN_COLUMNS.map((c) => c.id);
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [draggedColumn, setDraggedColumn]       = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);

    // Restore saved sort
    useEffect(() => {
        const saved = localStorage.getItem(LS_SORT);
        if (saved) {
            const cfg = JSON.parse(saved);
            if (cfg.orderBy) { setOrderBy(cfg.orderBy); setOrder(cfg.order); }
        }
    }, []);

    useEffect(() => { setList(MOCK_GRN); }, []);

    // Sync temp order when popup opens
    useEffect(() => {
        if (Boolean(columnSelectorAnchor)) setTempColumnOrder(columnOrder);
    }, [Boolean(columnSelectorAnchor)]);

    // ── Column visibility ──────────────────────────────────────────────────────
    const handleColumnVisibilityChange = (id, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    };
    const handleSelectAllColumns = (checked) =>
        setVisibleColumnIds(checked ? new Set(DEFAULT_VISIBLE_COLUMN_IDS) : new Set());

    const visibleColumns = useMemo(() =>
        GRN_COLUMNS
            .slice()
            .sort((a, b) => columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id))
            .filter((c) => visibleColumnIds.has(c.id)),
        [columnOrder, visibleColumnIds]);

    // ── Sort ───────────────────────────────────────────────────────────────────
    const handleSortRequest = (id) => {
        if (!SORTABLE_COLUMN_IDS.includes(id)) return;
        let newOrderBy, newOrder;
        if (orderBy === id) {
            if (order === 'asc') { newOrder = 'desc'; newOrderBy = id; }
            else                  { newOrder = 'asc';  newOrderBy = null; }
        } else { newOrderBy = id; newOrder = 'asc'; }
        setOrderBy(newOrderBy); setOrder(newOrder); setPage(0);
        localStorage.setItem(LS_SORT, JSON.stringify({ orderBy: newOrderBy, order: newOrder }));
    };

    // ── Column drag (table header) ─────────────────────────────────────────────
    const handleDragStart  = (e, id) => { setDraggedColumn(id); e.dataTransfer.effectAllowed = 'move'; };
    const handleDragOver   = (e)     => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDragEnd    = ()      => setDraggedColumn(null);
    const handleDrop = (e, targetId) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === targetId) return;
        const next = [...columnOrder];
        const from = next.indexOf(draggedColumn);
        const to   = next.indexOf(targetId);
        next.splice(from, 1); next.splice(to, 0, draggedColumn);
        setColumnOrder(next);
        localStorage.setItem(LS_COL_ORDER, JSON.stringify(next));
        setDraggedColumn(null);
    };

    // ── Column drag (popup) ────────────────────────────────────────────────────
    const handlePopupDragStart = (e, id) => { setDraggedPopupColumn(id); e.dataTransfer.effectAllowed = 'move'; };
    const handlePopupDragOver  = (e)     => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handlePopupDragEnd   = ()      => setDraggedPopupColumn(null);
    const handlePopupDrop = (e, targetId) => {
        e.preventDefault();
        if (!draggedPopupColumn || draggedPopupColumn === targetId) return;
        const next = [...tempColumnOrder];
        const from = next.indexOf(draggedPopupColumn);
        const to   = next.indexOf(targetId);
        next.splice(from, 1); next.splice(to, 0, draggedPopupColumn);
        setTempColumnOrder(next);
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

    // ── Filter & sort rows ────────────────────────────────────────────────────
    const filteredAndSortedRows = useMemo(() => {
        const norm = (s) => (s ? removeDiacritics(String(s).toLowerCase()) : '');
        const term = searchTerm.trim() ? norm(searchTerm.trim()) : '';
        let result = [...list];

        if (term) {
            result = result.filter((r) =>
                norm(r.grnCode).includes(term) ||
                norm(r.poCode).includes(term) ||
                norm(r.supplierName).includes(term) ||
                norm(r.warehouseName).includes(term) ||
                norm(r.createdByName).includes(term)
            );
        }
        if (filterValues.status)    result = result.filter((r) => r.status    === filterValues.status);
        if (filterValues.warehouse)  result = result.filter((r) => norm(r.warehouseName).includes(norm(filterValues.warehouse)));
        if (filterValues.supplier)   result = result.filter((r) => norm(r.supplierName).includes(norm(filterValues.supplier)));
        if (filterValues.createdBy)  result = result.filter((r) => norm(r.createdByName).includes(norm(filterValues.createdBy)));
        // if (filterValues.receivingStatus) result = result.filter((r) => r.receivingStatus === filterValues.receivingStatus);
        if (filterValues.fromDate)   result = result.filter((r) => r.receiptDate && r.receiptDate >= filterValues.fromDate);
        if (filterValues.toDate)     result = result.filter((r) => r.receiptDate && r.receiptDate <= filterValues.toDate);

        result.sort((a, b) => {
            if (!orderBy) return 0;
            const aVal = a[orderBy] ?? (NUMBER_COLUMN_IDS.includes(orderBy) ? 0 : '');
            const bVal = b[orderBy] ?? (NUMBER_COLUMN_IDS.includes(orderBy) ? 0 : '');
            let cmp = 0;
            if (orderBy === 'variance') {
                cmp = ((a.actualQtyTotal ?? 0) - (a.expectedQtyTotal ?? 0)) - ((b.actualQtyTotal ?? 0) - (b.expectedQtyTotal ?? 0));
            } else if (NUMBER_COLUMN_IDS.includes(orderBy)) {
                cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
            } else if (DATE_COLUMN_IDS.includes(orderBy)) {
                cmp = new Date(aVal || 0).getTime() - new Date(bVal || 0).getTime();
            } else {
                cmp = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
            }
            return order === 'asc' ? cmp : -cmp;
        });
        return result;
    }, [list, searchTerm, filterValues, orderBy, order]);

    const totalCount = filteredAndSortedRows.length;
    const start      = totalCount === 0 ? 0 : page * pageSize + 1;
    const end        = Math.min((page + 1) * pageSize, totalCount);
    const totalPages = pageSize > 0 ? Math.max(0, Math.ceil(totalCount / pageSize)) : 0;
    const rows       = filteredAndSortedRows.slice(page * pageSize, (page + 1) * pageSize);

    useEffect(() => setPage(0), [searchTerm, filterValues]);

    const handleFilterApply  = (vals) => { setFilterValues(vals); setPage(0); };
    const handlePageChange   = (p)    => setPage(p);
    const handlePageSizeChange = (e)  => { setPageSize(Number(e.target.value)); setPage(0); };

    // ── Row selection ──────────────────────────────────────────────────────────
    const handleSelectAll = (checked) =>
        setSelectedIds(checked ? new Set(rows.map((r) => r.grnId)) : new Set());
    const handleSelectRow = (id, checked) =>
        setSelectedIds((prev) => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    const isAllSelected  = rows.length > 0 && rows.every((r) => selectedIds.has(r.grnId));
    const isSomeSelected = rows.some((r) => selectedIds.has(r.grnId)) && !isAllSelected;

    const columnSelectorOpen = Boolean(columnSelectorAnchor);
    const activeFilterCount  = Object.values(filterValues).filter((v) => v && v !== '').length;

    // ── Toolbar sx helpers ─────────────────────────────────────────────────────
    const iconBtnSx = {
        border: '1px solid #e5e7eb',
        bgcolor: '#ffffff',
        borderRadius: '10px',
        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
    };

    return (
        <Box sx={{ height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>

            {/* ── Page header ─────────────────────────────────────────────── */}
            <Box sx={{ flexShrink: 0, px: { xs: 2, sm: 2 }, py: 2.5, bgcolor: '#fafafa' }}>
                <Typography variant="h5" component="h1" fontWeight="600" sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}>
                    Phiếu nhập kho
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Goods Receipt Note
                </Typography>
            </Box>

            {/* ── Filter Popup ─────────────────────────────────────────────── */}
            <GoodReceiptNoteFilterPopup
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                initialValues={filterValues}
                onApply={handleFilterApply}
            />

            {/* ── Main Card ────────────────────────────────────────────────── */}
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
                    {/* ── Toolbar ─────────────────────────────────────────── */}
                    <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid #f3f4f6' }}>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
                            <SearchInput
                                placeholder="Tìm theo mã phiếu, PO, nhà cung cấp, kho..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{
                                    flex: '1 1 200px', minWidth: isMobile ? '100%' : 200, maxWidth: isMobile ? '100%' : 480,
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px',
                                        '& fieldset': { border: 'none' },
                                        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                        '&.Mui-focused': { bgcolor: '#ffffff', borderColor: '#3b82f6', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' },
                                        '& input::placeholder': { color: '#9ca3af', fontSize: '13px' },
                                    },
                                }}
                            />

                            <Tooltip title={activeFilterCount > 0 ? `Bộ lọc (${activeFilterCount})` : 'Bộ lọc'}>
                                <IconButton onClick={() => setFilterOpen(true)} aria-label="Bộ lọc"
                                    sx={{ ...iconBtnSx, color: activeFilterCount > 0 ? '#3b82f6' : 'inherit', borderColor: activeFilterCount > 0 ? '#3b82f6' : '#e5e7eb' }}>
                                    <Filter size={18} />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton onClick={(e) => setColumnSelectorAnchor(e.currentTarget)} aria-label="Chọn cột" sx={iconBtnSx}>
                                    <Columns size={18} />
                                </IconButton>
                            </Tooltip>

                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                <Button
                                    variant="contained"
                                    startIcon={<Plus size={18} />}
                                    onClick={() => navigate('/good-receipt-notes/create')}
                                    sx={{
                                        fontSize: '13px', fontWeight: 500, textTransform: 'none',
                                        borderRadius: '10px', height: 38, px: 2.5,
                                        bgcolor: '#3b82f6', boxShadow: '0 1px 2px rgba(59,130,246,0.3)',
                                        '&:hover': { bgcolor: '#2563eb', boxShadow: '0 4px 12px rgba(59,130,246,0.4)' },
                                    }}
                                >
                                    Tạo phiếu nhập kho
                                </Button>
                            </Box>
                        </Box>
                    </Box>

                    {/* ── Column Selector Popover ──────────────────────────── */}
                    <Popover
                        open={columnSelectorOpen}
                        anchorEl={columnSelectorAnchor}
                        onClose={handleCancelColumnOrder}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        slotProps={{ paper: { elevation: 0, sx: { mt: 1, width: 340, maxHeight: '70vh', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column' } } }}
                    >
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>Chọn cột & Sắp xếp</Typography>
                        </Box>
                        <Box sx={{ px: 2.5, py: 2, flex: 1, minHeight: 0, overflowY: 'auto', '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px' } }}>
                            <FormGroup>
                                <FormControlLabel
                                    control={<Checkbox checked={visibleColumnIds.size === GRN_COLUMNS.length} indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < GRN_COLUMNS.length} onChange={(e) => handleSelectAllColumns(e.target.checked)} sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' }, '&.MuiCheckbox-indeterminate': { color: '#3b82f6' } }} />}
                                    label={<Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Tất cả</Typography>}
                                    sx={{ mb: 1, py: 0.5 }}
                                />
                                {GRN_COLUMNS.slice().sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id)).map((col) => (
                                    <Box key={col.id}
                                        sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: draggedPopupColumn === col.id ? '#f9fafb' : 'transparent', opacity: draggedPopupColumn === col.id ? 0.5 : 1, transition: 'all 0.2s', borderRadius: '8px', px: 0.75, py: 0.25, '&:hover': { bgcolor: '#f9fafb' } }}
                                        onDragOver={handlePopupDragOver}
                                        onDrop={(e) => handlePopupDrop(e, col.id)}
                                    >
                                        <Box draggable onDragStart={(e) => handlePopupDragStart(e, col.id)} onDragEnd={handlePopupDragEnd}
                                            sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', '&:active': { cursor: 'grabbing' }, color: '#9ca3af', '&:hover': { color: '#6b7280' } }}>
                                            <GripVertical size={14} />
                                        </Box>
                                        <FormControlLabel
                                            control={<Checkbox checked={visibleColumnIds.has(col.id)} onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)} sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' } }} />}
                                            label={<Typography sx={{ fontSize: '13px', color: '#374151' }}>{col.label}</Typography>}
                                            sx={{ flex: 1, m: 0, py: 0.5 }}
                                        />
                                    </Box>
                                ))}
                            </FormGroup>
                        </Box>
                        <Box sx={{ px: 2.5, py: 2, display: 'flex', gap: 1.5, borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
                            <Button variant="outlined" onClick={handleCancelColumnOrder}
                                sx={{ flex: 1, textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', borderColor: '#e5e7eb', color: '#6b7280', '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' } }}>Hủy</Button>
                            <Button variant="contained" onClick={handleSaveColumnOrder}
                                sx={{ flex: 1, textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', bgcolor: '#3b82f6', boxShadow: 'none', '&:hover': { bgcolor: '#2563eb', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' } }}>Lưu</Button>
                        </Box>
                    </Popover>

                    {/* ── Table ────────────────────────────────────────────── */}
                    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {rows.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, px: 2, color: 'text.secondary' }}>
                                <PackageOpen size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
                                <Typography sx={{ fontSize: '13px' }}>Chưa có phiếu nhập kho</Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {/* Checkbox header */}
                                            <TableCell padding="checkbox" sx={{ fontWeight: 600, bgcolor: '#fafafa', width: 56, minWidth: 56, maxWidth: 56, borderBottom: '2px solid #e5e7eb', fontSize: '12px', px: 2 }}>
                                                <Checkbox checked={isAllSelected} indeterminate={isSomeSelected} onChange={(e) => handleSelectAll(e.target.checked)} size="small" />
                                            </TableCell>
                                            {visibleColumns.map((col) => (
                                                <TableCell key={col.id}
                                                    sx={{ fontWeight: 600, bgcolor: draggedColumn === col.id ? 'action.hover' : '#fafafa', whiteSpace: 'nowrap', opacity: draggedColumn === col.id ? 0.5 : 1, transition: 'all 0.2s', borderBottom: '2px solid #e5e7eb', fontSize: '12px', color: '#6b7280', py: 1.5, px: 2 }}
                                                    align={NUMBER_COLUMN_IDS.includes(col.id) ? 'right' : (col.id === 'co' || col.id === 'cq') ? 'center' : 'left'}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, col.id)}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, '&:hover .drag-icon': { opacity: 0.6 } }}>
                                                        {col.sortable && (
                                                            <Box draggable onDragStart={(e) => handleDragStart(e, col.id)} onDragEnd={handleDragEnd} className="drag-icon"
                                                                sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', '&:active': { cursor: 'grabbing' }, color: '#9ca3af', opacity: 0, transition: 'opacity 0.2s' }}>
                                                                <GripVertical size={14} />
                                                            </Box>
                                                        )}
                                                        {col.sortable ? (
                                                            <TableSortLabel active={orderBy === col.id} direction={orderBy === col.id ? order : 'asc'} onClick={() => handleSortRequest(col.id)}
                                                                sx={{ flex: 1, '& .MuiTableSortLabel-icon': { fontSize: '14px', opacity: orderBy === col.id ? 1 : 0 } }}
                                                                hideSortIcon={false}>
                                                                {col.label}
                                                            </TableSortLabel>
                                                        ) : (
                                                            <Typography variant="inherit" sx={{ flex: 1 }}>{col.label}</Typography>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map((row, index) => (
                                            <TableRow key={row.grnId} hover
                                                sx={{ height: 56, '&:last-child td': { borderBottom: 0 }, '&:hover': { bgcolor: '#f9fafb' }, '& .MuiTableCell-root': BODY_CELL_SX, '& .MuiTableCell-paddingCheckbox': CHECKBOX_CELL_SX }}>
                                                <TableCell padding="checkbox">
                                                    <Checkbox checked={selectedIds.has(row.grnId)} onChange={(e) => handleSelectRow(row.grnId, e.target.checked)} size="small" />
                                                </TableCell>
                                                {visibleColumns.map((col) => {
                                                    const opts = { pageNumber: page + 1, pageSize };

                                                    if (col.id === 'stt') {
                                                        return <TableCell key={col.id} align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>{col.getValue(row, index, opts)}</TableCell>;
                                                    }

                                                    if (col.id === 'grnCode') {
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Box component="a"
                                                                        href={`/good-receipt-notes/${row.grnId}`}
                                                                        onClick={(e) => { e.preventDefault(); navigate(`/good-receipt-notes/${row.grnId}`); }}
                                                                        sx={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', '&:hover': { textDecoration: 'underline' } }}
                                                                        title={row.grnCode}>
                                                                        {row.grnCode}
                                                                    </Box>
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'status') {
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <StatusChip status={row.status} />
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (NUMBER_COLUMN_IDS.includes(col.id)) {
                                                        const val = col.getValue(row);
                                                        const isCurrency = CURRENCY_COLUMN_IDS.includes(col.id);
                                                        const display = isCurrency
                                                            ? Number(val).toLocaleString('vi-VN') + ' ₫'
                                                            : val;
                                                        return (
                                                            <TableCell
                                                                key={col.id}
                                                                align="right"
                                                                sx={{
                                                                    fontWeight: isCurrency ? 600 : 500,
                                                                    fontVariantNumeric: 'tabular-nums',
                                                                    pr: 3,
                                                                    color: '#374151',
                                                                }}
                                                            >
                                                                {display}
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (DATE_COLUMN_IDS.includes(col.id)) {
                                                        return (
                                                            <TableCell
                                                                key={col.id}
                                                                align="left"
                                                                sx={{
                                                                    color: '#6b7280',
                                                                    fontVariantNumeric: 'tabular-nums',
                                                                    whiteSpace: col.id === 'createdAt' ? 'pre-line' : 'nowrap',
                                                                }}
                                                            >
                                                                {col.id === 'createdAt'
                                                                    ? formatDateTime(row.createdAt)
                                                                    : formatDate(row.receiptDate)}
                                                            </TableCell>
                                                        );
                                                    }

                                                    return (
                                                        <TableCell key={col.id} align="left" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={col.getValue(row)}>
                                                            {col.getValue(row) || <Box component="span" sx={{ color: '#d1d5db' }}>—</Box>}
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

                    {/* ── Pagination ───────────────────────────────────────── */}
                    <Box sx={{ flexShrink: 0, px: 2, py: 2, borderTop: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>Số dòng / trang:</Typography>
                        <FormControl size="small" sx={{ minWidth: 72 }}>
                            <Select value={pageSize} onChange={handlePageSizeChange}
                                sx={{ height: 32, fontSize: '13px', borderRadius: '8px', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.1)' } }}>
                                {ROWS_PER_PAGE_OPTIONS.map((n) => <MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>{n}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                            {start}–{end} / {totalCount} (Tổng {totalPages} trang)
                        </Typography>
                        <Button size="small" variant="outlined" disabled={page <= 0} onClick={() => handlePageChange(page - 1)}
                            sx={{ minWidth: 36, textTransform: 'none', fontSize: '13px', borderRadius: '8px', borderColor: 'rgba(0,0,0,0.1)', '&:hover': { borderColor: 'rgba(0,0,0,0.2)' } }}>
                            Trước
                        </Button>
                        <Button size="small" variant="outlined" disabled={end >= totalCount || totalCount === 0} onClick={() => handlePageChange(page + 1)}
                            sx={{ minWidth: 36, textTransform: 'none', fontSize: '13px', borderRadius: '8px', borderColor: 'rgba(0,0,0,0.1)', '&:hover': { borderColor: 'rgba(0,0,0,0.2)' } }}>
                            Sau
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
