/*
 * Danh sách Yêu cầu xuất hàng.
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
    TableSortLabel,
    useTheme,
    useMediaQuery,
    Popover,
    FormGroup,
    FormControlLabel,
    Checkbox,
    FormControl,
    Select,
    MenuItem,
    Paper,
    Tooltip,
} from '@mui/material';
import { StatusBadge } from '@ui/badges';
import { Plus, Filter, Columns, GripVertical, PackageOpen, Send, RefreshCw } from 'lucide-react';
import SearchInput from '../components/SearchInput';
import ReleaseRequestFilterPopup from '../components/ReleaseRequestFilterPopup';
import { getReleaseRequests } from '../lib/releaseRequestService';
import { formatDateOnlyUtc, formatDateTimeNewlineUtc } from '../lib/dateUtils';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import '../styles/ListView.css';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const SummaryCard = ({ icon, label, value, color, bgColor }) => (
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
            {React.createElement(icon, { size: 22, color })}
        </Box>
        <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.3 }}>{label}</Typography>
            <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.2, mt: 0.25 }}>
                {value}
            </Typography>
        </Box>
    </Box>
);

const LS_COL_ORDER = 'rrColumnOrder';
const LS_SORT = 'rrSortConfig';

const headCellBaseSx = {
    fontWeight: 600,
    bgcolor: '#fafafa',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '12px',
    color: '#6b7280',
    py: 1.5,
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

const CHECKBOX_CELL_SX = {
    ...BODY_CELL_SX,
    width: 56,
    minWidth: 56,
    maxWidth: 56,
};

const StatusChip = ({ status }) => (
    <StatusBadge status={status} />
);

const LifecycleChip = ({ lifecycleStatus }) => (
    <StatusBadge status={lifecycleStatus} />
);

function getDisplayLifecycleStatus(status, lifecycleStatus, isQuotationFlow) {
    const normalizedStatus = String(status ?? '').toUpperCase();
    if (normalizedStatus === 'DRAFT') {
        return isQuotationFlow ? null : 'RR_DRAFT_PENDING_SUBMIT';
    }
    if (normalizedStatus === 'PENDING_ACC') return 'PENDING_ACC';
    if (normalizedStatus === 'REJECTED') return 'REJECTED';
    if (normalizedStatus !== 'APPROVED') return null;
    return lifecycleStatus;
}

const RR_COLUMNS = [
    { id: 'stt', label: 'STT', sortable: false, getValue: (row, idx, { pageNumber, pageSize }) => (pageNumber - 1) * pageSize + idx + 1 },
    { id: 'releaseRequestCode', label: 'Mã yêu cầu xuất hàng', sortable: true, getValue: (row) => row.releaseRequestCode ?? '' },
    { id: 'requestedByName', label: 'Nhân viên yêu cầu', sortable: true, getValue: (row) => row.requestedByName ?? '' },
    { id: 'receiverName', label: 'Người nhận', sortable: true, getValue: (row) => row.receiverName ?? '' },
    { id: 'companyName', label: 'Công ty', sortable: false, getValue: (row) => row.companyName ?? '' },
    { id: 'warehouseName', label: 'Kho xuất', sortable: true, getValue: (row) => row.warehouseName ?? '' },

    { id: 'requestedDate', label: 'Ngày yêu cầu', sortable: true, getValue: (row) => row.requestedDate ?? '' },
    { id: 'expectedDate', label: 'Ngày xuất dự kiến', sortable: true, getValue: (row) => row.expectedDate ?? '' },
    { id: 'totalItems', label: 'Tổng vật tư', sortable: false, getValue: (row) => row.totalItems ?? 0 },
    { id: 'totalRequestedQty', label: 'Tổng số lượng', sortable: false, getValue: (row) => row.totalRequestedQty ?? 0 },
    { id: 'status', label: 'Trạng thái', sortable: true, getValue: (row) => row.status ?? '' },
    { id: 'quotationStatus', label: 'Trạng thái báo giá', sortable: false, getValue: (row) => row.quotationStatus ?? '' },
    { id: 'lifecycleStatus', label: 'Tình trạng xuất', sortable: false, getValue: (row) => row.lifecycleStatus ?? '' },
    { id: 'createdAt', label: 'Ngày tạo', sortable: true, getValue: (row) => row.createdAt ?? '' },
];

const ALL_COLUMN_IDS = RR_COLUMNS.map((c) => c.id);
const DEFAULT_VISIBLE_COLUMN_IDS = RR_COLUMNS.map((c) => c.id);
const SORTABLE_COLUMN_IDS = RR_COLUMNS.filter((c) => c.sortable).map((c) => c.id);
const DATE_COLUMN_IDS = ['requestedDate', 'expectedDate', 'createdAt'];
const DEFAULT_SORT = { orderBy: 'createdAt', order: 'desc' };

function normalizeColumnOrder(rawOrder) {
    const validSet = new Set(ALL_COLUMN_IDS);
    const normalized = [];
    const seen = new Set();

    if (Array.isArray(rawOrder)) {
        rawOrder.forEach((id) => {
            if (validSet.has(id) && !seen.has(id)) {
                normalized.push(id);
                seen.add(id);
            }
        });
    }

    ALL_COLUMN_IDS.forEach((id) => {
        if (!seen.has(id)) normalized.push(id);
    });

    return normalized;
}

function getColumnOrderIndex(order, id) {
    const idx = order.indexOf(id);
    return idx >= 0 ? idx : Number.MAX_SAFE_INTEGER;
}

export default function ViewReleaseRequestList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const permissionRole = getPermissionRole(getRawRoleFromUser(authService.getUser()));
    const currentUserId = authService.getCurrentUserId();
    const canCreate = permissionRole !== 'ACCOUNTANTS' && permissionRole !== 'WAREHOUSE_KEEPER';

    const [list, setList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(DEFAULT_VISIBLE_COLUMN_IDS));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [orderBy, setOrderBy] = useState(DEFAULT_SORT.orderBy);
    const [order, setOrder] = useState(DEFAULT_SORT.order);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [columnOrder, setColumnOrder] = useState(() => {
        const saved = localStorage.getItem(LS_COL_ORDER);
        if (!saved) return ALL_COLUMN_IDS;
        try {
            return normalizeColumnOrder(JSON.parse(saved));
        } catch {
            return ALL_COLUMN_IDS;
        }
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);
    const [loading, setLoading] = useState(true);
    const [_error, setError] = useState(null);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        localStorage.setItem(LS_SORT, JSON.stringify(DEFAULT_SORT));
    }, []);

    useEffect(() => {
        const normalized = normalizeColumnOrder(columnOrder);
        const isSame = normalized.length === columnOrder.length
            && normalized.every((id, idx) => id === columnOrder[idx]);
        if (!isSame) {
            setColumnOrder(normalized);
            setTempColumnOrder(normalized);
            localStorage.setItem(LS_COL_ORDER, JSON.stringify(normalized));
        }
    }, [columnOrder]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getReleaseRequests({ page: page + 1, pageSize });
            setList(result.items || []);
            setTotalItems(Number(result.totalItems ?? 0));
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Không tải được danh sách yêu cầu xuất hàng';
            setError(msg);
            setList([]);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Polling ────────────────────────────────────────────────────
    const fetchDataRef = useRef(fetchData);
    useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);
    const { refetch } = usePolling('releaseRequests', () => fetchDataRef.current?.());

    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    const columnSelectorOpen = Boolean(columnSelectorAnchor);
    useEffect(() => {
        if (columnSelectorOpen) setTempColumnOrder(columnOrder);
    }, [columnSelectorOpen, columnOrder]);

    const handleColumnVisibilityChange = (id, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    };
    const handleSelectAllColumns = (checked) =>
        setVisibleColumnIds(checked ? new Set(DEFAULT_VISIBLE_COLUMN_IDS) : new Set());

    const visibleColumns = useMemo(() =>
        RR_COLUMNS
            .slice()
            .sort((a, b) => getColumnOrderIndex(columnOrder, a.id) - getColumnOrderIndex(columnOrder, b.id))
            .filter((c) => visibleColumnIds.has(c.id)),
        [columnOrder, visibleColumnIds]);

    const handleSortRequest = (id) => {
        if (!SORTABLE_COLUMN_IDS.includes(id)) return;
        let newOrderBy, newOrder;
        if (orderBy === id) {
            if (order === 'asc') { newOrder = 'desc'; newOrderBy = id; }
            else { newOrder = 'asc'; newOrderBy = null; }
        } else { newOrderBy = id; newOrder = 'asc'; }
        setOrderBy(newOrderBy); setOrder(newOrder); setPage(0);
        localStorage.setItem(LS_SORT, JSON.stringify({ orderBy: newOrderBy, order: newOrder }));
    };

    const handleDragStart = (e, id) => { setDraggedColumn(id); e.dataTransfer.effectAllowed = 'move'; };
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDragEnd = () => setDraggedColumn(null);
    const handleDrop = (e, targetId) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === targetId) return;
        const next = [...columnOrder];
        const from = next.indexOf(draggedColumn);
        const to = next.indexOf(targetId);
        next.splice(from, 1); next.splice(to, 0, draggedColumn);
        setColumnOrder(next);
        localStorage.setItem(LS_COL_ORDER, JSON.stringify(next));
        setDraggedColumn(null);
    };

    const handlePopupDragStart = (e, id) => { setDraggedPopupColumn(id); e.dataTransfer.effectAllowed = 'move'; };
    const handlePopupDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handlePopupDragEnd = () => setDraggedPopupColumn(null);
    const handlePopupDrop = (e, targetId) => {
        e.preventDefault();
        if (!draggedPopupColumn || draggedPopupColumn === targetId) return;
        const next = [...tempColumnOrder];
        const from = next.indexOf(draggedPopupColumn);
        const to = next.indexOf(targetId);
        next.splice(from, 1); next.splice(to, 0, draggedPopupColumn);
        setTempColumnOrder(next);
        setDraggedPopupColumn(null);
    };

    const handleSaveColumnOrder = () => {
        const normalized = normalizeColumnOrder(tempColumnOrder);
        setColumnOrder(normalized);
        localStorage.setItem(LS_COL_ORDER, JSON.stringify(normalized));
        setColumnSelectorAnchor(null);
    };
    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setColumnSelectorAnchor(null);
    };

    const filteredAndSortedRows = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        let result = [...list];

        // Chỉ người tạo mới thấy phiếu nháp của chính mình.
        result = result.filter((r) => {
            if (String(r.status || '').toUpperCase() !== 'DRAFT') return true;
            const ownerId = r.requestedBy ?? null;
            return ownerId != null && currentUserId != null && String(ownerId) === String(currentUserId);
        });

        if (term) {
            result = result.filter((r) =>
                (r.releaseRequestCode ?? '').toLowerCase().includes(term) ||
                (r.requestedByName ?? '').toLowerCase().includes(term) ||
                (r.receiverName ?? '').toLowerCase().includes(term) ||
                (r.warehouseName ?? '').toLowerCase().includes(term) ||
                (r.purpose ?? '').toLowerCase().includes(term) ||
                (r.companyName ?? '').toLowerCase().includes(term)
            );
        }
        if (filterValues.status) result = result.filter((r) => r.status === filterValues.status);
        if (filterValues.quotationStatus) result = result.filter((r) => (r.quotationStatus ?? '') === filterValues.quotationStatus);
        if (filterValues.lifecycleStatus) result = result.filter((r) => (r.lifecycleStatus ?? '') === filterValues.lifecycleStatus);
        if (filterValues.requestedBy) result = result.filter((r) => (r.requestedByName ?? '').toLowerCase().includes(filterValues.requestedBy.toLowerCase()));
        if (filterValues.receiverName) result = result.filter((r) => (r.receiverName ?? '').toLowerCase().includes(filterValues.receiverName.toLowerCase()));
        if (filterValues.fromExportDate) result = result.filter((r) => r.expectedDate && r.expectedDate >= filterValues.fromExportDate);
        if (filterValues.toExportDate) result = result.filter((r) => r.expectedDate && r.expectedDate <= filterValues.toExportDate);
        if (filterValues.fromCreatedDate) result = result.filter((r) => r.createdAt && r.createdAt.substring(0, 10) >= filterValues.fromCreatedDate);
        if (filterValues.toCreatedDate) result = result.filter((r) => r.createdAt && r.createdAt.substring(0, 10) <= filterValues.toCreatedDate);

        result.sort((a, b) => {
            const activeOrderBy = orderBy || DEFAULT_SORT.orderBy;
            const activeOrder = orderBy ? order : DEFAULT_SORT.order;

            let aVal = a[activeOrderBy] ?? '';
            let bVal = b[activeOrderBy] ?? '';
            let cmp = 0;
            if (DATE_COLUMN_IDS.includes(activeOrderBy)) {
                const tA = aVal ? new Date(aVal + (aVal.endsWith('Z') ? '' : 'Z')).getTime() : 0;
                const tB = bVal ? new Date(bVal + (bVal.endsWith('Z') ? '' : 'Z')).getTime() : 0;
                cmp = tA - tB;
            } else {
                cmp = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
            }
            return activeOrder === 'asc' ? cmp : -cmp;
        });
        return result;
    }, [list, searchTerm, filterValues, orderBy, order, currentUserId]);

    // API đã phân trang phía server; không slice thêm phía client theo page nữa.
    const totalCount = totalItems;
    const start = totalCount === 0 ? 0 : page * pageSize + 1;
    const end = totalCount === 0 ? 0 : Math.min(page * pageSize + filteredAndSortedRows.length, totalCount);
    const totalPages = pageSize > 0 ? Math.max(0, Math.ceil(totalCount / pageSize)) : 0;
    const rows = filteredAndSortedRows;

    useEffect(() => setPage(0), [searchTerm, filterValues]);

    const handleFilterApply = (vals) => { setFilterValues(vals); setPage(0); };
    const handlePageChange = (p) => setPage(p);
    const handlePageSizeChange = (e) => { setPageSize(Number(e.target.value)); setPage(0); };

    const handleSelectAll = (checked) =>
        setSelectedIds(checked ? new Set(rows.map((r) => r.releaseRequestId)) : new Set());
    const handleSelectRow = (id, checked) =>
        setSelectedIds((prev) => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    const isAllSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.releaseRequestId));
    const isSomeSelected = rows.some((r) => selectedIds.has(r.releaseRequestId)) && !isAllSelected;

    const activeFilterCount = Object.values(filterValues).filter((v) => v && v !== '').length;

    const iconBtnSx = {
        border: '1px solid #e5e7eb',
        bgcolor: '#ffffff',
        borderRadius: '10px',
        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
    };

    return (
        <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
            {/* Page header */}
            <Box sx={{ flexShrink: 0, px: { xs: 2, sm: 2 }, py: 2.5, bgcolor: '#fafafa' }}>
                <Typography variant="h5" component="h1" fontWeight="600" sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}>
                    Yêu cầu xuất hàng
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Release Request
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
                    <SummaryCard icon={Send} label="Tổng yêu cầu xuất" value={totalCount.toLocaleString()} color="#6b7280" bgColor="rgba(107,114,128,0.1)" />
                    <SummaryCard icon={Send} label="Chờ duyệt" value={filteredAndSortedRows.filter((r) => r.status === 'PENDING_ACC').length.toLocaleString()} color="#2563eb" bgColor="rgba(37,99,235,0.1)" />
                    <SummaryCard icon={Send} label="Đã duyệt" value={filteredAndSortedRows.filter((r) => r.status === 'APPROVED').length.toLocaleString()} color="#059669" bgColor="rgba(5,150,105,0.1)" />
                </Box>
            </Box>

            {/* Filter Popup */}
            <ReleaseRequestFilterPopup
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                initialValues={filterValues}
                onApply={handleFilterApply}
            />

            {/* Main Card */}
            <Box sx={{ flex: 1, px: { xs: 2, sm: 2 }, pb: 2, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Paper
                    className="list-view"
                    elevation={0}
                    sx={{
                        flex: 1, minHeight: 0, overflow: 'hidden',
                        display: 'flex', flexDirection: 'column',
                        border: '1px solid #e5e7eb', borderRadius: '12px', bgcolor: '#ffffff',
                    }}
                >
                    {/* Toolbar */}
                    <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid #f3f4f6' }}>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
                            <SearchInput
                                placeholder="Tìm theo mã, nhân viên, người nhận, kho, lý do..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{
                                    flex: '1 1 200px', minWidth: isMobile ? '100%' : 200, maxWidth: isMobile ? '100%' : 480,
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px',
                                        '& fieldset': { border: 'none' },
                                        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                        '&.Mui-focused': { bgcolor: '#ffffff', borderColor: '#3b82f6', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' },
                                        '& input::placeholder': { color: '#9ca3af', fontSize: '13px' },
                                    },
                                }}
                            />

                            <Tooltip title={activeFilterCount > 0 ? `Bộ lọc (${activeFilterCount})` : 'Bộ lọc'}>
                                <IconButton onClick={() => setFilterOpen(true)} aria-label="Bộ lọc"
                                    sx={{ ...iconBtnSx, color: activeFilterCount > 0 ? '#3b82f6' : 'inherit', borderColor: activeFilterCount > 0 ? '#3b82f6' : '#e5e7eb' }}>
                                    <Filter size={20} />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton onClick={(e) => setColumnSelectorAnchor(e.currentTarget)} aria-label="Chọn cột" sx={iconBtnSx}>
                                    <Columns size={20} />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Làm mới danh sách">
                                <IconButton
                                    onClick={handleRefresh}
                                    aria-label="Làm mới"
                                    disabled={loading}
                                    sx={iconBtnSx}
                                >
                                    <RefreshCw size={20} className={loading ? 'spin' : ''} />
                                </IconButton>
                            </Tooltip>

                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                {canCreate && (
                                    <Button
                                        variant="contained"
                                        startIcon={<Plus size={18} />}
                                        onClick={() => navigate('/release-request/create')}
                                        sx={{
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            textTransform: 'none',
                                            borderRadius: '10px',
                                            height: 38,
                                            px: 2.5,
                                            bgcolor: '#3b82f6',
                                            boxShadow: '0 1px 2px rgba(59,130,246,0.3)',
                                            '&:hover': {
                                                bgcolor: '#2563eb',
                                                boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
                                            },
                                        }}
                                    >
                                        Tạo yêu cầu xuất hàng
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    {/* Column Selector Popover */}
                    <Popover
                        open={columnSelectorOpen}
                        anchorEl={columnSelectorAnchor}
                        onClose={handleCancelColumnOrder}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        slotProps={{ paper: { elevation: 0, sx: { mt: 1, width: 340, maxHeight: '70vh', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column' } } }}
                    >
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>Chọn cột & Sắp xếp</Typography>
                        </Box>
                        <Box sx={{ px: 2.5, py: 2, flex: 1, minHeight: 0, overflowY: 'auto', '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px' } }}>
                            <FormGroup>
                                <FormControlLabel
                                    control={<Checkbox checked={visibleColumnIds.size === RR_COLUMNS.length} indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < RR_COLUMNS.length} onChange={(e) => handleSelectAllColumns(e.target.checked)} sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' }, '&.MuiCheckbox-indeterminate': { color: '#3b82f6' } }} />}
                                    label={<Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Tất cả</Typography>}
                                    sx={{ mb: 1, py: 0.5 }}
                                />
                                {RR_COLUMNS.slice().sort((a, b) => getColumnOrderIndex(tempColumnOrder, a.id) - getColumnOrderIndex(tempColumnOrder, b.id)).map((col) => (
                                    <Box key={col.id}
                                        sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: draggedPopupColumn === col.id ? '#f9fafb' : 'transparent', opacity: draggedPopupColumn === col.id ? 0.5 : 1, transition: 'all 0.2s', borderRadius: '8px', px: 0.75, py: 0.25, '&:hover': { bgcolor: '#f9fafb' } }}
                                        onDragOver={handlePopupDragOver}
                                        onDrop={(e) => handlePopupDrop(e, col.id)}
                                    >
                                        <Box draggable onDragStart={(e) => handlePopupDragStart(e, col.id)} onDragEnd={handlePopupDragEnd}
                                            sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', '&:active': { cursor: 'grabbing' }, color: '#9ca3af', '&:hover': { color: '#6b7280' } }}>
                                            <GripVertical size={14} />
                                        </Box>
                                        <FormControlLabel
                                            control={<Checkbox checked={visibleColumnIds.has(col.id)} onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)} sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#3b82f6' } }} />}
                                            label={<Typography sx={{ fontSize: '13px', color: '#374151' }}>{col.label}</Typography>}
                                            sx={{ flex: 1, m: 0, py: 0.5 }}
                                        />
                                    </Box>
                                ))}
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
                                <PackageOpen size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
                                <Typography sx={{ fontSize: '13px' }}>Chưa có yêu cầu xuất hàng</Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {/* Checkbox header */}
                                            <TableCell padding="checkbox" sx={{ fontWeight: 600, bgcolor: '#fafafa', width: 56, minWidth: 56, maxWidth: 56, borderBottom: '2px solid #e5e7eb', fontSize: '12px', px: 2 }}>
                                                <Checkbox checked={isAllSelected} indeterminate={isSomeSelected} onChange={(e) => handleSelectAll(e.target.checked)} size="small" />
                                            </TableCell>
                                            {visibleColumns.map((col) => (
                                                <TableCell key={col.id}
                                                    sx={{ ...headCellBaseSx, bgcolor: draggedColumn === col.id ? 'action.hover' : '#fafafa', whiteSpace: 'nowrap', opacity: draggedColumn === col.id ? 0.5 : 1, transition: 'all 0.2s', cursor: col.sortable ? 'pointer' : 'default' }}
                                                    align="left"
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
                                        {rows.map((row, index) => {
                                            const opts = { pageNumber: page + 1, pageSize };
                                            return (
                                                <TableRow key={row.releaseRequestId} hover
                                                    sx={{ height: 56, '&:last-child td': { borderBottom: 0 }, '&:hover': { bgcolor: '#f9fafb' }, '& .MuiTableCell-root': BODY_CELL_SX, '& .MuiTableCell-paddingCheckbox': CHECKBOX_CELL_SX }}>
                                                    <TableCell padding="checkbox">
                                                        <Checkbox checked={selectedIds.has(row.releaseRequestId)} onChange={(e) => handleSelectRow(row.releaseRequestId, e.target.checked)} size="small" />
                                                    </TableCell>
                                                    {visibleColumns.map((col) => {
                                                        if (col.id === 'stt') {
                                                            return <TableCell key={col.id} align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>{col.getValue(row, index, opts)}</TableCell>;
                                                        }

                                                        if (col.id === 'releaseRequestCode') {
                                                            return (
                                                                <TableCell key={col.id} align="left">
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                        <Box component="a"
                                                                            href={`/release-request/${row.releaseRequestId}`}
                                                                            onClick={(e) => { e.preventDefault(); navigate(`/release-request/${row.releaseRequestId}`); }}
                                                                            sx={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', '&:hover': { textDecoration: 'underline' } }}
                                                                            title={row.releaseRequestCode}>
                                                                            {row.releaseRequestCode}
                                                                        </Box>
                                                                    </Box>
                                                                </TableCell>
                                                            );
                                                        }

                                                        if (col.id === 'status') {
                                                            return (
                                                                <TableCell key={col.id} align="left">
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                        <StatusChip status={row.status} />
                                                                    </Box>
                                                                </TableCell>
                                                            );
                                                        }

                                                        if (col.id === 'quotationStatus') {
                                                            const quotationStatus = row.quotationStatus ?? '';
                                                            const isQuotationFlow = Boolean(row.isQuotationFlow);
                                                            return (
                                                                <TableCell key={col.id} align="left">
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                        {isQuotationFlow && quotationStatus ? (
                                                                            <StatusBadge status={quotationStatus} />
                                                                        ) : (
                                                                            <Box component="span" sx={{ color: '#d1d5db' }}>-</Box>
                                                                        )}
                                                                    </Box>
                                                                </TableCell>
                                                            );
                                                        }

                                                        if (col.id === 'lifecycleStatus') {
                                                            const displayLifecycleStatus = getDisplayLifecycleStatus(row.status, row.lifecycleStatus, row.isQuotationFlow);
                                                            return (
                                                                <TableCell key={col.id} align="left">
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                        {displayLifecycleStatus ? (
                                                                            <LifecycleChip lifecycleStatus={displayLifecycleStatus} />
                                                                        ) : (
                                                                            <Box component="span" sx={{ color: '#d1d5db' }}>-</Box>
                                                                        )}
                                                                    </Box>
                                                                </TableCell>
                                                            );
                                                        }

                                                        if (col.id === 'totalItems' || col.id === 'totalRequestedQty') {
                                                            return (
                                                                <TableCell key={col.id} align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                                                    {(row[col.id] ?? 0).toLocaleString()}
                                                                </TableCell>
                                                            );
                                                        }

                                                        if (col.id === 'purpose') {
                                                            const val = col.getValue(row);
                                                            return (
                                                                <TableCell key={col.id} align="left" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val}>
                                                                    {val || <Box component="span" sx={{ color: '#d1d5db' }}>-</Box>}
                                                                </TableCell>
                                                            );
                                                        }

                                                        if (col.id === 'companyName') {
                                                            const val = col.getValue(row);
                                                            return (
                                                                <TableCell key={col.id} align="left" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val}>
                                                                    {val || <Box component="span" sx={{ color: '#d1d5db' }}>-</Box>}
                                                                </TableCell>
                                                            );
                                                        }

                                                        if (DATE_COLUMN_IDS.includes(col.id)) {
                                                            const val = row[col.id];
                                                            if (col.id === 'createdAt') {
                                                                return (
                                                                    <TableCell key={col.id} align="left" sx={{ color: '#6b7280', whiteSpace: 'pre-line' }}>
                                                                        {formatDateTimeNewlineUtc(val)}
                                                                    </TableCell>
                                                                );
                                                            }
                                                            return (
                                                                <TableCell key={col.id} align="left" sx={{ color: '#6b7280' }}>
                                                                    {val ? formatDateOnlyUtc(val) : '-'}
                                                                </TableCell>
                                                            );
                                                        }

                                                        return (
                                                            <TableCell key={col.id} align="left" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={col.getValue(row)}>
                                                                {col.getValue(row) || <Box component="span" sx={{ color: '#d1d5db' }}>-</Box>}
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
                            {start}-{end} / {totalCount} (Tổng {totalPages} trang)
                        </Typography>
                        <Button size="small" variant="outlined" disabled={page <= 0} onClick={() => handlePageChange(page - 1)}
                            sx={{ minWidth: 36, textTransform: 'none', fontSize: '13px', borderRadius: '8px', borderColor: 'rgba(0,0,0,0.1)', '&:hover': { borderColor: 'rgba(0,0,0,0.2)' } }}>
                            Trước
                        </Button>
                        <Button size="small" variant="outlined" disabled={totalCount === 0 || page >= totalPages - 1} onClick={() => handlePageChange(page + 1)}
                            sx={{ minWidth: 36, textTransform: 'none', fontSize: '13px', borderRadius: '8px', borderColor: 'rgba(0,0,0,0.1)', '&:hover': { borderColor: 'rgba(0,0,0,0.2)' } }}>
                            Sau
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}