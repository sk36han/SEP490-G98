/*
 * Danh sách Quy cách đóng gói.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePolling } from '../hooks/usePolling';
import PollingManager from '../lib/pollingManager';
import {
    Box,
    Button,
    Typography,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Chip,
    useTheme,
    useMediaQuery,
    Popover,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Tooltip,
    FormControl,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import { Plus, Filter, Columns, Package, X, GripVertical } from 'lucide-react';
import SearchInput from '../components/SearchInput';
import { getPackagingSpecList, createPackagingSpec, updatePackagingSpec, getPackagingSpecById } from '../lib/packagingSpecService';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

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
    fontSize: '12px',
    py: 1.25,
    px: 2,
    verticalAlign: 'middle',
    borderBottom: '1px solid #f3f4f6',
};

const ViewPackagingSpecList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [allRows, setAllRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterAnchor, setFilterAnchor] = useState(null);
    const [columnsAnchor, setColumnsAnchor] = useState(null);

    // Pagination
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Add dialog
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addForm, setAddForm] = useState({ specName: '' });
    const [addSubmitting, setAddSubmitting] = useState(false);

    // Edit dialog
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editForm, setEditForm] = useState({ specName: '', isActive: true });
    const [editLoading, setEditLoading] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);

    // Column management
    const allColumns = [
        { id: 'specName', label: 'Tên quy cách', sortable: true },
        { id: 'description', label: 'Mô tả', sortable: false },
        { id: 'isActive', label: 'Trạng thái', sortable: true },
    ];

    const savedColumnOrder = (() => {
        try {
            const saved = JSON.parse(localStorage.getItem('packagingspecColumnOrder') || 'null');
            return saved ? saved.filter(id => allColumns.some(c => c.id === id)) : null;
        } catch { return null; }
    })();
    const savedVisibleColumns = (() => {
        try {
            const saved = JSON.parse(localStorage.getItem('packagingspecVisibleColumns') || 'null');
            const defaultIds = allColumns.map(c => c.id);
            if (!saved) return new Set(defaultIds);
            const valid = saved.filter(id => allColumns.some(c => c.id === id));
            return new Set(valid.length > 0 ? valid : defaultIds);
        } catch { return new Set(allColumns.map(c => c.id)); }
    })();

    const [columnOrder, setColumnOrder] = useState(savedColumnOrder || allColumns.map(c => c.id));
    const [visibleColumnIds, setVisibleColumnIds] = useState(savedVisibleColumns);
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [draggedColumn, setDraggedColumn] = useState(null);

    const [orderBy, setOrderBy] = useState(null);
    const [order, setOrder] = useState('asc');

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getPackagingSpecList();
            setAllRows(result.items ?? []);
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không tải được danh sách.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    // ── Polling ────────────────────────────────────────────────────
    const fetchListRef = useRef(fetchList);
    useEffect(() => { fetchListRef.current = fetchList; }, [fetchList]);
    usePolling('packagingSpecs', () => fetchListRef.current?.());

    // Filter client-side
    const filteredRows = allRows.filter(r => {
        const matchSearch = !searchTerm || (r.specName || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus === 'all'
            || (filterStatus === 'active' && r.isActive)
            || (filterStatus === 'inactive' && !r.isActive);
        return matchSearch && matchStatus;
    });

    // Sort client-side
    const sortedRows = (() => {
        if (!orderBy) return filteredRows;
        return [...filteredRows].sort((a, b) => {
            let aVal = a[orderBy];
            let bVal = b[orderBy];
            if (aVal == null) aVal = '';
            if (bVal == null) bVal = '';
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
    })();

    // Paginate
    const totalItems = sortedRows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const pagedRows = sortedRows.slice(page * pageSize, (page + 1) * pageSize);
    const start = totalItems === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalItems);

    const handleSortRequest = (colId) => {
        if (orderBy === colId) {
            if (order === 'asc') setOrder('desc');
            else { setOrderBy(null); setOrder('asc'); }
        } else {
            setOrderBy(colId);
            setOrder('asc');
        }
    };

    // Drag-drop popup
    const handlePopupDragStart = (e, colId) => {
        setDraggedColumn(colId);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handlePopupDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handlePopupDrop = (e, targetId) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === targetId) return;
        const newOrder = [...tempColumnOrder];
        newOrder.splice(newOrder.indexOf(draggedColumn), 1);
        const targetIdx = newOrder.indexOf(targetId);
        newOrder.splice(targetIdx, 0, draggedColumn);
        setTempColumnOrder(newOrder);
    };
    const handlePopupDragEnd = () => { setDraggedColumn(null); };
    const handleSaveColumnOrder = () => {
        const visible = tempColumnOrder.filter(id => visibleColumnIds.has(id));
        setColumnOrder(visible);
        localStorage.setItem('packagingspecColumnOrder', JSON.stringify(visible));
        localStorage.setItem('packagingspecVisibleColumns', JSON.stringify([...visibleColumnIds]));
        setColumnsAnchor(null);
    };
    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setColumnsAnchor(null);
    };
    const handleColumnVisibilityChange = (colId, checked) => {
        setVisibleColumnIds(prev => {
            const next = new Set(prev);
            checked ? next.add(colId) : next.delete(colId);
            return next;
        });
    };
    const handleSelectAllColumns = (checked) => {
        checked ? setVisibleColumnIds(new Set(allColumns.map(c => c.id))) : setVisibleColumnIds(new Set());
    };

    // Header drag-drop
    const handleDragStart = (e, colId) => {
        setDraggedColumn(colId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colId);
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
    };
    const handleDrop = (e, targetId) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedId = draggedColumn || e.dataTransfer.getData('text/plain');
        if (!draggedId || draggedId === targetId) return;
        const newOrder = [...columnOrder];
        const draggedIdx = newOrder.indexOf(draggedId);
        const targetIdx = newOrder.indexOf(targetId);
        if (draggedIdx === -1 || targetIdx === -1) return;
        newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, draggedId);
        setColumnOrder(newOrder);
        localStorage.setItem('packagingspecColumnOrder', JSON.stringify(newOrder));
        setDraggedColumn(null);
    };
    const handleDragEnd = () => { setDraggedColumn(null); };

    // Add
    const handleAdd = async () => {
        const name = (addForm.specName || '').trim();
        if (!name || name.length < 2) return;
        setAddSubmitting(true);
        try {
            await createPackagingSpec({ specName: name });
            setAddDialogOpen(false);
            setAddForm({ specName: '' });
            fetchList();
            PollingManager.triggerRefreshByFetchKey('PackagingSpec');
        } catch { } finally {
            setAddSubmitting(false);
        }
    };

    // Edit
    const handleOpenEdit = async (row) => {
        setEditId(row.packagingSpecId);
        setEditLoading(true);
        setEditDialogOpen(true);
        setEditForm({ specName: row.specName || '', isActive: row.isActive ?? true });
        try {
            const detail = await getPackagingSpecById(row.packagingSpecId);
            setEditForm({ specName: detail.specName || '', isActive: detail.isActive ?? true });
        } catch { } finally {
            setEditLoading(false);
        }
    };

    const handleEdit = async () => {
        const name = (editForm.specName || '').trim();
        if (!name || name.length < 2) return;
        setEditSubmitting(true);
        try {
            await updatePackagingSpec(editId, { specName: name, isActive: editForm.isActive });
            setEditDialogOpen(false);
            setEditForm({ specName: '', isActive: true });
            setEditId(null);
            fetchList();
            PollingManager.triggerRefreshByFetchKey('PackagingSpec');
        } catch { } finally {
            setEditSubmitting(false);
        }
    };

    return (
        <Box sx={{ height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
            {/* Header */}
            <Box sx={{ flexShrink: 0, px: { xs: 2, sm: 2 }, py: 2.5, bgcolor: '#fafafa' }}>
                <Typography variant="h5" component="h1" fontWeight="600" sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}>
                    Quy cách đóng gói
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Packaging Specification
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
                    <SummaryCard icon={Package} label="Tổng quy cách" value={allRows.length.toLocaleString()} color="#6b7280" bgColor="rgba(107,114,128,0.1)" />
                    <SummaryCard icon={Package} label="Đang hoạt động" value={allRows.filter(r => r.isActive).length.toLocaleString()} color="#059669" bgColor="rgba(5,150,105,0.1)" />
                    <SummaryCard icon={Package} label="Ngưng hoạt động" value={allRows.filter(r => !r.isActive).length.toLocaleString()} color="#d97706" bgColor="rgba(217,119,6,0.1)" />
                </Box>
            </Box>

            {/* Body */}
            <Box className="list-view" sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', px: { xs: 2, sm: 2 }, pb: 2, boxSizing: 'border-box' }}>
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb', borderRadius: '12px', bgcolor: '#ffffff' }}>
                    {/* Toolbar */}
                    <Box sx={{ px: 2, py: 2, borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1, minWidth: 0 }}>
                            <SearchInput
                                placeholder="Tìm kiếm theo tên quy cách..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                                sx={{ flex: 1, minWidth: isMobile ? '100%' : 200, maxWidth: isMobile ? '100%' : 480, '& .MuiOutlinedInput-root': { bgcolor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', '& fieldset': { border: 'none' }, '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' }, '&.Mui-focused': { bgcolor: '#ffffff', borderColor: '#3b82f6', boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)' }, '& input::placeholder': { color: '#9ca3af', fontSize: '13px' } } }}
                            />
                            <Tooltip title="Bộ lọc">
                                <IconButton color="primary" onClick={(e) => setFilterAnchor(e.currentTarget)} sx={{ border: '1px solid #e5e7eb', bgcolor: '#ffffff', borderRadius: '10px', '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' } }}>
                                    <Filter size={20} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton color="primary" onClick={(e) => setColumnsAnchor(e.currentTarget)} sx={{ border: '1px solid #e5e7eb', bgcolor: '#ffffff', borderRadius: '10px', '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' } }}>
                                    <Columns size={20} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                        <Button className="list-page-btn" variant="contained" startIcon={<Plus size={18} />} onClick={() => setAddDialogOpen(true)} sx={{ fontSize: 13, fontWeight: 500, textTransform: 'none', borderRadius: 10, minHeight: 38, px: 2.5, bgcolor: '#0284c7', boxShadow: '0 1px 2px rgba(2, 132, 199, 0.25)', '&:hover': { bgcolor: '#0369a1', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.30)' } }}>
                            Thêm quy cách
                        </Button>
                    </Box>

                    {/* Filter Popup */}
                    <Popover open={Boolean(filterAnchor)} anchorEl={filterAnchor} onClose={() => setFilterAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }} slotProps={{ paper: { elevation: 0, sx: { mt: 1, width: 340, borderRadius: '14px', border: '1px solid rgba(0, 0, 0, 0.08)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)', overflow: 'hidden' } } }}>
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>Bộ lọc</Typography>
                            <Button size="small" onClick={() => { setFilterStatus('all'); setFilterAnchor(null); }} sx={{ textTransform: 'none', fontSize: '13px', fontWeight: 500, color: '#6b7280' }}>Đặt lại</Button>
                        </Box>
                        <Box sx={{ px: 2.5, py: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5 }}>Trạng thái</Typography>
                            <FormControl fullWidth size="small">
                                <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} sx={{ fontSize: '13px', borderRadius: '8px' }}>
                                    <MenuItem value="all" sx={{ fontSize: '13px' }}>Tất cả</MenuItem>
                                    <MenuItem value="active" sx={{ fontSize: '13px' }}>Hoạt động</MenuItem>
                                    <MenuItem value="inactive" sx={{ fontSize: '13px' }}>Tắt</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Popover>

                    {/* Columns Popover */}
                    <Popover open={Boolean(columnsAnchor)} anchorEl={columnsAnchor} onClose={handleCancelColumnOrder} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }} slotProps={{ paper: { elevation: 0, sx: { mt: 1, width: 340, maxHeight: '70vh', borderRadius: '14px', border: '1px solid rgba(0, 0, 0, 0.08)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' } } }}>
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>Chọn cột & Sắp xếp</Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button size="small" onClick={handleCancelColumnOrder} sx={{ textTransform: 'none', fontSize: '13px', fontWeight: 500, color: '#6b7280' }}>Hủy</Button>
                                <Button size="small" onClick={handleSaveColumnOrder} sx={{ textTransform: 'none', fontSize: '13px', fontWeight: 500, color: '#0284c7' }}>Lưu</Button>
                            </Box>
                        </Box>
                        <Box sx={{ px: 2.5, py: 2, flex: 1, minHeight: 0, overflowY: 'auto' }}>
                            <FormControlLabel control={<Checkbox checked={visibleColumnIds.size === allColumns.length} indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < allColumns.length} onChange={(e) => handleSelectAllColumns(e.target.checked)} sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' } }} />} label={<Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Tất cả</Typography>} sx={{ mb: 1 }} />
                            {allColumns.map((col) => (
                                <Box key={col.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: draggedColumn === col.id ? '#f9fafb' : 'transparent', opacity: draggedColumn === col.id ? 0.5 : 1, borderRadius: '8px', px: 0.75, py: 0.25, cursor: 'grab', '&:hover': { bgcolor: '#f9fafb' } }} draggable onDragStart={(e) => handlePopupDragStart(e, col.id)} onDragOver={handlePopupDragOver} onDrop={(e) => handlePopupDrop(e, col.id)} onDragEnd={handlePopupDragEnd}>
                                    <Box sx={{ color: '#9ca3af' }}><GripVertical size={14} /></Box>
                                    <FormControlLabel control={<Checkbox checked={visibleColumnIds.has(col.id)} onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)} sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' } }} />} label={<Typography sx={{ fontSize: '13px', color: '#374151' }}>{col.label}</Typography>} sx={{ m: 0 }} />
                                </Box>
                            ))}
                        </Box>
                    </Popover>

                    {/* Table */}
                    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
                                <CircularProgress size={40} sx={{ mb: 2 }} />
                                <Typography variant="body2" color="text.secondary">Đang tải…</Typography>
                            </Box>
                        ) : error ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, px: 2, textAlign: 'center' }}>
                                <Typography variant="body2" color="error" sx={{ mb: 2 }}>{error}</Typography>
                                <Button variant="outlined" size="small" onClick={fetchList} sx={{ textTransform: 'none' }}>Thử lại</Button>
                            </Box>
                        ) : filteredRows.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, px: 2 }}>
                                <Package size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <Typography color="text.secondary">Chưa có dữ liệu quy cách đóng gói</Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                                <Table size="small" stickyHeader sx={{ minWidth: '100%', width: 'max-content', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ ...headCellBaseSx, width: 56, minWidth: 56, maxWidth: 56, textAlign: 'center' }}>STT</TableCell>
                                            {columnOrder.filter(id => visibleColumnIds.has(id)).map((colId) => {
                                                const col = allColumns.find(c => c.id === colId);
                                                if (!col) return null;
                                                return (
                                                    <TableCell key={colId} draggable onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, colId); }} onDragEnd={(e) => { e.stopPropagation(); handleDragEnd(); }} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, colId)} sortDirection={orderBy === colId ? order : false} sx={{ ...headCellBaseSx, cursor: 'grab', userSelect: 'none', opacity: draggedColumn === colId ? 0.5 : 1 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, width: '100%' }}>
                                                            <GripVertical size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                                                            {col.sortable ? (
                                                                <TableSortLabel active={orderBy === colId} direction={orderBy === colId ? order : 'asc'} onClick={() => handleSortRequest(colId)} sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1, '& .MuiTableSortLabel-icon': { fontSize: '14px', opacity: orderBy === colId ? 1 : 0 } }}>
                                                                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.label}</Box>
                                                                </TableSortLabel>
                                                            ) : (
                                                                <Typography variant="inherit" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{col.label}</Typography>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pagedRows.map((row, index) => (
                                            <TableRow key={row.packagingSpecId} hover sx={{ height: 52, '&:hover': { bgcolor: '#f9fafb' } }}>
                                                <TableCell align="center" sx={{ ...bodyCellBaseSx, width: 56, minWidth: 56, maxWidth: 56 }}>{start + index}</TableCell>
                                                {columnOrder.filter(id => visibleColumnIds.has(id)).map((colId) => (
                                                    <TableCell key={colId} sx={{ ...bodyCellBaseSx }}>
                                                        {colId === 'specName' && (
                                                            <Box component="button" onClick={() => handleOpenEdit(row)} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', display: 'block', fontSize: '13px', textAlign: 'left', color: '#2563eb', cursor: 'pointer', bgcolor: 'transparent', border: 'none', p: 0, fontFamily: 'inherit', '&:hover': { color: '#1d4ed8' } }} title={row.specName}>
                                                                {row.specName}
                                                            </Box>
                                                        )}
                                                        {colId === 'description' && (
                                                            <Typography sx={{ fontSize: '13px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description || '—'}</Typography>
                                                        )}
                                                        {colId === 'isActive' && (
                                                            <Chip label={row.isActive ? '• Hoạt động' : '• Tạm dừng'} size="small" sx={{ fontWeight: 500, fontSize: '12px', borderRadius: '999px', minWidth: 100, height: '26px', bgcolor: row.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)', color: '#374151', border: 'none', '& .MuiChip-label': { px: 1.5, py: 0 } }} />
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>

                    {/* Pagination */}
                    <Box sx={{ flexShrink: 0, px: 2, py: 2, borderTop: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>Số dòng / trang:</Typography>
                        <FormControl size="small" sx={{ minWidth: 72 }}>
                            <Select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} sx={{ height: 32, fontSize: '13px', borderRadius: '8px' }}>
                                {ROWS_PER_PAGE_OPTIONS.map((n) => (<MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>{n}</MenuItem>))}
                            </Select>
                        </FormControl>
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>{start}–{end} / {totalItems} (Tổng {totalPages} trang)</Typography>
                        <Button size="small" variant="outlined" disabled={page <= 0} onClick={() => setPage((p) => p - 1)} sx={{ minWidth: 36, textTransform: 'none', fontSize: '13px', borderRadius: '8px' }}>Trước</Button>
                        <Button size="small" variant="outlined" disabled={page >= totalPages - 1 || totalItems === 0} onClick={() => setPage((p) => p + 1)} sx={{ minWidth: 36, textTransform: 'none', fontSize: '13px', borderRadius: '8px' }}>Sau</Button>
                    </Box>
                </Box>
            </Box>

            {/* Add Dialog */}
            <Dialog open={addDialogOpen} onClose={() => { if (!addSubmitting) { setAddDialogOpen(false); setAddForm({ specName: '' }); } }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
                <DialogTitle component="span" sx={{ px: 3, py: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography component="span" sx={{ fontWeight: 600, fontSize: '18px' }}>Thêm quy cách đóng gói</Typography>
                    <IconButton onClick={() => { setAddDialogOpen(false); setAddForm({ specName: '' }); }} disabled={addSubmitting} size="small" sx={{ color: 'text.secondary' }}><X size={20} /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 2, pb: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 1 }}>Tên quy cách đóng gói</Typography>
                    <Box component="input" type="text" value={addForm.specName} onChange={(e) => setAddForm({ specName: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} placeholder="Nhập tên quy cách đóng gói" sx={{ width: '100%', border: 'none', outline: 'none', borderBottom: '1px solid rgba(0,0,0,0.1)', pb: 1, fontSize: '14px', '&:focus': { borderBottom: '1px solid #0284c7' }, '&::placeholder': { color: '#9ca3af' } }} />
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1px solid rgba(0,0,0,0.06)', gap: 1.5 }}>
                    <Button onClick={() => { setAddDialogOpen(false); setAddForm({ specName: '' }); }} disabled={addSubmitting} size="small" sx={{ textTransform: 'none', fontWeight: 500, fontSize: '13px', color: 'text.secondary' }}>Hủy</Button>
                    <Button onClick={handleAdd} variant="contained" disabled={addSubmitting || (addForm.specName || '').trim().length < 2} size="small" sx={{ textTransform: 'none', fontWeight: 500, fontSize: '13px', borderRadius: '8px', boxShadow: 'none' }}>Tạo</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onClose={() => { if (!editSubmitting) { setEditDialogOpen(false); setEditForm({ specName: '', isActive: true }); setEditId(null); } }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
                <DialogTitle component="span" sx={{ px: 3, py: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography component="span" sx={{ fontWeight: 600, fontSize: '18px' }}>Sửa quy cách đóng gói</Typography>
                    <IconButton onClick={() => { setEditDialogOpen(false); setEditForm({ specName: '', isActive: true }); setEditId(null); }} disabled={editSubmitting} size="small" sx={{ color: 'text.secondary' }}><X size={20} /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 2, pb: 2.5 }}>
                    {editLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
                    ) : (
                        <>
                            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5 }}>Tên quy cách đóng gói</Typography>
                            <Box component="input" type="text" value={editForm.specName} onChange={(e) => setEditForm((p) => ({ ...p, specName: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(); }} sx={{ width: '100%', border: 'none', outline: 'none', borderBottom: '1px solid rgba(0,0,0,0.1)', pb: 1, fontSize: '14px', mb: 2, '&:focus': { borderBottom: '1px solid #2563eb' } }} />

                            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5 }}>Trạng thái</Typography>
                            <Box component="select" value={String(editForm.isActive)} onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.value === 'true' }))} sx={{ width: '100%', border: 'none', outline: 'none', borderBottom: '1px solid rgba(0,0,0,0.1)', pb: 1, fontSize: '14px', color: editForm.isActive ? '#10b981' : '#ef4444', fontWeight: 500, cursor: 'pointer', '&:focus': { borderBottom: '1px solid #2563eb' } }}>
                                <option value="true" style={{ color: '#10b981' }}>Hoạt động</option>
                                <option value="false" style={{ color: '#ef4444' }}>Ngừng hoạt động</option>
                            </Box>
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1px solid rgba(0,0,0,0.06)', gap: 1.5 }}>
                    <Button onClick={() => { setEditDialogOpen(false); setEditForm({ specName: '', isActive: true }); setEditId(null); }} disabled={editSubmitting} size="small" sx={{ textTransform: 'none', fontWeight: 500, fontSize: '13px', color: 'text.secondary' }}>Hủy</Button>
                    <Button onClick={handleEdit} variant="contained" disabled={editSubmitting || editLoading || (editForm.specName || '').trim().length < 2} size="small" sx={{ textTransform: 'none', fontWeight: 500, fontSize: '13px', borderRadius: '8px', boxShadow: 'none' }}>Lưu</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ViewPackagingSpecList;
