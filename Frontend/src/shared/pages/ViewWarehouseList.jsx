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
    Warehouse as WarehouseIcon,
    Plus,
    Filter,
    Columns,
    GripVertical,
    Eye,
    Edit,
} from 'lucide-react';
import { removeDiacritics } from '../utils/stringUtils';
import SearchInput from '../components/SearchInput';
import { getWarehouses } from '../lib/warehouseService';
import '../styles/ListView.css';

// ── Constants ────────────────────────────────────────────────────────────────
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
const LS_COL_ORDER  = 'warehouseColumnOrder';
const LS_SORT       = 'warehouseSortConfig';

// ── Status styles ─────────────────────────────────────────────────────────────
const STATUS_STYLE = {
    true:  { bgColor: 'rgba(16,185,129,0.18)', label: 'Hoạt động', dot: '•' },
    false: { bgColor: 'rgba(107,114,128,0.15)', label: 'Tắt', dot: '•' },
};

// ── Column definitions ────────────────────────────────────────────────────────
const WAREHOUSE_COLUMNS = [
    { id: 'stt',              label: 'STT',              sortable: false, getValue: (row, idx, { pageNumber, pageSize }) => (pageNumber - 1) * pageSize + idx + 1 },
    { id: 'warehouseCode',    label: 'Mã kho',         sortable: true,  getValue: (row) => row.warehouseCode    ?? '' },
    { id: 'warehouseName',    label: 'Tên kho',         sortable: true,  getValue: (row) => row.warehouseName    ?? '' },
    { id: 'address',          label: 'Địa chỉ',        sortable: true,  getValue: (row) => row.address          ?? '' },
    { id: 'isActive',         label: 'Trạng thái',      sortable: true,  getValue: (row) => row.isActive       ?? null },
    { id: 'createdAt',        label: 'Ngày tạo',        sortable: true,  getValue: (row) => row.createdAt      ?? '' },
];

const DEFAULT_VISIBLE_COLUMN_IDS = WAREHOUSE_COLUMNS.map((c) => c.id);
const SORTABLE_COLUMN_IDS = WAREHOUSE_COLUMNS.filter((c) => c.sortable).map((c) => c.id);
const DATE_COLUMN_IDS     = ['createdAt'];

// ── Helper functions ────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN');
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

// ── Status Chip Component ───────────────────────────────────────────────────────
const StatusChip = ({ isActive }) => {
    const style = STATUS_STYLE[isActive] ?? { bgColor: 'rgba(107,114,128,0.15)', label: '—', dot: '•' };
    return (
        <Chip
            label={`${style.dot} ${style.label}`}
            size="small"
            sx={{
                fontWeight: 500,
                fontSize: '12px',
                lineHeight: '16px',
                borderRadius: '999px',
                minWidth: 80,
                height: '26px',
                bgcolor: style.bgColor,
                color: '#374151',
            }}
        />
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ViewWarehouseList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [list, setList] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [orderBy, setOrderBy] = useState('');
    const [order, setOrder] = useState('asc');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [columnOrder, setColumnOrder] = useState(() => {
        const saved = localStorage.getItem(LS_COL_ORDER);
        return saved ? JSON.parse(saved) : WAREHOUSE_COLUMNS.map(c => c.id);
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [draggedColumn, setDraggedColumn] = useState(null);

    // Load data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await getWarehouses({ pageNumber: page + 1, pageSize });
                let items = res.items ?? [];
                
                // Filter by search term
                if (searchTerm) {
                    const term = removeDiacritics(searchTerm.toLowerCase());
                    items = items.filter(item => 
                        removeDiacritics((item.warehouseCode ?? '').toLowerCase()).includes(term) ||
                        removeDiacritics((item.warehouseName ?? '').toLowerCase()).includes(term) ||
                        removeDiacritics((item.address ?? '').toLowerCase()).includes(term)
                    );
                }

                // Sort
                if (orderBy) {
                    items.sort((a, b) => {
                        const aVal = a[orderBy] ?? '';
                        const bVal = b[orderBy] ?? '';
                        if (aVal < bVal) return order === 'asc' ? -1 : 1;
                        if (aVal > bVal) return order === 'asc' ? 1 : -1;
                        return 0;
                    });
                }

                setList(items);
                setTotalCount(res.totalItems ?? 0);
            } catch (err) {
                console.error('Error fetching warehouses:', err);
                setList([]);
                setTotalCount(0);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [page, pageSize, searchTerm, orderBy, order]);

    // Computed values
    const rows = list;
    const start = totalCount === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalCount);
    const totalPages = Math.ceil(totalCount / pageSize);
    const visibleColumns = WAREHOUSE_COLUMNS.filter(c => columnOrder.includes(c.id));
    const isAllSelected = rows.length > 0 && rows.every(r => selectedIds.has(r.warehouseId));
    const isSomeSelected = rows.some(r => selectedIds.has(r.warehouseId)) && !isAllSelected;

    // Handlers
    const handleSortRequest = (colId) => {
        const isAsc = orderBy === colId && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(colId);
    };

    const handlePageChange = (newPage) => setPage(newPage);
    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setPage(0);
    };

    const handleSelectRow = (id, checked) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(new Set(rows.map(r => r.warehouseId)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleColumnVisibilityChange = (id, checked) => {
        setTempColumnOrder(prev => {
            if (checked && !prev.includes(id)) return [...prev, id];
            if (!checked && prev.includes(id)) return prev.filter(c => c !== id);
            return prev;
        });
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

    const handleDragStart = (e, colId) => {
        setDraggedColumn(colId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => setDraggedColumn(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetColId) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === targetColId) return;
        const newOrder = [...tempColumnOrder];
        const dragIdx = newOrder.indexOf(draggedColumn);
        const targetIdx = newOrder.indexOf(targetColId);
        newOrder.splice(dragIdx, 1);
        newOrder.splice(targetIdx, 0, draggedColumn);
        setTempColumnOrder(newOrder);
        setDraggedColumn(null);
    };

    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    return (
        <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', pt: 0, pb: 2 }}>
            {/* Header */}
            <Box sx={{ flexShrink: 0, mb: 2 }}>
                <Typography variant="h4" component="h1" fontWeight="800" sx={{
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    backgroundClip: 'text',
                    textFillColor: 'transparent',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 0.5,
                }}>
                    Danh sách kho
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Danh sách kho – tìm kiếm theo mã kho, tên kho, địa chỉ.
                </Typography>
            </Box>

            <Box className="list-view" sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: '#fff', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 1, overflow: 'hidden' }}>
                {/* Filter Bar */}
                <Box sx={{ p: 1.5, borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <SearchInput
                        placeholder="Tìm theo mã kho, tên kho, địa chỉ…"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                        sx={{ flex: '1 1 200px', minWidth: 200, maxWidth: 420 }}
                    />
                    <Tooltip title="Chọn cột hiển thị">
                        <IconButton onClick={(e) => { setTempColumnOrder(columnOrder); setColumnSelectorAnchor(e.currentTarget); }} sx={{ border: 1, borderColor: 'divider' }}>
                            <Columns size={20} />
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Column Selector Popover */}
                <Popover
                    open={columnSelectorOpen}
                    anchorEl={columnSelectorAnchor}
                    onClose={() => setColumnSelectorAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{ paper: { sx: { width: 280, maxHeight: 400 } } }}
                >
                    <Box sx={{ p: 2, borderBottom: '1px solid #f3f4f6' }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>Chọn cột hiển thị</Typography>
                    </Box>
                    <Box sx={{ p: 2, maxHeight: 280, overflowY: 'auto' }}>
                        <FormGroup>
                            {tempColumnOrder.map((colId) => {
                                const col = WAREHOUSE_COLUMNS.find(c => c.id === colId);
                                if (!col) return null;
                                return (
                                    <Box key={colId} draggable onDragStart={(e) => handleDragStart(e, colId)} onDragEnd={handleDragEnd}
                                        sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', '&:active': { cursor: 'grabbing' }, '&:hover': { bgcolor: '#f9fafb' }, py: 0.5 }}>
                                        <Box draggable onDragStart={(e) => handleDragStart(e, colId)} onDragEnd={handleDragEnd}
                                            sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', '&:active': { cursor: 'grabbing' }, color: '#9ca3af', '&:hover': { color: '#6b7280' }, mr: 1 }}>
                                            <GripVertical size={14} />
                                        </Box>
                                        <FormControlLabel
                                            control={<Checkbox checked={tempColumnOrder.includes(colId)} onChange={(e) => handleColumnVisibilityChange(colId, e.target.checked)} sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' } }} />}
                                            label={<Typography sx={{ fontSize: '13px', color: '#374151' }}>{col.label}</Typography>}
                                            sx={{ flex: 1, m: 0, py: 0.5 }}
                                        />
                                    </Box>
                                );
                            })}
                        </FormGroup>
                    </Box>
                    <Box sx={{ px: 2.5, py: 2, display: 'flex', gap: 1.5, borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
                        <Button variant="outlined" onClick={handleCancelColumnOrder}
                            sx={{ flex: 1, textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', borderColor: '#e5e7eb', color: '#6b7280', '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' } }}>Hủy</Button>
                        <Button variant="contained" onClick={handleSaveColumnOrder}
                            sx={{ flex: 1, textTransform: 'none', fontSize: '13px', fontWeight: 500, height: 38, borderRadius: '10px', bgcolor: '#3b82f6', boxShadow: 'none', '&:hover': { bgcolor: '#2563eb', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' } }}>Lưu</Button>
                    </Box>
                </Popover>

                {/* Table */}
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {rows.length === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, px: 2, color: 'text.secondary' }}>
                            <WarehouseIcon size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
                            <Typography sx={{ fontSize: '13px' }}>Chưa có dữ liệu kho</Typography>
                        </Box>
                    ) : (
                        <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        {visibleColumns.map((col) => (
                                            <TableCell key={col.id}
                                                sx={{ fontWeight: 600, bgcolor: draggedColumn === col.id ? 'action.hover' : '#fafafa', whiteSpace: 'nowrap', opacity: draggedColumn === col.id ? 0.5 : 1, transition: 'all 0.2s', borderBottom: '2px solid #e5e7eb', fontSize: '12px', color: '#6b7280', py: 1.5, px: 2 }}
                                                align={col.id === 'stt' ? 'center' : 'left'}
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
                                        <TableRow key={row.warehouseId} hover
                                            sx={{ height: 56, '&:last-child td': { borderBottom: 0 }, '&:hover': { bgcolor: '#f9fafb' } }}>
                                            {visibleColumns.map((col) => {
                                                const opts = { pageNumber: page + 1, pageSize };

                                                if (col.id === 'stt') {
                                                    return <TableCell key={col.id} align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>{col.getValue(row, index, opts)}</TableCell>;
                                                }

                                                if (col.id === 'warehouseCode') {
                                                    return (
                                                        <TableCell key={col.id} align="left">
                                                            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                <Box component="a"
                                                                    href={`/inventory/${row.warehouseId}`}
                                                                    onClick={(e) => { e.preventDefault(); navigate(`/inventory/${row.warehouseId}`); }}
                                                                    sx={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', '&:hover': { textDecoration: 'underline' } }}
                                                                    title={row.warehouseCode}>
                                                                    {row.warehouseCode}
                                                                </Box>
                                                            </Box>
                                                        </TableCell>
                                                    );
                                                }

                                                if (col.id === 'isActive') {
                                                    return (
                                                        <TableCell key={col.id} align="left">
                                                            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                <StatusChip isActive={row.isActive} />
                                                            </Box>
                                                        </TableCell>
                                                    );
                                                }

                                                if (DATE_COLUMN_IDS.includes(col.id)) {
                                                    return (
                                                        <TableCell key={col.id} align="left" sx={{ color: '#6b7280', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                                            {col.id === 'createdAt' ? formatDateTime(row.createdAt) : formatDate(row.createdAt)}
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

                {/* Pagination */}
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
            </Box>
        </Box>
    );
};

export default ViewWarehouseList;
