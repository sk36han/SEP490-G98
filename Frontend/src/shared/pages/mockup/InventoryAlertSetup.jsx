/**
 * InventoryAlertSetup – Màn hình Thiết lập Cảnh báo Tồn kho (Warehouse Policy).
 *
 * Nghiệp vụ:
 *   - Mỗi vật tư tại mỗi kho có ngưỡng MinQty (tối thiểu) và ReorderQty (đặt lại).
 *   - Nếu OnHandQty < MinQty → cảnh báo "Dưới định mức" (đỏ).
 *   - Nếu OnHandQty >= MinQty → "An toàn" (xanh).
 *
 * Backend: chờ IWarehousePolicyController (xem itemWarehousePolicyService.js).
 * Hiện dùng mock data để demo UI.
 *
 * UI pattern: bám 1:1 theo ViewItemList (Danh sách vật tư).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Button,
    Typography,
    IconButton,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    FormControl,
    Select,
    MenuItem,
    Chip,
    CircularProgress,
    Popover,
    Checkbox,
    FormGroup,
    FormControlLabel,
} from '@mui/material';
import {
    Columns,
    Filter,
    GripVertical,
    Package,
    RotateCcw,
} from 'lucide-react';
import Toast from '../../../components/Toast/Toast';
import { useToast } from '../../hooks/useToast';
import SearchInput from '../../components/SearchInput';
import AlertFilterPopup from '../../components/AlertFilterPopup';
import '../../styles/ListView.css';

// ─── Mock data – thay bằng API khi backend sẵn sàng ────────────────────────
const MOCK_ALERTS = [
    { alertId: 1, itemId: 1, itemCode: 'ITEM-001', itemName: 'Nguyên liệu demo', uom: 'Each', warehouseId: 1, warehouseName: 'Kho HCM', onHandQty: 999, minQty: 50, reorderQty: 200 },
    { alertId: 2, itemId: 2, itemCode: 'ITEM-002', itemName: 'Vật tư B', uom: 'Box', warehouseId: 1, warehouseName: 'Kho HCM', onHandQty: 20, minQty: 50, reorderQty: 200 },
    { alertId: 3, itemId: 3, itemCode: 'ITEM-003', itemName: 'Vật tư C', uom: 'Each', warehouseId: 1, warehouseName: 'Kho HCM', onHandQty: 150, minQty: 100, reorderQty: 300 },
];

// ─── Cột hiển thị ────────────────────────────────────────────────────────────
const ALERT_COLUMNS = [
    {
        id: 'stt',
        label: 'STT',
        sortable: false,
        getValue: (row, index, { pageNumber, pageSize }) => (pageNumber - 1) * pageSize + index + 1,
    },
    {
        id: 'itemCode',
        label: 'Mã vật tư',
        sortable: true,
        getValue: (row) => row.itemCode ?? '',
    },
    {
        id: 'itemName',
        label: 'Tên vật tư',
        sortable: true,
        getValue: (row) => row.itemName ?? '',
    },
    {
        id: 'warehouse',
        label: 'Kho',
        sortable: true,
        getValue: (row) => row.warehouseName ?? '-',
    },
    {
        id: 'uom',
        label: 'ĐVT',
        sortable: true,
        getValue: (row) => row.uom ?? '-',
    },
    {
        id: 'onHandQty',
        label: 'Tồn thực tế',
        sortable: true,
        getValue: (row) => row.onHandQty != null ? Number(row.onHandQty).toLocaleString('vi-VN') : '-',
    },
    {
        id: 'minQty',
        label: 'Tồn tối thiểu',
        sortable: true,
        getValue: (row) => row.minQty != null ? Number(row.minQty).toLocaleString('vi-VN') : '-',
    },
    {
        id: 'reorderQty',
        label: 'Số lượng đặt lại',
        sortable: true,
        getValue: (row) => row.reorderQty != null ? Number(row.reorderQty).toLocaleString('vi-VN') : '-',
    },
    {
        id: 'status',
        label: 'Trạng thái',
        sortable: true,
        getValue: (row) => {
            const qty = row.onHandQty ?? 0;
            const min = row.minQty ?? 0;
            if (qty < min) return 'Dưới định mức';
            return 'An toàn';
        },
    },
];

const SORTABLE_COLUMN_IDS = ALERT_COLUMNS.filter((c) => c.sortable).map((c) => c.id);
const DEFAULT_VISIBLE_COLUMN_IDS = ALERT_COLUMNS.map((c) => c.id);
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const getTableColumnWidth = (colId) => {
    switch (colId) {
        case 'stt': return 56;
        case 'itemCode': return 230;
        case 'itemName': return 220;
        case 'warehouse': return 160;
        case 'uom': return 100;
        case 'onHandQty': return 150;
        case 'minQty': return 150;
        case 'reorderQty': return 150;
        case 'status': return 180;
        default: return 160;
    }
};

const isCenterAlignedColumn = (colId) =>
    ['stt', 'onHandQty', 'minQty', 'reorderQty'].includes(colId);

// ─── Styles giống ViewItemList ────────────────────────────────────────────────
const bodyCellBaseSx = {
    color: '#374151',
    fontSize: '13px',
    py: 1.25,
    px: 2,
    verticalAlign: 'middle',
    borderBottom: '1px solid #f3f4f6',
};

// ─── Component ────────────────────────────────────────────────────────────────
const InventoryAlertSetup = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();

    // Dữ liệu
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Phân trang
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(() => {
        const saved = localStorage.getItem('alertPageSize');
        return saved ? Number(saved) : 20;
    });

    // Tìm kiếm
    const [searchTerm, setSearchTerm] = useState('');

    // Filter
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});

    // Cột
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
        const saved = localStorage.getItem('alertVisibleColumns');
        if (saved) {
            try { return new Set(JSON.parse(saved)); }
            catch { return new Set(DEFAULT_VISIBLE_COLUMN_IDS); }
        }
        return new Set(DEFAULT_VISIBLE_COLUMN_IDS);
    });

    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [columnOrder, setColumnOrder] = useState(() => {
        const saved = localStorage.getItem('alertColumnOrder');
        return saved ? JSON.parse(saved) : ALERT_COLUMNS.map((c) => c.id);
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);
    const resetRef = useRef(false);

    // Sắp xếp
    const [orderBy, setOrderBy] = useState(null);
    const [order, setOrder] = useState('asc');

    // Load data
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await new Promise((r) => setTimeout(r, 600));
            setData(MOCK_ALERTS);
        } catch (err) {
            const msg = err?.response?.data?.message ?? err?.response?.data?.detail ?? err?.message ?? 'Không thể tải danh sách cảnh báo.';
            setError(msg);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Lọc + tìm kiếm
    const filteredData = data.filter((row) => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchSearch =
                (row.itemCode ?? '').toLowerCase().includes(term) ||
                (row.itemName ?? '').toLowerCase().includes(term);
            if (!matchSearch) return false;
        }
        if (filterValues.itemCode) {
            if (!(row.itemCode ?? '').toLowerCase().includes(filterValues.itemCode.toLowerCase())) return false;
        }
        if (filterValues.itemName) {
            if (!(row.itemName ?? '').toLowerCase().includes(filterValues.itemName.toLowerCase())) return false;
        }
        if (filterValues.warehouseId != null) {
            if (row.warehouseId !== filterValues.warehouseId) return false;
        }
        if (filterValues.statusFilter) {
            const qty = row.onHandQty ?? 0;
            const min = row.minQty ?? 0;
            const isUnder = qty < min;
            if (filterValues.statusFilter === 'under' && !isUnder) return false;
            if (filterValues.statusFilter === 'safe' && isUnder) return false;
        }
        return true;
    });

    // Sắp xếp
    const sortedData = [...filteredData].sort((a, b) => {
        if (!orderBy) return 0;
        const aVal = a[orderBy] ?? '';
        const bVal = b[orderBy] ?? '';
        const cmp = String(aVal).localeCompare(String(bVal), 'vi');
        return order === 'asc' ? cmp : -cmp;
    });

    // Phân trang
    const paginatedData = sortedData.slice(page * pageSize, (page + 1) * pageSize);
    const totalPages = Math.ceil(sortedData.length / pageSize);
    const start = sortedData.length === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, sortedData.length);

    // ── Column visibility ────────────────────────────────────────────────────
    const handleColumnVisibilityChange = (columnId, checked) => {
        const next = new Set(visibleColumnIds);
        if (checked) next.add(columnId);
        else next.delete(columnId);
        setVisibleColumnIds(next);
        localStorage.setItem('alertVisibleColumns', JSON.stringify([...next]));
    };

    const handleSelectAllColumns = (checked) => {
        setVisibleColumnIds(checked ? new Set(ALERT_COLUMNS.map((c) => c.id)) : new Set());
    };

    // ── Drag & drop cột trong bảng ─────────────────────────────────────────
    const handleDragStart = (e, columnId) => {
        setDraggedColumn(columnId);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e, targetId) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === targetId) return;
        const newOrder = [...columnOrder];
        const draggedIdx = newOrder.indexOf(draggedColumn);
        const targetIdx = newOrder.indexOf(targetId);
        newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, draggedColumn);
        setColumnOrder(newOrder);
        setTempColumnOrder(newOrder);
        localStorage.setItem('alertColumnOrder', JSON.stringify(newOrder));
        setDraggedColumn(null);
    };
    const handleDragEnd = () => { setDraggedColumn(null); };

    // ── Drag & drop trong popup ──────────────────────────────────────────────
    const handlePopupDragStart = (e, colId) => { setDraggedPopupColumn(colId); e.dataTransfer.effectAllowed = 'move'; };
    const handlePopupDragOver = (e) => { e.preventDefault(); };
    const handlePopupDrop = (e, targetId) => {
        e.preventDefault();
        if (!draggedPopupColumn || draggedPopupColumn === targetId) return;
        const newOrder = [...tempColumnOrder];
        const d = newOrder.indexOf(draggedPopupColumn);
        const t = newOrder.indexOf(targetId);
        newOrder.splice(d, 1);
        newOrder.splice(t, 0, draggedPopupColumn);
        setTempColumnOrder(newOrder);
        setDraggedPopupColumn(null);
    };
    const handlePopupDragEnd = () => { setDraggedPopupColumn(null); };

    // ── Sort ─────────────────────────────────────────────────────────────────
    const handleSortRequest = (colId) => {
        if (!SORTABLE_COLUMN_IDS.includes(colId)) return;
        let newOrder, newOrderBy;
        if (orderBy === colId) {
            newOrder = order === 'asc' ? 'desc' : 'asc';
            newOrderBy = colId;
        } else {
            newOrderBy = colId;
            newOrder = 'asc';
        }
        setOrderBy(newOrderBy);
        setOrder(newOrder);
        setPage(0);
    };

    const handleSearchTermChange = (e) => {
        setSearchTerm(e.target.value);
        setPage(0);
    };

    const handleFilterApply = (values) => {
        setFilterValues(values);
        setPage(0);
    };

    const handlePageChange = (newPage) => setPage(newPage);
    const handlePageSizeChange = (e) => {
        const newSize = Number(e.target.value);
        setPageSize(newSize);
        setPage(0);
        localStorage.setItem('alertPageSize', String(newSize));
    };

    const columnSelectorOpen = Boolean(columnSelectorAnchor);
    useEffect(() => {
        if (columnSelectorOpen) {
            setTempColumnOrder(columnOrder);
        }
    }, [columnSelectorOpen, columnOrder]);

    const handleSaveColumnOrder = () => {
        setColumnOrder(tempColumnOrder);
        localStorage.setItem('alertColumnOrder', JSON.stringify(tempColumnOrder));
        setColumnSelectorAnchor(null);
    };

    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setColumnSelectorAnchor(null);
    };

    const handleResetColumns = () => {
        const defaultOrder = ALERT_COLUMNS.map((c) => c.id);
        const defaultVisible = new Set(DEFAULT_VISIBLE_COLUMN_IDS);
        resetRef.current = true;
        setTempColumnOrder(defaultOrder);
        setColumnOrder(defaultOrder);
        setVisibleColumnIds(defaultVisible);
        localStorage.setItem('alertColumnOrder', JSON.stringify(defaultOrder));
        localStorage.setItem('alertVisibleColumns', JSON.stringify([...defaultVisible]));
        setColumnSelectorAnchor(null);
    };

    useEffect(() => {
        if (columnSelectorOpen) {
            setTempColumnOrder(columnOrder);
        }
    }, [columnSelectorOpen, columnOrder]);

    useEffect(() => {
        if (!resetRef.current) {
            if (columnSelectorOpen) {
                setTempColumnOrder(columnOrder);
            }
        }
        resetRef.current = false;
    }, [columnSelectorOpen, columnOrder]);

    const visibleColumns = ALERT_COLUMNS.filter((col) => visibleColumnIds.has(col.id))
        .sort((a, b) => {
            if (a.id === 'stt' && b.id !== 'stt') return -1;
            if (b.id === 'stt' && a.id !== 'stt') return 1;
            return columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id);
        });

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
            {/* ── Header giống ViewItemList ──────────────────────────── */}
            <Box
                sx={{
                    flexShrink: 0,
                    px: { xs: 2, sm: 2 },
                    py: 2.5,
                    bgcolor: '#fafafa',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography
                        variant="h5"
                        component="h1"
                        fontWeight="600"
                        sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}
                    >
                        Thiết lập Cảnh báo Tồn kho
                    </Typography>
                </Box>
                <Typography
                    variant="body2"
                    sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}
                >
                    Cấu hình ngưỡng tối thiểu và số lượng đặt lại cho từng vật tư tại mỗi kho.
                </Typography>
            </Box>

            {/* ── Main list-view container giống ViewItemList ──────────── */}
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
                {/* Wrapper border + radius giống ViewItemList */}
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
                    {/* ── Filter / Toolbar bar – Card giống ViewItemList ── */}
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
                                    gap: 1.5,
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                }}
                            >
                                {/* Search – giống ViewItemList */}
                                <SearchInput
                                    placeholder="Tìm kiếm theo mã, tên vật tư…"
                                    value={searchTerm}
                                    onChange={handleSearchTermChange}
                                    sx={{
                                        flex: '1 1 200px',
                                        minWidth: 200,
                                        maxWidth: 480,
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: '#f3f4f6',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '10px',
                                            fontSize: '13px',
                                            '& fieldset': {
                                                border: 'none',
                                            },
                                            '&:hover': {
                                                bgcolor: '#f9fafb',
                                                borderColor: '#d1d5db',
                                            },
                                            '&.Mui-focused': {
                                                bgcolor: '#ffffff',
                                                borderColor: '#3b82f6',
                                                boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                                            },
                                            '& input::placeholder': {
                                                color: '#9ca3af',
                                                fontSize: '13px',
                                            },
                                        },
                                    }}
                                />

                                {/* Filter button */}
                                <Tooltip title="Bộ lọc">
                                    <IconButton
                                        color="primary"
                                        onClick={() => setFilterOpen(true)}
                                        aria-label="Bộ lọc"
                                        sx={{
                                            border: '1px solid #e5e7eb',
                                            bgcolor: '#ffffff',
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

                                {/* Column selector – IconButton giống ViewItemList */}
                                <Tooltip title="Chọn cột hiển thị">
                                    <IconButton
                                        color="primary"
                                        onClick={(e) => { setColumnSelectorAnchor(e.currentTarget); setTempColumnOrder(columnOrder); }}
                                        aria-label="Chọn cột"
                                        sx={{
                                            border: '1px solid #e5e7eb',
                                            bgcolor: '#ffffff',
                                            borderRadius: '10px',
                                            '&:hover': {
                                                bgcolor: '#f9fafb',
                                                borderColor: '#d1d5db',
                                            },
                                        }}
                                    >
                                        <Columns size={20} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* ── Column selector Popover – giống y ViewItemList ─────── */}
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
                                    mt: 1,
                                    width: 340,
                                    maxHeight: '70vh',
                                    borderRadius: '14px',
                                    border: '1px solid rgba(0, 0, 0, 0.08)',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }
                            }
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
                            px: 2.5,
                            py: 2,
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto',
                            '&::-webkit-scrollbar': { width: '6px' },
                            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                            '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px', '&:hover': { bgcolor: '#9ca3af' } },
                        }}>
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={visibleColumnIds.size === ALERT_COLUMNS.length}
                                            indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < ALERT_COLUMNS.length}
                                            onChange={(e) => handleSelectAllColumns(e.target.checked)}
                                            sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' }, '&.MuiCheckbox-indeterminate': { color: '#3b82f6' } }}
                                        />
                                    }
                                    label={<Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Tất cả</Typography>}
                                    sx={{ mb: 1, py: 0.5 }}
                                />
                                {[...ALERT_COLUMNS].sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id)).map((col) => (
                                    <Box
                                        key={col.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            borderRadius: '8px',
                                            px: 0.75,
                                            py: 0.25,
                                            '&:hover': { bgcolor: '#f9fafb' },
                                        }}
                                        onDragOver={(e) => { if (col.sortable !== false) e.preventDefault(); }}
                                        onDrop={(e) => { if (col.sortable !== false) { e.preventDefault(); handlePopupDrop(e, col.id); } }}
                                    >
                                        {col.sortable ? (
                                            <Box
                                                draggable
                                                onDragStart={(e) => handlePopupDragStart(e, col.id)}
                                                onDragEnd={handlePopupDragEnd}
                                                sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', '&:active': { cursor: 'grabbing' }, color: '#9ca3af', '&:hover': { color: '#6b7280' } }}
                                            >
                                                <GripVertical size={14} />
                                            </Box>
                                        ) : (
                                            <Box sx={{ width: 14, height: 14 }} />
                                        )}
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={visibleColumnIds.has(col.id)}
                                                    disabled={col.id === 'stt'}
                                                    onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)}
                                                    sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' }, '&.Mui-disabled': { color: '#d1d5db' } }}
                                                />
                                            }
                                            label={
                                                <Typography sx={{ fontSize: '13px', color: col.id === 'stt' ? '#9ca3af' : '#374151' }}>
                                                    {col.label}
                                                    {col.id === 'stt' && (
                                                        <Typography component="span" sx={{ fontSize: '11px', color: '#9ca3af', ml: 0.5 }}>(cố định)</Typography>
                                                    )}
                                                </Typography>
                                            }
                                            sx={{ flex: 1, m: 0, py: 0.5 }}
                                        />
                                    </Box>
                                ))}
                            </FormGroup>
                        </Box>

                        {/* Footer */}
                        <Box sx={{ px: 2.5, py: 2, display: 'flex', gap: 1.5, borderTop: '1px solid #f3f4f6', flexShrink: 0, alignItems: 'center' }}>
                            <Button
                                variant="text"
                                onClick={handleResetColumns}
                                startIcon={<RotateCcw size={14} />}
                                sx={{
                                    textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', color: '#6b7280', mr: 'auto',
                                    '&:hover': { bgcolor: '#f9fafb', color: '#374151' },
                                }}
                            >
                                Đặt lại
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleCancelColumnOrder}
                                sx={{
                                    textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', borderColor: '#e5e7eb', color: '#6b7280',
                                    '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' },
                                }}
                            >
                                Hủy
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleSaveColumnOrder}
                                sx={{
                                    textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', bgcolor: '#0284c7', boxShadow: 'none',
                                    '&:hover': { bgcolor: '#0369a1', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)' },
                                }}
                            >
                                Lưu
                            </Button>
                        </Box>
                    </Popover>

                    {/* ── Table card giống ViewItemList ─────────────────────── */}
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
                            {/* Loading state giống ViewItemList */}
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
                                    <CircularProgress size={40} sx={{ mb: 2 }} />
                                    <Typography variant="body2">Đang tải danh sách cảnh báo…</Typography>
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
                            ) : paginatedData.length === 0 ? (
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
                                    <Typography>Chưa có dữ liệu cảnh báo</Typography>
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
                                    <Table
                                        size="small"
                                        stickyHeader
                                        sx={{
                                            minWidth: '100%',
                                            width: 'max-content',
                                            tableLayout: 'fixed',
                                            borderCollapse: 'separate',
                                            borderSpacing: 0,
                                        }}
                                    >
                                        <colgroup>
                                            {visibleColumns.map((col) => (
                                                <col key={col.id} style={{ width: getTableColumnWidth(col.id) }} />
                                            ))}
                                        </colgroup>

                                        <TableHead>
                                            <TableRow>
                                                {visibleColumns.map((col) => {
                                                    const isCenter = isCenterAlignedColumn(col.id);
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align={isCenter ? 'right' : 'left'}
                                                            draggable={col.sortable !== false && col.id !== 'stt'}
                                                            sx={{
                                                                bgcolor: draggedColumn === col.id ? 'action.hover' : '#fafafa',
                                                                borderBottom: '2px solid #e5e7eb',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                color: '#6b7280',
                                                                py: 1.5,
                                                                px: 2,
                                                                whiteSpace: 'nowrap',
                                                                opacity: draggedColumn === col.id ? 0.5 : 1,
                                                                transition: 'all 0.2s',
                                                                overflow: 'hidden',
                                                                ...(col.id === 'stt' && { width: 70, minWidth: 70, maxWidth: 70 }),
                                                            }}
                                                            onDragOver={handleDragOver}
                                                            onDrop={(e) => handleDrop(e, col.id)}
                                                        >
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                                                                {col.sortable && col.id !== 'stt' ? (
                                                                    <Box
                                                                        draggable
                                                                        onDragStart={(e) => handleDragStart(e, col.id)}
                                                                        onDragEnd={handleDragEnd}
                                                                        sx={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            cursor: 'grab',
                                                                            '&:active': { cursor: 'grabbing' },
                                                                            color: '#9ca3af',
                                                                            opacity: 1,
                                                                            transition: 'opacity 0.2s',
                                                                        }}
                                                                    >
                                                                        <GripVertical size={14} />
                                                                    </Box>
                                                                ) : (
                                                                    <Box sx={{ width: 14 }} />
                                                                )}
                                                                {col.sortable ? (
                                                                    <TableSortLabel
                                                                        active={orderBy === col.id}
                                                                        direction={orderBy === col.id ? order : 'asc'}
                                                                        onClick={() => handleSortRequest(col.id)}
                                                                        sx={{
                                                                            flex: 1,
                                                                            '& .MuiTableSortLabel-icon': { fontSize: '14px', opacity: orderBy === col.id ? 1 : 0 },
                                                                        }}
                                                                        >
                                                                        {col.label}
                                                                    </TableSortLabel>
                                                                ) : (
                                                                    <Typography variant="inherit" sx={{ flex: 1 }}>{col.label}</Typography>
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        </TableHead>

                                        <TableBody>
                                            {paginatedData.map((row, index) => {
                                                const qty = row?.onHandQty ?? 0;
                                                const min = row?.minQty ?? 0;
                                                const isUnder = qty < min;
                                                return (
                                                    <TableRow
                                                        key={row.alertId}
                                                        hover
                                                        sx={{
                                                            height: 52,
                                                            '&:hover': {
                                                                bgcolor: '#f9fafb',
                                                            },
                                                        }}
                                                    >
                                                        {visibleColumns.map((col) => {
                                                            const opts = { pageNumber: page + 1, pageSize };
                                                            const isCenter = isCenterAlignedColumn(col.id);

                                                            if (col.id === 'stt') {
                                                                return (
                                                                    <TableCell
                                                                        key={col.id}
                                                                        align="center"
                                                                        sx={{ ...bodyCellBaseSx, px: 1 }}
                                                                    >
                                                                        {(page + 1 - 1) * pageSize + index + 1}
                                                                    </TableCell>
                                                                );
                                                            }

                                                            if (col.id === 'itemCode') {
                                                                return (
                                                                    <TableCell key={col.id} align="left">
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                            <Box
                                                                                component="a"
                                                                                href={`/items/${row.itemId}`}
                                                                                onClick={(e) => { e.preventDefault(); navigate(`/items/${row.itemId}`); }}
                                                                                sx={{
                                                                                    color: '#3b82f6', textDecoration: 'none', fontWeight: 500, cursor: 'pointer',
                                                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                                    '&:hover': { textDecoration: 'underline' },
                                                                                }}
                                                                                title={col.getValue(row, index, opts)}
                                                                            >
                                                                                {col.getValue(row, index, opts)}
                                                                            </Box>
                                                                        </Box>
                                                                    </TableCell>
                                                                );
                                                            }

                                                            if (col.id === 'status') {
                                                                return (
                                                                    <TableCell
                                                                        key={col.id}
                                                                        align="left"
                                                                    >
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                            <Chip
                                                                                label={isUnder ? '• Dưới định mức' : '• An toàn'}
                                                                                size="small"
                                                                                sx={{
                                                                                    fontWeight: 500,
                                                                                    fontSize: '12px',
                                                                                    lineHeight: '16px',
                                                                                    borderRadius: '999px',
                                                                                    minWidth: 120,
                                                                                    height: '26px',
                                                                                    bgcolor: isUnder
                                                                                        ? 'rgba(239, 68, 68, 0.15)'
                                                                                        : 'rgba(16, 185, 129, 0.2)',
                                                                                    color: '#374151',
                                                                                    border: 'none',
                                                                                    boxShadow: 'none',
                                                                                    '& .MuiChip-label': {
                                                                                        px: 1.5,
                                                                                        py: 0,
                                                                                        textAlign: 'left',
                                                                                        display: 'block',
                                                                                        width: '100%',
                                                                                    },
                                                                                }}
                                                                            />
                                                                        </Box>
                                                                    </TableCell>
                                                                );
                                                            }

                                                            return (
                                                                <TableCell
                                                                    key={col.id}
                                                                    align={isCenter ? 'center' : 'left'}
                                                                    sx={{
                                                                        ...bodyCellBaseSx,
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                    }}
                                                                    title={col.getValue(row, index, opts)}
                                                                >
                                                                    {col.getValue(row, index, opts)}
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

                    {/* ── Pagination footer giống ViewItemList ─────────────── */}
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
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            component="span"
                            sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}
                        >
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
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(0, 0, 0, 0.1)',
                                    },
                                }}
                            >
                                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                    <MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>
                                        {n}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                            component="span"
                            sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}
                        >
                            {start}–{end} / {sortedData.length} (Tổng {totalPages} trang)
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
                                '&:hover': {
                                    borderColor: 'rgba(0, 0, 0, 0.2)',
                                },
                            }}
                        >
                            Trước
                        </Button>

                        <Button
                            size="small"
                            variant="outlined"
                            disabled={end >= sortedData.length || sortedData.length === 0}
                            onClick={() => handlePageChange(page + 1)}
                            sx={{
                                minWidth: 36,
                                textTransform: 'none',
                                fontSize: '13px',
                                borderRadius: '8px',
                                borderColor: 'rgba(0, 0, 0, 0.1)',
                                '&:hover': {
                                    borderColor: 'rgba(0, 0, 0, 0.2)',
                                },
                            }}
                        >
                            Sau
                        </Button>
                    </Box>
                </Box>

                {/* ── Popups ── */}
                <AlertFilterPopup
                    open={filterOpen}
                    onClose={() => setFilterOpen(false)}
                    initialValues={filterValues}
                    onApply={handleFilterApply}
                />

                {/* Toast đặt đúng vị trí như ViewItemList – sau list-view, trong root */}
                {toast && toast.message && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
            </Box>
        </Box>
    );
};

export default InventoryAlertSetup;
