import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
    useTheme,
    useMediaQuery,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import { Plus, Filter, Columns, GripVertical, Package } from 'lucide-react';
import SearchInput from '../components/SearchInput';
import { StatusBadge } from '../../ui/badges/StatusBadge';
import InventoryAdjustmentFilterPopup from '../components/InventoryAdjustmentFilterPopup';
import '../styles/ListView.css';

// Mock data
const MOCK_DATA = [
    {
        adjustmentId: 1,
        adjustmentCode: 'ADJ-0001',
        stocktakeCode: 'STK-0001',
        warehouseCode: 'WH-HCM',
        warehouseName: 'Kho HCM',
        submittedByName: 'Nguyễn Văn A',
        status: 'POSTED',
        reason: 'Điều chỉnh theo kiểm kê demo',
        submittedAt: '2026-02-08T14:02:47.5454645',
        approvedAt: '2026-02-08T14:02:47.5454645',
        postedAt: '2026-02-08T14:02:47.5454645',
    },
    {
        adjustmentId: 2,
        adjustmentCode: 'ADJ-0002',
        stocktakeCode: null,
        warehouseCode: 'WH-HCM',
        warehouseName: 'Kho HCM',
        submittedByName: 'Trần Thị B',
        status: 'APPROVED',
        reason: 'Hàng hóa hư hỏng do bảo quản',
        submittedAt: '2026-03-01T10:30:00.0000000',
        approvedAt: '2026-03-01T11:00:00.0000000',
        postedAt: null,
    },
    {
        adjustmentId: 3,
        adjustmentCode: 'ADJ-0003',
        stocktakeCode: 'STK-0002',
        warehouseCode: 'WH-HCM',
        warehouseName: 'Kho HCM',
        submittedByName: 'Lê Văn C',
        status: 'PENDING_DIR',
        reason: 'Chênh lệch tồn kho sau kiểm kê định kỳ',
        submittedAt: '2026-03-05T09:15:00.0000000',
        approvedAt: null,
        postedAt: null,
    },
    {
        adjustmentId: 4,
        adjustmentCode: 'ADJ-0004',
        stocktakeCode: null,
        warehouseCode: 'WH-HCM',
        warehouseName: 'Kho HCM',
        submittedByName: 'Phạm Thị D',
        status: 'DRAFT',
        reason: 'Chuẩn bị điều chỉnh tồn kho',
        submittedAt: '2026-03-10T08:00:00.0000000',
        approvedAt: null,
        postedAt: null,
    },
    {
        adjustmentId: 5,
        adjustmentCode: 'ADJ-0005',
        stocktakeCode: 'STK-0003',
        warehouseCode: 'WH-HCM',
        warehouseName: 'Kho HCM',
        submittedByName: 'Nguyễn Văn E',
        status: 'REJECTED',
        reason: 'Sai sót trong phiếu kiểm kê',
        submittedAt: '2026-03-08T14:20:00.0000000',
        approvedAt: '2026-03-08T15:00:00.0000000',
        postedAt: null,
    },
];

// LocalStorage keys
const LS_COL_ORDER = 'inventoryAdjustmentColumnOrder';

// Constants
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const ADJUSTMENT_COLUMNS = [
    { id: 'stt', label: 'STT', sortable: false },
    { id: 'adjustmentCode', label: 'Mã điều chỉnh', sortable: true },
    { id: 'stocktakeCode', label: 'Mã kiểm kê', sortable: false },
    { id: 'warehouseName', label: 'Kho', sortable: true },
    { id: 'submittedByName', label: 'Người đề xuất', sortable: true },
    { id: 'status', label: 'Trạng thái', sortable: true },
    { id: 'reason', label: 'Lý do', sortable: false },
    { id: 'submittedAt', label: 'Ngày đề xuất', sortable: true },
];

const DEFAULT_VISIBLE_COLUMN_IDS = ['stt', 'adjustmentCode', 'stocktakeCode', 'warehouseName', 'status', 'submittedAt'];

const getColumnWeight = (colId) => {
    switch (colId) {
        case 'stt': return 0.8;
        case 'adjustmentCode': return 1.4;
        case 'stocktakeCode': return 1.2;
        case 'warehouseName': return 1.6;
        case 'submittedByName': return 1.6;
        case 'status': return 1.6;
        case 'reason': return 2;
        case 'submittedAt': return 1.4;
        default: return 1;
    }
};

const HEAD_CELL_SX = {
    fontWeight: 600,
    bgcolor: '#fafafa',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '12px',
    color: '#6b7280',
    py: 1.5,
    px: 2,
    verticalAlign: 'middle',
};

const BODY_CELL_SX = {
    color: '#374151',
    fontSize: '13px',
    py: 1.25,
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

const getStatusConfig = (status) => {
    const configMap = {
        DRAFT: { label: 'Nháp', color: 'default' },
        PENDING_DIR: { label: 'Chờ duyệt', color: 'warning' },
        APPROVED: { label: 'Đã duyệt', color: 'success' },
        POSTED: { label: 'Đã ghi sổ', color: 'success' },
        REJECTED: { label: 'Từ chối', color: 'error' },
    };
    return configMap[status] || { label: status, color: 'default' };
};

const ViewInventoryAdjustmentList = () => {
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
            const allIds = ADJUSTMENT_COLUMNS.map((c) => c.id);
            const saved = JSON.parse(localStorage.getItem(LS_COL_ORDER));
            if (Array.isArray(saved) && saved.length > 0) {
                const validIds = new Set(allIds);
                const filtered = saved.filter((id) => validIds.has(id));
                const missing = allIds.filter((id) => !filtered.includes(id));
                return [...filtered, ...missing];
            }
            return allIds;
        } catch { return ADJUSTMENT_COLUMNS.map((c) => c.id); }
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
        () => ADJUSTMENT_COLUMNS.filter((c) => visibleColumnIds.has(c.id))
            .sort((a, b) => columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id)),
        [columnOrder, visibleColumnIds],
    );

    // Fetch data
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        await new Promise((resolve) => setTimeout(resolve, 500));

        try {
            let filteredData = [...MOCK_DATA];

            // Apply filter from popup
            if (filterValues.status) {
                filteredData = filteredData.filter((item) => item.status === filterValues.status);
            }
            if (filterValues.fromDate) {
                const from = new Date(filterValues.fromDate);
                filteredData = filteredData.filter((item) => item.submittedAt && new Date(item.submittedAt) >= from);
            }
            if (filterValues.toDate) {
                const to = new Date(filterValues.toDate);
                to.setHours(23, 59, 59, 999);
                filteredData = filteredData.filter((item) => item.submittedAt && new Date(item.submittedAt) <= to);
            }

            // Apply search
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                filteredData = filteredData.filter(
                    (item) =>
                        item.adjustmentCode?.toLowerCase().includes(term) ||
                        item.warehouseName?.toLowerCase().includes(term) ||
                        item.submittedByName?.toLowerCase().includes(term) ||
                        item.reason?.toLowerCase().includes(term),
                );
            }
            setList(filteredData);
            setTotalRows(filteredData.length);
        } catch (err) {
            setError(err.message || 'Không thể kết nối đến server');
            setList([]);
            setTotalRows(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [searchTerm, filterValues]);

    // Pagination helpers
    const totalCount = totalRows;
    const start = totalCount === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalCount);
    const totalPages = pageSize > 0 ? Math.max(0, Math.ceil(totalCount / pageSize)) : 0;
    const paginatedList = list.slice(page * pageSize, (page + 1) * pageSize);

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
        setVisibleColumnIds(checked ? new Set(ADJUSTMENT_COLUMNS.map((c) => c.id)) : new Set());
    };

    const totalWeight = ADJUSTMENT_COLUMNS.filter((col) => visibleColumnIds.has(col.id))
        .reduce((acc, col) => acc + getColumnWeight(col.id), 0);
    const getColWidthPct = (colId) => (totalWeight > 0 ? (getColumnWeight(colId) / totalWeight) * 100 : 0);

    // Drag and drop handlers for table header
    const handleDragStart = (e, colId) => {
        setDraggedColumn(colId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colId);
        // Set drag image
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

    // Row selection
    const handleSelectAll = (checked) => {
        setSelectedIds(checked ? new Set(paginatedList.map((r) => r.adjustmentId)) : new Set());
    };
    const handleSelectRow = (id, checked) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    };
    const isAllSelected = paginatedList.length > 0 && paginatedList.every((r) => selectedIds.has(r.adjustmentId));
    const isSomeSelected = paginatedList.some((r) => selectedIds.has(r.adjustmentId)) && !isAllSelected;

    // Filter handlers
    const handleFilterApply = (values) => {
        setFilterValues(values);
        setPage(0);
    };

    const handleSearchTermChange = (e) => {
        setSearchTerm(e.target.value);
        setPage(0);
    };

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    // Save column order from popup
    const handleSaveColumnOrder = () => {
        setColumnOrder(tempColumnOrder);
        localStorage.setItem(LS_COL_ORDER, JSON.stringify(tempColumnOrder));
        setColumnSelectorAnchor(null);
    };

    return (
        <Box
            sx={{
                height: '100%',
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
                        Danh sách điều chỉnh tồn kho
                    </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Inventory adjustment request
                </Typography>
            </Box>

            {/* Main Content */}
            <Box
                className="list-view"
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
                    {/* Filter Card */}
                    <Card
                        className="list-filter-card"
                        sx={{
                            mb: 0,
                            borderRadius: '12px 12px 0 0',
                            border: 'none',
                            borderBottom: '1px solid #f3f4f6',
                            boxShadow: 'none',
                        }}
                    >
                        <CardContent
                            sx={{
                                '&.MuiCardContent-root:last-child': { pb: 1.5 },
                                pt: 2,
                                px: 2,
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: isMobile ? 'column' : 'row',
                                    gap: 1.5,
                                    alignItems: isMobile ? 'stretch' : 'center',
                                    flexWrap: 'wrap',
                                }}
                            >
                                {/* Search Input */}
                                <SearchInput
                                    placeholder="Tìm theo mã điều chỉnh, kho, người đề xuất…"
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

                                {/* Filter Button */}
                                <Tooltip title="Bộ lọc">
                                    <IconButton
                                        color="primary"
                                        onClick={() => setFilterOpen(true)}
                                        aria-label="Bộ lọc"
                                        sx={{
                                            border: '1px solid #e5e7eb',
                                            bgcolor: activeFilterCount > 0 ? '#e0f2fe' : '#ffffff',
                                            borderRadius: '10px',
                                            '&:hover': {
                                                bgcolor: '#f9fafb',
                                                borderColor: '#d1d5db',
                                            },
                                        }}
                                    >
                                        <Filter size={20} />
                                    </IconButton>
                                </Tooltip>

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
                                    <Button
                                        className="list-page-btn"
                                        variant="contained"
                                        startIcon={<Plus size={18} />}
                                        onClick={() => {}}
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
                                        Tạo điều chỉnh
                                    </Button>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Filter Popup */}
                    <InventoryAdjustmentFilterPopup
                        open={filterOpen}
                        onClose={() => setFilterOpen(false)}
                        initialValues={filterValues}
                        onApply={handleFilterApply}
                    />

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
                                            checked={visibleColumnIds.size === ADJUSTMENT_COLUMNS.length}
                                            indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < ADJUSTMENT_COLUMNS.length}
                                            onChange={(e) => handleSelectAllColumns(e.target.checked)}
                                            sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' } }}
                                        />
                                    }
                                    label={<Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Tất cả</Typography>}
                                    sx={{ mb: 1, py: 0.5 }}
                                />
                                {ADJUSTMENT_COLUMNS
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

                    {/* Data Table */}
                    <Card
                        className="list-grid-card"
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            minWidth: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 0,
                            border: 'none',
                            boxShadow: 'none',
                            p: 0,
                        }}
                    >
                        <Box
                            className="list-grid-wrapper"
                            sx={{
                                flex: 1,
                                minHeight: 0,
                                minWidth: 0,
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
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
                                    <Typography variant="body2">Đang tải danh sách điều chỉnh tồn kho…</Typography>
                                </Box>
                            ) : error ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        py: 6,
                                        color: 'error.main',
                                        textAlign: 'center',
                                        px: 2,
                                    }}
                                >
                                    <Typography variant="body2" sx={{ mb: 2 }}>
                                        {error}
                                    </Typography>
                                    <Button variant="outlined" size="small" onClick={() => fetchData()} sx={{ textTransform: 'none' }}>
                                        Thử lại
                                    </Button>
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
                                    <Package size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                    <Typography>Chưa có dữ liệu điều chỉnh tồn kho</Typography>
                                </Box>
                            ) : (
                                <TableContainer
                                    sx={{
                                        flex: 1,
                                        minHeight: 0,
                                        minWidth: 0,
                                        width: '100%',
                                        maxWidth: '100%',
                                        overflow: 'auto',
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
                                                const statusConfig = getStatusConfig(item.status);
                                                return (
                                                    <TableRow
                                                        key={item.adjustmentId}
                                                        hover
                                                        sx={{
                                                            height: 52,
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
                                                                    checked={selectedIds.has(item.adjustmentId)}
                                                                    onChange={(e) => handleSelectRow(item.adjustmentId, e.target.checked)}
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
                                                                        sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%`, px: 1 }}
                                                                    >
                                                                        {page * pageSize + index + 1}
                                                                    </TableCell>
                                                                );
                                                            }
                                                            if (col.id === 'adjustmentCode') {
                                                                return (
                                                                    <TableCell
                                                                        key={col.id}
                                                                        sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%` }}
                                                                    >
                                                                        <Typography
                                                                            onClick={() => navigate(`/inventory/adjustments/${item.adjustmentId}`)}
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
                                                                            {item.adjustmentCode}
                                                                        </Typography>
                                                                    </TableCell>
                                                                );
                                                            }
                                                            if (col.id === 'stocktakeCode') {
                                                                return (
                                                                    <TableCell
                                                                        key={col.id}
                                                                        sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%` }}
                                                                    >
                                                                        {item.stocktakeCode ? (
                                                                            <Typography
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
                                                                                {item.stocktakeCode}
                                                                            </Typography>
                                                                        ) : (
                                                                            '-'
                                                                        )}
                                                                    </TableCell>
                                                                );
                                                            }
                                                            if (col.id === 'status') {
                                                                return (
                                                                    <TableCell
                                                                        key={col.id}
                                                                        sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%` }}
                                                                    >
                                                                        <StatusBadge
                                                                            status={item.status}
                                                                            label={statusConfig.label}
                                                                            colors={{
                                                                                DRAFT: 'default',
                                                                                PENDING_DIR: 'warning',
                                                                                APPROVED: 'success',
                                                                                POSTED: 'success',
                                                                                REJECTED: 'error',
                                                                            }}
                                                                        />
                                                                    </TableCell>
                                                                );
                                                            }
                                                            if (col.id === 'submittedAt') {
                                                                return (
                                                                    <TableCell
                                                                        key={col.id}
                                                                        sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%`, fontSize: '0.8rem' }}
                                                                    >
                                                                        {formatDate(item.submittedAt)}
                                                                    </TableCell>
                                                                );
                                                            }
                                                            return (
                                                                <TableCell
                                                                    key={col.id}
                                                                    sx={{ ...BODY_CELL_SX, width: `${getColWidthPct(col.id)}%` }}
                                                                    title={col.getValue?.(item) || item[col.id]}
                                                                >
                                                                    {col.getValue?.(item) || item[col.id]}
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
                    </Card>

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

export default ViewInventoryAdjustmentList;
