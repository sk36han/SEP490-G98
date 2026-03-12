/*
 * Danh sách Đơn vị tính – kết nối API UnitOfMeasure.
 * Cột: STT, Mã đơn vị tính, Tên đơn vị tính, Trạng thái, Hành động.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Chip,
    useTheme,
    useMediaQuery,
    Popover,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Alert,
    Tooltip,
    FormControl,
    Select,
    MenuItem,
    Paper,
    TableSortLabel,
} from '@mui/material';
import { Plus, Edit3, RefreshCw, Filter, Power, GripVertical, FileText } from 'lucide-react';
import '../styles/ListView.css';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import UomFormDialog from '../components/UomFormDialog';
import { getUomList, createUom, updateUom, toggleUomStatus } from '../lib/uomService';
import { removeDiacritics } from '../utils/stringUtils';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const UOM_COLUMNS = [
    { id: 'stt', label: 'STT', sortable: false, getValue: (row, index, { pageNumber, pageSize }) => (pageNumber - 1) * pageSize + index + 1 },
    { id: 'uomName', label: 'Tên đơn vị tính', sortable: true, getValue: (row) => row.uomName ?? '' },
    { id: 'isActive', label: 'Trạng thái', sortable: true, getValue: (row) => row.isActive },
];

const DEFAULT_VISIBLE_COLUMN_IDS = UOM_COLUMNS.map((c) => c.id);
const SORTABLE_COLUMN_IDS = UOM_COLUMNS.filter((c) => c.sortable).map((c) => c.id);

const ViewUomList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const canManage = permissionRole === 'WAREHOUSE_KEEPER';

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const [showOnlyActive, setShowOnlyActive] = useState(false);

    // Column visibility and ordering
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(DEFAULT_VISIBLE_COLUMN_IDS));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [columnOrder, setColumnOrder] = useState(() => {
        const saved = localStorage.getItem('uomColumnOrder');
        return saved ? JSON.parse(saved) : UOM_COLUMNS.map(c => c.id);
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);

    // Sorting
    const [orderBy, setOrderBy] = useState(null);
    const [order, setOrder] = useState('asc');
    const [sortConfig, setSortConfig] = useState(() => {
        const saved = localStorage.getItem('uomSortConfig');
        return saved ? JSON.parse(saved) : { orderBy: null, order: 'asc' };
    });

    // Selection
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Dialog state
    const [uomDialogOpen, setUomDialogOpen] = useState(false);
    const [uomDialogMode, setUomDialogMode] = useState('create');
    const [uomEditRow, setUomEditRow] = useState(null);

    // Initialize sort from saved config
    useEffect(() => {
        if (sortConfig.orderBy) {
            setOrderBy(sortConfig.orderBy);
            setOrder(sortConfig.order);
        }
    }, []);

    const currentPage = page + 1;
    const totalPages = pageSize > 0 ? Math.max(0, Math.ceil(totalItems / pageSize)) : 0;

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getUomList({
                page: currentPage,
                pageSize,
                keyword: searchTerm.trim() || undefined,
                isActive: showOnlyActive ? true : undefined,
            });
            setRows(result.items ?? []);
            setTotalItems(result.totalItems ?? 0);
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không tải được danh sách đơn vị tính.');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, searchTerm, showOnlyActive]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    // Reset page when search or filters change
    useEffect(() => {
        setPage(0);
    }, [searchTerm, showOnlyActive]);

    const handleRefresh = () => {
        fetchList();
    };

    const handleToggleStatus = async (uom) => {
        if (!canManage) return;
        try {
            await toggleUomStatus(uom.uomId, !uom.isActive);
            setRows((prev) =>
                prev.map((r) => (r.uomId === uom.uomId ? { ...r, isActive: !r.isActive } : r))
            );
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không đổi được trạng thái.');
        }
    };

    const handleOpenCreateUom = () => {
        setUomEditRow(null);
        setUomDialogMode('create');
        setUomDialogOpen(true);
    };

    const handleOpenEditUom = (u) => {
        setUomEditRow(u);
        setUomDialogMode('edit');
        setUomDialogOpen(true);
    };

    const handleUomDialogSuccess = async (payload) => {
        if (payload.mode === 'edit') {
            await updateUom(payload.uomId, { uomName: payload.uomName, isActive: payload.isActive });
        } else {
            await createUom({ uomName: payload.uomName });
        }
        fetchList();
    };

    // Column visibility handlers
    const handleColumnVisibilityChange = (columnId, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(columnId);
            else next.delete(columnId);
            return next;
        });
    };

    const handleSelectAllColumns = (checked) => {
        setVisibleColumnIds(checked ? new Set(DEFAULT_VISIBLE_COLUMN_IDS) : new Set());
    };

    const visibleColumns = UOM_COLUMNS
        .filter((col) => visibleColumnIds.has(col.id))
        .sort((a, b) => {
            if (a.id === 'stt' && b.id !== 'stt') return -1;
            if (b.id === 'stt' && a.id !== 'stt') return 1;
            return columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id);
        });

    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    useEffect(() => {
        if (columnSelectorOpen) {
            setTempColumnOrder(columnOrder);
        }
    }, [columnSelectorOpen, columnOrder]);

    // Sorting handlers
    const handleSortRequest = (columnId) => {
        if (!SORTABLE_COLUMN_IDS.includes(columnId)) return;

        let newOrder, newOrderBy;
        if (orderBy === columnId) {
            if (order === 'asc') {
                newOrder = 'desc';
                newOrderBy = columnId;
            } else {
                newOrder = 'asc';
                newOrderBy = null;
            }
        } else {
            newOrderBy = columnId;
            newOrder = 'asc';
        }

        setOrderBy(newOrderBy);
        setOrder(newOrder);
        setPage(0);

        localStorage.setItem('uomSortConfig', JSON.stringify({ orderBy: newOrderBy, order: newOrder }));
    };

    // Drag and drop handlers
    const handleDragStart = (e, columnId) => {
        setDraggedColumn(columnId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetColumnId) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === targetColumnId) return;

        const newOrder = [...columnOrder];
        const draggedIndex = newOrder.indexOf(draggedColumn);
        const targetIndex = newOrder.indexOf(targetColumnId);

        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedColumn);

        setColumnOrder(newOrder);
        localStorage.setItem('uomColumnOrder', JSON.stringify(newOrder));
        setDraggedColumn(null);
    };

    const handleDragEnd = () => {
        setDraggedColumn(null);
    };

    // Popup drag and drop handlers
    const handlePopupDragStart = (e, columnId) => {
        setDraggedPopupColumn(columnId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handlePopupDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handlePopupDrop = (e, targetColumnId) => {
        e.preventDefault();
        if (!draggedPopupColumn || draggedPopupColumn === targetColumnId) return;

        const newOrder = [...tempColumnOrder];
        const draggedIndex = newOrder.indexOf(draggedPopupColumn);
        const targetIndex = newOrder.indexOf(targetColumnId);

        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedPopupColumn);

        setTempColumnOrder(newOrder);
        setDraggedPopupColumn(null);
    };

    const handlePopupDragEnd = () => {
        setDraggedPopupColumn(null);
    };

    const handleSaveColumnOrder = () => {
        setColumnOrder(tempColumnOrder);
        localStorage.setItem('uomColumnOrder', JSON.stringify(tempColumnOrder));
        setColumnSelectorAnchor(null);
    };

    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setColumnSelectorAnchor(null);
    };

    // Selection handlers
    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(new Set(rows.map(row => row.uomId)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id, checked) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (checked) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    };

    const isAllSelected = rows.length > 0 && rows.every(row => selectedIds.has(row.uomId));
    const isSomeSelected = rows.some(row => selectedIds.has(row.uomId)) && !isAllSelected;

    // Filter and sort data
    const filteredAndSortedRows = useMemo(() => {
        const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');
        const term = searchTerm.trim() ? normalize(searchTerm.trim()) : '';
        let result = [...rows];

        if (term) {
            result = result.filter((row) =>
                normalize(row.uomName ?? '').includes(term)
            );
        }

        if (showOnlyActive !== undefined) {
            result = result.filter((row) => row.isActive === showOnlyActive);
        }

        result.sort((a, b) => {
            if (!orderBy) return 0;

            const aVal = a[orderBy];
            const bVal = b[orderBy];
            const isBoolean = ['isActive'].includes(orderBy);
            let cmp = 0;

            if (isBoolean) {
                cmp = (aVal === bVal) ? 0 : aVal ? 1 : -1;
            } else {
                const strA = String(aVal ?? '').toLowerCase();
                const strB = String(bVal ?? '').toLowerCase();
                cmp = strA.localeCompare(strB);
            }

            return order === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [rows, searchTerm, showOnlyActive, orderBy, order]);

    const totalCount = filteredAndSortedRows.length;
    const start = totalCount === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalCount);
    const displayedRows = filteredAndSortedRows.slice(page * pageSize, (page + 1) * pageSize);

    // Cell styles
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

    const handlePageChange = (newPage) => setPage(newPage);
    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setPage(0);
    };

    return (
        <Box sx={{
            height: '100%',
            minHeight: 0,
            minWidth: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#fafafa',
        }}>
            {/* Header Section */}
            <Box sx={{
                flexShrink: 0,
                px: { xs: 2, sm: 2 },
                py: 2.5,
                bgcolor: '#fafafa',
            }}>
                <Typography variant="h5" component="h1" fontWeight="600" sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}>
                    Danh sách đơn vị tính
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Unit of Measure
                </Typography>
            </Box>

            {/* Main Content Wrapper with Border */}
            <Box sx={{ flex: 1, px: { xs: 2, sm: 2 }, pb: 2, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Paper
                    className="list-view"
                    elevation={0}
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
                    {/* Toolbar Section */}
                    <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid #f3f4f6' }}>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
                            <SearchInput
                                placeholder="Tìm theo tên đơn vị tính..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{
                                    flex: '1 1 200px',
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
                                    onClick={(e) => {
                                        setColumnSelectorAnchor(e.currentTarget);
                                    }}
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
                                    <Filter size={18} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton
                                    color="primary"
                                    onClick={(e) => setColumnSelectorAnchor(e.currentTarget)}
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
                                    <GripVertical size={18} />
                                </IconButton>
                            </Tooltip>
                            {canManage && (
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                    <Button
                                        className="list-page-btn"
                                        variant="contained"
                                        startIcon={<Plus size={18} />}
                                        onClick={handleOpenCreateUom}
                                        sx={{
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            textTransform: 'none',
                                            borderRadius: '10px',
                                            height: 38,
                                            px: 2.5,
                                            bgcolor: '#0284c7',
                                            boxShadow: '0 1px 2px rgba(2, 132, 199, 0.25)',
                                            '&:hover': {
                                                bgcolor: '#0369a1',
                                                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.30)',
                                            },
                                        }}
                                    >
                                        Thêm đơn vị tính
                                    </Button>
                                </Box>
                            )}
                            <Tooltip title="Làm mới">
                                <IconButton
                                    onClick={handleRefresh}
                                    aria-label="Làm mới"
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
                                    <RefreshCw size={18} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    {/* Error Alert */}
                    {error && (
                        <Alert severity="error" onClose={() => setError(null)} sx={{ mx: 2, mt: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Column Selector Popover */}
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
                                    width: 320,
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
                        <Box sx={{
                            px: 2.5,
                            py: 2,
                            borderBottom: '1px solid #f3f4f6',
                            flexShrink: 0,
                        }}>
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
                            '&::-webkit-scrollbar': {
                                width: '6px',
                            },
                            '&::-webkit-scrollbar-track': {
                                bgcolor: 'transparent',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                bgcolor: '#d1d5db',
                                borderRadius: '3px',
                                '&:hover': {
                                    bgcolor: '#9ca3af',
                                },
                            },
                        }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={visibleColumnIds.size === UOM_COLUMNS.length}
                                        indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < UOM_COLUMNS.length}
                                        onChange={(e) => handleSelectAllColumns(e.target.checked)}
                                        sx={{
                                            color: '#9ca3af',
                                            '&.Mui-checked': { color: '#3b82f6' },
                                            '&.MuiCheckbox-indeterminate': { color: '#3b82f6' },
                                        }}
                                    />
                                }
                                label={<Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Tất cả</Typography>}
                                sx={{ mb: 1, py: 0.5 }}
                            />
                            {UOM_COLUMNS.sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id)).map((col) => (
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
                                        '&:hover': {
                                            bgcolor: '#f9fafb',
                                        },
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
                                            '&:hover': { color: '#6b7280' }
                                        }}
                                    >
                                        <GripVertical size={14} />
                                    </Box>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={visibleColumnIds.has(col.id)}
                                                onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)}
                                                sx={{
                                                    color: '#9ca3af',
                                                    '&.Mui-checked': { color: '#3b82f6' },
                                                }}
                                            />
                                        }
                                        label={<Typography sx={{ fontSize: '13px', color: '#374151' }}>{col.label}</Typography>}
                                        sx={{ flex: 1, m: 0, py: 0.5 }}
                                    />
                                </Box>
                            ))}
                        </Box>

                        {/* Footer */}
                        <Box sx={{
                            px: 2.5,
                            py: 2,
                            display: 'flex',
                            gap: 1.5,
                            borderTop: '1px solid #f3f4f6',
                            flexShrink: 0,
                        }}>
                            <Button
                                variant="outlined"
                                onClick={handleCancelColumnOrder}
                                sx={{
                                    flex: 1,
                                    textTransform: 'none',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    height: 38,
                                    borderRadius: '10px',
                                    borderColor: '#e5e7eb',
                                    color: '#6b7280',
                                    '&:hover': {
                                        borderColor: '#d1d5db',
                                        bgcolor: '#f9fafb',
                                    },
                                }}
                            >
                                Hủy
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleSaveColumnOrder}
                                sx={{
                                    flex: 1,
                                    textTransform: 'none',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    height: 38,
                                    borderRadius: '10px',
                                    bgcolor: '#0284c7',
                                    boxShadow: 'none',
                                    '&:hover': {
                                        bgcolor: '#0369a1',
                                        boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                                    },
                                }}
                            >
                                Lưu
                            </Button>
                        </Box>
                    </Popover>

                    {/* Table Section */}
                    <Box sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
                                <CircularProgress />
                            </Box>
                        ) : displayedRows.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, px: 2, color: 'text.secondary' }}>
                                <FileText size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <Typography sx={{ fontSize: '13px' }}>Chưa có dữ liệu đơn vị tính</Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell
                                                padding="checkbox"
                                                sx={{
                                                    fontWeight: 600,
                                                    bgcolor: '#fafafa',
                                                    width: 56,
                                                    minWidth: 56,
                                                    maxWidth: 56,
                                                    borderBottom: '2px solid #e5e7eb',
                                                    fontSize: '12px',
                                                    px: 2,
                                                }}
                                            >
                                                <Checkbox
                                                    checked={isAllSelected}
                                                    indeterminate={isSomeSelected}
                                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                                    size="small"
                                                />
                                            </TableCell>
                                            {visibleColumns.map((col) => (
                                                <TableCell
                                                    key={col.id}
                                                    sx={{
                                                        fontWeight: 600,
                                                        bgcolor: draggedColumn === col.id ? 'action.hover' : '#fafafa',
                                                        whiteSpace: 'nowrap',
                                                        opacity: draggedColumn === col.id ? 0.5 : 1,
                                                        transition: 'all 0.2s',
                                                        borderBottom: '2px solid #e5e7eb',
                                                        fontSize: '12px',
                                                        color: '#6b7280',
                                                        py: 1.5,
                                                        px: 2,
                                                    }}
                                                    align="left"
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, col.id)}
                                                >
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                        '&:hover .drag-icon': {
                                                            opacity: 0.6,
                                                        },
                                                    }}>
                                                        {col.sortable && (
                                                            <Box
                                                                draggable
                                                                onDragStart={(e) => handleDragStart(e, col.id)}
                                                                onDragEnd={handleDragEnd}
                                                                className="drag-icon"
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    cursor: 'grab',
                                                                    '&:active': { cursor: 'grabbing' },
                                                                    color: '#9ca3af',
                                                                    opacity: 0,
                                                                    transition: 'opacity 0.2s',
                                                                }}
                                                            >
                                                                <GripVertical size={14} />
                                                            </Box>
                                                        )}
                                                        {col.sortable ? (
                                                            <TableSortLabel
                                                                active={orderBy === col.id}
                                                                direction={orderBy === col.id ? order : 'asc'}
                                                                onClick={() => handleSortRequest(col.id)}
                                                                sx={{
                                                                    flex: 1,
                                                                    '& .MuiTableSortLabel-icon': {
                                                                        fontSize: '14px',
                                                                        opacity: orderBy === col.id ? 1 : 0,
                                                                    },
                                                                }}
                                                                hideSortIcon={false}
                                                            >
                                                                {col.label}
                                                            </TableSortLabel>
                                                        ) : (
                                                            <Typography variant="inherit" sx={{ flex: 1 }}>
                                                                {col.label}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            ))}
                                            {/* Actions column - always visible */}
                                            <TableCell
                                                sx={{
                                                    fontWeight: 600,
                                                    bgcolor: '#fafafa',
                                                    borderBottom: '2px solid #e5e7eb',
                                                    fontSize: '12px',
                                                    color: '#6b7280',
                                                    py: 1.5,
                                                    px: 2,
                                                    width: 120,
                                                    minWidth: 120,
                                                }}
                                                align="right"
                                            >
                                                Hành động
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {displayedRows.map((row, index) => (
                                            <TableRow
                                                key={row.uomId}
                                                hover
                                                sx={{
                                                    height: 56,
                                                    '&:last-child td': { borderBottom: 0 },
                                                    '&:hover': {
                                                        bgcolor: '#f9fafb',
                                                    },
                                                    '& .MuiTableCell-root': BODY_CELL_SX,
                                                    '& .MuiTableCell-paddingCheckbox': CHECKBOX_CELL_SX,
                                                }}
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={selectedIds.has(row.uomId)}
                                                        onChange={(e) => handleSelectRow(row.uomId, e.target.checked)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                {visibleColumns.map((col) => {
                                                    const opts = { pageNumber: page + 1, pageSize };

                                                    // STT column
                                                    if (col.id === 'stt') {
                                                        return (
                                                            <TableCell
                                                                key={col.id}
                                                                align="center"
                                                                sx={{ fontVariantNumeric: 'tabular-nums' }}
                                                            >
                                                                {col.getValue(row, index, opts)}
                                                            </TableCell>
                                                        );
                                                    }

                                                    // Status column (isActive)
                                                    if (col.id === 'isActive') {
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Chip
                                                                        label={row.isActive ? 'Hoạt động' : 'Tắt'}
                                                                        size="small"
                                                                        sx={{
                                                                            fontWeight: 500,
                                                                            fontSize: '12px',
                                                                            lineHeight: '16px',
                                                                            borderRadius: '999px',
                                                                            minWidth: 90,
                                                                            height: '26px',
                                                                            bgcolor: row.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                                                                            color: '#374151',
                                                                            border: 'none',
                                                                            boxShadow: 'none',
                                                                            '& .MuiChip-label': {
                                                                                px: 1.5,
                                                                                py: 0,
                                                                            }
                                                                        }}
                                                                    />
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }

                                                    // Default text columns with ellipsis
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="left"
                                                            sx={{
                                                                maxWidth: 200,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                            title={col.getValue(row)}
                                                        >
                                                            {col.getValue(row)}
                                                        </TableCell>
                                                    );
                                                })}
                                                {/* Actions */}
                                                <TableCell align="right" sx={{ px: 2 }}>
                                                    {canManage && (
                                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                                                            <Tooltip title={row.isActive ? 'Tắt' : 'Bật'}>
                                                                <IconButton size="small" onClick={() => handleToggleStatus(row)} aria-label={row.isActive ? 'Tắt' : 'Bật'}>
                                                                    <Power size={18} color={row.isActive ? '#2e7d32' : '#757575'} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Chỉnh sửa">
                                                                <IconButton size="small" aria-label="Chỉnh sửa" onClick={() => handleOpenEditUom(row)}>
                                                                    <Edit3 size={18} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>

                    {/* Pagination Section */}
                    <Box sx={{
                        flexShrink: 0,
                        px: 2,
                        py: 2,
                        borderTop: '1px solid #f3f4f6',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 2
                    }}>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>Số dòng / trang:</Typography>
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
                                    <MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>{n}</MenuItem>
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
                            disabled={end >= totalCount || totalCount === 0}
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
                </Paper>
            </Box>

            {/* UOM Form Dialog */}
            <UomFormDialog
                open={uomDialogOpen}
                onClose={() => setUomDialogOpen(false)}
                mode={uomDialogMode}
                editRow={uomEditRow}
                onSuccess={handleUomDialogSuccess}
            />
        </Box>
    );
};

export default ViewUomList;
