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
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Box,
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
    Popover,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Chip,
    CircularProgress,
    Paper,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Plus,
    Columns,
    Filter,
    RefreshCw,
    Save,
    Edit,
    X,
    GripVertical,
    AlertTriangle,
} from 'lucide-react';
import Toast from '../components/Toast/Toast';
import { useToast } from '../shared/hooks/useToast';
import SearchInput from '../shared/components/SearchInput';
import authService from '../shared/lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../shared/permissions/roleUtils';
import '../shared/styles/ListView.css';

// ─── Mock data – thay bằng API khi backend sẵn sàng ────────────────────────
const MOCK_WAREHOUSES = [
    { warehouseId: 1, warehouseCode: 'WH-HCM', warehouseName: 'Kho HCM' },
];

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

// ─── Styles ───────────────────────────────────────────────────────────────────
const headCellBaseSx = {
    fontWeight: 600,
    bgcolor: '#fafafa',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '12px',
    color: '#6b7280',
    height: 48,
    py: 0,
    px: 2,
    verticalAlign: 'middle',
};

const bodyCellBaseSx = {
    color: '#374151',
    fontSize: '13px',
    py: 1.25,
    px: 2,
    verticalAlign: 'middle',
    borderBottom: '1px solid #f3f4f6',
};

const getAlertCellSx = (colId, widthPct, row) => {
    const base = {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        width: `${widthPct}%`,
        maxWidth: `${widthPct}%`,
        boxSizing: 'border-box',
    };

    if (colId === 'itemCode') {
        return { ...base, fontWeight: 600, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' };
    }
    if (colId === 'onHandQty' || colId === 'minQty' || colId === 'reorderQty') {
        return { ...base, fontVariantNumeric: 'tabular-nums' };
    }
    if (colId === 'status') {
        const qty = row?.onHandQty ?? 0;
        const min = row?.minQty ?? 0;
        if (qty < min) return { ...base, color: 'error.main', fontWeight: 600 };
        return { ...base, color: 'success.main', fontWeight: 600 };
    }
    return base;
};

// ─── Component ────────────────────────────────────────────────────────────────
const InventoryAlertSetup = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const location = useLocation();
    const { toast, showToast, clearToast } = useToast();

    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));

    // Dữ liệu
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Phân trang
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(() => {
        const saved = localStorage.getItem('alertPageSize');
        return saved ? Number(saved) : 20;
    });

    // Tìm kiếm
    const [searchTerm, setSearchTerm] = useState('');

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

    // Sắp xếp
    const [orderBy, setOrderBy] = useState(null);
    const [order, setOrder] = useState('asc');

    // Edit inline
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ minQty: 0, reorderQty: 0 });

    // Load data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // TODO: thay bằng getItemWarehousePolicyList() khi backend sẵn sàng
            // const result = await getItemWarehousePolicyList();
            // setData(result.items);
            await new Promise((r) => setTimeout(r, 600));
            setData(MOCK_ALERTS);
        } catch (err) {
            showToast('Không tải được danh sách cảnh báo.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Lọc + tìm kiếm
    const filteredData = data.filter((row) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (row.itemCode ?? '').toLowerCase().includes(term) ||
            (row.itemName ?? '').toLowerCase().includes(term)
        );
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

    // ── Helpers ──────────────────────────────────────────────────────────────
    function getColumnWidth(colId) {
        switch (colId) {
            case 'stt': return 60;
            case 'itemCode': return 160;
            case 'itemName': return 220;
            case 'warehouse': return 160;
            case 'uom': return 100;
            case 'onHandQty': return 140;
            case 'minQty': return 140;
            case 'reorderQty': return 140;
            case 'status': return 160;
            default: return 150;
        }
    }

    // Cột đang hiển thị theo thứ tự
    const visibleColumns = columnOrder
        .filter((id) => visibleColumnIds.has(id))
        .map((id) => ALERT_COLUMNS.find((c) => c.id === id))
        .filter(Boolean);

    const totalWidth = visibleColumns.reduce((sum, col) => sum + getColumnWidth(col.id), 0);

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

    // ── Drag & drop ─────────────────────────────────────────────────────────
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

    // Drag trong popup
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

    const handleApplyColumnOrder = () => {
        setColumnOrder(tempColumnOrder);
        localStorage.setItem('alertColumnOrder', JSON.stringify(tempColumnOrder));
        setColumnSelectorAnchor(null);
    };

    // ── Sort ─────────────────────────────────────────────────────────────────
    const handleSort = (colId) => {
        if (!SORTABLE_COLUMN_IDS.includes(colId)) return;
        const isAsc = orderBy === colId && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(colId);
    };

    // ── Edit inline ─────────────────────────────────────────────────────────
    const handleEdit = (row) => {
        setEditingId(row.alertId);
        setEditForm({ minQty: row.minQty, reorderQty: row.reorderQty });
    };

    const handleSave = (row) => {
        setData((prev) =>
            prev.map((r) =>
                r.alertId === row.alertId
                    ? { ...r, minQty: editForm.minQty, reorderQty: editForm.reorderQty }
                    : r
            )
        );
        setEditingId(null);
        showToast('Cập nhật ngưỡng thành công!', 'success');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({ minQty: 0, reorderQty: 0 });
    };

    const handlePageChange = (_, newPage) => setPage(newPage);
    const handlePageSizeChange = (e) => {
        const newSize = Number(e.target.value);
        setPageSize(newSize);
        setPage(0);
        localStorage.setItem('alertPageSize', String(newSize));
    };

    return (
        <Box className="list-view" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* ── Toast ─────────────────────────────────────────────────── */}
            {toast && toast.message && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

            {/* ── Header ─────────────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexShrink: 0, px: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700} color="text.primary">
                        Thiết lập Cảnh báo Tồn kho
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Cấu hình ngưỡng tối thiểu và số lượng đặt lại cho từng vật tư tại mỗi kho.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Làm mới">
                        <IconButton onClick={fetchData} size="small">
                            <RefreshCw size={18} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* ── Filter / Toolbar bar ───────────────────────────────────── */}
            <Box className="list-filter-card" sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <SearchInput
                        placeholder="Tìm theo mã hoặc tên vật tư..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                        sx={{ flex: '1 1 240px', maxWidth: 400 }}
                    />

                    {/* Alert banner */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 2,
                            py: 0.75,
                            bgcolor: 'warning.50',
                            border: '1px solid',
                            borderColor: 'warning.light',
                            borderRadius: 2,
                            flex: '1 1 280px',
                        }}
                    >
                        <AlertTriangle size={16} color="#ed6c02" />
                        <Typography variant="caption" color="warning.dark">
                            Tồn thực tế &lt; ngưỡng Min → cảnh báo tự động.
                        </Typography>
                    </Box>

                    {/* Column selector */}
                    <Tooltip title="Chọn cột hiển thị">
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Columns size={16} />}
                            onClick={(e) => { setColumnSelectorAnchor(e.currentTarget); setTempColumnOrder(columnOrder); }}
                            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                            Cột
                        </Button>
                    </Tooltip>
                </Box>
            </Box>

            {/* ── Table card ───────────────────────────────────────────── */}
            <Box className="list-grid-card" sx={{ flex: 1, px: 2, pb: 2, minHeight: 0 }}>
                <Box className="list-grid-wrapper" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Paper
                        elevation={0}
                        sx={{
                            flex: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                        }}
                    >
                        {loading ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, py: 8 }}>
                                <CircularProgress size={32} />
                            </Box>
                        ) : (
                            <>
                                <TableContainer sx={{ flex: 1 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                {visibleColumns.map((col) => (
                                                    <TableCell
                                                        key={col.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, col.id)}
                                                        onDragOver={handleDragOver}
                                                        onDrop={(e) => handleDrop(e, col.id)}
                                                        sx={{
                                                            ...headCellBaseSx,
                                                            cursor: 'grab',
                                                            userSelect: 'none',
                                                            width: getColumnWidth(col.id),
                                                            minWidth: getColumnWidth(col.id),
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            {SORTABLE_COLUMN_IDS.includes(col.id) ? (
                                                                <Box
                                                                    component="span"
                                                                    onClick={() => handleSort(col.id)}
                                                                    sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                                                                >
                                                                    {col.label}
                                                                    {orderBy === col.id ? (order === 'asc' ? ' ↑' : ' ↓') : ''}
                                                                </Box>
                                                            ) : (
                                                                <Box component="span">{col.label}</Box>
                                                            )}
                                                            <GripVertical size={12} color="#d1d5db" />
                                                        </Box>
                                                    </TableCell>
                                                ))}
                                                {/* Thao tác */}
                                                <TableCell sx={{ ...headCellBaseSx, width: 100, minWidth: 100 }}>
                                                    Thao tác
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>

                                        <TableBody>
                                            {paginatedData.map((row) => {
                                                const isEditing = editingId === row.alertId;
                                                const totalW = visibleColumns.reduce((s, c) => s + getColumnWidth(c.id), 0);

                                                return (
                                                    <TableRow key={row.alertId} hover>
                                                        {visibleColumns.map((col) => (
                                                            <TableCell
                                                                key={col.id}
                                                                sx={getAlertCellSx(col.id, (getColumnWidth(col.id) / totalW) * 100, row)}
                                                            >
                                                                {col.getValue(row, paginatedData.indexOf(row), {
                                                                    pageNumber: page + 1,
                                                                    pageSize,
                                                                })}
                                                            </TableCell>
                                                        ))}
                                                        <TableCell sx={{ ...bodyCellBaseSx }}>
                                                            {isEditing ? (
                                                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                                                    <Tooltip title="Lưu">
                                                                        <IconButton color="primary" size="small" onClick={() => handleSave(row)}>
                                                                            <Save size={15} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    <Tooltip title="Hủy">
                                                                        <IconButton size="small" onClick={handleCancelEdit}>
                                                                            <X size={15} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                </Box>
                                                            ) : (
                                                                <Tooltip title="Chỉnh sửa ngưỡng">
                                                                    <IconButton color="primary" size="small" onClick={() => handleEdit(row)}>
                                                                        <Edit size={15} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}

                                            {paginatedData.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={visibleColumns.length + 1} align="center" sx={{ py: 6 }}>
                                                        <Typography color="text.secondary">Không tìm thấy dữ liệu phù hợp.</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {/* ── Pagination ──────────────────────────────────── */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        px: 2,
                                        py: 1,
                                        borderTop: '1px solid',
                                        borderColor: 'divider',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Dòng mỗi trang:
                                        </Typography>
                                        <Box component="select" value={pageSize} onChange={handlePageSizeChange}
                                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1, py: 0.5, fontSize: '0.8125rem', cursor: 'pointer' }}>
                                            {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                                <Box component="option" key={n} value={n}>{n}</Box>
                                            ))}
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                            {(page * pageSize + 1)}–{Math.min((page + 1) * pageSize, sortedData.length)} trong {sortedData.length} dòng
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <Button size="small" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>‹</Button>
                                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                                            <Button
                                                key={i} size="small" variant={page === i ? 'contained' : 'text'}
                                                onClick={() => setPage(i)} sx={{ minWidth: 32 }}
                                            >
                                                {i + 1}
                                            </Button>
                                        ))}
                                        <Button size="small" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>›</Button>
                                    </Box>
                                </Box>
                            </>
                        )}
                    </Paper>
                </Box>
            </Box>

            {/* ── Column selector Popover ─────────────────────────────────── */}
            <Popover
                open={Boolean(columnSelectorAnchor)}
                anchorEl={columnSelectorAnchor}
                onClose={() => setColumnSelectorAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                <Box sx={{ p: 2, width: 280 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Chọn cột hiển thị
                    </Typography>
                    <FormGroup>
                        {tempColumnOrder.map((colId) => {
                            const col = ALERT_COLUMNS.find((c) => c.id === colId);
                            if (!col) return null;
                            return (
                                <FormControlLabel
                                    key={colId}
                                    control={
                                        <Checkbox
                                            checked={visibleColumnIds.has(colId)}
                                            onChange={(e) => handleColumnVisibilityChange(colId, e.target.checked)}
                                            size="small"
                                        />
                                    }
                                    label={
                                        <Box
                                            draggable
                                            onDragStart={(e) => handlePopupDragStart(e, colId)}
                                            onDragOver={handlePopupDragOver}
                                            onDrop={(e) => handlePopupDrop(e, colId)}
                                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'grab', fontSize: '0.875rem' }}
                                        >
                                            <GripVertical size={14} color="#9ca3af" />
                                            {col.label}
                                        </Box>
                                    }
                                />
                            );
                        })}
                    </FormGroup>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                        <Button size="small" onClick={() => setColumnSelectorAnchor(null)}>Hủy</Button>
                        <Button size="small" variant="contained" onClick={handleApplyColumnOrder}>Áp dụng</Button>
                    </Box>
                </Box>
            </Popover>
        </Box>
    );
};

export default InventoryAlertSetup;
