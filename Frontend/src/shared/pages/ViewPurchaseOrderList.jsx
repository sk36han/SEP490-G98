import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
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
} from '@mui/material';
import { FileText, Filter, Eye, Edit, Columns, Plus, ArrowUpDown, GripVertical } from 'lucide-react';
import { removeDiacritics } from '../utils/stringUtils';
import SearchInput from '../components/SearchInput';
import PurchaseOrderFilterPopup from '../components/PurchaseOrderFilterPopup';
import '../styles/ListView.css';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const APPROVAL_STATUS_STYLE = {
    Pending: { color: 'warning.main', borderColor: 'warning.main', label: 'Chờ duyệt' },
    Approved: { color: 'success.main', borderColor: 'success.main', label: 'Đã duyệt' },
    Rejected: { color: 'error.main', borderColor: 'error.main', label: 'Từ chối' },
};

const RECEIVING_STATUS_STYLE = {
    Pending: { color: 'info.main', borderColor: 'info.main', label: 'Chờ nhập' },
    Partial: { color: 'warning.main', borderColor: 'warning.main', label: 'Nhập một phần' },
    Completed: { color: 'success.main', borderColor: 'success.main', label: 'Nhập toàn bộ' },
};

const PO_COLUMNS = [
    { id: 'stt', label: 'STT', sortable: false, getValue: (row, index, { pageNumber, pageSize }) => (pageNumber - 1) * pageSize + index + 1 },
    { id: 'orderCode', label: 'Mã đơn đặt hàng nhập', sortable: true, getValue: (row) => row.orderCode ?? '' },
    { id: 'warehouseName', label: 'Kho nhận', sortable: true, getValue: (row) => row.warehouseName ?? '' },
    { id: 'approvalStatus', label: 'Trạng thái duyệt', sortable: true, getValue: (row) => APPROVAL_STATUS_STYLE[row.approvalStatus]?.label ?? row.approvalStatus ?? '' },
    { id: 'receivingStatus', label: 'Trạng thái nhập hàng', sortable: true, getValue: (row) => RECEIVING_STATUS_STYLE[row.receivingStatus]?.label ?? row.receivingStatus ?? '' },
    { id: 'supplierName', label: 'Nhà cung cấp', sortable: true, getValue: (row) => row.supplierName ?? '' },
    { id: 'creator', label: 'Nhân viên tạo', sortable: true, getValue: (row) => row.creator ?? '' },
    { id: 'responsiblePerson', label: 'Nhân viên phụ trách', sortable: true, getValue: (row) => row.responsiblePerson ?? '' },
    { id: 'totalOrderedQuantity', label: 'Số lượng đặt', sortable: true, getValue: (row) => row.totalOrderedQuantity ?? 0 },
    { id: 'totalReceivedQuantity', label: 'Số lượng đã nhập', sortable: true, getValue: (row) => row.totalReceivedQuantity ?? 0 },
    { id: 'remainingQuantity', label: 'Số lượng còn lại', sortable: true, getValue: (row) => row.remainingQuantity ?? 0 },
    { id: 'createdAt', label: 'Ngày tạo', sortable: true, getValue: (row) => row.createdAt ?? '' },
    { id: 'actions', label: 'Thao tác', sortable: false, getValue: () => '' },
];

/** Mặc định hiển thị tất cả các cột */
const DEFAULT_VISIBLE_COLUMN_IDS = PO_COLUMNS.map((c) => c.id);
const SORTABLE_COLUMN_IDS = PO_COLUMNS.filter((c) => c.sortable).map((c) => c.id);

/** Mock danh sách đơn mua – đủ cột theo yêu cầu (UI only). */
const MOCK_PO_LIST = [
    { 
        purchaseOrderId: 1, 
        orderCode: 'PO-2025-001', 
        warehouseName: 'Kho Hà Nội', 
        approvalStatus: 'Pending', 
        receivingStatus: 'Pending', 
        supplierName: 'Công ty TNHH ABC', 
        creator: 'Nguyễn Văn A', 
        responsiblePerson: 'Trần Thị B', 
        totalOrderedQuantity: 500, 
        totalReceivedQuantity: 0, 
        remainingQuantity: 500, 
        createdAt: '2025-02-09T08:00:00' 
    },
    { 
        purchaseOrderId: 2, 
        orderCode: 'PO-2025-002', 
        warehouseName: 'Kho Đà Nẵng', 
        approvalStatus: 'Approved', 
        receivingStatus: 'Partial', 
        supplierName: 'Công ty CP XYZ', 
        creator: 'Lê Văn C', 
        responsiblePerson: 'Phạm Thị D', 
        totalOrderedQuantity: 1000, 
        totalReceivedQuantity: 350, 
        remainingQuantity: 650, 
        createdAt: '2025-02-11T09:00:00' 
    },
    { 
        purchaseOrderId: 3, 
        orderCode: 'PO-2025-003', 
        warehouseName: 'Kho Hồ Chí Minh', 
        approvalStatus: 'Approved', 
        receivingStatus: 'Completed', 
        supplierName: 'Công ty TNHH ABC', 
        creator: 'Nguyễn Văn A', 
        responsiblePerson: 'Trần Thị B', 
        totalOrderedQuantity: 300, 
        totalReceivedQuantity: 300, 
        remainingQuantity: 0, 
        createdAt: '2025-02-13T14:00:00' 
    },
    { 
        purchaseOrderId: 4, 
        orderCode: 'PO-2025-004', 
        warehouseName: 'Kho Hà Nội', 
        approvalStatus: 'Rejected', 
        receivingStatus: 'Pending', 
        supplierName: 'Công ty CP XYZ', 
        creator: 'Phạm Thị D', 
        responsiblePerson: 'Lê Văn C', 
        totalOrderedQuantity: 750, 
        totalReceivedQuantity: 0, 
        remainingQuantity: 750, 
        createdAt: '2025-02-14T16:00:00' 
    },
];

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatDateOnly = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('vi-VN');
};

export default function ViewPurchaseOrderList() {
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
        const saved = localStorage.getItem('poColumnOrder');
        return saved ? JSON.parse(saved) : PO_COLUMNS.map(c => c.id);
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);
    const [sortConfig, setSortConfig] = useState(() => {
        const saved = localStorage.getItem('poSortConfig');
        return saved ? JSON.parse(saved) : { orderBy: null, order: 'asc' };
    });

    useEffect(() => {
        if (sortConfig.orderBy) {
            setOrderBy(sortConfig.orderBy);
            setOrder(sortConfig.order);
        }
    }, []);

    useEffect(() => setList(MOCK_PO_LIST), []);

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
    const visibleColumns = PO_COLUMNS
        .sort((a, b) => columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id))
        .filter((col) => visibleColumnIds.has(col.id));
    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    useEffect(() => {
        if (columnSelectorOpen) {
            setTempColumnOrder(columnOrder);
        }
    }, [columnSelectorOpen, columnOrder]);

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
        
        // Lưu cấu hình sort
        localStorage.setItem('poSortConfig', JSON.stringify({ orderBy: newOrderBy, order: newOrder }));
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
        // Lưu cấu hình column order
        localStorage.setItem('poColumnOrder', JSON.stringify(newOrder));
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
        localStorage.setItem('poColumnOrder', JSON.stringify(tempColumnOrder));
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
                normalize(row.orderCode ?? '').includes(term) ||
                normalize(row.supplierName ?? '').includes(term) ||
                normalize(row.creator ?? '').includes(term) ||
                normalize(row.responsiblePerson ?? '').includes(term) ||
                normalize(row.warehouseName ?? '').includes(term)
            );
        }
        if (filterValues.approvalStatus) {
            result = result.filter((row) => row.approvalStatus === filterValues.approvalStatus);
        }
        if (filterValues.receivingStatus) {
            result = result.filter((row) => row.receivingStatus === filterValues.receivingStatus);
        }
        if (filterValues.supplier) {
            result = result.filter((row) => normalize(row.supplierName ?? '').includes(normalize(filterValues.supplier)));
        }
        if (filterValues.warehouse) {
            result = result.filter((row) => normalize(row.warehouseName ?? '').includes(normalize(filterValues.warehouse)));
        }
        if (filterValues.creator) {
            result = result.filter((row) => normalize(row.creator ?? '').includes(normalize(filterValues.creator)));
        }
        if (filterValues.product) {
            // TODO: Filter by product when product list is available in PO data
        }
        if (filterValues.fromDate) {
            result = result.filter((row) => {
                const d = row.createdAt;
                return d && String(d).slice(0, 10) >= filterValues.fromDate;
            });
        }
        if (filterValues.toDate) {
            result = result.filter((row) => {
                const d = row.createdAt;
                return d && String(d).slice(0, 10) <= filterValues.toDate;
            });
        }

        result.sort((a, b) => {
            if (!orderBy) return 0;
            
            const aVal = a[orderBy];
            const bVal = b[orderBy];
            const isDate = ['createdAt'].includes(orderBy);
            const isNumber = ['totalOrderedQuantity', 'totalReceivedQuantity', 'remainingQuantity'].includes(orderBy);
            let cmp = 0;
            if (isDate) {
                const tA = aVal ? new Date(aVal).getTime() : 0;
                const tB = bVal ? new Date(bVal).getTime() : 0;
                cmp = tA - tB;
            } else if (isNumber) {
                cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
            } else {
                const strA = String(aVal ?? '').toLowerCase();
                const strB = String(bVal ?? '').toLowerCase();
                cmp = strA.localeCompare(strB);
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
        setPage(0);
    };
    const handlePageChange = (newPage) => setPage(newPage);
    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setPage(0);
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(new Set(rows.map(row => row.purchaseOrderId)));
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

    const isAllSelected = rows.length > 0 && rows.every(row => selectedIds.has(row.purchaseOrderId));
    const isSomeSelected = rows.some(row => selectedIds.has(row.purchaseOrderId)) && !isAllSelected;

    return (
        <Box sx={{ height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', pt: 0, pb: 2 }}>
            <Box sx={{ flexShrink: 0, mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Typography variant="h4" component="h1" fontWeight="800" sx={{ color: '#1976d2', whiteSpace: 'nowrap' }}>
                    Danh sách đơn mua hàng (PO)
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    Tra cứu đơn mua: tìm kiếm, lọc theo trạng thái/ngày, sắp xếp và xem chi tiết.
                </Typography>
            </Box>

            <PurchaseOrderFilterPopup open={filterOpen} onClose={() => setFilterOpen(false)} initialValues={filterValues} onApply={handleFilterApply} />

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
                    background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.97) 100%)',
                    borderRadius: 3,
                    p: 0.75,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: (t) => t.shadows[1],
                    boxSizing: 'border-box',
                }}
            >
                <Card className="list-filter-card" sx={{ mb: 1, borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)', boxShadow: (t) => t.shadows[1] }}>
                    <CardContent sx={{ '&.MuiCardContent-root:last-child': { pb: 2 }, pt: 1, px: 1.5 }}>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
                            <SearchInput
                                placeholder="Tìm theo mã PO, nhà cung cấp, nhân viên, kho..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{ flex: '1 1 200px', minWidth: isMobile ? '100%' : 200, maxWidth: isMobile ? '100%' : 480 }}
                            />
                            <Tooltip title="Bộ lọc">
                                <IconButton color="primary" onClick={() => setFilterOpen(true)} aria-label="Bộ lọc" sx={{ border: 1, borderColor: 'divider' }}>
                                    <Filter size={20} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton color="primary" onClick={(e) => setColumnSelectorAnchor(e.currentTarget)} aria-label="Chọn cột" sx={{ border: 1, borderColor: 'divider' }}>
                                    <Columns size={20} />
                                </IconButton>
                            </Tooltip>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                <Button className="list-page-btn" variant="contained" startIcon={<Plus size={18} />} onClick={() => navigate('/purchase-orders/create')} sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}>
                                    Tạo đơn mua hàng
                                </Button>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                <Popover open={columnSelectorOpen} anchorEl={columnSelectorAnchor} onClose={handleCancelColumnOrder} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { mt: 1.5, p: 2, minWidth: 280 } } }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, whiteSpace: 'nowrap' }}>Chọn cột hiển thị & Sắp xếp</Typography>
                    <FormGroup>
                        <FormControlLabel control={<Checkbox checked={visibleColumnIds.size === PO_COLUMNS.length} indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < PO_COLUMNS.length} onChange={(e) => handleSelectAllColumns(e.target.checked)} />} label="Tất cả" sx={{ mb: 0.5 }} />
                        {PO_COLUMNS.sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id)).map((col) => (
                            <Box 
                                key={col.id} 
                                sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    bgcolor: draggedPopupColumn === col.id ? 'action.hover' : 'transparent',
                                    opacity: draggedPopupColumn === col.id ? 0.5 : 1,
                                    transition: 'all 0.2s',
                                    borderRadius: 1,
                                    px: 0.5
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
                                        color: 'text.secondary',
                                        '&:hover': { color: 'primary.main' }
                                    }}
                                >
                                    <GripVertical size={16} />
                                </Box>
                                <FormControlLabel 
                                    control={<Checkbox checked={visibleColumnIds.has(col.id)} onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)} />} 
                                    label={col.label}
                                    sx={{ flex: 1, m: 0, py: 0.5 }}
                                />
                            </Box>
                        ))}
                    </FormGroup>
                    <Box sx={{ display: 'flex', gap: 1, mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Button 
                            variant="outlined" 
                            size="small" 
                            onClick={handleCancelColumnOrder}
                            sx={{ flex: 1, textTransform: 'none' }}
                        >
                            Hủy
                        </Button>
                        <Button 
                            variant="contained" 
                            size="small" 
                            onClick={handleSaveColumnOrder}
                            sx={{ flex: 1, textTransform: 'none' }}
                        >
                            Lưu
                        </Button>
                    </Box>
                </Popover>

                <Card className="list-grid-card" sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)', boxShadow: (t) => t.shadows[1], p: 1 }}>
                    <Box className="list-grid-wrapper" sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        {rows.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, color: 'text.secondary' }}>
                                <FileText size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <Typography>Chưa có dữ liệu đơn mua hàng</Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ flex: 1, minHeight: 0, minWidth: 0, border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, overflow: 'auto' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell 
                                                padding="checkbox" 
                                                sx={{ fontWeight: 600, bgcolor: 'grey.50', width: 48 }}
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
                                                        bgcolor: draggedColumn === col.id ? 'action.hover' : 'grey.50', 
                                                        whiteSpace: 'nowrap',
                                                        opacity: draggedColumn === col.id ? 0.5 : 1,
                                                        transition: 'all 0.2s'
                                                    }}
                                                    align={col.id === 'actions' ? 'right' : col.id === 'stt' ? 'left' : 'left'}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, col.id)}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        {col.id !== 'actions' && col.id !== 'stt' && (
                                                            <Box
                                                                draggable
                                                                onDragStart={(e) => handleDragStart(e, col.id)}
                                                                onDragEnd={handleDragEnd}
                                                                sx={{ display: 'flex', alignItems: 'center' }}
                                                            >
                                                                <Tooltip title="Kéo để di chuyển cột">
                                                                    <IconButton 
                                                                        size="small" 
                                                                        sx={{ 
                                                                            p: 0.25, 
                                                                            cursor: 'grab',
                                                                            '&:active': { cursor: 'grabbing' },
                                                                            color: 'text.secondary',
                                                                            '&:hover': { color: 'primary.main' }
                                                                        }}
                                                                    >
                                                                        <GripVertical size={14} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Box>
                                                        )}
                                                        {col.sortable ? (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                                                                <TableSortLabel 
                                                                    active={orderBy === col.id} 
                                                                    direction={orderBy === col.id ? order : 'asc'} 
                                                                    onClick={() => handleSortRequest(col.id)}
                                                                    sx={{ flex: 1 }}
                                                                    hideSortIcon={orderBy !== col.id}
                                                                >
                                                                    {col.label}
                                                                </TableSortLabel>
                                                                {orderBy !== col.id && (
                                                                    <Tooltip title="Click để sắp xếp">
                                                                        <Box
                                                                            onClick={() => handleSortRequest(col.id)}
                                                                            sx={{ 
                                                                                display: 'flex', 
                                                                                cursor: 'pointer',
                                                                                '&:hover': { opacity: 0.6 }
                                                                            }}
                                                                        >
                                                                            <ArrowUpDown 
                                                                                size={14} 
                                                                                style={{ opacity: 0.3 }} 
                                                                            />
                                                                        </Box>
                                                                    </Tooltip>
                                                                )}
                                                            </Box>
                                                        ) : (
                                                            <Typography variant="inherit" sx={{ flex: 1 }}>
                                                                {col.label}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map((row, index) => (
                                            <TableRow key={row.purchaseOrderId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={selectedIds.has(row.purchaseOrderId)}
                                                        onChange={(e) => handleSelectRow(row.purchaseOrderId, e.target.checked)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                {visibleColumns.map((col) => {
                                                    const opts = { pageNumber: page + 1, pageSize };
                                                    if (col.id === 'stt') return <TableCell key={col.id} align="left">{col.getValue(row, index, opts)}</TableCell>;
                                                    if (col.id === 'approvalStatus') {
                                                        const style = APPROVAL_STATUS_STYLE[row.approvalStatus] ?? { color: 'text.secondary', borderColor: 'grey.400', label: row.approvalStatus ?? '' };
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Chip label={style.label} size="small" variant="outlined" sx={{ fontWeight: 600, borderRadius: '50px', px: 1.25, bgcolor: 'transparent', color: style.color, border: '1px solid', borderColor: style.borderColor }} />
                                                            </TableCell>
                                                        );
                                                    }
                                                    if (col.id === 'receivingStatus') {
                                                        const style = RECEIVING_STATUS_STYLE[row.receivingStatus] ?? { color: 'text.secondary', borderColor: 'grey.400', label: row.receivingStatus ?? '' };
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Chip label={style.label} size="small" variant="outlined" sx={{ fontWeight: 600, borderRadius: '50px', px: 1.25, bgcolor: 'transparent', color: style.color, border: '1px solid', borderColor: style.borderColor }} />
                                                            </TableCell>
                                                        );
                                                    }
                                                    if (col.id === 'totalOrderedQuantity' || col.id === 'totalReceivedQuantity' || col.id === 'remainingQuantity') {
                                                        return <TableCell key={col.id} align="right" sx={{ fontWeight: 600 }}>{col.getValue(row)}</TableCell>;
                                                    }
                                                    if (col.id === 'createdAt') return <TableCell key={col.id} align="left" sx={{ fontSize: '0.8rem' }}>{formatDate(row[col.id])}</TableCell>;
                                                    if (col.id === 'actions') {
                                                        return (
                                                            <TableCell key={col.id} align="right">
                                                                <Tooltip title="Xem chi tiết">
                                                                    <IconButton size="small" onClick={() => navigate(`/purchase-orders/${row.purchaseOrderId}`)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'primary.lighter' } }}>
                                                                        <Eye size={18} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Chỉnh sửa">
                                                                    <IconButton size="small" onClick={() => navigate(`/purchase-orders/edit/${row.purchaseOrderId}`)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'primary.lighter' } }}>
                                                                        <Edit size={18} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </TableCell>
                                                        );
                                                    }
                                                    return <TableCell key={col.id} align="left">{col.getValue(row)}</TableCell>;
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                </Card>

                <Box sx={{ flexShrink: 0, mt: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap' }}>Số dòng / trang:</Typography>
                    <FormControl size="small" sx={{ minWidth: 72 }}>
                        <Select value={pageSize} onChange={handlePageSizeChange} sx={{ height: 32, fontSize: '0.875rem' }}>
                            {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                <MenuItem key={n} value={n}>{n}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap' }}>
                        {start}–{end} / {totalCount} (Tổng {totalPages} trang)
                    </Typography>
                    <Button size="small" variant="outlined" disabled={page <= 0} onClick={() => handlePageChange(page - 1)} sx={{ minWidth: 36, textTransform: 'none' }}>Trước</Button>
                    <Button size="small" variant="outlined" disabled={end >= totalCount || totalCount === 0} onClick={() => handlePageChange(page + 1)} sx={{ minWidth: 36, textTransform: 'none' }}>Sau</Button>
                </Box>
            </Box>
        </Box>
    );
}
