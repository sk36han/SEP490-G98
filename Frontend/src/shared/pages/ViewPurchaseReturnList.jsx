import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
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
    Chip,
    TableSortLabel,
    CircularProgress,
    Alert,
    FormControl,
    Select,
    MenuItem,
} from '@mui/material';
import { FileText, Filter, Columns, Plus, GripVertical, RotateCcw } from 'lucide-react';
import { removeDiacritics } from '../utils/stringUtils';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import PurchaseReturnFilterPopup from '../components/PurchaseReturnFilterPopup';
import { getPurchaseReturnNotes } from '../lib/purchaseReturnNoteService';
import '../styles/ListView.css';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const STATUS_STYLE = {
    DRAFT: { bgColor: 'rgba(107, 114, 128, 0.2)', label: 'Nháp', dot: '•' },
    SUBMITTED: { bgColor: 'rgba(251, 191, 36, 0.2)', label: 'Đã gửi duyệt', dot: '•' },
    APPROVED: { bgColor: 'rgba(16, 185, 129, 0.2)', label: 'Đã duyệt', dot: '•' },
    POSTED: { bgColor: 'rgba(139, 92, 246, 0.2)', label: 'Đã hoàn thành', dot: '•' },
    CANCELLED: { bgColor: 'rgba(239, 68, 68, 0.2)', label: 'Đã hủy', dot: '•' },
};

const REFUND_STATUS_STYLE = {
    Refunded: { bgColor: 'rgba(16, 185, 129, 0.2)', label: 'Đã hoàn tiền', dot: '•' },
    PartiallyRefunded: { bgColor: 'rgba(251, 191, 36, 0.2)', label: 'Hoàn một phần', dot: '•' },
    NotRefunded: { bgColor: 'rgba(251, 191, 36, 0.2)', label: 'Chưa hoàn tiền', dot: '•' },
};

const PURCHASE_RETURN_COLUMNS = [
    { id: 'stt', label: 'STT', sortable: false, draggable: false, getValue: (row, index, { pageNumber, pageSize }) => (pageNumber - 1) * pageSize + index + 1 },
    { id: 'returnCode', label: 'Mã phiếu trả hàng', sortable: true, draggable: true, getValue: (row) => row.returnCode ?? '' },
    { id: 'relatedGrnCode', label: 'Phiếu nhập tham chiếu', sortable: true, draggable: true, getValue: (row) => row.relatedGrnCode ?? '' },
    { id: 'supplierName', label: 'Nhà cung cấp', sortable: true, draggable: true, getValue: (row) => row.supplierName ?? '' },
    { id: 'returnDate', label: 'Ngày trả hàng', sortable: true, draggable: true, getValue: (row) => row.returnDate ?? '' },
    { id: 'status', label: 'Trạng thái', sortable: true, draggable: true, getValue: (row) => STATUS_STYLE[row.status]?.label ?? row.status ?? '' },
    { id: 'refundStatus', label: 'Trạng thái hoàn tiền', sortable: true, draggable: true, getValue: (row) => REFUND_STATUS_STYLE[row.refundStatus]?.label ?? row.refundStatus ?? '' },
    { id: 'totalReturnedQty', label: 'Số lượng hoàn', sortable: true, draggable: true, getValue: (row) => row.totalReturnedQty ?? 0 },
    { id: 'totalReturnedAmount', label: 'Số tiền hoàn', sortable: true, draggable: true, getValue: (row) => row.totalReturnedAmount ?? 0 },
    { id: 'createdByName', label: 'Người tạo', sortable: true, draggable: true, getValue: (row) => row.createdByName ?? '' },
    { id: 'createdAt', label: 'Ngày tạo', sortable: true, draggable: true, getValue: (row) => row.createdAt ?? '' },
];

// Immutable defaults — NEVER mutate these
const DEFAULT_COLUMN_ORDER = PURCHASE_RETURN_COLUMNS.map((c) => c.id);
const DEFAULT_VISIBLE_COLUMN_IDS = DEFAULT_COLUMN_ORDER.slice();
const SORTABLE_COLUMN_IDS = PURCHASE_RETURN_COLUMNS.filter((c) => c.sortable).map((c) => c.id);
const COLUMN_IDS_WITH_RIGHT_ALIGN = new Set(['totalReturnedQty', 'totalReturnedAmount']);

// Roles allowed to create a new purchase return
const ROLES_CAN_CREATE = new Set(['ACCOUNTANTS']);

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);
};

const safeParse = (jsonStr, fallback) => {
    try {
        return JSON.parse(jsonStr);
    } catch {
        return fallback;
    }
};

export default function ViewPurchaseReturnList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const permissionRole = getPermissionRole(getRawRoleFromUser(authService.getUser()));
    const canCreate = ROLES_CAN_CREATE.has(permissionRole);

    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState(() => {
        const saved = localStorage.getItem('purchaseReturnFilterValues');
        return saved ? safeParse(saved, {}) : {};
    });
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
        const saved = localStorage.getItem('purchaseReturnVisibleColumnIds');
        return saved ? new Set(safeParse(saved, DEFAULT_VISIBLE_COLUMN_IDS)) : new Set(DEFAULT_VISIBLE_COLUMN_IDS);
    });
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [orderBy, setOrderBy] = useState(() => {
        const saved = localStorage.getItem('purchaseReturnSortConfig');
        const parsed = saved ? safeParse(saved, null) : null;
        return parsed?.orderBy ?? null;
    });
    const [order, setOrder] = useState(() => {
        const saved = localStorage.getItem('purchaseReturnSortConfig');
        const parsed = saved ? safeParse(saved, null) : null;
        return parsed?.order ?? 'asc';
    });
    const [columnOrder, setColumnOrder] = useState(() => {
        const saved = localStorage.getItem('purchaseReturnColumnOrder');
        return saved ? safeParse(saved, DEFAULT_COLUMN_ORDER) : [...DEFAULT_COLUMN_ORDER];
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);

    // Ref to signal Reset was called so cleanup skips syncing tempColumnOrder

    // Fetch data from API
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        getPurchaseReturnNotes({ page: 1, pageSize: 1000 })
            .then((result) => {
                if (cancelled) return;
                setList(result.items);
                setLoading(false);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.response?.data?.message || err?.message || 'Không thể tải danh sách phiếu trả hàng.');
                setLoading(false);
            });

        return () => { cancelled = true; };
    }, []);
    const resetRef = useRef(false);

    // Sync tempColumnOrder when popup opens; cancel pending changes when popup closes.
    // Cleanup only syncs tempColumnOrder = columnOrder when NOT resetting.
    useEffect(() => {
        if (columnSelectorAnchor) {
            setTempColumnOrder(columnOrder);
        }
        return () => {
            if (!resetRef.current) {
                setTempColumnOrder(columnOrder);
            }
            resetRef.current = false;
        };
    }, [columnSelectorAnchor]);

    const handleColumnVisibilityChange = (columnId, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(columnId);
            else next.delete(columnId);
            localStorage.setItem('purchaseReturnVisibleColumnIds', JSON.stringify([...next]));
            return next;
        });
    };

    const handleSelectAllColumns = (checked) => {
        const newSet = checked ? new Set(DEFAULT_VISIBLE_COLUMN_IDS) : new Set();
        newSet.add('stt');
        setVisibleColumnIds(newSet);
        localStorage.setItem('purchaseReturnVisibleColumnIds', JSON.stringify([...newSet]));
    };

    const visibleColumns = PURCHASE_RETURN_COLUMNS
        .filter((col) => visibleColumnIds.has(col.id))
        .sort((a, b) => {
            if (a.id === 'stt' && b.id !== 'stt') return -1;
            if (b.id === 'stt' && a.id !== 'stt') return 1;
            return columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id);
        });

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
        localStorage.setItem('purchaseReturnSortConfig', JSON.stringify({ orderBy: newOrderBy, order: newOrder }));
    };

    // Table column drag-drop: fix index adjustment after splice
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
        const dragIdx = newOrder.indexOf(draggedColumn);
        const targetIdx = newOrder.indexOf(targetColumnId);
        if (dragIdx === -1 || targetIdx === -1) return;

        // Remove dragged item first
        newOrder.splice(dragIdx, 1);
        // Adjust target index: if moving left, subtract 1 because array shifted
        const adjustedTargetIdx = dragIdx < targetIdx ? targetIdx : targetIdx;
        newOrder.splice(adjustedTargetIdx, 0, draggedColumn);

        setColumnOrder(newOrder);
        localStorage.setItem('purchaseReturnColumnOrder', JSON.stringify(newOrder));
        setDraggedColumn(null);
    };

    const handleDragEnd = () => setDraggedColumn(null);

    const BODY_CELL_SX = {
        py: 1.75,
        px: 2,
        fontSize: '13px',
        lineHeight: '20px',
        verticalAlign: 'middle',
        borderBottom: '1px solid #f3f4f6',
        color: '#374151',
    };

    // Popup drag-drop: fix index adjustment after splice
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
        const dragIdx = newOrder.indexOf(draggedPopupColumn);
        const targetIdx = newOrder.indexOf(targetColumnId);
        if (dragIdx === -1 || targetIdx === -1) return;

        newOrder.splice(dragIdx, 1);
        const adjustedTargetIdx = dragIdx < targetIdx ? targetIdx : targetIdx;
        newOrder.splice(adjustedTargetIdx, 0, draggedPopupColumn);

        setTempColumnOrder(newOrder);
        setDraggedPopupColumn(null);
    };

    const handlePopupDragEnd = () => setDraggedPopupColumn(null);

    const handleResetColumns = () => {
        const defaultOrder = [...DEFAULT_COLUMN_ORDER];
        const defaultVisible = new Set(DEFAULT_VISIBLE_COLUMN_IDS);

        resetRef.current = true;
        setTempColumnOrder(defaultOrder);
        setColumnOrder(defaultOrder);
        setVisibleColumnIds(defaultVisible);
        localStorage.setItem('purchaseReturnColumnOrder', JSON.stringify(defaultOrder));
        localStorage.setItem('purchaseReturnVisibleColumnIds', JSON.stringify([...defaultVisible]));
        setColumnSelectorAnchor(null);
    };

    const handleSaveColumnOrder = () => {
        setColumnOrder(tempColumnOrder);
        localStorage.setItem('purchaseReturnColumnOrder', JSON.stringify(tempColumnOrder));
        setColumnSelectorAnchor(null);
    };

    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setColumnSelectorAnchor(null);
    };

    const filteredAndSortedRows = useMemo(() => {
        const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');
        const term = searchTerm.trim() ? normalize(searchTerm.trim()) : '';
        let result = [...list];

        if (term) {
            result = result.filter((row) =>
                normalize(row.returnCode ?? '').includes(term) ||
                normalize(row.relatedGrnCode ?? '').includes(term) ||
                normalize(row.createdByName ?? '').includes(term) ||
                normalize(row.supplierName ?? '').includes(term)
            );
        }

        if (filterValues.status) {
            result = result.filter((row) => row.status === filterValues.status);
        }
        if (filterValues.refundStatus) {
            result = result.filter((row) => row.refundStatus === filterValues.refundStatus);
        }
        if (filterValues.relatedGrnCode) {
            result = result.filter((row) => normalize(row.relatedGrnCode ?? '').includes(normalize(filterValues.relatedGrnCode)));
        }
        if (filterValues.createdByName) {
            result = result.filter((row) => normalize(row.createdByName ?? '').includes(normalize(filterValues.createdByName)));
        }
        if (filterValues.supplierName) {
            result = result.filter((row) => normalize(row.supplierName ?? '').includes(normalize(filterValues.supplierName)));
        }
        if (filterValues.returnFromDate) {
            result = result.filter((row) => {
                const d = row.returnDate;
                return d && String(d).slice(0, 10) >= filterValues.returnFromDate;
            });
        }
        if (filterValues.returnToDate) {
            result = result.filter((row) => {
                const d = row.returnDate;
                return d && String(d).slice(0, 10) <= filterValues.returnToDate;
            });
        }
        if (filterValues.createdFromDate) {
            result = result.filter((row) => {
                const d = row.createdAt;
                return d && String(d).slice(0, 10) >= filterValues.createdFromDate;
            });
        }
        if (filterValues.createdToDate) {
            result = result.filter((row) => {
                const d = row.createdAt;
                return d && String(d).slice(0, 10) <= filterValues.createdToDate;
            });
        }

        result.sort((a, b) => {
            if (!orderBy) return 0;
            const aVal = a[orderBy];
            const bVal = b[orderBy];
            const isDate = ['returnDate', 'createdAt'].includes(orderBy);
            const isNumber = ['totalReturnedQty', 'totalReturnedAmount'].includes(orderBy);
            let cmp = 0;
            if (isDate) {
                const tA = aVal ? new Date(aVal + (aVal.endsWith('Z') ? '' : 'Z')).getTime() : 0;
                const tB = bVal ? new Date(bVal + (bVal.endsWith('Z') ? '' : 'Z')).getTime() : 0;
                cmp = tA - tB;
            } else if (isNumber) {
                cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
            } else {
                cmp = String(aVal ?? '').toLowerCase().localeCompare(String(bVal ?? '').toLowerCase());
            }
            return order === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [list, searchTerm, filterValues, orderBy, order]);

    const totalCount = filteredAndSortedRows.length;
    const start = totalCount === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalCount);
    const totalPages = pageSize > 0 ? Math.max(0, Math.ceil(totalCount / pageSize)) : 0;
    const rows = filteredAndSortedRows.slice(page * pageSize, (page + 1) * pageSize);

    useEffect(() => setPage(0), [searchTerm, filterValues]);

    const handleFilterApply = (values) => {
        setFilterValues(values);
        localStorage.setItem('purchaseReturnFilterValues', JSON.stringify(values));
        setPage(0);
    };

    const relatedGRNOptions = useMemo(() => [...new Set(list.map((x) => x.relatedGrnCode).filter(Boolean))], [list]);
    const createdByOptions = useMemo(() => [...new Set(list.map((x) => x.createdByName).filter(Boolean))], [list]);
    const supplierOptions = useMemo(() => [...new Set(list.map((x) => x.supplierName).filter(Boolean))], [list]);

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
                    Danh sách phiếu trả hàng
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Purchase Returns
                </Typography>
            </Box>

            <PurchaseReturnFilterPopup
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                initialValues={filterValues}
                onApply={handleFilterApply}
                relatedGRNOptions={relatedGRNOptions}
                createdByOptions={createdByOptions}
                supplierOptions={supplierOptions}
            />

            {/* Main Content Wrapper */}
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
                                placeholder="Tìm theo mã trả hàng, GRN, người tạo, nhà cung cấp..."
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
                            <Tooltip title="Bộ lọc">
                                <IconButton
                                    color="primary"
                                    onClick={() => setFilterOpen(true)}
                                    aria-label="Bộ lọc"
                                    sx={{
                                        border: '1px solid #e5e7eb',
                                        bgcolor: '#ffffff',
                                        borderRadius: '10px',
                                        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
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
                                        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                    }}
                                >
                                    <Columns size={18} />
                                </IconButton>
                            </Tooltip>
                            {canCreate && (
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                    <Button
                                        className="list-page-btn"
                                        variant="contained"
                                        startIcon={<Plus size={18} />}
                                        onClick={() => navigate('/purchase-returns/create')}
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
                                        Tạo phiếu trả hàng
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* Column Selector Popover */}
                    <Popover
                        open={Boolean(columnSelectorAnchor)}
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
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>
                                Chọn cột & Sắp xếp
                            </Typography>
                        </Box>

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
                                            checked={visibleColumnIds.size === PURCHASE_RETURN_COLUMNS.length}
                                            indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < PURCHASE_RETURN_COLUMNS.length}
                                            onChange={(e) => handleSelectAllColumns(e.target.checked)}
                                            sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' }, '&.MuiCheckbox-indeterminate': { color: '#3b82f6' } }}
                                        />
                                    }
                                    label={<Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Tất cả</Typography>}
                                    sx={{ mb: 1, py: 0.5 }}
                                />
                                {[...PURCHASE_RETURN_COLUMNS].sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id)).map((col) => (
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
                                        onDragOver={(e) => { if (col.draggable !== false) e.preventDefault(); }}
                                        onDrop={(e) => { if (col.draggable !== false) { e.preventDefault(); handlePopupDrop(e, col.id); } }}
                                    >
                                        {col.draggable !== false ? (
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

                    {/* Table Section */}
                    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {error && (
                            <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2, mb: 0 }}>{error}</Alert>
                        )}
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
                                <CircularProgress size={32} />
                            </Box>
                        ) : rows.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, px: 2, color: 'text.secondary' }}>
                                <FileText size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <Typography sx={{ fontSize: '13px' }}>Chưa có dữ liệu phiếu trả hàng</Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
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
                                                        ...(col.id === 'stt' && { width: 70, minWidth: 70, maxWidth: 70 }),
                                                        ...(col.id === 'returnCode' && { minWidth: 150 }),
                                                        ...(col.id === 'relatedGrnCode' && { minWidth: 150 }),
                                                        ...(col.id === 'supplierName' && { minWidth: 170 }),
                                                        ...(col.id === 'returnDate' && { minWidth: 145 }),
                                                        ...(col.id === 'status' && { minWidth: 120 }),
                                                        ...(col.id === 'refundStatus' && { minWidth: 140 }),
                                                        ...(col.id === 'refundQuantity' && { minWidth: 110 }),
                                                        ...(col.id === 'refundedAmount' && { minWidth: 140 }),
                                                        ...(col.id === 'createdBy' && { minWidth: 120 }),
                                                        ...(col.id === 'createdAt' && { minWidth: 145 }),
                                                    }}
                                                    align={COLUMN_IDS_WITH_RIGHT_ALIGN.has(col.id) ? 'right' : 'left'}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, col.id)}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                                                                    opacity: 1,
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
                                                                    '& .MuiTableSortLabel-icon': { fontSize: '14px', opacity: orderBy === col.id ? 1 : 0 },
                                                                }}
                                                                hideSortIcon={false}
                                                            >
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
                                            <TableRow
                                                key={row.purchaseReturnId}
                                                hover
                                                sx={{
                                                    height: 56,
                                                    '&:last-child td': { borderBottom: 0 },
                                                    '&:hover': { bgcolor: '#f9fafb' },
                                                    '& .MuiTableCell-root': BODY_CELL_SX,
                                                }}
                                            >
                                                {visibleColumns.map((col) => {
                                                    const opts = { pageNumber: page + 1, pageSize };

                                                    if (col.id === 'stt') {
                                                        return (
                                                            <TableCell key={col.id} align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                                                {col.getValue(row, index, opts)}
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'returnCode') {
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Box
                                                                        component="a"
                                                                        href={`/purchase-returns/${row.purchaseReturnId}`}
                                                                        onClick={(e) => { e.preventDefault(); navigate(`/purchase-returns/${row.purchaseReturnId}`); }}
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

                                                    if (col.id === 'relatedGrnCode') {
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Box
                                                                        component="a"
                                                                        href={`/goods-receipts/${row.relatedGrnId}`}
                                                                        onClick={(e) => { e.preventDefault(); navigate(`/goods-receipts/${row.relatedGrnId}`); }}
                                                                        sx={{
                                                                            color: '#3b82f6', textDecoration: 'none', fontWeight: 500, cursor: 'pointer',
                                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                            '&:hover': { textDecoration: 'underline' },
                                                                        }}
                                                                        title={col.getValue(row, index, opts)}
                                                                    >
                                                                        {col.getValue(row, index, opts) || '-'}
                                                                    </Box>
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'status') {
                                                        const style = STATUS_STYLE[row.status] ?? { bgColor: 'rgba(107, 114, 128, 0.2)', label: row.status ?? '', dot: '•' };
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Chip
                                                                        label={`${style.dot} ${style.label}`}
                                                                        size="small"
                                                                        sx={{
                                                                            fontWeight: 500, fontSize: '12px', lineHeight: '16px', borderRadius: '999px',
                                                                            minWidth: 100, height: '26px', bgcolor: style.bgColor, color: '#374151',
                                                                            border: 'none', boxShadow: 'none',
                                                                            '& .MuiChip-label': { px: 1.5, py: 0, textAlign: 'left', display: 'block', width: '100%' },
                                                                        }}
                                                                    />
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'refundStatus') {
                                                        const style = REFUND_STATUS_STYLE[row.refundStatus] ?? { bgColor: 'rgba(107, 114, 128, 0.2)', label: row.refundStatus ?? '', dot: '•' };
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Chip
                                                                        label={`${style.dot} ${style.label}`}
                                                                        size="small"
                                                                        sx={{
                                                                            fontWeight: 500, fontSize: '12px', lineHeight: '16px', borderRadius: '999px',
                                                                            minWidth: 120, height: '26px', bgcolor: style.bgColor, color: '#374151',
                                                                            border: 'none', boxShadow: 'none',
                                                                            '& .MuiChip-label': { px: 1.5, py: 0, textAlign: 'left', display: 'block', width: '100%' },
                                                                        }}
                                                                    />
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'totalReturnedQty') {
                                                        return (
                                                            <TableCell key={col.id} align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', pr: 3 }}>
                                                                {Number(col.getValue(row) || 0).toLocaleString('vi-VN')}
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'totalReturnedAmount') {
                                                        return (
                                                            <TableCell key={col.id} align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', pr: 3 }}>
                                                                {formatCurrency(col.getValue(row))}
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (['returnDate', 'createdAt'].includes(col.id)) {
                                                        return (
                                                            <TableCell key={col.id} align="left" sx={{ color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                                                                {formatDate(row[col.id])}
                                                            </TableCell>
                                                        );
                                                    }

                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="left"
                                                            sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                            title={col.getValue(row)}
                                                        >
                                                            {col.getValue(row)}
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

                    {/* Pagination Section */}
                    <Box sx={{
                        flexShrink: 0, px: 2, py: 2, borderTop: '1px solid #f3f4f6',
                        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 2
                    }}>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>Số dòng / trang:</Typography>
                        <FormControl size="small" sx={{ minWidth: 72 }}>
                            <Select
                                value={pageSize}
                                onChange={handlePageSizeChange}
                                sx={{ height: 32, fontSize: '13px', borderRadius: '8px', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.1)' } }}
                            >
                                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                    <MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>{n}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                            {start}–{end} / {totalCount} (Tổng {pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 0} trang)
                        </Typography>
                        <Button
                            size="small" variant="outlined" disabled={page <= 0} onClick={() => handlePageChange(page - 1)}
                            sx={{ minWidth: 36, textTransform: 'none', fontSize: '13px', borderRadius: '8px', borderColor: 'rgba(0, 0, 0, 0.1)', '&:hover': { borderColor: 'rgba(0, 0, 0, 0.2)' } }}
                        >
                            Trước
                        </Button>
                        <Button
                            size="small" variant="outlined" disabled={end >= totalCount || totalCount === 0} onClick={() => handlePageChange(page + 1)}
                            sx={{ minWidth: 36, textTransform: 'none', fontSize: '13px', borderRadius: '8px', borderColor: 'rgba(0, 0, 0, 0.1)', '&:hover': { borderColor: 'rgba(0, 0, 0, 0.2)' } }}
                        >
                            Sau
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
