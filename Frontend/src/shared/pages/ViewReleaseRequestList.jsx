/*
 * Danh sách Yêu cầu xuất hàng – mock data.
 */
import React, { useState, useEffect, useMemo } from 'react';
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
    TableSortLabel,
    Chip,
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
import { Plus, Filter, Columns, GripVertical, PackageOpen } from 'lucide-react';
import SearchInput from '../components/SearchInput';
import ReleaseRequestFilterPopup from '../components/ReleaseRequestFilterPopup';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
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

const STATUS_STYLE = {
    PENDING:   { bgColor: 'rgba(251,191,36,0.20)', label: 'Chờ duyệt' },
    APPROVED:  { bgColor: 'rgba(16,185,129,0.18)', label: 'Đã duyệt' },
    REJECTED:  { bgColor: 'rgba(239,68,68,0.15)',  label: 'Từ chối' },
    COMPLETED: { bgColor: 'rgba(59,130,246,0.15)', label: 'Hoàn thành' },
};

const RR_COLUMNS = [
    { id: 'stt',                  label: 'STT',                   sortable: false, getValue: (row, idx, { pageNumber, pageSize }) => (pageNumber - 1) * pageSize + idx + 1 },
    { id: 'releaseRequestCode',   label: 'Mã yêu cầu xuất hàng',  sortable: true,  getValue: (row) => row.releaseRequestCode ?? '' },
    { id: 'createdByName',        label: 'Nhân viên tạo',           sortable: true,  getValue: (row) => row.createdByName ?? '' },
    { id: 'receiverName',         label: 'Người nhận',              sortable: true,  getValue: (row) => row.receiverName ?? '' },
    { id: 'expectedExportDate',   label: 'Ngày xuất dự kiến',      sortable: true,  getValue: (row) => row.expectedExportDate ?? '' },
    { id: 'status',               label: 'Trạng thái',              sortable: true,  getValue: (row) => row.status ?? '' },
    { id: 'createdAt',            label: 'Ngày tạo',                sortable: true,  getValue: (row) => row.createdAt ?? '' },
];

const DEFAULT_VISIBLE_COLUMN_IDS = RR_COLUMNS.map((c) => c.id);
const SORTABLE_COLUMN_IDS = RR_COLUMNS.filter((c) => c.sortable).map((c) => c.id);
const DATE_COLUMN_IDS = ['expectedExportDate', 'createdAt'];

const MOCK_RELEASE_REQUESTS = [
    { releaseRequestId: 1, releaseRequestCode: 'XR-2025-001', createdByName: 'Nguyễn Văn A', receiverName: 'Trần Thị B', expectedExportDate: '2025-01-15', status: 'PENDING', createdAt: '2025-01-14T08:00:00' },
    { releaseRequestId: 2, releaseRequestCode: 'XR-2025-002', createdByName: 'Nguyễn Văn A', receiverName: 'Lê Văn C', expectedExportDate: '2025-01-20', status: 'APPROVED', createdAt: '2025-01-19T09:00:00' },
    { releaseRequestId: 3, releaseRequestCode: 'XR-2025-003', createdByName: 'Phạm Thị D', receiverName: 'Hoàng Văn E', expectedExportDate: '2025-02-05', status: 'REJECTED', createdAt: '2025-02-04T10:00:00' },
    { releaseRequestId: 4, releaseRequestCode: 'XR-2025-004', createdByName: 'Phạm Thị D', receiverName: 'Đặng Thị F', expectedExportDate: '2025-02-10', status: 'PENDING', createdAt: '2025-02-09T11:00:00' },
    { releaseRequestId: 5, releaseRequestCode: 'XR-2025-005', createdByName: 'Vũ Văn G', receiverName: 'Bùi Thị H', expectedExportDate: '2025-02-15', status: 'COMPLETED', createdAt: '2025-02-14T14:00:00' },
    { releaseRequestId: 6, releaseRequestCode: 'XR-2025-006', createdByName: 'Vũ Văn G', receiverName: 'Đỗ Văn I', expectedExportDate: '2025-03-01', status: 'PENDING', createdAt: '2025-02-28T15:00:00' },
    { releaseRequestId: 7, releaseRequestCode: 'XR-2025-007', createdByName: 'Ngô Thị K', receiverName: 'Lý Văn L', expectedExportDate: '2025-03-10', status: 'APPROVED', createdAt: '2025-03-09T08:30:00' },
    { releaseRequestId: 8, releaseRequestCode: 'XR-2025-008', createdByName: 'Ngô Thị K', receiverName: 'Mai Thị M', expectedExportDate: '2025-03-20', status: 'PENDING', createdAt: '2025-03-19T16:00:00' },
    { releaseRequestId: 9, releaseRequestCode: 'XR-2025-009', createdByName: 'Trịnh Văn N', receiverName: 'Phạm Thị P', expectedExportDate: '2025-04-05', status: 'COMPLETED', createdAt: '2025-04-04T09:00:00' },
    { releaseRequestId: 10, releaseRequestCode: 'XR-2025-010', createdByName: 'Trịnh Văn N', receiverName: 'Vũ Thị Q', expectedExportDate: '2025-04-12', status: 'REJECTED', createdAt: '2025-04-11T10:30:00' },
    { releaseRequestId: 11, releaseRequestCode: 'XR-2025-011', createdByName: 'Đinh Văn R', receiverName: 'Nguyễn Thị S', expectedExportDate: '2025-04-20', status: 'PENDING', createdAt: '2025-04-19T11:00:00' },
    { releaseRequestId: 12, releaseRequestCode: 'XR-2025-012', createdByName: 'Đinh Văn R', receiverName: 'Chu Thị T', expectedExportDate: '2025-05-01', status: 'APPROVED', createdAt: '2025-04-30T13:00:00' },
];

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('vi-VN');
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('vi-VN') + '\n' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const StatusChip = ({ status }) => {
    const style = STATUS_STYLE[status?.toUpperCase()] ?? { bgColor: 'rgba(107,114,128,0.15)', label: status ?? '-' };
    return (
        <Chip
            label={`• ${style.label}`}
            size="small"
            sx={{
                fontWeight: 500,
                fontSize: '12px',
                lineHeight: '16px',
                borderRadius: '999px',
                minWidth: 100,
                height: '26px',
                bgcolor: style.bgColor,
                color: '#374151',
                border: 'none',
                boxShadow: 'none',
                '& .MuiChip-label': { px: 1.5, py: 0, textAlign: 'left', display: 'block', width: '100%' },
            }}
        />
    );
};

export default function ViewReleaseRequestList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();

    const [list, setList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(DEFAULT_VISIBLE_COLUMN_IDS));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [orderBy, setOrderBy] = useState(null);
    const [order, setOrder] = useState('asc');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [columnOrder, setColumnOrder] = useState(() => {
        const saved = localStorage.getItem(LS_COL_ORDER);
        return saved ? JSON.parse(saved) : RR_COLUMNS.map((c) => c.id);
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);

    useEffect(() => {
        const saved = localStorage.getItem(LS_SORT);
        if (saved) {
            const cfg = JSON.parse(saved);
            if (cfg.orderBy) { setOrderBy(cfg.orderBy); setOrder(cfg.order); }
        }
    }, []);

    useEffect(() => {
        setList(MOCK_RELEASE_REQUESTS);
    }, []);

    useEffect(() => {
        if (Boolean(columnSelectorAnchor)) setTempColumnOrder(columnOrder);
    }, [Boolean(columnSelectorAnchor)]);

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
            .sort((a, b) => columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id))
            .filter((c) => visibleColumnIds.has(c.id)),
        [columnOrder, visibleColumnIds]);

    const handleSortRequest = (id) => {
        if (!SORTABLE_COLUMN_IDS.includes(id)) return;
        let newOrderBy, newOrder;
        if (orderBy === id) {
            if (order === 'asc') { newOrder = 'desc'; newOrderBy = id; }
            else                  { newOrder = 'asc';  newOrderBy = null; }
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
        setColumnOrder(tempColumnOrder);
        localStorage.setItem(LS_COL_ORDER, JSON.stringify(tempColumnOrder));
        setColumnSelectorAnchor(null);
    };
    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setColumnSelectorAnchor(null);
    };

    const filteredAndSortedRows = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        let result = [...list];

        if (term) {
            result = result.filter((r) =>
                (r.releaseRequestCode ?? '').toLowerCase().includes(term) ||
                (r.createdByName ?? '').toLowerCase().includes(term) ||
                (r.receiverName ?? '').toLowerCase().includes(term)
            );
        }
        if (filterValues.status) result = result.filter((r) => r.status === filterValues.status);
        if (filterValues.createdBy) result = result.filter((r) => (r.createdByName ?? '').toLowerCase().includes(filterValues.createdBy.toLowerCase()));
        if (filterValues.receiverName) result = result.filter((r) => (r.receiverName ?? '').toLowerCase().includes(filterValues.receiverName.toLowerCase()));
        if (filterValues.fromExportDate) result = result.filter((r) => r.expectedExportDate && r.expectedExportDate >= filterValues.fromExportDate);
        if (filterValues.toExportDate) result = result.filter((r) => r.expectedExportDate && r.expectedExportDate <= filterValues.toExportDate);
        if (filterValues.fromCreatedDate) result = result.filter((r) => r.createdAt && r.createdAt.substring(0, 10) >= filterValues.fromCreatedDate);
        if (filterValues.toCreatedDate) result = result.filter((r) => r.createdAt && r.createdAt.substring(0, 10) <= filterValues.toCreatedDate);

        result.sort((a, b) => {
            if (!orderBy) return 0;
            let aVal = a[orderBy] ?? '';
            let bVal = b[orderBy] ?? '';
            let cmp = 0;
            if (DATE_COLUMN_IDS.includes(orderBy)) {
                const tA = aVal ? new Date(aVal + (aVal.endsWith('Z') ? '' : 'Z')).getTime() : 0;
                const tB = bVal ? new Date(bVal + (bVal.endsWith('Z') ? '' : 'Z')).getTime() : 0;
                cmp = tA - tB;
            } else {
                cmp = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
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

    const columnSelectorOpen = Boolean(columnSelectorAnchor);
    const activeFilterCount = Object.values(filterValues).filter((v) => v && v !== '').length;

    const iconBtnSx = {
        border: '1px solid #e5e7eb',
        bgcolor: '#ffffff',
        borderRadius: '10px',
        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
    };

    return (
        <Box sx={{ height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
            {/* Page header */}
            <Box sx={{ flexShrink: 0, px: { xs: 2, sm: 2 }, py: 2.5, bgcolor: '#fafafa' }}>
                <Typography variant="h5" component="h1" fontWeight="600" sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}>
                    Yêu cầu xuất hàng
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Release Request
                </Typography>
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
                                placeholder="Tìm theo mã, nhân viên tạo, người nhận..."
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

                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                <Button
                                    variant="contained"
                                    startIcon={<Plus size={18} />}
                                    sx={{
                                        fontSize: '13px', fontWeight: 500, textTransform: 'none',
                                        borderRadius: '10px', height: 38, px: 2.5,
                                        bgcolor: '#3b82f6', boxShadow: '0 1px 2px rgba(59,130,246,0.3)',
                                        '&:hover': { bgcolor: '#2563eb', boxShadow: '0 4px 12px rgba(59,130,246,0.4)' },
                                    }}
                                >
                                    Tạo yêu cầu xuất hàng
                                </Button>
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
                                {RR_COLUMNS.slice().sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id)).map((col) => (
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
                                                                            href={`/good-delivery-notes/${row.releaseRequestId}`}
                                                                            onClick={(e) => { e.preventDefault(); navigate(`/good-delivery-notes/${row.releaseRequestId}`); }}
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

                                                        if (DATE_COLUMN_IDS.includes(col.id)) {
                                                            return (
                                                                <TableCell key={col.id} align="left" sx={{ color: '#6b7280', whiteSpace: col.id === 'createdAt' ? 'pre-line' : 'nowrap' }}>
                                                                    {col.id === 'createdAt' ? formatDateTime(row.createdAt) : formatDate(row.expectedExportDate)}
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
                </Paper>
            </Box>
        </Box>
    );
}
