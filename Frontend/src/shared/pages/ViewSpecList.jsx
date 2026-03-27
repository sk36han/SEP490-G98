/*
 * Danh sách Thông số kỹ thuật – Mock data, kết nối API SpecificationController.
 */
import React, { useState, useEffect, useCallback } from 'react';
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
    TextField,
    FormGroup,
} from '@mui/material';
import { Plus, Filter, Columns, Ruler, X, GripVertical } from 'lucide-react';
import SearchInput from '../components/SearchInput';
import CategoryFilterPopup from '../components/CategoryFilterPopup';

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
    { specificationId: 'SPC001', specificationCode: 'SPEC001', specificationName: 'Chiều dài', unit: 'cm', isActive: true, createdAt: '2025-01-15T08:30:00Z' },
    { specificationId: 'SPC002', specificationCode: 'SPEC002', specificationName: 'Chiều rộng', unit: 'cm', isActive: true, createdAt: '2025-01-15T09:00:00Z' },
    { specificationId: 'SPC003', specificationCode: 'SPEC003', specificationName: 'Chiều cao', unit: 'cm', isActive: true, createdAt: '2025-01-15T09:30:00Z' },
    { specificationId: 'SPC004', specificationCode: 'SPEC004', specificationName: 'Trọng lượng', unit: 'kg', isActive: true, createdAt: '2025-01-16T10:00:00Z' },
    { specificationId: 'SPC005', specificationCode: 'SPEC005', specificationName: 'Dung tích', unit: 'L', isActive: false, createdAt: '2025-01-16T11:00:00Z' },
    { specificationId: 'SPC006', specificationCode: 'SPEC006', specificationName: 'Công suất', unit: 'W', isActive: true, createdAt: '2025-01-17T08:00:00Z' },
    { specificationId: 'SPC007', specificationCode: 'SPEC007', specificationName: 'Điện áp', unit: 'V', isActive: true, createdAt: '2025-01-17T09:00:00Z' },
    { specificationId: 'SPC008', specificationCode: 'SPEC008', specificationName: 'Nhiệt độ tối đa', unit: '°C', isActive: true, createdAt: '2025-01-18T10:30:00Z' },
    { specificationId: 'SPC009', specificationCode: 'SPEC009', specificationName: 'Bước sóng', unit: 'nm', isActive: false, createdAt: '2025-01-18T14:00:00Z' },
    { specificationId: 'SPC010', specificationCode: 'SPEC010', specificationName: 'Độ pH', unit: '', isActive: true, createdAt: '2025-01-19T08:30:00Z' },
    { specificationId: 'SPC011', specificationCode: 'SPEC011', specificationName: 'Tốc độ', unit: 'rpm', isActive: true, createdAt: '2025-01-19T15:00:00Z' },
    { specificationId: 'SPC012', specificationCode: 'SPEC012', specificationName: 'Áp suất', unit: 'bar', isActive: true, createdAt: '2025-01-20T09:00:00Z' },
];

const allColumns = [
    { id: 'specificationName', label: 'Tên thông số', sortable: true },
    { id: 'specificationCode', label: 'Mã thông số', sortable: true },
    { id: 'unit', label: 'Đơn vị', sortable: true },
    { id: 'createdAt', label: 'Ngày tạo', sortable: true },
    { id: 'isActive', label: 'Trạng thái', sortable: true },
];

const ViewSpecList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterAnchor, setFilterAnchor] = useState(null);
    const [columnsAnchor, setColumnsAnchor] = useState(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addForm, setAddForm] = useState({ specificationName: '', unit: '' });
    const [addSubmitting, setAddSubmitting] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editSpecId, setEditSpecId] = useState(null);
    const [editForm, setEditForm] = useState({ specificationCode: '', specificationName: '', unit: '', isActive: true, createdAt: '' });
    const [editSubmitting, setEditSubmitting] = useState(false);

    // Column management
    const savedColumnOrder = (() => {
        try {
            const saved = JSON.parse(localStorage.getItem('specColumnOrder') || 'null');
            return saved ? saved.filter(id => allColumns.some(c => c.id === id)) : null;
        } catch { return null; }
    })();
    const savedVisibleColumns = (() => {
        try {
            const saved = JSON.parse(localStorage.getItem('specVisibleColumns') || 'null');
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

    const effectiveColumns = allColumns.filter(c => visibleColumnIds.has(c.id));

    const handleSortRequest = (colId) => {
        if (orderBy === colId) {
            if (order === 'asc') setOrder('desc');
            else { setOrderBy(null); setOrder('asc'); }
        } else {
            setOrderBy(colId);
            setOrder('asc');
        }
    };

    // Drag-drop
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
        localStorage.setItem('specColumnOrder', JSON.stringify(visible));
        localStorage.setItem('specVisibleColumns', JSON.stringify([...visibleColumnIds]));
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
        localStorage.setItem('specColumnOrder', JSON.stringify(newOrder));
        setDraggedColumn(null);
    };
    const handleDragEnd = () => { setDraggedColumn(null); };

    const handleFilterApply = useCallback((values) => {
        setFilterStatus(values.filterStatus ?? 'all');
        setFilterDateFrom(values.fromDate ?? '');
        setFilterDateTo(values.toDate ?? '');
        setPage(0);
    }, []);

    const currentPage = page + 1;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    // Filter + sort + paginate mock data
    const applyFiltersAndSort = useCallback(() => {
        let data = [...MOCK_DATA];

        // Search filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            data = data.filter(item =>
                item.specificationName.toLowerCase().includes(term) ||
                item.specificationCode.toLowerCase().includes(term)
            );
        }

        // Status filter
        if (filterStatus === 'active') {
            data = data.filter(item => item.isActive === true);
        } else if (filterStatus === 'inactive') {
            data = data.filter(item => item.isActive === false);
        }

        // Date filters
        if (filterDateFrom) {
            const from = new Date(filterDateFrom + 'T00:00:00Z').getTime();
            data = data.filter(item => {
                if (!item.createdAt) return false;
                const d = new Date(item.createdAt + (item.createdAt.endsWith('Z') ? '' : 'Z'));
                return d.getTime() >= from;
            });
        }
        if (filterDateTo) {
            const to = new Date(filterDateTo + 'T23:59:59.999Z').getTime();
            data = data.filter(item => {
                if (!item.createdAt) return false;
                const d = new Date(item.createdAt + (item.createdAt.endsWith('Z') ? '' : 'Z'));
                return d.getTime() <= to;
            });
        }

        // Sort
        if (orderBy) {
            data.sort((a, b) => {
                let aVal = a[orderBy];
                let bVal = b[orderBy];
                if (orderBy === 'createdAt') {
                    aVal = aVal ? new Date(aVal + (aVal.endsWith('Z') ? '' : 'Z')) : new Date(0);
                    bVal = bVal ? new Date(bVal + (bVal.endsWith('Z') ? '' : 'Z')) : new Date(0);
                } else if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }
                if (aVal < bVal) return order === 'asc' ? -1 : 1;
                if (aVal > bVal) return order === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [searchTerm, filterStatus, filterDateFrom, filterDateTo, orderBy, order]);

    const fetchList = useCallback(() => {
        setLoading(true);
        setError(null);
        // Simulate async
        setTimeout(() => {
            const filtered = applyFiltersAndSort();
            setTotalItems(filtered.length);
            const start = page * pageSize;
            const paginated = filtered.slice(start, start + pageSize);
            setRows(paginated);
            setLoading(false);
        }, 300);
    }, [page, pageSize, applyFiltersAndSort]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const start = totalItems === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalItems);

    const handleOpenAddSpec = () => {
        setAddForm({ specificationName: '', unit: '' });
        setAddDialogOpen(true);
    };

    const handleAddSpec = () => {
        const name = (addForm.specificationName || '').trim();
        const unit = (addForm.unit || '').trim();
        if (!name) return;
        setAddSubmitting(true);
        const newSpec = {
            specificationId: 'SPC' + String(MOCK_DATA.length + 1).padStart(3, '0'),
            specificationCode: 'SPEC' + String(MOCK_DATA.length + 1).padStart(3, '0'),
            specificationName: name,
            unit: unit,
            isActive: true,
            createdAt: new Date().toISOString(),
        };
        MOCK_DATA.unshift(newSpec);
        setAddDialogOpen(false);
        setAddForm({ specificationName: '', unit: '' });
        setPage(0);
        setTimeout(() => fetchList(), 50);
        setAddSubmitting(false);
    };

    const handleOpenEditSpec = (spec) => {
        setEditSpecId(spec.specificationId);
        setEditForm({
            specificationCode: spec.specificationCode || '',
            specificationName: spec.specificationName || '',
            unit: spec.unit || '',
            isActive: spec.isActive ?? true,
            createdAt: spec.createdAt || '',
        });
        setEditDialogOpen(true);
    };

    const handleEditSpec = () => {
        const name = (editForm.specificationName || '').trim();
        if (!name) return;
        setEditSubmitting(true);
        const idx = MOCK_DATA.findIndex(s => s.specificationId === editSpecId);
        if (idx !== -1) {
            MOCK_DATA[idx] = {
                ...MOCK_DATA[idx],
                specificationName: name,
                unit: editForm.unit,
                isActive: editForm.isActive,
            };
        }
        setEditDialogOpen(false);
        setEditSpecId(null);
        setEditForm({ specificationCode: '', specificationName: '', unit: '', isActive: true, createdAt: '' });
        setTimeout(() => fetchList(), 50);
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
                    Thông số kỹ thuật
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}
                >
                    Specification
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
                                placeholder="Tìm kiếm theo mã, tên thông số..."
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
                            onClick={handleOpenAddSpec}
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
                            Thêm thông số
                        </Button>
                    </Box>

                    {/* Filter Popup */}
                    <CategoryFilterPopup
                        open={Boolean(filterAnchor)}
                        onClose={() => setFilterAnchor(null)}
                        initialValues={{
                            isActive: filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : null,
                            fromDate: filterDateFrom,
                            toDate: filterDateTo,
                        }}
                        onApply={handleFilterApply}
                    />

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
                            <FormGroup>
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
                            </FormGroup>
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
                                <Typography variant="body2">Đang tải danh sách thông số…</Typography>
                            </Box>
                        ) : error ? (
                            /* Error State */
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
                        ) : rows.length === 0 ? (
                            /* Empty State */
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
                                <Ruler size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <Typography>Chưa có dữ liệu thông số kỹ thuật</Typography>
                            </Box>
                        ) : (
                            /* Table */
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
                                        {rows.map((s, index) => (
                                            <TableRow
                                                key={s.specificationId}
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
                                                {columnOrder.filter(id => visibleColumnIds.has(id)).map((colId) => {
                                                    return (
                                                        <TableCell
                                                            key={colId}
                                                            sx={{ ...bodyCellBaseSx }}
                                                        >
                                                            {colId === 'specificationCode' && (
                                                                <Typography sx={{ fontSize: '13px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {s.specificationCode || '—'}
                                                                </Typography>
                                                            )}
                                                            {colId === 'specificationName' && (
                                                                <Box
                                                                    component="button"
                                                                    onClick={() => handleOpenEditSpec(s)}
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
                                                                    title={s.specificationName}
                                                                >
                                                                    {s.specificationName}
                                                                </Box>
                                                            )}
                                                            {colId === 'unit' && (
                                                                <Typography sx={{ fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {s.unit || '—'}
                                                                </Typography>
                                                            )}
                                                            {colId === 'createdAt' && (
                                                                <Typography sx={{ fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {s.createdAt ? (() => { const d = new Date(s.createdAt + (s.createdAt.endsWith('Z') ? '' : 'Z')); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); })() : '—'}
                                                                </Typography>
                                                            )}
                                                            {colId === 'isActive' && (
                                                                <Chip
                                                                    label={s.isActive ? '• Hoạt động' : '• Tạm dừng'}
                                                                    size="small"
                                                                    sx={{
                                                                        fontWeight: 500,
                                                                        fontSize: '12px',
                                                                        lineHeight: '16px',
                                                                        borderRadius: '999px',
                                                                        minWidth: 100,
                                                                        height: '26px',
                                                                        bgcolor: s.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)',
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
                            {start}–{end} / {totalItems} (Tổng {totalPages} trang)
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
                            disabled={page >= totalPages - 1 || totalItems === 0}
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

            {/* Add Spec Dialog */}
            <Dialog
                open={addDialogOpen}
                onClose={() => {
                    setAddDialogOpen(false);
                    setAddForm({ specificationName: '', unit: '' });
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
                        Thêm thông số
                    </Typography>
                    <IconButton
                        onClick={() => {
                            setAddDialogOpen(false);
                            setAddForm({ specificationName: '', unit: '' });
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
                        Tên thông số
                    </Typography>
                    <Box
                        component="input"
                        type="text"
                        value={addForm.specificationName}
                        onChange={(e) => setAddForm({ ...addForm, specificationName: e.target.value })}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleAddSpec();
                            }
                        }}
                        placeholder="Nhập tên thông số"
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

                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 500,
                            fontSize: '12px',
                            color: 'text.secondary',
                            display: 'block',
                            mb: 1,
                            mt: 2.5,
                        }}
                    >
                        Đơn vị
                    </Typography>
                    <Box
                        component="input"
                        type="text"
                        value={addForm.unit}
                        onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleAddSpec();
                            }
                        }}
                        placeholder="Nhập đơn vị (VD: cm, kg, L)"
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
                            setAddForm({ specificationName: '', unit: '' });
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
                        onClick={handleAddSpec}
                        variant="contained"
                        disabled={addSubmitting || !addForm.specificationName.trim()}
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

            {/* Edit Spec Dialog */}
            <Dialog
                open={editDialogOpen}
                onClose={() => {
                    setEditDialogOpen(false);
                    setEditForm({ specificationCode: '', specificationName: '', unit: '', isActive: true, createdAt: '' });
                    setEditSpecId(null);
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
                        Sửa thông số
                    </Typography>
                    <IconButton
                        onClick={() => {
                            setEditDialogOpen(false);
                            setEditForm({ specificationCode: '', specificationName: '', unit: '', isActive: true, createdAt: '' });
                            setEditSpecId(null);
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
                    {/* Mã thông số */}
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
                        Mã thông số
                    </Typography>
                    <Box sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.06)', pb: 1, mb: 2 }}>
                        <Typography sx={{ fontSize: '14px', color: '#6b7280' }}>
                            {editForm.specificationCode || '—'}
                        </Typography>
                    </Box>

                    {/* Tên thông số */}
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
                        Tên thông số
                    </Typography>
                    <Box
                        component="input"
                        type="text"
                        value={editForm.specificationName}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, specificationName: e.target.value }))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleEditSpec();
                            }
                        }}
                        placeholder="Nhập tên thông số"
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

                    {/* Đơn vị */}
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
                        Đơn vị
                    </Typography>
                    <Box sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.06)', pb: 1, mb: 2 }}>
                        <Typography sx={{ fontSize: '14px', color: '#6b7280' }}>
                            {editForm.unit || '—'}
                        </Typography>
                    </Box>

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
                                ? (() => { const d = new Date(editForm.createdAt + (editForm.createdAt.endsWith('Z') ? '' : 'Z')); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); })()
                                : '—'}
                        </Typography>
                    </Box>
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
                            setEditForm({ specificationCode: '', specificationName: '', unit: '', isActive: true, createdAt: '' });
                            setEditSpecId(null);
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
                        onClick={handleEditSpec}
                        variant="contained"
                        disabled={editSubmitting || !editForm.specificationName.trim()}
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

export default ViewSpecList;
