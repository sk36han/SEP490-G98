import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { FileText, Filter, Columns, Plus, GripVertical, RefreshCw, RotateCcw } from 'lucide-react';
import { removeDiacritics } from '../utils/stringUtils';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import PurchaseReturnFilterPopup from '../components/PurchaseReturnFilterPopup';
import '../styles/ListView.css';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const STATUS_STYLE = {
    Pending: { bgColor: 'rgba(251, 191, 36, 0.2)', label: 'Chờ xử lý', dot: '•' },
    Approved: { bgColor: 'rgba(16, 185, 129, 0.2)', label: 'Đã duyệt', dot: '•' },
    Rejected: { bgColor: 'rgba(239, 68, 68, 0.2)', label: 'Từ chối', dot: '•' },
    Posted: { bgColor: 'rgba(139, 92, 246, 0.2)', label: 'Đã hạch toán', dot: '•' },
    Completed: { bgColor: 'rgba(59, 130, 246, 0.2)', label: 'Hoàn tất', dot: '•' },
};

const REFUND_STATUS_STYLE = {
    Pending: { bgColor: 'rgba(251, 191, 36, 0.2)', label: 'Chờ hoàn tiền', dot: '•' },
    Partial: { bgColor: 'rgba(251, 191, 36, 0.2)', label: 'Hoàn một phần', dot: '•' },
    Completed: { bgColor: 'rgba(16, 185, 129, 0.2)', label: 'Đã hoàn tiền', dot: '•' },
    Failed: { bgColor: 'rgba(239, 68, 68, 0.2)', label: 'Hoàn tiền thất bại', dot: '•' },
    NotRequired: { bgColor: 'rgba(107, 114, 128, 0.2)', label: 'Không cần hoàn tiền', dot: '•' },
};

const PURCHASE_RETURN_COLUMNS = [
    { id: 'stt', label: 'STT', sortable: false, getValue: (row, index, { pageNumber, pageSize }) => (pageNumber - 1) * pageSize + index + 1 },
    { id: 'returnCode', label: 'Mã phiếu trả hàng', sortable: true, getValue: (row) => row.returnCode ?? '' },
    { id: 'relatedGRNId', label: 'Phiếu nhập tham chiếu', sortable: true, getValue: (row) => row.relatedGRNId ?? '' },
    { id: 'returnDate', label: 'Ngày trả hàng', sortable: true, getValue: (row) => row.returnDate ?? '' },
    { id: 'status', label: 'Trạng thái', sortable: true, getValue: (row) => STATUS_STYLE[row.status]?.label ?? row.status ?? '' },
    { id: 'refundStatus', label: 'Trạng thái hoàn tiền', sortable: true, getValue: (row) => REFUND_STATUS_STYLE[row.refundStatus]?.label ?? row.refundStatus ?? '' },
    { id: 'refundedAmount', label: 'Số tiền hoàn', sortable: true, getValue: (row) => row.refundedAmount ?? 0 },
    
    { id: 'createdBy', label: 'Người tạo', sortable: true, getValue: (row) => row.createdBy ?? '' },
    { id: 'createdAt', label: 'Ngày tạo', sortable: true, getValue: (row) => row.createdAt ?? '' },
];

const DEFAULT_VISIBLE_COLUMN_IDS = PURCHASE_RETURN_COLUMNS.map((c) => c.id);
const SORTABLE_COLUMN_IDS = PURCHASE_RETURN_COLUMNS.filter((c) => c.sortable).map((c) => c.id);

const MOCK_PURCHASE_RETURN_LIST = [
    {
        purchaseReturnId: 1,
        returnCode: 'PR-2025-001',
        relatedGRNId: 'GRN-2025-001',
        returnDate: '2025-02-15T10:00:00',
        status: 'Pending',
        reason: 'Hàng bị lỗi, không đúng quy cách',
        note: 'Khách hàng phát hiện 5 sản phẩm bị trầy xước trong quá trình vận chuyển',
        feeAmount: 500000,
        refundStatus: 'Pending',
        refundedAmount: 0,
        refundedAt: null,
        
        refundReference: '',
        createdBy: 'Nguyễn Văn A',
        createdAt: '2025-02-14T08:30:00',
        approvedBy: '',
        approvedAt: null,
        postedAt: null,
    },
    {
        purchaseReturnId: 2,
        returnCode: 'PR-2025-002',
        relatedGRNId: 'GRN-2025-003',
        returnDate: '2025-02-13T14:00:00',
        status: 'Approved',
        reason: 'Sản phẩm hết hạn sử dụng',
        note: '',
        feeAmount: 0,
        refundStatus: 'Completed',
        refundedAmount: 25000000,
        refundedAt: '2025-02-14T16:00:00',
        
        refundReference: 'TT-2025-001234',
        createdBy: 'Lê Văn C',
        createdAt: '2025-02-13T09:00:00',
        approvedBy: 'Trần Thị B',
        approvedAt: '2025-02-13T11:30:00',
        postedAt: '2025-02-13T15:00:00',
    },
    {
        purchaseReturnId: 3,
        returnCode: 'PR-2025-003',
        relatedGRNId: 'GRN-2025-005',
        returnDate: '2025-02-12T09:00:00',
        status: 'Approved',
        reason: 'Đặt nhầm sản phẩm',
        note: 'Nhân viên đặt nhầm model, cần đổi sang model khác',
        feeAmount: 200000,
        refundStatus: 'Partial',
        refundedAmount: 15000000,
        refundedAt: '2025-02-14T10:00:00',
        
        refundReference: 'TM-2025-00567',
        createdBy: 'Phạm Thị D',
        createdAt: '2025-02-12T08:00:00',
        approvedBy: 'Nguyễn Văn A',
        approvedAt: '2025-02-12T10:00:00',
        postedAt: '2025-02-12T11:00:00',
    },
    {
        purchaseReturnId: 4,
        returnCode: 'PR-2025-004',
        relatedGRNId: 'GRN-2025-007',
        returnDate: '2025-02-11T16:00:00',
        status: 'Rejected',
        reason: 'Hàng đã qua sử dụng',
        note: 'Sản phẩm đã được sử dụng, không thể trả lại theo chính sách',
        feeAmount: 0,
        refundStatus: 'NotRequired',
        refundedAmount: 0,
        refundedAt: null,
        
        refundReference: '',
        createdBy: 'Trần Thị B',
        createdAt: '2025-02-11T14:00:00',
        approvedBy: 'Lê Văn C',
        approvedAt: '2025-02-11T17:00:00',
        postedAt: null,
    },
    {
        purchaseReturnId: 5,
        returnCode: 'PR-2025-005',
        relatedGRNId: 'GRN-2025-008',
        returnDate: '2025-02-10T11:00:00',
        status: 'Posted',
        reason: 'Hàng giao thiếu so với đơn hàng',
        note: 'Nhà cung cấp giao thiếu 3 sản phẩm, đã xác nhận và hoàn tiền',
        feeAmount: 150000,
        refundStatus: 'Completed',
        refundedAmount: 45000000,
        refundedAt: '2025-02-12T09:00:00',
       
        refundReference: 'TT-2025-00890',
        createdBy: 'Nguyễn Văn A',
        createdAt: '2025-02-10T10:00:00',
        approvedBy: 'Phạm Thị D',
        approvedAt: '2025-02-10T13:00:00',
        postedAt: '2025-02-10T14:00:00',
    },
    {
        purchaseReturnId: 6,
        returnCode: 'PR-2025-006',
        relatedGRNId: 'GRN-2025-010',
        returnDate: '2025-02-09T08:00:00',
        status: 'Completed',
        reason: 'Sản phẩm không đúng quy cách kỹ thuật',
        note: 'Sản phẩm có thông số kỹ thuật không đúng như hợp đồng',
        feeAmount: 0,
        refundStatus: 'Completed',
        refundedAmount: 12000000,
        refundedAt: '2025-02-11T15:00:00',
        
        refundReference: 'TT-2025-01122',
        createdBy: 'Lê Văn C',
        createdAt: '2025-02-09T07:30:00',
        approvedBy: 'Trần Thị B',
        approvedAt: '2025-02-09T09:30:00',
        postedAt: '2025-02-09T10:00:00',
    },
    {
        purchaseReturnId: 7,
        returnCode: 'PR-2025-007',
        relatedGRNId: 'GRN-2025-012',
        returnDate: '2025-02-08T13:00:00',
        status: 'Pending',
        reason: 'Hàng bị hư hỏng trong kho',
        note: 'Kiểm kho phát hiện một số sản phẩm bị ẩm, cần trả lại nhà cung cấp',
        feeAmount: 300000,
        refundStatus: 'Pending',
        refundedAmount: 0,
        refundedAt: null,
        
        refundReference: '',
        createdBy: 'Phạm Thị D',
        createdAt: '2025-02-08T12:00:00',
        approvedBy: '',
        approvedAt: null,
        postedAt: null,
    },
    {
        purchaseReturnId: 8,
        returnCode: 'PR-2025-008',
        relatedGRNId: 'GRN-2025-015',
        returnDate: '2025-02-07T10:00:00',
        status: 'Approved',
        reason: 'Thay đổi quy cách sản phẩm',
        note: 'Khách hàng yêu cầu đổi sang sản phẩm khác có giá trị cao hơn',
        feeAmount: 100000,
        refundStatus: 'Failed',
        refundedAmount: 0,
        refundedAt: '2025-02-09T11:00:00',
        
        refundReference: 'TT-2025-00987',
        createdBy: 'Trần Thị B',
        createdAt: '2025-02-07T09:00:00',
        approvedBy: 'Nguyễn Văn A',
        approvedAt: '2025-02-07T14:00:00',
        postedAt: null,
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

export default function ViewPurchaseReturnList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const permissionRole = getPermissionRole(getRawRoleFromUser(authService.getUser()));

    const [list, setList] = useState(MOCK_PURCHASE_RETURN_LIST);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState(() => {
        const saved = localStorage.getItem('purchaseReturnFilterValues');
        return saved ? JSON.parse(saved) : {};
    });
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
        const saved = localStorage.getItem('purchaseReturnVisibleColumnIds');
        return saved ? new Set(JSON.parse(saved)) : new Set(DEFAULT_VISIBLE_COLUMN_IDS);
    });
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [orderBy, setOrderBy] = useState(() => {
        const saved = localStorage.getItem('purchaseReturnSortConfig');
        return saved ? JSON.parse(saved).orderBy : null;
    });
    const [order, setOrder] = useState(() => {
        const saved = localStorage.getItem('purchaseReturnSortConfig');
        return saved ? JSON.parse(saved).order : 'asc';
    });
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [columnOrder, setColumnOrder] = useState(() => {
        const saved = localStorage.getItem('purchaseReturnColumnOrder');
        return saved ? JSON.parse(saved) : PURCHASE_RETURN_COLUMNS.map(c => c.id);
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);
    const [sortConfig, setSortConfig] = useState(() => {
        const saved = localStorage.getItem('purchaseReturnSortConfig');
        return saved ? JSON.parse(saved) : { orderBy: null, order: 'asc' };
    });

    useEffect(() => {
        if (sortConfig.orderBy) {
            setOrderBy(sortConfig.orderBy);
            setOrder(sortConfig.order);
        }
    }, []);

    const handleRefresh = () => {
        setLoading(true);
        setTimeout(() => {
            setList(MOCK_PURCHASE_RETURN_LIST);
            setLoading(false);
        }, 300);
    };

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

        localStorage.setItem('purchaseReturnSortConfig', JSON.stringify({ orderBy: newOrderBy, order: newOrder }));
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
        localStorage.setItem('purchaseReturnColumnOrder', JSON.stringify(newOrder));
        setDraggedColumn(null);
    };

    const handleDragEnd = () => {
        setDraggedColumn(null);
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
                normalize(row.relatedGRNId ?? '').includes(term) ||
                normalize(row.createdBy ?? '').includes(term)
            );
        }

        if (filterValues.status) {
            result = result.filter((row) => row.status === filterValues.status);
        }
        if (filterValues.refundStatus) {
            result = result.filter((row) => row.refundStatus === filterValues.refundStatus);
        }
       
        if (filterValues.fromDate) {
            result = result.filter((row) => {
                const d = row.returnDate;
                return d && String(d).slice(0, 10) >= filterValues.fromDate;
            });
        }
        if (filterValues.toDate) {
            result = result.filter((row) => {
                const d = row.returnDate;
                return d && String(d).slice(0, 10) <= filterValues.toDate;
            });
        }

        result.sort((a, b) => {
            if (!orderBy) return 0;

            const aVal = a[orderBy];
            const bVal = b[orderBy];
            const isDate = ['returnDate', 'createdAt'].includes(orderBy);
            const isNumber = ['refundedAmount'].includes(orderBy);
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
        localStorage.setItem('purchaseReturnFilterValues', JSON.stringify(values));
        setPage(0);
    };

    const handlePageChange = (newPage) => setPage(newPage);
    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setPage(0);
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(new Set(rows.map(row => row.purchaseReturnId)));
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

    const isAllSelected = rows.length > 0 && rows.every(row => selectedIds.has(row.purchaseReturnId));
    const isSomeSelected = rows.some(row => selectedIds.has(row.purchaseReturnId)) && !isAllSelected;

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

            <PurchaseReturnFilterPopup open={filterOpen} onClose={() => setFilterOpen(false)} initialValues={filterValues} onApply={handleFilterApply} />

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
                                placeholder="Tìm theo mã trả hàng, GRN liên quan, người tạo..."
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
                            <Tooltip title="Làm mới">
                                <IconButton
                                    color="primary"
                                    onClick={handleRefresh}
                                    aria-label="Làm mới"
                                    disabled={loading}
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
                                    <RefreshCw size={18} className={loading ? 'spin' : ''} />
                                </IconButton>
                            </Tooltip>
                            {permissionRole !== 'ACCOUNTANTS' && (
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
                                            checked={visibleColumnIds.size === PURCHASE_RETURN_COLUMNS.length}
                                            indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < PURCHASE_RETURN_COLUMNS.length}
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
                                {PURCHASE_RETURN_COLUMNS.sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id)).map((col) => (
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
                        {error && (
                            <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2, mb: 0 }}>
                                {error}
                            </Alert>
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
                                                    align={['feeAmount', 'refundedAmount'].includes(col.id) ? 'right' : 'left'}
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
                                                key={row.purchaseReturnId}
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
                                                        checked={selectedIds.has(row.purchaseReturnId)}
                                                        onChange={(e) => handleSelectRow(row.purchaseReturnId, e.target.checked)}
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

                                                    // Return Code column (link)
                                                    if (col.id === 'returnCode') {
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                    <Box
                                                                        component="a"
                                                                        href={`/purchase-returns/${row.purchaseReturnId}`}
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            navigate(`/purchase-returns/${row.purchaseReturnId}`);
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
                                                     
                                                    // Related GRN column (link)
if (col.id === 'relatedGRNId') {
    return (
        <TableCell key={col.id} align="left">
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <Box
                    component="a"
                    href={`/goods-receipts/${encodeURIComponent(row.relatedGRNId)}`}
                    onClick={(e) => {
                        e.preventDefault();
                        navigate(`/goods-receipts/${encodeURIComponent(row.relatedGRNId)}`);
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
                    {col.getValue(row, index, opts) || '-'}
                </Box>
            </Box>
        </TableCell>
    );
}

                                                    // Status chip
                                                    if (col.id === 'status') {
                                                        const style = STATUS_STYLE[row.status] ?? { bgColor: 'rgba(107, 114, 128, 0.2)', label: row.status ?? '', dot: '•' };
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

                                                    // Refund Status chip
                                                    if (col.id === 'refundStatus') {
                                                        const style = REFUND_STATUS_STYLE[row.refundStatus] ?? { bgColor: 'rgba(107, 114, 128, 0.2)', label: row.refundStatus ?? '', dot: '•' };
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
                                                                            minWidth: 120,
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

                                                    // Fee Amount (currency)
                                                    if (col.id === 'feeAmount') {
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

                                                    // Refunded Amount (currency)
                                                    if (col.id === 'refundedAmount') {
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

                                                    // Date columns
                                                    if (['returnDate', 'createdAt', 'approvedAt', 'refundedAt', 'postedAt'].includes(col.id)) {
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

                                                    // Text columns with ellipsis
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
            <MenuItem key={n} value={n} sx={{ fontSize: '13px' }}>
                {n}
            </MenuItem>
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
