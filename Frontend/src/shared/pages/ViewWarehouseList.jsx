import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePolling } from '../hooks/usePolling';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Tooltip,
    Popover,
    FormGroup,
    FormControlLabel,
    Checkbox,
    FormControl,
    Select,
    MenuItem,
    useTheme,
    useMediaQuery,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import { StatusBadge } from '@ui/badges';
import { Plus, Columns, GripVertical, Warehouse as WarehouseIcon, Building2 } from 'lucide-react';
import { removeDiacritics } from '../utils/stringUtils';
import SearchInput from '../components/SearchInput';
import { getWarehouses } from '../lib/warehouseService';
import { formatDateTimeLinesUtc } from '../lib/dateUtils';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import '../styles/ListView.css';

// ── Constants ────────────────────────────────────────────────────────────────
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
const LS_COL_ORDER = 'warehouseColumnOrder';

// isActive uses StatusBadge via <StatusBadge status={item.isActive} />

// ── Summary Card ──────────────────────────────────────────────────────────────
const SummaryCard = ({ icon, label, value, color, bgColor }) => {
    const IconComp = icon;
    return (
        <Box sx={{
            flex: '1 1 200px', minWidth: 200, bgcolor: '#fff',
            border: '1px solid #e5e7eb', borderRadius: '14px', p: 2.5,
            display: 'flex', alignItems: 'center', gap: 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
            <Box sx={{
                width: 48, height: 48, borderRadius: '12px', bgcolor: bgColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
                <IconComp size={22} color={color} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.3 }}>{label}</Typography>
                <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.2, mt: 0.25 }}>
                    {value}
                </Typography>
            </Box>
        </Box>
    );
};

// ── Column definitions ────────────────────────────────────────────────────────
const WAREHOUSE_COLUMNS = [
    { id: 'stt', label: 'STT', sortable: false },
    { id: 'warehouseCode', label: 'Mã kho', sortable: true },
    { id: 'warehouseName', label: 'Tên kho', sortable: true },
    { id: 'address', label: 'Địa chỉ', sortable: true },
    { id: 'isActive', label: 'Trạng thái', sortable: true },
    { id: 'createdAt', label: 'Ngày tạo', sortable: true },
];

const DEFAULT_VISIBLE_COLUMN_IDS = WAREHOUSE_COLUMNS.map((c) => c.id);

const HEAD_CELL_SX = {
    fontWeight: 600,
    bgcolor: '#fafafa',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '12px',
    color: '#6b7280',
    py: 1.5,
    px: 2,
    verticalAlign: 'middle',
};

const BODY_CELL_SX = {
    color: '#374151',
    fontSize: '13px',
    lineHeight: '20px',
    py: 1.75,
    px: 2,
    verticalAlign: 'middle',
    borderBottom: '1px solid #f3f4f6',
};

const SELECTION_COLUMN_WIDTH = 40;
const selectionHeadCellSx = {
    ...HEAD_CELL_SX,
    width: SELECTION_COLUMN_WIDTH,
    minWidth: SELECTION_COLUMN_WIDTH,
    maxWidth: SELECTION_COLUMN_WIDTH,
    px: 0,
    textAlign: 'center',
};

const selectionBodyCellSx = {
    ...BODY_CELL_SX,
    width: SELECTION_COLUMN_WIDTH,
    minWidth: SELECTION_COLUMN_WIDTH,
    maxWidth: SELECTION_COLUMN_WIDTH,
    px: 0,
    textAlign: 'center',
    verticalAlign: 'middle',
};

// ── Helper functions ────────────────────────────────────────────────────────────
const getColumnWeight = (colId) => {
    switch (colId) {
        case 'stt': return 0.8;
        case 'warehouseCode': return 1.4;
        case 'warehouseName': return 1.6;
        case 'address': return 2;
        case 'isActive': return 1.4;
        case 'createdAt': return 1.4;
        default: return 1;
    }
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const parts = formatDateTimeLinesUtc(dateStr);
    if (!parts) return dateStr;
    return (
        <Box sx={{ lineHeight: 1.3 }}>
            <Box>{parts.datePart}</Box>
            <Box>{parts.timePart}</Box>
        </Box>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ViewWarehouseList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();

    // Permission: Director and Warehouse Keeper can create warehouses
    const permissionRole = getPermissionRole(getRawRoleFromUser(authService.getUser()));
    const canCreate = permissionRole === 'DIRECTOR' || permissionRole === 'WAREHOUSE_KEEPER';

    // State
    const [loading, setLoading] = useState(true);
    const [list, setList] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Column visibility + order
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(DEFAULT_VISIBLE_COLUMN_IDS));
    const [columnOrder, setColumnOrder] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(LS_COL_ORDER));
            if (Array.isArray(saved) && saved.length > 0) {
                const validIds = new Set(WAREHOUSE_COLUMNS.map((c) => c.id));
                const filtered = saved.filter((id) => validIds.has(id));
                const missing = WAREHOUSE_COLUMNS.map((c) => c.id).filter((id) => !filtered.includes(id));
                return [...filtered, ...missing];
            }
            return WAREHOUSE_COLUMNS.map((c) => c.id);
        } catch { return WAREHOUSE_COLUMNS.map((c) => c.id); }
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);

    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    // Load data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getWarehouses({ pageNumber: page + 1, pageSize });
            let items = res.items ?? [];
            const totalFromApi = res.totalItems ?? res.TotalItems ?? items.length;

            if (searchTerm) {
                const term = removeDiacritics(searchTerm.toLowerCase());
                items = items.filter(item =>
                    removeDiacritics((item.warehouseCode ?? '').toLowerCase()).includes(term) ||
                    removeDiacritics((item.warehouseName ?? '').toLowerCase()).includes(term) ||
                    removeDiacritics((item.address ?? '').toLowerCase()).includes(term)
                );
            }

            setList(items);
            setTotalRows(searchTerm ? items.length : totalFromApi);
        } catch (err) {
            console.error('Error fetching warehouses:', err);
            setList([]);
            setTotalRows(0);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, searchTerm]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Polling ────────────────────────────────────────────────────
    const fetchDataRef = useRef(fetchData);
    useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);
    usePolling('warehouses', () => fetchDataRef.current?.());

    // Sync tempColumnOrder when popup opens
    useEffect(() => {
        if (columnSelectorOpen) setTempColumnOrder(columnOrder);
    }, [columnSelectorOpen, columnOrder]);

    // Visible columns
    const visibleColumns = useMemo(
        () => WAREHOUSE_COLUMNS.filter((c) => visibleColumnIds.has(c.id))
            .sort((a, b) => columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id)),
        [columnOrder, visibleColumnIds],
    );

    const totalWeight = WAREHOUSE_COLUMNS.filter((col) => visibleColumnIds.has(col.id))
        .reduce((acc, col) => acc + getColumnWeight(col.id), 0);
    const getColWidthPct = (colId) => (totalWeight > 0 ? (getColumnWeight(colId) / totalWeight) * 100 : 0);

    // Pagination helpers
    const totalCount = totalRows;
    const start = totalCount === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalCount);
    const totalPages = pageSize > 0 ? Math.max(0, Math.ceil(totalCount / pageSize)) : 0;
    const paginatedList = list;
    const summaryBreakdownReliable = totalCount > 0 && list.length >= totalCount;

    const handlePageChange = (newPage) => setPage(newPage);
    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setPage(0);
    };

    // Row selection
    const handleSelectAll = (checked) => {
        setSelectedIds(checked ? new Set(paginatedList.map((r) => r.warehouseId)) : new Set());
    };
    const handleSelectRow = (id, checked) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    };
    const isAllSelected = paginatedList.length > 0 && paginatedList.every((r) => selectedIds.has(r.warehouseId));
    const isSomeSelected = paginatedList.some((r) => selectedIds.has(r.warehouseId)) && !isAllSelected;

    // Column visibility
    const handleColumnVisibilityChange = (columnId, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(columnId);
            else next.delete(columnId);
            return next;
        });
    };

    const handleSelectAllColumns = (checked) => {
        setVisibleColumnIds(checked ? new Set(WAREHOUSE_COLUMNS.map((c) => c.id)) : new Set());
    };

    // Drag and drop for table header
    const handleDragStart = (e, colId) => {
        setDraggedColumn(colId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colId);
        e.dataTransfer.setDragImage(e.target, 0, 0);
    };
    const handleDragEnd = () => setDraggedColumn(null);
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e, targetId) => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('text/plain') || draggedColumn;
        if (!sourceId || sourceId === targetId) { setDraggedColumn(null); return; }
        const arr = [...columnOrder];
        const from = arr.indexOf(sourceId);
        const to = arr.indexOf(targetId);
        if (from === -1 || to === -1) { setDraggedColumn(null); return; }
        arr.splice(from, 1);
        arr.splice(to, 0, sourceId);
        setColumnOrder(arr);
        localStorage.setItem(LS_COL_ORDER, JSON.stringify(arr));
        setDraggedColumn(null);
    };

    // Drag handlers for popup
    const handlePopupDragStart = (e, colId) => {
        setDraggedPopupColumn(colId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colId);
    };
    const handlePopupDragEnd = () => setDraggedPopupColumn(null);
    const handlePopupDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handlePopupDrop = (e, targetId) => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('text/plain') || draggedPopupColumn;
        if (!sourceId || sourceId === targetId) { setDraggedPopupColumn(null); return; }
        const arr = [...tempColumnOrder];
        const from = arr.indexOf(sourceId);
        const to = arr.indexOf(targetId);
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

    const handleSearchTermChange = (e) => {
        setSearchTerm(e.target.value);
        setPage(0);
    };

    return (
        <Box
            sx={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#fafafa',
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    flexShrink: 0,
                    px: { xs: 2, sm: 2 },
                    py: 2.5,
                    bgcolor: '#fafafa',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography
                        variant="h5"
                        component="h1"
                        fontWeight="600"
                        sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}
                    >
                        Danh sách kho
                    </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Warehouses
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
                    <SummaryCard icon={Building2} label="Tổng kho" value={totalCount.toLocaleString()} color="#6b7280" bgColor="rgba(107,114,128,0.1)" />
                    <SummaryCard icon={Building2} label="Đang hoạt động" value={summaryBreakdownReliable ? list.filter((r) => r.isActive).length.toLocaleString() : '—'} color="#059669" bgColor="rgba(5,150,105,0.1)" />
                    <SummaryCard icon={Building2} label="Tạm dừng" value={summaryBreakdownReliable ? list.filter((r) => !r.isActive).length.toLocaleString() : '—'} color="#d97706" bgColor="rgba(217,119,6,0.1)" />
                </Box>
            </Box>

            {/* Main Content */}
            <Box
                className="list-view warehouse-list-page"
                sx={{
                    flex: 1,
                    minHeight: 0,
                    minWidth: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    maxWidth: '100%',
                    px: { xs: 2, sm: 2 },
                    pb: 2,
                    boxSizing: 'border-box',
                }}
            >
                {/* Container */}
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        bgcolor: '#ffffff',
                    }}
                >
                    {/* Filter Bar */}
                    <Box
                        sx={{
                            px: 2,
                            py: 2,
                            borderBottom: '1px solid #f3f4f6',
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            gap: 1.5,
                            alignItems: isMobile ? 'stretch' : 'center',
                            flexWrap: 'wrap',
                        }}
                    >
                        {/* Search Input */}
                        <SearchInput
                            placeholder="Tìm theo mã kho, tên kho, địa chỉ…"
                            value={searchTerm}
                            onChange={handleSearchTermChange}
                            sx={{
                                flex: '1 1 200px',
                                minWidth: isMobile ? '100%' : 200,
                                maxWidth: isMobile ? '100%' : 420,
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: '#f3f4f6',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    '& fieldset': { border: 'none' },
                                    '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                    '&.Mui-focused': {
                                        bgcolor: '#ffffff',
                                        borderColor: '#3b82f6',
                                        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                                    },
                                    '& input::placeholder': { color: '#9ca3af', fontSize: '13px' },
                                },
                            }}
                        />

                        {/* Column Selector */}
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
                                <Columns size={20} />
                            </IconButton>
                        </Tooltip>

                        {/* Action Buttons */}
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 1.5,
                                alignItems: 'center',
                                ml: isMobile ? 0 : 'auto',
                            }}
                        >
                            {canCreate && (
                                <Button
                                    className="list-page-btn"
                                    variant="contained"
                                    startIcon={<Plus size={18} />}
                                    onClick={() => navigate('/inventory/create')}
                                    sx={{
                                        fontSize: 13,
                                        fontWeight: 500,
                                        textTransform: 'none',
                                        borderRadius: 10,
                                        minHeight: 38,
                                        px: 2.5,
                                        bgcolor: '#0284c7',
                                        boxShadow: '0 1px 2px rgba(2, 132, 199, 0.25)',
                                        '&:hover': {
                                            bgcolor: '#0369a1',
                                            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.30)',
                                        },
                                    }}
                                >
                                    Tạo kho
                                </Button>
                            )}
                        </Box>
                    </Box>

                    {/* Column Selector Popover */}
                    <Popover
                        open={columnSelectorOpen}
                        anchorEl={columnSelectorAnchor}
                        onClose={() => setColumnSelectorAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        slotProps={{
                            paper: {
                                elevation: 0,
                                sx: {
                                    mt: 1,
                                    width: 280,
                                    maxHeight: '70vh',
                                    borderRadius: '14px',
                                    border: '1px solid rgba(0, 0, 0, 0.08)',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                },
                            },
                        }}
                    >
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>
                                Chọn cột hiển thị
                            </Typography>
                            {tempColumnOrder !== columnOrder && (
                                <Button size="small" onClick={handleSaveColumnOrder} sx={{ fontSize: '12px', textTransform: 'none' }}>
                                    Lưu
                                </Button>
                            )}
                        </Box>
                        <Box sx={{ px: 2.5, py: 2, flex: 1, minHeight: 0, overflowY: 'auto' }}>
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={visibleColumnIds.size === WAREHOUSE_COLUMNS.length}
                                            indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < WAREHOUSE_COLUMNS.length}
                                            onChange={(e) => handleSelectAllColumns(e.target.checked)}
                                            sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' } }}
                                        />
                                    }
                                    label={<Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Tất cả</Typography>}
                                    sx={{ mb: 1, py: 0.5 }}
                                />
                                {WAREHOUSE_COLUMNS
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
                                                        onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)}
                                                        sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' } }}
                                                    />
                                                }
                                                label={<Typography sx={{ fontSize: '13px', color: '#374151' }}>{col.label}</Typography>}
                                                sx={{ m: 0 }}
                                            />
                                        </Box>
                                    ))}
                            </FormGroup>
                        </Box>
                    </Popover>

                    {/* Data Table — không ép chiều cao + overflow dọc: tránh cuộn kép với MainLayout */}
                    <Box
                        sx={{
                            flex: '1 1 auto',
                            minHeight: 0,
                            minWidth: 0,
                            overflow: 'visible',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                            {loading ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        py: 8,
                                        color: 'text.secondary',
                                    }}
                                >
                                    <Typography variant="body2">Đang tải danh sách kho…</Typography>
                                </Box>
                            ) : paginatedList.length === 0 ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        py: 6,
                                        px: 2,
                                        color: 'text.secondary',
                                    }}
                                >
                                    <WarehouseIcon size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                    <Typography>Chưa có dữ liệu kho</Typography>
                                </Box>
                            ) : (
                                <TableContainer
                                    sx={{
                                        flex: '0 0 auto',
                                        alignSelf: 'stretch',
                                        minWidth: 0,
                                        width: '100%',
                                        maxWidth: '100%',
                                        overflowX: 'auto',
                                        overflowY: 'visible',
                                        boxSizing: 'border-box',
                                    }}
                                >
                                    <Table size="small" stickyHeader sx={{ minWidth: '100%', width: 'max-content', tableLayout: 'fixed' }}>
                                        <TableHead>
                                            <TableRow>
                                                {/* Checkbox header */}
                                                <TableCell sx={selectionHeadCellSx}>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '100%',
                                                            height: '100%',
                                                        }}
                                                    >
                                                        <Checkbox
                                                            checked={isAllSelected}
                                                            indeterminate={isSomeSelected}
                                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                                            size="small"
                                                            sx={{
                                                                color: '#9ca3af',
                                                                '&.Mui-checked': { color: '#3b82f6' },
                                                                '&.MuiCheckbox-indeterminate': { color: '#3b82f6' },
                                                            }}
                                                        />
                                                    </Box>
                                                </TableCell>

                                                {visibleColumns.map((col) => (
                                                    <TableCell
                                                        key={col.id}
                                                        sx={{
                                                            ...HEAD_CELL_SX,
                                                            width: `${getColWidthPct(col.id)}%`,
                                                            maxWidth: `${getColWidthPct(col.id)}%`,
                                                            bgcolor: draggedColumn === col.id ? 'action.hover' : '#fafafa',
                                                            opacity: draggedColumn === col.id ? 0.5 : 1,
                                                            transition: 'all 0.2s',
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
                                                            <Typography variant="inherit" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {col.label}
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {paginatedList.map((item, index) => {
                                                return (
                                                    <TableRow
                                                        key={item.warehouseId}
                                                        hover
                                                        sx={{
                                                            height: 56,
                                                            '&:last-child td': { borderBottom: 0 },
                                                            '&:hover': { bgcolor: '#f9fafb' },
                                                            '& .MuiTableCell-root': BODY_CELL_SX,
                                                        }}
                                                    >
                                                        {/* Checkbox cell */}
                                                        <TableCell sx={selectionBodyCellSx}>
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    width: '100%',
                                                                    height: '100%',
                                                                }}
                                                            >
                                                                <Checkbox
                                                                    checked={selectedIds.has(item.warehouseId)}
                                                                    onChange={(e) => handleSelectRow(item.warehouseId, e.target.checked)}
                                                                    size="small"
                                                                    sx={{
                                                                        color: '#9ca3af',
                                                                        '&.Mui-checked': { color: '#3b82f6' },
                                                                    }}
                                                                />
                                                            </Box>
                                                        </TableCell>

                                                        {visibleColumns.map((col) => {
                                                            if (col.id === 'stt') {
                                                                return (
                                                                    <TableCell
                                                                        key={col.id}
                                                                        align="center"
                                                                        sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%` }}
                                                                    >
                                                                        {page * pageSize + index + 1}
                                                                    </TableCell>
                                                                );
                                                            }
                                                            if (col.id === 'warehouseCode') {
                                                                return (
                                                                    <TableCell
                                                                        key={col.id}
                                                                        sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%` }}
                                                                    >
                                                                        <Typography
                                                                            onClick={() => navigate(`/inventory/${item.warehouseId}`)}
                                                                            sx={{
                                                                                color: '#3b82f6',
                                                                                fontSize: '13px',
                                                                                fontWeight: 500,
                                                                                cursor: 'pointer',
                                                                                '&:hover': { textDecoration: 'underline' },
                                                                                overflow: 'hidden',
                                                                                textOverflow: 'ellipsis',
                                                                                whiteSpace: 'nowrap',
                                                                                display: 'block',
                                                                            }}
                                                                        >
                                                                            {item.warehouseCode}
                                                                        </Typography>
                                                                    </TableCell>
                                                                );
                                                            }
                                                            if (col.id === 'isActive') {
                                                                return (
                                                                    <TableCell
                                                                        key={col.id}
                                                                        sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%` }}
                                                                    >
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                            <StatusBadge status={item.isActive} dot="•" variant="dot" />
                                                                        </Box>
                                                                    </TableCell>
                                                                );
                                                            }
                                                            if (col.id === 'createdAt') {
                                                                return (
                                                                    <TableCell
                                                                        key={col.id}
                                                                        sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%` }}
                                                                    >
                                                                        {formatDateTime(item.createdAt)}
                                                                    </TableCell>
                                                                );
                                                            }
                                                            return (
                                                                <TableCell
                                                                    key={col.id}
                                                                    sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%` }}
                                                                    title={col.getValue?.(item) || item[col.id]}
                                                                >
                                                                    {col.getValue?.(item) || item[col.id] || '-'}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>

                    {/* Pagination */}
                    <Box
                        sx={{
                            flexShrink: 0,
                            px: 2,
                            py: 2,
                            borderTop: '1px solid #f3f4f6',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 2,
                        }}
                    >
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                            Số dòng / trang:
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 72 }}>
                            <Select
                                value={pageSize}
                                onChange={handlePageSizeChange}
                                sx={{
                                    height: 32,
                                    fontSize: '13px',
                                    borderRadius: '8px',
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.1)' },
                                }}
                            >
                                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                    <MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>
                                        {n}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                            {start}–{end} / {totalCount} (Tổng {totalPages} trang)
                        </Typography>
                        <Button
                            size="small"
                            variant="outlined"
                            disabled={page <= 0}
                            onClick={() => handlePageChange(page - 1)}
                            sx={{
                                minWidth: 36,
                                textTransform: 'none',
                                fontSize: '13px',
                                borderRadius: '8px',
                                borderColor: 'rgba(0, 0, 0, 0.1)',
                                '&:hover': { borderColor: 'rgba(0, 0, 0, 0.2)' },
                            }}
                        >
                            Trước
                        </Button>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            component="span"
                            sx={{ whiteSpace: 'nowrap', fontSize: '13px', minWidth: 72, textAlign: 'center' }}
                        >
                            Trang {page + 1} / {totalPages || 1}
                        </Typography>
                        <Button
                            size="small"
                            variant="outlined"
                            disabled={end >= totalCount || totalCount === 0}
                            onClick={() => handlePageChange(page + 1)}
                            sx={{
                                minWidth: 36,
                                textTransform: 'none',
                                fontSize: '13px',
                                borderRadius: '8px',
                                borderColor: 'rgba(0, 0, 0, 0.1)',
                                '&:hover': { borderColor: 'rgba(0, 0, 0, 0.2)' },
                            }}
                        >
                            Sau
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default ViewWarehouseList;
