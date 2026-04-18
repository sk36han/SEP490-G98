/**
 * ViewDeliveryList – Danh sách giao hàng
 * Pattern giống ViewStocktakeList.
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePolling } from '../hooks/usePolling';
import { getDeliveries } from '../lib/deliveryService';
import {
    Box,
    Card,
    CardContent,
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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { StatusBadge } from '@ui/badges';
import {
    Plus,
    Filter,
    Columns,
    GripVertical,
    Truck,
    Package,
} from 'lucide-react';
import SearchInput from '../components/SearchInput';
import DeliveryFilterPopup from '../components/DeliveryFilterPopup';
import '../styles/ListView.css';

// LocalStorage keys
const LS_COL_ORDER = 'deliveryColumnOrder';

// Constants
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

// Summary card (reuse style from ViewStocktakeList)
const SummaryCard = ({ icon: Icon, label, value, color, bgColor }) => (
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
            <Icon size={22} color={color} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.3 }}>{label}</Typography>
            <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.2, mt: 0.25 }}>
                {value}
            </Typography>
        </Box>
    </Box>
);

const DELIVERY_COLUMNS = [
    { id: 'stt', label: 'STT', sortable: false },
    { id: 'transportId', label: 'Mã giao hàng', sortable: true },
    { id: 'gdnCode', label: 'Mã phiếu xuất', sortable: true },
    { id: 'carrierName', label: 'Đơn vị vận chuyển', sortable: true },
    { id: 'driverName', label: 'Tài xế', sortable: true },
    { id: 'driverPhone', label: 'SĐT tài xế', sortable: false },
    { id: 'licensePlate', label: 'Biển số xe', sortable: false },
    { id: 'note', label: 'Ghi chú', sortable: false },
    { id: 'isActive', label: 'Trạng thái', sortable: true },
];

const DEFAULT_VISIBLE_COLUMN_IDS = ['stt', 'transportId', 'gdnCode', 'carrierName', 'driverName', 'driverPhone', 'licensePlate', 'isActive'];

const getColumnWeight = (colId) => {
    switch (colId) {
        case 'stt': return 0.8;
        case 'transportId': return 1.4;
        case 'gdnCode': return 1.4;
        case 'carrierName': return 1.6;
        case 'driverName': return 1.4;
        case 'driverPhone': return 1.2;
        case 'licensePlate': return 1.2;
        case 'note': return 1.6;
        case 'isActive': return 1.4;
        default: return 1;
    }
};

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

const SELECTION_COLUMN_WIDTH = 48;
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

const ViewDeliveryList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();

    // Data state
    const [list, setList] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const activeFilterCount = useMemo(
        () => Object.values(filterValues).filter((v) => v !== undefined && v !== null && v !== '').length,
        [filterValues],
    );

    // Pagination
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    // Row selection
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Column visibility + order
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(DEFAULT_VISIBLE_COLUMN_IDS));
    const [columnOrder, setColumnOrder] = useState(() => {
        try {
            const allIds = DELIVERY_COLUMNS.map((c) => c.id);
            const saved = JSON.parse(localStorage.getItem(LS_COL_ORDER));
            if (Array.isArray(saved) && saved.length > 0) {
                const validIds = new Set(allIds);
                const filtered = saved.filter((id) => validIds.has(id));
                const missing = allIds.filter((id) => !filtered.includes(id));
                return [...filtered, ...missing];
            }
            return allIds;
        } catch { return DELIVERY_COLUMNS.map((c) => c.id); }
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

    // Drag state
    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);

    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    // Sync tempColumnOrder when popup opens
    useEffect(() => {
        if (columnSelectorOpen) setTempColumnOrder(columnOrder);
    }, [columnSelectorOpen, columnOrder]);

    // Visible columns in current order
    const visibleColumns = useMemo(
        () => DELIVERY_COLUMNS.filter((c) => visibleColumnIds.has(c.id))
            .sort((a, b) => columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id)),
        [columnOrder, visibleColumnIds],
    );

    // Fetch data
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getDeliveries({
                page: page + 1,
                pageSize,
                searchTerm: searchTerm || null,
                isActive: filterValues.isActive ?? null,
                status: filterValues.status ?? null,
                carrierName: filterValues.carrierName ?? null,
            });
            setList(result.items || []);
            setTotalRows(result.totalItems || 0);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Không thể tải danh sách giao hàng';
            setError(msg);
            setList([]);
            setTotalRows(0);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, searchTerm, filterValues]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Polling
    const fetchDataRef = useRef(fetchData);
    useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);
    usePolling('deliveries', () => fetchDataRef.current?.());

    // Pagination helpers
    const totalCount = totalRows;
    const totalPages = pageSize > 0 ? Math.max(0, Math.ceil(totalCount / pageSize)) : 0;
    const paginatedList = list;
    const start = totalCount > 0 ? page * pageSize + 1 : 0;
    const end = Math.min((page + 1) * pageSize, totalCount);

    const handlePageChange = (newPage) => setPage(newPage);
    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setPage(0);
    };

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
        setVisibleColumnIds(checked ? new Set(DELIVERY_COLUMNS.map((c) => c.id)) : new Set());
    };

    const totalWeight = DELIVERY_COLUMNS.filter((col) => visibleColumnIds.has(col.id))
        .reduce((acc, col) => acc + getColumnWeight(col.id), 0);
    const getColWidthPct = (colId) => (totalWeight > 0 ? (getColumnWeight(colId) / totalWeight) * 100 : 0);

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

    // Drag for popup
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

    // Row selection
    const handleSelectAll = (checked) => {
        setSelectedIds(checked ? new Set(paginatedList.map((r) => r.transportId)) : new Set());
    };
    const handleSelectRow = (id, checked) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    };
    const isAllSelected = paginatedList.length > 0 && paginatedList.every((r) => selectedIds.has(r.transportId));
    const isSomeSelected = paginatedList.some((r) => selectedIds.has(r.transportId)) && !isAllSelected;

    // Filter handlers
    const handleFilterApply = (values) => {
        setFilterValues(values);
        setPage(0);
    };

    const handleSearchTermChange = (e) => {
        setSearchTerm(e.target.value);
        setPage(0);
    };

    // Save column order from popup
    const handleSaveColumnOrder = () => {
        setColumnOrder(tempColumnOrder);
        localStorage.setItem(LS_COL_ORDER, JSON.stringify(tempColumnOrder));
        setColumnSelectorAnchor(null);
    };

    // Summary counts
    const summaryActive = list.filter(r => r.isActive === true).length;
    const summaryInactive = list.filter(r => r.isActive === false).length;

    return (
        <Box sx={{
            flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden',
            display: 'flex', flexDirection: 'column', bgcolor: '#fafafa',
        }}>
            {/* Header */}
            <Box sx={{ flexShrink: 0, px: { xs: 2, sm: 2 }, py: 2.5, bgcolor: '#fafafa' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="h5" component="h1" fontWeight="600" sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}>
                        Danh sách giao hàng
                    </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Delivery management
                </Typography>

                {/* Summary Cards */}
                <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
                    <SummaryCard icon={Truck} label="Tổng đơn giao hàng" value={(totalCount || list.length).toLocaleString()} color="#6b7280" bgColor="rgba(107,114,128,0.1)" />
                    <SummaryCard icon={Truck} label="Đang hoạt động" value={summaryActive.toLocaleString()} color="#16a34a" bgColor="rgba(22,163,74,0.1)" />
                    <SummaryCard icon={Truck} label="Ngừng hoạt động" value={summaryInactive.toLocaleString()} color="#dc2626" bgColor="rgba(220,38,38,0.1)" />
                </Box>
            </Box>

            {/* Main Content */}
            <Box className="list-view" sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', px: { xs: 2, sm: 2 }, pb: 2, boxSizing: 'border-box' }}>
                {/* Container */}
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb', borderRadius: '12px', bgcolor: '#ffffff' }}>
                    {/* Filter Card */}
                    <Card sx={{ mb: 0, borderRadius: '12px 12px 0 0', border: 'none', borderBottom: '1px solid #f3f4f6', boxShadow: 'none' }}>
                        <CardContent sx={{ '&.MuiCardContent-root:last-child': { pb: 1.5 }, pt: 2, px: 2 }}>
                            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
                                {/* Search */}
                                <SearchInput
                                    placeholder="Tìm theo mã giao hàng, mã phiếu xuất, đơn vị vận chuyển, tài xế…"
                                    value={searchTerm}
                                    onChange={handleSearchTermChange}
                                    sx={{
                                        flex: '1 1 200px', minWidth: isMobile ? '100%' : 200, maxWidth: isMobile ? '100%' : 420,
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px',
                                            '& fieldset': { border: 'none' },
                                            '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                            '&.Mui-focused': { bgcolor: '#ffffff', borderColor: '#3b82f6', boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)' },
                                            '& input::placeholder': { color: '#9ca3af', fontSize: '13px' },
                                        },
                                    }}
                                />

                                {/* Filter Button */}
                                <Tooltip title="Bộ lọc">
                                    <IconButton color="primary" onClick={() => setFilterOpen(true)} aria-label="Bộ lọc" sx={{ border: '1px solid #e5e7eb', bgcolor: activeFilterCount > 0 ? '#e0f2fe' : '#ffffff', borderRadius: '10px', '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' } }}>
                                        <Filter size={20} />
                                    </IconButton>
                                </Tooltip>

                                {/* Column Selector */}
                                <Tooltip title="Chọn cột hiển thị">
                                    <IconButton color="primary" onClick={(e) => setColumnSelectorAnchor(e.currentTarget)} aria-label="Chọn cột" sx={{ border: '1px solid #e5e7eb', bgcolor: '#ffffff', borderRadius: '10px', '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' } }}>
                                        <Columns size={20} />
                                    </IconButton>
                                </Tooltip>

                                {/* Action Buttons */}
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                    <Button
                                        variant="contained"
                                        startIcon={<Plus size={18} />}
                                        onClick={() => navigate('/deliveries/create')}
                                        sx={{
                                            fontSize: 13, fontWeight: 500, textTransform: 'none', borderRadius: 10, minHeight: 38, px: 2.5,
                                            bgcolor: '#0284c7', boxShadow: '0 1px 2px rgba(2, 132, 199, 0.25)',
                                            '&:hover': { bgcolor: '#0369a1', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.30)' },
                                        }}
                                    >
                                        Tạo giao hàng
                                    </Button>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Filter Popup */}
                    <DeliveryFilterPopup open={filterOpen} onClose={() => setFilterOpen(false)} initialValues={filterValues} onApply={handleFilterApply} />

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
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
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
                                            checked={visibleColumnIds.size === DELIVERY_COLUMNS.length}
                                            indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < DELIVERY_COLUMNS.length}
                                            onChange={(e) => handleSelectAllColumns(e.target.checked)}
                                            sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' } }}
                                        />
                                    }
                                    label={<Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Tất cả</Typography>}
                                    sx={{ mb: 1, py: 0.5 }}
                                />
                                {DELIVERY_COLUMNS.slice()
                                    .sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id))
                                    .map((col) => (
                                        <Box
                                            key={col.id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                bgcolor: draggedPopupColumn === col.id ? '#f9fafb' : 'transparent',
                                                opacity: draggedPopupColumn === col.id ? 0.5 : 1,
                                                transition: 'all 0.2s',
                                                borderRadius: '8px',
                                                px: 0.75,
                                                py: 0.25,
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
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    cursor: 'grab',
                                                    '&:active': { cursor: 'grabbing' },
                                                    color: '#9ca3af',
                                                    '&:hover': { color: '#6b7280' },
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

                    {/* Data Table */}
                    <Card sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 0, border: 'none', boxShadow: 'none', p: 0 }}>
                        <Box className="list-grid-wrapper" sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            {loading ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, color: 'text.secondary' }}>
                                    <Typography variant="body2">Đang tải danh sách giao hàng…</Typography>
                                </Box>
                            ) : error ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, color: 'error.main', textAlign: 'center', px: 2 }}>
                                    <Typography variant="body2" sx={{ mb: 2 }}>{error}</Typography>
                                    <Button variant="outlined" size="small" onClick={() => fetchData()} sx={{ textTransform: 'none' }}>Thử lại</Button>
                                </Box>
                            ) : (
                                <TableContainer sx={{ flex: 1, minHeight: 0, minWidth: 0, width: '100%', maxWidth: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
                                    <Table size="small" stickyHeader sx={{ minWidth: '100%', width: 'max-content', tableLayout: 'fixed' }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={selectionHeadCellSx}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                                        <Checkbox checked={isAllSelected} indeterminate={isSomeSelected} onChange={(e) => handleSelectAll(e.target.checked)} size="small" sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' }, '&.MuiCheckbox-indeterminate': { color: '#3b82f6' } }} />
                                                    </Box>
                                                </TableCell>
                                                {visibleColumns.map((col) => (
                                                    <TableCell key={col.id} sx={{ ...HEAD_CELL_SX, width: `${getColWidthPct(col.id)}%`, maxWidth: `${getColWidthPct(col.id)}%`, bgcolor: draggedColumn === col.id ? 'action.hover' : '#fafafa', opacity: draggedColumn === col.id ? 0.5 : 1, transition: 'all 0.2s' }}
                                                        align={col.id === 'stt' ? 'center' : 'left'}
                                                        onDragOver={handleDragOver}
                                                        onDrop={(e) => handleDrop(e, col.id)}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, '&:hover .drag-icon': { opacity: 0.6 } }}>
                                                            <Box draggable onDragStart={(e) => handleDragStart(e, col.id)} onDragEnd={handleDragEnd} className="drag-icon" sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', '&:active': { cursor: 'grabbing' }, color: '#9ca3af', opacity: 0, transition: 'opacity 0.2s' }}>
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
                                            {paginatedList.map((item, index) => (
                                                <TableRow key={item.transportId} hover sx={{ height: 56, '&:last-child td': { borderBottom: 0 }, '&:hover': { bgcolor: '#f9fafb' }, '& .MuiTableCell-root': BODY_CELL_SX }}>
                                                    <TableCell sx={selectionBodyCellSx}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                                            <Checkbox checked={selectedIds.has(item.transportId)} onChange={(e) => handleSelectRow(item.transportId, e.target.checked)} size="small" sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' } }} />
                                                        </Box>
                                                    </TableCell>
                                                    {visibleColumns.map((col) => {
                                                        if (col.id === 'stt') {
                                                            return <TableCell key={col.id} align="center" sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%`, px: 1 }}>{page * pageSize + index + 1}</TableCell>;
                                                        }
                                                        if (col.id === 'isActive') {
                                                            return (
                                                                <TableCell key={col.id} sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%` }}>
                                                                    <StatusBadge status={item.isActive} />
                                                                </TableCell>
                                                            );
                                                        }
                                                        if (col.id === 'note') {
                                                            return (
                                                                <TableCell key={col.id} sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%` }} title={item.note || '-'}>
                                                                    {item.note || '-'}
                                                                </TableCell>
                                                            );
                                                        }
                                                        if (col.id === 'driverPhone') {
                                                            return <TableCell key={col.id} sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%` }}>{item.driverPhone || '-'}</TableCell>;
                                                        }
                                                        if (col.id === 'gdnCode') {
                                                            return (
                                                                <TableCell key={col.id} sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%` }}>
                                                                    <Typography sx={{ color: '#3b82f6', fontSize: '13px', fontWeight: 500, cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                                                                        onClick={() => navigate(`/deliveries/${item.transportId}`)}>
                                                                        {item.gdnCode || '-'}
                                                                    </Typography>
                                                                </TableCell>
                                                            );
                                                        }
                                                        return (
                                                            <TableCell key={col.id} sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%` }} title={item[col.id]}>
                                                                {item[col.id] ?? '-'}
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
                    </Card>

                    {/* Pagination */}
                    <Box sx={{ flexShrink: 0, px: 2, py: 2, borderTop: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                            Số dòng / trang:
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 72 }}>
                            <Select value={pageSize} onChange={handlePageSizeChange} sx={{ height: 32, fontSize: '13px', borderRadius: '8px', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.1)' } }}>
                                {ROWS_PER_PAGE_OPTIONS.map((n) => <MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>{n}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                            {start}–{end} / {totalCount} (Tổng {totalPages} trang)
                        </Typography>
                        <Button size="small" variant="outlined" disabled={page <= 0} onClick={() => handlePageChange(page - 1)} sx={{ minWidth: 36, textTransform: 'none', fontSize: '13px', borderRadius: '8px', borderColor: 'rgba(0,0,0,0.1)', '&:hover': { borderColor: 'rgba(0,0,0,0.2)' } }}>
                            Trước
                        </Button>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px', minWidth: 72, textAlign: 'center' }}>
                            Trang {page + 1} / {totalPages || 1}
                        </Typography>
                        <Button size="small" variant="outlined" disabled={end >= totalCount || totalCount === 0} onClick={() => handlePageChange(page + 1)} sx={{ minWidth: 36, textTransform: 'none', fontSize: '13px', borderRadius: '8px', borderColor: 'rgba(0,0,0,0.1)', '&:hover': { borderColor: 'rgba(0,0,0,0.2)' } }}>
                            Sau
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default ViewDeliveryList;
