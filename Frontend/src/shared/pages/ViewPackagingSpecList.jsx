/*
 * Danh sách Quy cách đóng gói – mock data.
 */
import React, { useState, useCallback } from 'react';
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

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

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

// Mock data
const MOCK_DATA = [
    { packagingSpecId: 1, packagingSpecCode: 'PKG001', packagingSpecName: 'Thùng carton 10kg', isActive: true, createdAt: '2024-01-15T08:30:00Z' },
    { packagingSpecId: 2, packagingSpecCode: 'PKG002', packagingSpecName: 'Túi nilon 1kg', isActive: true, createdAt: '2024-01-20T09:15:00Z' },
    { packagingSpecId: 3, packagingSpecCode: 'PKG003', packagingSpecName: 'Hộp giấy 500g', isActive: false, createdAt: '2024-02-03T14:00:00Z' },
    { packagingSpecId: 4, packagingSpecCode: 'PKG004', packagingSpecName: 'Thùng gỗ 25kg', isActive: true, createdAt: '2024-02-10T11:45:00Z' },
    { packagingSpecId: 5, packagingSpecCode: 'PKG005', packagingSpecName: 'Túi vải 5kg', isActive: true, createdAt: '2024-02-18T16:20:00Z' },
    { packagingSpecId: 6, packagingSpecCode: 'PKG006', packagingSpecName: 'Hộp nhựa 2kg', isActive: false, createdAt: '2024-03-05T10:00:00Z' },
    { packagingSpecId: 7, packagingSpecCode: 'PKG007', packagingSpecName: 'Bao bì chân không 10kg', isActive: true, createdAt: '2024-03-12T13:30:00Z' },
    { packagingSpecId: 8, packagingSpecCode: 'PKG008', packagingSpecName: 'Thùng xốp 5kg', isActive: true, createdAt: '2024-03-20T08:00:00Z' },
    { packagingSpecId: 9, packagingSpecCode: 'PKG009', packagingSpecName: 'Hộp carton A4', isActive: false, createdAt: '2024-04-01T09:30:00Z' },
    { packagingSpecId: 10, packagingSpecCode: 'PKG010', packagingSpecName: 'Túi giấy 500g', isActive: true, createdAt: '2024-04-08T15:15:00Z' },
    { packagingSpecId: 11, packagingSpecCode: 'PKG011', packagingSpecName: 'Thùng nhựa 20kg', isActive: true, createdAt: '2024-04-15T10:45:00Z' },
    { packagingSpecId: 12, packagingSpecCode: 'PKG012', packagingSpecName: 'Bao bì zip 1kg', isActive: false, createdAt: '2024-04-22T14:20:00Z' },
];

const ViewPackagingSpecList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [rows, setRows] = useState(MOCK_DATA);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(MOCK_DATA.length);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterAnchor, setFilterAnchor] = useState(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addForm, setAddForm] = useState({ packagingSpecName: '' });
    const [addSubmitting, setAddSubmitting] = useState(false);
    const [columnsAnchor, setColumnsAnchor] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editPackagingSpecId, setEditPackagingSpecId] = useState(null);
    const [editForm, setEditForm] = useState({ packagingSpecCode: '', packagingSpecName: '', isActive: true, createdAt: '' });
    const [editLoading, setEditLoading] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);

    // Column management
    const allColumns = [
        { id: 'packagingSpecName', label: 'Tên quy cách', sortable: true },
        { id: 'isActive', label: 'Trạng thái', sortable: true },
        { id: 'createdAt', label: 'Ngày tạo', sortable: true },
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
        setVisibleColumnIds(prev => new Set([...prev]));
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
            if (checked) next.add(colId); else next.delete(colId);
            return next;
        });
    };
    const handleSelectAllColumns = (checked) => {
        if (checked) setVisibleColumnIds(new Set(allColumns.map(c => c.id)));
        else setVisibleColumnIds(new Set());
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

    const handleFilterApply = useCallback((values) => {
        setFilterStatus(values.isActive === true ? 'active' : values.isActive === false ? 'inactive' : 'all');
        setFilterDateFrom(values.fromDate ?? '');
        setFilterDateTo(values.toDate ?? '');
        setPage(0);
    }, []);

    const fetchList = useCallback(() => {
        setLoading(false);
    }, []);

    const currentPage = page + 1;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    // Filter logic
    const filteredRows = (() => {
        let result = [...MOCK_DATA];

        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            result = result.filter(r =>
                (r.packagingSpecCode || '').toLowerCase().includes(term) ||
                (r.packagingSpecName || '').toLowerCase().includes(term)
            );
        }

        if (filterStatus === 'active') {
            result = result.filter(r => r.isActive === true);
        } else if (filterStatus === 'inactive') {
            result = result.filter(r => r.isActive === false);
        }

        if (filterDateFrom) {
            const from = new Date(filterDateFrom + 'T00:00:00Z').getTime();
            result = result.filter(r => {
                if (!r.createdAt) return false;
                const d = new Date(r.createdAt + (r.createdAt.endsWith('Z') ? '' : 'Z'));
                return d.getTime() >= from;
            });
        }
        if (filterDateTo) {
            const to = new Date(filterDateTo + 'T23:59:59.999Z').getTime();
            result = result.filter(r => {
                if (!r.createdAt) return false;
                const d = new Date(r.createdAt + (r.createdAt.endsWith('Z') ? '' : 'Z'));
                return d.getTime() <= to;
            });
        }

        // Sort
        if (orderBy) {
            result.sort((a, b) => {
                let aVal = a[orderBy];
                let bVal = b[orderBy];
                if (orderBy === 'createdAt') {
                    aVal = aVal ? new Date(aVal + (aVal.endsWith('Z') ? '' : 'Z')).getTime() : 0;
                    bVal = bVal ? new Date(bVal + (bVal.endsWith('Z') ? '' : 'Z')).getTime() : 0;
                } else {
                    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
                }
                if (aVal < bVal) return order === 'asc' ? -1 : 1;
                if (aVal > bVal) return order === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    })();

    const paginatedRows = filteredRows.slice(page * pageSize, (page + 1) * pageSize);
    const start = filteredRows.length === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, filteredRows.length);

    const handleOpenEdit = (p) => {
        setEditPackagingSpecId(p.packagingSpecId);
        setEditLoading(true);
        setEditDialogOpen(true);
        setEditForm({
            packagingSpecCode: p.packagingSpecCode || '',
            packagingSpecName: p.packagingSpecName || '',
            isActive: p.isActive ?? true,
            createdAt: p.createdAt || '',
        });
        setEditLoading(false);
    };

    const handleAddPackagingSpec = () => {
        const name = (addForm.packagingSpecName || '').trim();
        if (!name || name.length < 2) return;
        setAddSubmitting(true);
        const newId = Math.max(...MOCK_DATA.map(r => r.packagingSpecId)) + 1;
        const newCode = 'PKG' + String(newId).padStart(3, '0');
        const newRow = {
            packagingSpecId: newId,
            packagingSpecCode: newCode,
            packagingSpecName: name,
            isActive: true,
            createdAt: new Date().toISOString(),
        };
        setRows(prev => [newRow, ...prev]);
        setAddDialogOpen(false);
        setAddForm({ packagingSpecName: '' });
        setAddSubmitting(false);
    };

    const handleEditPackagingSpec = () => {
        const name = (editForm.packagingSpecName || '').trim();
        if (!name || name.length < 2) return;
        setEditSubmitting(true);
        setRows(prev => prev.map(r =>
            r.packagingSpecId === editPackagingSpecId
                ? { ...r, packagingSpecName: name, isActive: editForm.isActive }
                : r
        ));
        setEditDialogOpen(false);
        setEditForm({ packagingSpecCode: '', packagingSpecName: '', isActive: true, createdAt: '' });
        setEditPackagingSpecId(null);
        setEditSubmitting(false);
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
            {/* Page Header */}
            <Box
                sx={{
                    flexShrink: 0,
                    px: { xs: 2, sm: 2 },
                    py: 2.5,
                    bgcolor: '#fafafa',
                }}
            >
                <Typography
                    variant="h5"
                    component="h1"
                    fontWeight="600"
                    sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}
                >
                    Quy cách đóng gói
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}
                >
                    Packaging Specification
                </Typography>
            </Box>

            {/* Body */}
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
                {/* Outer White Container */}
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
                    {/* Filter Toolbar */}
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
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1, minWidth: 0 }}>
                            <SearchInput
                                placeholder="Tìm kiếm theo mã, tên quy cách..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setPage(0);
                                }}
                                sx={{
                                    flex: 1,
                                    minWidth: isMobile ? '100%' : 200,
                                    maxWidth: isMobile ? '100%' : 480,
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

                            <Tooltip title="Bộ lọc">
                                <IconButton
                                    color="primary"
                                    onClick={(e) => setFilterAnchor(e.currentTarget)}
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

                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton
                                    color="primary"
                                    onClick={(e) => setColumnsAnchor(e.currentTarget)}
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

                        <Button
                            className="list-page-btn"
                            variant="contained"
                            startIcon={<Plus size={18} />}
                            onClick={() => setAddDialogOpen(true)}
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
                            Thêm quy cách
                        </Button>
                    </Box>

                    {/* Filter Popup */}
                    <Popover
                        open={Boolean(filterAnchor)}
                        anchorEl={filterAnchor}
                        onClose={() => setFilterAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                        slotProps={{
                            paper: {
                                elevation: 0,
                                sx: {
                                    mt: 1,
                                    width: 340,
                                    borderRadius: '14px',
                                    border: '1px solid rgba(0, 0, 0, 0.08)',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
                                    overflow: 'hidden',
                                },
                            },
                        }}
                    >
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>
                                Bộ lọc
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setFilterAnchor(null);
                                    }}
                                    sx={{ textTransform: 'none', fontSize: '13px', fontWeight: 500, color: '#6b7280' }}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    size="small"
                                    onClick={() => {
                                        handleFilterApply({
                                            isActive: filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : null,
                                            fromDate: filterDateFrom,
                                            toDate: filterDateTo,
                                        });
                                        setFilterAnchor(null);
                                    }}
                                    sx={{ textTransform: 'none', fontSize: '13px', fontWeight: 500, color: '#0284c7' }}
                                >
                                    Áp dụng
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ px: 2.5, py: 2 }}>
                            {/* Status */}
                            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                Trạng thái
                            </Typography>
                            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                <Select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    sx={{
                                        fontSize: '13px',
                                        borderRadius: '8px',
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#e5e7eb',
                                        },
                                    }}
                                >
                                    <MenuItem value="all" sx={{ fontSize: '13px' }}>Tất cả</MenuItem>
                                    <MenuItem value="active" sx={{ fontSize: '13px' }}>Hoạt động</MenuItem>
                                    <MenuItem value="inactive" sx={{ fontSize: '13px' }}>Tắt</MenuItem>
                                </Select>
                            </FormControl>

                            {/* Date From */}
                            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                Từ ngày
                            </Typography>
                            <Box
                                component="input"
                                type="date"
                                value={filterDateFrom}
                                onChange={(e) => setFilterDateFrom(e.target.value)}
                                sx={{
                                    width: '100%',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    px: 1.5,
                                    py: 0.75,
                                    fontSize: '13px',
                                    color: '#374151',
                                    bgcolor: '#ffffff',
                                    outline: 'none',
                                    mb: 2,
                                    boxSizing: 'border-box',
                                    '&:focus': {
                                        borderColor: '#3b82f6',
                                        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                                    },
                                }}
                            />

                            {/* Date To */}
                            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '12px', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                Đến ngày
                            </Typography>
                            <Box
                                component="input"
                                type="date"
                                value={filterDateTo}
                                onChange={(e) => setFilterDateTo(e.target.value)}
                                sx={{
                                    width: '100%',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    px: 1.5,
                                    py: 0.75,
                                    fontSize: '13px',
                                    color: '#374151',
                                    bgcolor: '#ffffff',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    '&:focus': {
                                        borderColor: '#3b82f6',
                                        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                                    },
                                }}
                            />
                        </Box>
                    </Popover>

                    {/* Columns Popover */}
                    <Popover
                        open={Boolean(columnsAnchor)}
                        anchorEl={columnsAnchor}
                        onClose={handleCancelColumnOrder}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
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
                                },
                            },
                        }}
                    >
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>
                                Chọn cột & Sắp xếp
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button size="small" onClick={handleCancelColumnOrder} sx={{ textTransform: 'none', fontSize: '13px', fontWeight: 500, color: '#6b7280' }}>
                                    Hủy
                                </Button>
                                <Button size="small" onClick={handleSaveColumnOrder} sx={{ textTransform: 'none', fontSize: '13px', fontWeight: 500, color: '#0284c7' }}>
                                    Lưu
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ px: 2.5, py: 2, flex: 1, minHeight: 0, overflowY: 'auto', '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-track': { bgcolor: 'transparent' }, '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px', '&:hover': { bgcolor: '#9ca3af' } } }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={visibleColumnIds.size === allColumns.length}
                                        indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < allColumns.length}
                                        onChange={(e) => handleSelectAllColumns(e.target.checked)}
                                        sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' }, '&.MuiCheckbox-indeterminate': { color: '#3b82f6' } }}
                                    />
                                }
                                label={<Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Tất cả</Typography>}
                                sx={{ mb: 1, py: 0.5 }}
                            />
                            {allColumns.map((col) => (
                                <Box
                                    key={col.id}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        bgcolor: draggedColumn === col.id ? '#f9fafb' : 'transparent',
                                        opacity: draggedColumn === col.id ? 0.5 : 1,
                                        transition: 'all 0.2s',
                                        borderRadius: '8px',
                                        px: 0.75,
                                        py: 0.25,
                                        cursor: 'grab',
                                        '&:hover': { bgcolor: '#f9fafb' },
                                    }}
                                    draggable
                                    onDragStart={(e) => handlePopupDragStart(e, col.id)}
                                    onDragOver={handlePopupDragOver}
                                    onDrop={(e) => handlePopupDrop(e, col.id)}
                                    onDragEnd={handlePopupDragEnd}
                                >
                                    <Box sx={{ cursor: 'grab', color: '#9ca3af', display: 'flex', alignItems: 'center', '&:hover': { color: '#6b7280' } }}>
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
                        </Box>
                    </Popover>

                    {/* Table */}
                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            minWidth: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* Loading State */}
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
                                <Typography variant="body2">Đang tải danh sách quy cách đóng gói…</Typography>
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
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => fetchList()}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Thử lại
                                </Button>
                            </Box>
                        ) : paginatedRows.length === 0 ? (
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
                                <Typography>Chưa có dữ liệu quy cách đóng gói</Typography>
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
                                    <TableHead>
                                        <TableRow>
                                            <TableCell
                                                sx={{
                                                    ...headCellBaseSx,
                                                    width: 56,
                                                    minWidth: 56,
                                                    maxWidth: 56,
                                                    textAlign: 'center',
                                                }}
                                            >
                                                STT
                                            </TableCell>
                                            {/* PackagingSpecCode column - always visible */}
                                            <TableCell
                                                sx={{
                                                    ...headCellBaseSx,
                                                    width: 160,
                                                    minWidth: 160,
                                                }}
                                            >
                                                Mã quy cách
                                            </TableCell>
                                            {columnOrder.filter(id => visibleColumnIds.has(id)).map((colId) => {
                                                const col = allColumns.find(c => c.id === colId);
                                                if (!col) return null;
                                                return (
                                                    <TableCell
                                                        key={colId}
                                                        draggable
                                                        onDragStart={(e) => {
                                                            e.stopPropagation();
                                                            handleDragStart(e, colId);
                                                        }}
                                                        onDragEnd={(e) => {
                                                            e.stopPropagation();
                                                            handleDragEnd();
                                                        }}
                                                        onDragOver={handleDragOver}
                                                        onDrop={(e) => handleDrop(e, colId)}
                                                        sortDirection={orderBy === colId ? order : false}
                                                        sx={{
                                                            ...headCellBaseSx,
                                                            cursor: 'grab',
                                                            userSelect: 'none',
                                                            opacity: draggedColumn === colId ? 0.5 : 1,
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 0.5,
                                                                minWidth: 0,
                                                                width: '100%',
                                                            }}
                                                        >
                                                            <GripVertical size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                                                            {col.sortable ? (
                                                                <TableSortLabel
                                                                    active={orderBy === colId}
                                                                    direction={orderBy === colId ? order : 'asc'}
                                                                    onClick={() => handleSortRequest(colId)}
                                                                    hideSortIcon={false}
                                                                    sx={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        minWidth: 0,
                                                                        flex: 1,
                                                                        '& .MuiTableSortLabel-icon': {
                                                                            fontSize: '14px',
                                                                            opacity: orderBy === colId ? 1 : 0,
                                                                        },
                                                                    }}
                                                                >
                                                                    <Box
                                                                        component="span"
                                                                        sx={{
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                        }}
                                                                    >
                                                                        {col.label}
                                                                    </Box>
                                                                </TableSortLabel>
                                                            ) : (
                                                                <Typography
                                                                    variant="inherit"
                                                                    sx={{
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                        flex: 1,
                                                                    }}
                                                                >
                                                                    {col.label}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {paginatedRows.map((p, index) => (
                                            <TableRow
                                                key={p.packagingSpecId}
                                                hover
                                                sx={{
                                                    height: 52,
                                                    '&:hover': { bgcolor: '#f9fafb' },
                                                }}
                                            >
                                                <TableCell
                                                    align="center"
                                                    sx={{
                                                        ...bodyCellBaseSx,
                                                        width: 56,
                                                        minWidth: 56,
                                                        maxWidth: 56,
                                                    }}
                                                >
                                                    {page * pageSize + index + 1}
                                                </TableCell>
                                                {/* PackagingSpecCode - always visible, readonly */}
                                                <TableCell
                                                    sx={{
                                                        ...bodyCellBaseSx,
                                                        width: 160,
                                                        minWidth: 160,
                                                        color: '#6b7280',
                                                    }}
                                                >
                                                    {p.packagingSpecCode || '—'}
                                                </TableCell>
                                                {columnOrder.filter(id => visibleColumnIds.has(id)).map((colId) => {
                                                    return (
                                                        <TableCell
                                                            key={colId}
                                                            sx={{ ...bodyCellBaseSx }}
                                                        >
                                                            {colId === 'packagingSpecName' && (
                                                                <Box
                                                                    component="button"
                                                                    onClick={() => handleOpenEdit(p)}
                                                                    sx={{
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                        width: '100%',
                                                                        display: 'block',
                                                                        fontSize: '13px',
                                                                        textAlign: 'left',
                                                                        color: '#2563eb',
                                                                        cursor: 'pointer',
                                                                        bgcolor: 'transparent',
                                                                        border: 'none',
                                                                        p: 0,
                                                                        fontFamily: 'inherit',
                                                                        '&:hover': { color: '#1d4ed8' },
                                                                    }}
                                                                    title={p.packagingSpecName}
                                                                >
                                                                    {p.packagingSpecName}
                                                                </Box>
                                                            )}
                                                            {colId === 'createdAt' && (p.createdAt ? (p.createdAt ? (() => { const d = new Date(p.createdAt + (p.createdAt.endsWith('Z') ? '' : 'Z')); return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); })() : '-') : '—')}
                                                            {colId === 'isActive' && (
                                                                <Chip
                                                                    label={p.isActive ? '• Hoạt động' : '• Tạm dừng'}
                                                                    size="small"
                                                                    sx={{
                                                                        fontWeight: 500,
                                                                        fontSize: '12px',
                                                                        lineHeight: '16px',
                                                                        borderRadius: '999px',
                                                                        minWidth: 100,
                                                                        height: '26px',
                                                                        bgcolor: p.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                                                                        color: '#374151',
                                                                        border: 'none',
                                                                        boxShadow: 'none',
                                                                        '& .MuiChip-label': { px: 1.5, py: 0, textAlign: 'left' },
                                                                    }}
                                                                />
                                                            )}
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

                    {/* Pagination Footer */}
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
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(0);
                                }}
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
                            {start}–{end} / {filteredRows.length} (Tổng {totalPages} trang)
                        </Typography>

                        <Button
                            size="small"
                            variant="outlined"
                            disabled={page <= 0}
                            onClick={() => setPage((p) => p - 1)}
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
                            disabled={page >= totalPages - 1 || filteredRows.length === 0}
                            onClick={() => setPage((p) => p + 1)}
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
            </Box>

            {/* Add PackagingSpec Dialog */}
            <Dialog
                open={addDialogOpen}
                onClose={() => {
                    setAddDialogOpen(false);
                    setAddForm({ packagingSpecName: '' });
                }}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '14px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        px: 3,
                        py: 2.5,
                        borderBottom: '1px solid',
                        borderColor: 'rgba(0, 0, 0, 0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 600,
                            fontSize: '18px',
                            color: 'text.primary',
                        }}
                    >
                        Thêm quy cách đóng gói
                    </Typography>
                    <IconButton
                        onClick={() => {
                            setAddDialogOpen(false);
                            setAddForm({ packagingSpecName: '' });
                        }}
                        size="small"
                        sx={{
                            color: 'text.secondary',
                            '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.04)',
                            },
                        }}
                    >
                        <X size={20} />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ px: 3, pt: 2, pb: 2.5 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 500,
                            fontSize: '12px',
                            color: 'text.secondary',
                            display: 'block',
                            mb: 1,
                            mt: 1,
                        }}
                    >
                        Tên quy cách đóng gói
                    </Typography>
                    <Box
                        component="input"
                        type="text"
                        value={addForm.packagingSpecName}
                        onChange={(e) => setAddForm({ packagingSpecName: e.target.value })}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleAddPackagingSpec();
                            }
                        }}
                        placeholder="Nhập tên quy cách đóng gói"
                        sx={{
                            width: '100%',
                            border: 'none',
                            outline: 'none',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                            pb: 1,
                            fontSize: '14px',
                            color: 'text.primary',
                            bgcolor: 'transparent',
                            '&:focus': {
                                borderBottom: '1px solid #0284c7',
                            },
                            '&::placeholder': {
                                color: '#9ca3af',
                                fontSize: '14px',
                            },
                        }}
                    />
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 3,
                        py: 2.5,
                        borderTop: '1px solid',
                        borderColor: 'rgba(0, 0, 0, 0.06)',
                        gap: 1.5,
                    }}
                >
                    <Button
                        onClick={() => {
                            setAddDialogOpen(false);
                            setAddForm({ packagingSpecName: '' });
                        }}
                        size="small"
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '13px',
                            color: 'text.secondary',
                            px: 2,
                            '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.04)',
                            },
                        }}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleAddPackagingSpec}
                        variant="contained"
                        disabled={addSubmitting}
                        size="small"
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '13px',
                            px: 3,
                            py: 0.75,
                            borderRadius: '8px',
                            boxShadow: 'none',
                            '&:hover': {
                                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.24)',
                            },
                        }}
                    >
                        Tạo
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit PackagingSpec Dialog */}
            <Dialog
                open={editDialogOpen}
                onClose={() => {
                    setEditDialogOpen(false);
                    setEditForm({ packagingSpecCode: '', packagingSpecName: '', isActive: true, createdAt: '' });
                    setEditPackagingSpecId(null);
                }}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '14px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        px: 3,
                        py: 2.5,
                        borderBottom: '1px solid',
                        borderColor: 'rgba(0, 0, 0, 0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 600,
                            fontSize: '18px',
                            color: 'text.primary',
                        }}
                    >
                        Sửa quy cách đóng gói
                    </Typography>
                    <IconButton
                        onClick={() => {
                            setEditDialogOpen(false);
                            setEditForm({ packagingSpecCode: '', packagingSpecName: '', isActive: true, createdAt: '' });
                            setEditPackagingSpecId(null);
                        }}
                        size="small"
                        sx={{
                            color: 'text.secondary',
                            '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.04)',
                            },
                        }}
                    >
                        <X size={20} />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ px: 3, pt: 2, pb: 2.5 }}>
                    {editLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        <>
                            {/* Mã quy cách đóng gói */}
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 500,
                                    fontSize: '12px',
                                    color: 'text.secondary',
                                    display: 'block',
                                    mb: 0.5,
                                    mt: 1,
                                }}
                            >
                                Mã quy cách
                            </Typography>
                            <Box sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.06)', pb: 1, mb: 2 }}>
                                <Typography sx={{ fontSize: '14px', color: '#6b7280' }}>
                                    {editForm.packagingSpecCode || '—'}
                                </Typography>
                            </Box>

                            {/* Tên quy cách đóng gói */}
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 500,
                                    fontSize: '12px',
                                    color: 'text.secondary',
                                    display: 'block',
                                    mb: 0.5,
                                }}
                            >
                                Tên quy cách đóng gói
                            </Typography>
                            <Box
                                component="input"
                                type="text"
                                value={editForm.packagingSpecName}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, packagingSpecName: e.target.value }))}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleEditPackagingSpec();
                                    }
                                }}
                                placeholder="Nhập tên quy cách đóng gói"
                                sx={{
                                    width: '100%',
                                    border: 'none',
                                    outline: 'none',
                                    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                                    pb: 1,
                                    fontSize: '14px',
                                    color: '#374151',
                                    bgcolor: 'transparent',
                                    mb: 2,
                                    '&:focus': {
                                        borderBottom: '1px solid #2563eb',
                                    },
                                    '&::placeholder': {
                                        color: '#9ca3af',
                                        fontSize: '14px',
                                    },
                                }}
                            />

                            {/* Trạng thái */}
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 500,
                                    fontSize: '12px',
                                    color: 'text.secondary',
                                    display: 'block',
                                    mb: 0.5,
                                }}
                            >
                                Trạng thái
                            </Typography>
                            <Box
                                component="select"
                                value={editForm.isActive}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.value === 'true' }))}
                                sx={{
                                    width: '100%',
                                    border: 'none',
                                    outline: 'none',
                                    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                                    pb: 1,
                                    mb: 2,
                                    fontSize: '14px',
                                    color: editForm.isActive ? '#10b981' : '#ef4444',
                                    fontWeight: 500,
                                    bgcolor: 'transparent',
                                    cursor: 'pointer',
                                    '&:focus': {
                                        borderBottom: '1px solid #2563eb',
                                    },
                                }}
                            >
                                <option value="true" style={{ color: '#10b981' }}>Hoạt động</option>
                                <option value="false" style={{ color: '#ef4444' }}>Ngừng hoạt động</option>
                            </Box>

                            {/* Ngày tạo */}
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 500,
                                    fontSize: '12px',
                                    color: 'text.secondary',
                                    display: 'block',
                                    mb: 0.5,
                                }}
                            >
                                Ngày tạo
                            </Typography>
                            <Box
                                sx={{
                                    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                                    pb: 1,
                                }}
                            >
                                <Typography sx={{ fontSize: '14px', color: '#374151' }}>
                                    {editForm.createdAt
                                        ? new Date(editForm.createdAt).toLocaleDateString('vi-VN', {
                                              day: '2-digit',
                                              month: '2-digit',
                                              year: 'numeric',
                                          })
                                        : '—'}
                                </Typography>
                            </Box>
                        </>
                    )}
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 3,
                        py: 2.5,
                        borderTop: '1px solid',
                        borderColor: 'rgba(0, 0, 0, 0.06)',
                        gap: 1.5,
                    }}
                >
                    <Button
                        onClick={() => {
                            setEditDialogOpen(false);
                            setEditForm({ packagingSpecCode: '', packagingSpecName: '', isActive: true, createdAt: '' });
                            setEditPackagingSpecId(null);
                        }}
                        size="small"
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '13px',
                            color: 'text.secondary',
                            px: 2,
                            '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.04)',
                            },
                        }}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleEditPackagingSpec}
                        variant="contained"
                        disabled={editSubmitting || editLoading}
                        size="small"
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '13px',
                            px: 3,
                            py: 0.75,
                            borderRadius: '8px',
                            boxShadow: 'none',
                            '&:hover': {
                                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.24)',
                            },
                        }}
                    >
                        Lưu
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ViewPackagingSpecList;
