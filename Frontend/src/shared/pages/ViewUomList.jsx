/*
 * Danh sách Đơn vị tính – kết nối API UnitOfMeasure.
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePolling } from '../hooks/usePolling';
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
import { Plus, Edit3, Power, GripVertical, FileText, Filter, Columns, Scale } from 'lucide-react';
import '../styles/ListView.css';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import UomFormDialog from '@ui/dialogs/UomFormDialog';
import UomFilterPopup from '../components/UomFilterPopup';
import { getUomList, createUom, updateUom, toggleUomStatus } from '../lib/uomService';

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

const UOM_COLUMNS = [
    {
        id: 'uomName',
        label: 'Tên đơn vị tính',
        sortable: true,
        getValue: (row) => row.uomName ?? '',
    },
    {
        id: 'isActive',
        label: 'Trạng thái',
        sortable: true,
        getValue: (row) => row.isActive,
    },
];

const DEFAULT_VISIBLE_COLUMN_IDS = UOM_COLUMNS.map((c) => c.id);
const SORTABLE_COLUMN_IDS = UOM_COLUMNS.filter((c) => c.sortable).map((c) => c.id);

const ViewUomList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterAnchor, setFilterAnchor] = useState(null);

    const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
        const saved = localStorage.getItem('uomVisibleColumnIds');
        if (!saved) return new Set(DEFAULT_VISIBLE_COLUMN_IDS);

        try {
            const parsed = JSON.parse(saved);
            return new Set(Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_VISIBLE_COLUMN_IDS);
        } catch {
            return new Set(DEFAULT_VISIBLE_COLUMN_IDS);
        }
    });

    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [columnOrder, setColumnOrder] = useState(() => {
        const saved = localStorage.getItem('uomColumnOrder');
        if (!saved) return UOM_COLUMNS.map((c) => c.id);

        try {
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) && parsed.length > 0 ? parsed : UOM_COLUMNS.map((c) => c.id);
        } catch {
            return UOM_COLUMNS.map((c) => c.id);
        }
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);

    const [orderBy, setOrderBy] = useState(() => {
        const saved = localStorage.getItem('uomSortConfig');
        if (!saved) return null;

        try {
            const parsed = JSON.parse(saved);
            return parsed?.orderBy ?? null;
        } catch {
            return null;
        }
    });
    const [order, setOrder] = useState(() => {
        const saved = localStorage.getItem('uomSortConfig');
        if (!saved) return 'asc';

        try {
            const parsed = JSON.parse(saved);
            return parsed?.order === 'desc' ? 'desc' : 'asc';
        } catch {
            return 'asc';
        }
    });

    const [uomDialogOpen, setUomDialogOpen] = useState(false);
    const [uomDialogMode, setUomDialogMode] = useState('create');
    const [uomEditRow, setUomEditRow] = useState(null);

    const currentPage = page + 1;
    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;
    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    useEffect(() => {
        localStorage.setItem('uomSortConfig', JSON.stringify({ orderBy, order }));
    }, [orderBy, order]);

    useEffect(() => {
        localStorage.setItem('uomColumnOrder', JSON.stringify(columnOrder));
    }, [columnOrder]);

    useEffect(() => {
        localStorage.setItem('uomVisibleColumnIds', JSON.stringify(Array.from(visibleColumnIds)));
    }, [visibleColumnIds]);

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await getUomList({
                page: currentPage,
                pageSize,
                keyword: searchTerm.trim() || undefined,
                isActive:
                    filterStatus === 'all'
                        ? undefined
                        : filterStatus === 'ACTIVE',
                orderBy: orderBy || undefined,
                order: orderBy ? order : undefined,
            });

            const items = Array.isArray(result?.items) ? result.items : [];
            const total = Number(result?.totalItems ?? 0);

            setRows(items);
            setTotalItems(Number.isNaN(total) ? 0 : total);
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không tải được danh sách đơn vị tính.');
            setRows([]);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, searchTerm, filterStatus, filterDateFrom, filterDateTo, orderBy, order]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    // ── Polling ────────────────────────────────────────────────────
    const fetchListRef = useRef(fetchList);
    useEffect(() => { fetchListRef.current = fetchList; }, [fetchList]);
    usePolling('uom', () => fetchListRef.current?.());

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setPage(0);
    };

    const handleFilterApply = useCallback((values) => {
        setFilterStatus(values.filterStatus ?? 'all');
        setFilterDateFrom(values.fromDate ?? '');
        setFilterDateTo(values.toDate ?? '');
        setPage(0);
    }, []);

    const activeFilterCount = [
        filterStatus !== 'all',
        filterDateFrom,
        filterDateTo,
    ].filter(Boolean).length;

    const handleToggleStatus = async (uom) => {
        if (!canManage) return;

        try {
            await toggleUomStatus(uom.uomId, !uom.isActive);
            fetchList();
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

    const handleOpenEditUomByRow = (row) => {
        setUomEditRow(row);
        setUomDialogMode('edit');
        setUomDialogOpen(true);
    };

    const handleUomDialogSuccess = async (payload) => {
        try {
            if (payload.mode === 'edit') {
                await updateUom(payload.uomId, {
                    uomName: payload.uomName,
                    isActive: payload.isActive,
                });
            } else {
                await createUom({
                    uomName: payload.uomName,
                });
            }

            setUomDialogOpen(false);
            fetchList();
            PollingManager.triggerRefreshByFetchKey('Uom');
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không lưu được đơn vị tính.');
        }
    };

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

    const visibleColumns = useMemo(() => {
        return UOM_COLUMNS
            .filter((col) => visibleColumnIds.has(col.id))
            .sort((a, b) => columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id));
    }, [visibleColumnIds, columnOrder]);

    useEffect(() => {
        if (columnSelectorOpen) {
            setTempColumnOrder(columnOrder);
        }
    }, [columnSelectorOpen, columnOrder]);

    const handleSortRequest = (columnId) => {
        if (!SORTABLE_COLUMN_IDS.includes(columnId)) return;

        let newOrderBy = columnId;
        let newOrder = 'asc';

        if (orderBy === columnId) {
            if (order === 'asc') {
                newOrder = 'desc';
            } else {
                newOrderBy = null;
                newOrder = 'asc';
            }
        }

        setOrderBy(newOrderBy);
        setOrder(newOrder);
        setPage(0);
    };

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
        setDraggedColumn(null);
    };

    const handleDragEnd = () => {
        setDraggedColumn(null);
    };

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
        setColumnSelectorAnchor(null);
    };

    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setColumnSelectorAnchor(null);
    };

    const displayedRows = useMemo(() => {
        if (!orderBy) return rows;

        const result = [...rows];

        result.sort((a, b) => {
            const aVal = a?.[orderBy];
            const bVal = b?.[orderBy];

            if (orderBy === 'isActive') {
                const cmp = aVal === bVal ? 0 : aVal ? 1 : -1;
                return order === 'asc' ? cmp : -cmp;
            }

            const strA = String(aVal ?? '').toLowerCase();
            const strB = String(bVal ?? '').toLowerCase();
            const cmp = strA.localeCompare(strB);

            return order === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [rows, orderBy, order]);

    const start = totalItems === 0 ? 0 : page * pageSize + 1;
    const end = totalItems === 0 ? 0 : Math.min((page + 1) * pageSize, totalItems);

    /** Chỉ khi một trang chứa hết kết quả thì đếm hoạt động/ngưng theo dòng hiện có mới khớp tổng */
    const summaryBreakdownReliable = totalItems > 0 && rows.length >= totalItems;

    const HEADER_CELL_SX = {
        fontWeight: 600,
        bgcolor: '#fafafa',
        borderBottom: '2px solid #e5e7eb',
        fontSize: '12px',
        color: '#6b7280',
        height: 48,
        py: 0,
        px: 2,
        verticalAlign: 'middle',
    };

    const BODY_CELL_SX = {
        py: 1.75,
        px: 2,
        fontSize: '13px',
        lineHeight: '20px',
        verticalAlign: 'middle',
        borderBottom: '1px solid #f3f4f6',
        color: '#374151',
    };

    const handlePageChange = (newPage) => {
        if (newPage < 0 || newPage > totalPages - 1) return;
        setPage(newPage);
    };

    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
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
                    Danh sách đơn vị tính
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}
                >
                    Unit of Measure
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
                    <SummaryCard icon={Scale} label="Tổng đơn vị tính" value={totalItems.toLocaleString()} color="#6b7280" bgColor="rgba(107,114,128,0.1)" />
                    <SummaryCard icon={Scale} label="Đang hoạt động" value={summaryBreakdownReliable ? rows.filter((r) => r.isActive).length.toLocaleString() : '—'} color="#059669" bgColor="rgba(5,150,105,0.1)" />
                    <SummaryCard icon={Scale} label="Ngưng hoạt động" value={summaryBreakdownReliable ? rows.filter((r) => !r.isActive).length.toLocaleString() : '—'} color="#d97706" bgColor="rgba(217,119,6,0.1)" />
                </Box>
            </Box>

            <Box
                sx={{
                    flex: 1,
                    px: { xs: 2, sm: 2 },
                    pb: 2,
                    minHeight: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
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
                    <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid #f3f4f6' }}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: isMobile ? 'column' : 'row',
                                gap: 1.5,
                                alignItems: isMobile ? 'stretch' : 'center',
                                flexWrap: 'wrap',
                            }}
                        >
                            <SearchInput
                                placeholder="Tìm theo tên đơn vị tính..."
                                value={searchTerm}
                                onChange={handleSearchChange}
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
                                    onClick={(e) => setFilterAnchor(e.currentTarget)}
                                    aria-label="Bộ lọc"
                                    sx={{
                                        border: '1px solid #e5e7eb',
                                        bgcolor: '#ffffff',
                                        borderRadius: '10px',
                                        position: 'relative',
                                        '&:hover': {
                                            bgcolor: '#f9fafb',
                                            borderColor: '#d1d5db',
                                        },
                                    }}
                                >
                                    <Filter size={18} />
                                    {activeFilterCount > 0 && (
                                        <Box sx={{
                                            position: 'absolute', top: 4, right: 4,
                                            width: 8, height: 8, borderRadius: '50%',
                                            bgcolor: '#0284c7',
                                        }} />
                                    )}
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
                                    <Columns size={18} />
                                </IconButton>
                            </Tooltip>

                            {canManage && (
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
                        </Box>
                    </Box>

                    {error && (
                        <Alert severity="error" onClose={() => setError(null)} sx={{ mx: 2, mt: 2 }}>
                            {error}
                        </Alert>
                    )}

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
                                },
                            },
                        }}
                    >
                        <Box
                            sx={{
                                px: 2.5,
                                py: 2,
                                borderBottom: '1px solid #f3f4f6',
                                flexShrink: 0,
                            }}
                        >
                            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>
                                Chọn cột & Sắp xếp
                            </Typography>
                        </Box>

                        <Box
                            sx={{
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
                            }}
                        >
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
                                label={
                                    <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                                        Tất cả
                                    </Typography>
                                }
                                sx={{ mb: 1, py: 0.5 }}
                            />

                            {[...UOM_COLUMNS]
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

                        <Box
                            sx={{
                                px: 2.5,
                                py: 2,
                                display: 'flex',
                                gap: 1.5,
                                borderTop: '1px solid #f3f4f6',
                                flexShrink: 0,
                            }}
                        >
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

                    <UomFilterPopup
                        open={Boolean(filterAnchor)}
                        onClose={() => setFilterAnchor(null)}
                        initialValues={{ isActive: filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : null, fromDate: filterDateFrom, toDate: filterDateTo }}
                        onApply={handleFilterApply}
                    />

                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
                                <CircularProgress />
                            </Box>
                        ) : displayedRows.length === 0 ? (
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
                                <FileText size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <Typography sx={{ fontSize: '13px' }}>Chưa có dữ liệu đơn vị tính</Typography>
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
                                                ...HEADER_CELL_SX,
                                                width: 56,
                                                minWidth: 56,
                                                maxWidth: 56,
                                                textAlign: 'center',
                                            }}
                                        >
                                            STT
                                        </TableCell>
                                        {/* Ma UOM — always visible, not in configurable columns */}
                                        <TableCell
                                            sx={{
                                                ...HEADER_CELL_SX,
                                                width: 140,
                                                minWidth: 140,
                                                maxWidth: 140,
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <GripVertical size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                                                <Typography variant="inherit" sx={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                                                    Mã đơn vị tính
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        {visibleColumns.map((col) => (
                                            <TableCell
                                                key={col.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.stopPropagation();
                                                    handleDragStart(e, col.id);
                                                }}
                                                onDragEnd={(e) => {
                                                    e.stopPropagation();
                                                    handleDragEnd();
                                                }}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, col.id)}
                                                sortDirection={orderBy === col.id ? order : false}
                                                sx={{
                                                    ...HEADER_CELL_SX,
                                                    cursor: 'grab',
                                                    userSelect: 'none',
                                                    opacity: draggedColumn === col.id ? 0.5 : 1,
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
                                                            active={orderBy === col.id}
                                                            direction={orderBy === col.id ? order : 'asc'}
                                                            onClick={() => handleSortRequest(col.id)}
                                                            hideSortIcon={false}
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                minWidth: 0,
                                                                flex: 1,
                                                                '& .MuiTableSortLabel-icon': {
                                                                    fontSize: '14px',
                                                                    opacity: orderBy === col.id ? 1 : 0,
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
                                        ))}
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {displayedRows.map((row, index) => (
                                        <TableRow
                                            key={row.uomId}
                                            hover
                                            sx={{
                                                height: 52,
                                                '&:hover': { bgcolor: '#f9fafb' },
                                            }}
                                        >
                                            <TableCell
                                                align="center"
                                                sx={{
                                                    ...BODY_CELL_SX,
                                                    width: 56,
                                                    minWidth: 56,
                                                    maxWidth: 56,
                                                }}
                                            >
                                                {page * pageSize + index + 1}
                                            </TableCell>
                                            <TableCell
                                                align="left"
                                                sx={{
                                                    ...BODY_CELL_SX,
                                                    width: 140,
                                                    minWidth: 140,
                                                    maxWidth: 140,
                                                }}
                                            >
                                                <Typography sx={{ fontSize: '13px', color: '#374151' }}>
                                                    {row.uomCode ?? ''}
                                                </Typography>
                                            </TableCell>
                                            {visibleColumns.map((col) => {
                                                const opts = { pageNumber: page + 1, pageSize };

                                                if (col.id === 'uomName') {
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="left"
                                                            sx={{ ...BODY_CELL_SX }}
                                                        >
                                                            <Box
                                                                component="button"
                                                                onClick={() => handleOpenEditUomByRow(row)}
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
                                                                title={row.uomName ?? ''}
                                                            >
                                                                {row.uomName ?? ''}
                                                            </Box>
                                                        </TableCell>
                                                    );
                                                }

                                                if (col.id === 'isActive') {
                                                    return (
                                                        <TableCell key={col.id} align="left" sx={{ ...BODY_CELL_SX }}>
                                                            <Chip
                                                                label={row.isActive ? '• Hoạt động' : '• Tạm dừng'}
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 500,
                                                                    fontSize: '12px',
                                                                    lineHeight: '16px',
                                                                    borderRadius: '999px',
                                                                    minWidth: 100,
                                                                    height: '26px',
                                                                    bgcolor: row.isActive
                                                                        ? 'rgba(16, 185, 129, 0.2)'
                                                                        : 'rgba(107, 114, 128, 0.2)',
                                                                    color: '#374151',
                                                                    border: 'none',
                                                                    boxShadow: 'none',
                                                                    '& .MuiChip-label': { px: 1.5, py: 0, textAlign: 'left' },
                                                                }}
                                                            />
                                                        </TableCell>
                                                    );
                                                }

                                                return (
                                                    <TableCell
                                                        key={col.id}
                                                        align="left"
                                                        sx={{
                                                            ...BODY_CELL_SX,
                                                            maxWidth: 200,
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
                                    ))}
                                </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>

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
                            {start}–{end} / {totalItems} (Tổng {totalPages} trang)
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
                            disabled={page >= totalPages - 1 || totalItems === 0}
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