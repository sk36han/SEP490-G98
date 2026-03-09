import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
    Paper,
} from '@mui/material';
import { FileText, Filter, Eye, Edit, Columns, Plus, ArrowUpDown, GripVertical } from 'lucide-react';
import { removeDiacritics } from '../utils/stringUtils';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import PurchaseOrderFilterPopup from '../components/PurchaseOrderFilterPopup';
import '../styles/ListView.css';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const APPROVAL_STATUS_STYLE = {
    Pending: { 
        bgColor: 'rgba(251, 191, 36, 0.2)', 
        label: 'Chờ duyệt',
        dot: '•'
    },
    Approved: { 
        bgColor: 'rgba(16, 185, 129, 0.2)', 
        label: 'Đã duyệt',
        dot: '•'
    },
    Rejected: { 
        bgColor: 'rgba(239, 68, 68, 0.2)', 
        label: 'Từ chối',
        dot: '•'
    },
};

const RECEIVING_STATUS_STYLE = {
    Pending: { 
        bgColor: 'rgba(59, 130, 246, 0.2)', 
        label: 'Chờ nhập',
        dot: '•'
    },
    Partial: { 
        bgColor: 'rgba(251, 191, 36, 0.2)', 
        label: 'Nhập một phần',
        dot: '•'
    },
    Completed: { 
        bgColor: 'rgba(16, 185, 129, 0.2)', 
        label: 'Nhập toàn bộ',
        dot: '•'
    },
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
    { id: 'totalReceivedQuantity', label: 'Số lượng nhập', sortable: true, getValue: (row) => row.totalReceivedQuantity ?? 0 },
    { id: 'orderValue', label: 'Giá trị đơn', sortable: true, getValue: (row) => row.orderValue ?? 0 },
    { id: 'createdAt', label: 'Ngày tạo', sortable: true, getValue: (row) => row.createdAt ?? '' },
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
        totalReceivedQuantity: 0,
        orderValue: 125000000, 
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
        totalReceivedQuantity: 350,
        orderValue: 98000000, 
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
        totalReceivedQuantity: 300,
        orderValue: 45000000, 
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
        totalReceivedQuantity: 0,
        orderValue: 30500000, 
        createdAt: '2025-02-14T16:00:00' 
    },
];

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);
};

const formatDateOnly = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('vi-VN');
};

export default function ViewPurchaseOrderList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const location = useLocation();
    const permissionRole = getPermissionRole(getRawRoleFromUser(authService.getUser()));

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

    // Áp dụng filter từ sidebar (Tất cả / Chờ duyệt / Đã duyệt)
    useEffect(() => {
        const status = location.state?.approvalStatus;
        if (status !== undefined) {
            setFilterValues((prev) => ({ ...prev, approvalStatus: status || undefined }));
        }
    }, [location.state?.approvalStatus]);

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
        .filter((col) => visibleColumnIds.has(col.id))
        .sort((a, b) => {
            // Giữ cột STT cố định bên trái, không bị drag reorder
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

    // Shared cell styles for perfect alignment
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
            const isNumber = ['orderValue', 'totalReceivedQuantity'].includes(orderBy);
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
                    Danh sách đơn mua
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}>
                    Purchase Orders
                </Typography>
            </Box>

            <PurchaseOrderFilterPopup open={filterOpen} onClose={() => setFilterOpen(false)} initialValues={filterValues} onApply={handleFilterApply} />

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
                                placeholder="Tìm theo mã PO, nhà cung cấp, nhân viên, kho..."
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
                                    onClick={() => setFilterOpen(true)} 
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
                                    <Columns size={18} />
                                </IconButton>
                            </Tooltip>
                            {permissionRole !== 'ACCOUNTANTS' && (
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                    <Button 
                                        className="list-page-btn" 
                                        variant="contained" 
                                        startIcon={<Plus size={18} />} 
                                        onClick={() => navigate('/purchase-orders/create')} 
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
                                        Tạo đơn mua hàng
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    </Box>

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
                            <FormGroup>
                                <FormControlLabel 
                                    control={
                                        <Checkbox 
                                            checked={visibleColumnIds.size === PO_COLUMNS.length} 
                                            indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < PO_COLUMNS.length} 
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
                                {PO_COLUMNS.sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id)).map((col) => (
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
                            </FormGroup>
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
                    {rows.length === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, px: 2, color: 'text.secondary' }}>
                            <FileText size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                            <Typography sx={{ fontSize: '13px' }}>Chưa có dữ liệu đơn mua hàng</Typography>
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
                                                    align={col.id === 'orderValue' || col.id === 'totalReceivedQuantity' ? 'right' : 'left'}
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
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map((row, index) => (
                                            <TableRow 
                                                key={row.purchaseOrderId} 
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
                                                        checked={selectedIds.has(row.purchaseOrderId)}
                                                        onChange={(e) => handleSelectRow(row.purchaseOrderId, e.target.checked)}
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
                                                    
                                                    // Order Code column (link in flex box)
                                                    if (col.id === 'orderCode') {
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Box
                                                                        component="a"
                                                                        href={`/purchase-orders/${row.purchaseOrderId}`}
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            navigate(`/purchase-orders/${row.purchaseOrderId}`);
                                                                        }}
                                                                        sx={{
                                                                            color: '#3b82f6',
                                                                            textDecoration: 'none',
                                                                            fontWeight: 500,
                                                                            cursor: 'pointer',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                            '&:hover': {
                                                                                textDecoration: 'underline',
                                                                            },
                                                                        }}
                                                                        title={col.getValue(row, index, opts)}
                                                                    >
                                                                        {col.getValue(row, index, opts)}
                                                                    </Box>
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }
                                                    
                                                    // Approval Status chip (wrapped in flex box)
                                                    if (col.id === 'approvalStatus') {
                                                        const style = APPROVAL_STATUS_STYLE[row.approvalStatus] ?? { bgColor: 'rgba(107, 114, 128, 0.2)', label: row.approvalStatus ?? '', dot: '•' };
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Chip 
                                                                        label={`${style.dot} ${style.label}`}
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
                                                                            '& .MuiChip-label': {
                                                                                px: 1.5,
                                                                                py: 0,
                                                                                textAlign: 'left',
                                                                                display: 'block',
                                                                                width: '100%',
                                                                            }
                                                                        }} 
                                                                    />
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }
                                                    
                                                    // Receiving Status chip (wrapped in flex box)
                                                    if (col.id === 'receivingStatus') {
                                                        const style = RECEIVING_STATUS_STYLE[row.receivingStatus] ?? { bgColor: 'rgba(107, 114, 128, 0.2)', label: row.receivingStatus ?? '', dot: '•' };
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Chip 
                                                                        label={`${style.dot} ${style.label}`}
                                                                        size="small"
                                                                        sx={{ 
                                                                            fontWeight: 500, 
                                                                            fontSize: '12px',
                                                                            lineHeight: '16px',
                                                                            borderRadius: '999px',
                                                                            minWidth: 110,
                                                                            height: '26px',
                                                                            bgcolor: style.bgColor, 
                                                                            color: '#374151',
                                                                            border: 'none',
                                                                            boxShadow: 'none',
                                                                            '& .MuiChip-label': {
                                                                                px: 1.5,
                                                                                py: 0,
                                                                                textAlign: 'left',
                                                                                display: 'block',
                                                                                width: '100%',
                                                                            }
                                                                        }} 
                                                                    />
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }
                                                    
                                                    // Số lượng nhập (number)
                                                    if (col.id === 'totalReceivedQuantity') {
                                                        return (
                                                            <TableCell 
                                                                key={col.id} 
                                                                align="right"
                                                                sx={{
                                                                    fontWeight: 500,
                                                                    fontVariantNumeric: 'tabular-nums',
                                                                    pr: 3,
                                                                }}
                                                            >
                                                                {col.getValue(row)}
                                                            </TableCell>
                                                        );
                                                    }
                                                    
                                                    // Giá trị đơn (number + currency)
                                                    if (col.id === 'orderValue') {
                                                        return (
                                                            <TableCell 
                                                                key={col.id} 
                                                                align="right"
                                                                sx={{
                                                                    fontWeight: 600,
                                                                    fontVariantNumeric: 'tabular-nums',
                                                                    pr: 3,
                                                                }}
                                                            >
                                                                {formatCurrency(col.getValue(row))}
                                                            </TableCell>
                                                        );
                                                    }
                                                    
                                                    // Date column
                                                    if (col.id === 'createdAt') {
                                                        return (
                                                            <TableCell 
                                                                key={col.id} 
                                                                align="left"
                                                                sx={{
                                                                    color: '#6b7280',
                                                                    fontVariantNumeric: 'tabular-nums',
                                                                }}
                                                            >
                                                                {formatDate(row[col.id])}
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
        </Box>
    );
}
