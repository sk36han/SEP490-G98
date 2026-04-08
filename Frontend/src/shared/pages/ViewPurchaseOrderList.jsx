import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
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
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    FileText,
    Filter,
    Eye,
    Edit,
    Columns,
    Plus,
    RefreshCw,
    ShoppingCart,
} from 'lucide-react';
import { removeDiacritics } from '../utils/stringUtils';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import PurchaseOrderFilterPopup from '../components/PurchaseOrderFilterPopup';
import { getPurchaseOrders } from '../lib/purchaseOrderService';
import '../styles/ListView.css';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
const API_PAGE_SIZE = 100;
const MAX_API_PAGES = 100;

const SummaryCard = ({ icon: Icon, label, value, color, bgColor }) => (
    <Box
        sx={{
            flex: '1 1 200px',
            minWidth: 200,
            bgcolor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
    >
        <Box
            sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                bgcolor: bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}
        >
            <Icon size={22} color={color} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.3 }}>
                {label}
            </Typography>
            <Typography
                sx={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#111827',
                    lineHeight: 1.2,
                    mt: 0.25,
                }}
            >
                {value}
            </Typography>
        </Box>
    </Box>
);

const APPROVAL_STATUS_STYLE = {
    DRAFT: {
        bgColor: 'rgba(107, 114, 128, 0.2)',
        color: '#4b5563',
        label: 'Bản nháp',
    },
    PENDING: {
        bgColor: 'rgba(251, 191, 36, 0.2)',
        color: '#92400e',
        label: 'Chờ duyệt',
    },
    PENDING_ACC: {
        bgColor: 'rgba(251, 191, 36, 0.2)',
        color: '#92400e',
        label: 'Chờ duyệt',
    },
    PENDING_DIR: {
        bgColor: 'rgba(251, 191, 36, 0.2)',
        color: '#92400e',
        label: 'Chờ duyệt',
    },
    APPROVED: {
        bgColor: 'rgba(16, 185, 129, 0.2)',
        color: '#065f46',
        label: 'Đã duyệt',
    },
    REJECTED: {
        bgColor: 'rgba(239, 68, 68, 0.2)',
        color: '#991b1b',
        label: 'Từ chối',
    },
};

const RECEIVING_STATUS_STYLE = {
    PendingRcv: {
        bgColor: 'rgba(59, 130, 246, 0.2)',
        color: '#1d4ed8',
        label: 'Đang đợi hàng về',
    },
    PartialRcv: {
        bgColor: 'rgba(251, 191, 36, 0.2)',
        color: '#92400e',
        label: 'Đã về một phần hàng',
    },
    PartRcv: {
        bgColor: 'rgba(251, 191, 36, 0.2)',
        color: '#92400e',
        label: 'Đã về một phần hàng',
    },
    Received: {
        bgColor: 'rgba(16, 185, 129, 0.2)',
        color: '#065f46',
        label: 'Đã về đủ hàng',
    },
    FullRcv: {
        bgColor: 'rgba(16, 185, 129, 0.2)',
        color: '#065f46',
        label: 'Đã về đủ hàng',
    },
    Closed: {
        bgColor: 'rgba(107, 114, 128, 0.2)',
        color: '#4b5563',
        label: 'Đã đóng',
    },
    Cancelled: {
        bgColor: 'rgba(239, 68, 68, 0.2)',
        color: '#991b1b',
        label: 'Đã hủy',
    },
};

const PO_COLUMNS = [
    {
        id: 'stt',
        label: 'STT',
        sortable: false,
        getValue: (row, index, { pageNumber, pageSize }) =>
            (pageNumber - 1) * pageSize + index + 1,
    },
    { id: 'orderCode', label: 'Mã đơn đặt hàng nhập', sortable: true, getValue: (row) => row.orderCode ?? '' },
    { id: 'warehouseName', label: 'Kho nhận', sortable: true, getValue: (row) => row.warehouseName ?? '' },
    {
        id: 'approvalStatus',
        label: 'Trạng thái duyệt',
        sortable: true,
        getValue: (row) =>
            APPROVAL_STATUS_STYLE[String(row.approvalStatus ?? '').toUpperCase()]?.label ??
            row.approvalStatus ??
            '',
    },
    {
        id: 'receivingStatus',
        label: 'Trạng thái nhập hàng',
        sortable: true,
        getValue: (row) =>
            RECEIVING_STATUS_STYLE[row.receivingStatus]?.label ?? row.receivingStatus ?? '',
    },
    { id: 'supplierName', label: 'Nhà cung cấp', sortable: true, getValue: (row) => row.supplierName ?? '' },
    { id: 'creator', label: 'Nhân viên tạo', sortable: true, getValue: (row) => row.creator ?? '' },
    { id: 'responsiblePerson', label: 'Nhân viên phụ trách', sortable: true, getValue: (row) => row.responsiblePerson ?? '' },
    { id: 'totalReceivedQuantity', label: 'Số lượng nhập', sortable: true, getValue: (row) => row.totalReceivedQuantity ?? 0 },
    { id: 'orderValue', label: 'Giá trị đơn', sortable: true, getValue: (row) => row.orderValue ?? 0 },
    { id: 'createdAt', label: 'Ngày tạo', sortable: true, getValue: (row) => row.createdAt ?? '' },
];

const DEFAULT_VISIBLE_COLUMN_IDS = PO_COLUMNS.map((c) => c.id);
const SORTABLE_COLUMN_IDS = PO_COLUMNS.filter((c) => c.sortable).map((c) => c.id);

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return (
        d.toLocaleDateString('vi-VN') +
        ' ' +
        d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    );
};

const normalizeText = (value) =>
    value ? removeDiacritics(String(value).toLowerCase()) : '';

const upper = (value) => String(value ?? '').toUpperCase();

const mapPOItem = (item) => ({
    purchaseOrderId: item.purchaseOrderId ?? item.PurchaseOrderId ?? 0,
    orderCode: item.poCode ?? item.PoCode ?? '',
    warehouseName: item.warehouseName ?? item.WarehouseName ?? '',
    approvalStatus: upper(item.status ?? item.Status ?? 'DRAFT'),
    status: upper(item.status ?? item.Status ?? 'DRAFT'),
    receivingStatus:
        item.lifecycleStatus ??
        item.LifecycleStatus ??
        item.receivingStatus ??
        'PendingRcv',
    supplierName: item.supplierName ?? item.SupplierName ?? '',
    creator: item.requestedByName ?? item.RequestedByName ?? item.creator ?? '',
    creatorId: item.requestedBy ?? item.RequestedBy ?? null,
    responsiblePerson:
        item.responsibleUserName ??
        item.ResponsibleUserName ??
        item.responsiblePerson ??
        '',
    totalReceivedQuantity: item.totalReceivedQty ?? item.TotalReceivedQty ?? 0,
    orderValue: item.totalAmount ?? item.TotalAmount ?? 0,
    createdAt: item.createdAt ?? item.CreatedAt ?? '',
});

export default function ViewPurchaseOrderList() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const location = useLocation();

    const user = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(user));
    const currentUserId = user?.userId ?? user?.UserId ?? null;
    const currentUserName = authService.getCurrentUserName();

    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [serverTotalItems, setServerTotalItems] = useState(0);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState(() => {
        const saved = localStorage.getItem('poFilterValues');
        return saved ? JSON.parse(saved) : {};
    });

    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
        const saved = localStorage.getItem('poVisibleColumnIds');
        return saved ? new Set(JSON.parse(saved)) : new Set(DEFAULT_VISIBLE_COLUMN_IDS);
    });

    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

    const [orderBy, setOrderBy] = useState(() => {
        const saved = localStorage.getItem('poSortConfig');
        return saved ? JSON.parse(saved).orderBy : null;
    });

    const [order, setOrder] = useState(() => {
        const saved = localStorage.getItem('poSortConfig');
        return saved ? JSON.parse(saved).order : 'asc';
    });

    const [columnOrder] = useState(() => {
        const saved = localStorage.getItem('poColumnOrder');
        return saved ? JSON.parse(saved) : PO_COLUMNS.map((c) => c.id);
    });

    useEffect(() => {
        const status = location.state?.approvalStatus;
        if (status !== undefined) {
            setFilterValues((prev) => {
                const next = {
                    ...prev,
                    approvalStatus: status || undefined,
                };
                localStorage.setItem('poFilterValues', JSON.stringify(next));
                return next;
            });
        }
    }, [location.state?.approvalStatus]);

    // Lấy filterValues từ scope ngoài, không cần dependency array thay đổi
    // vì filterValues được truyền vào fetchAllPages mỗi lần gọi
    const fetchAllPages = useCallback(async (filters) => {
        const allItems = [];
        let currentPage = 1;
        let totalItemsFromApi = 0;

        while (currentPage <= MAX_API_PAGES) {
            const result = await getPurchaseOrders({
                page: currentPage,
                pageSize: API_PAGE_SIZE,
                // Backend filter: status, lifecycleStatus, supplierName, warehouseName, fromDate, toDate, requestedByName
                status: filters.approvalStatus,
                lifecycleStatus: filters.receivingStatus,
                supplierName: filters.supplier,
                warehouseName: filters.warehouse,
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                requestedByName: filters.creator,
            });

            const items = Array.isArray(result?.items) ? result.items : [];
            totalItemsFromApi = result?.totalItems ?? totalItemsFromApi;

            allItems.push(...items);

            if (items.length === 0) break;
            if (totalItemsFromApi > 0 && allItems.length >= totalItemsFromApi) break;
            if (items.length < API_PAGE_SIZE) break;

            currentPage += 1;
        }

        const dedupedMap = new Map();
        allItems.forEach((item) => {
            const id = item.purchaseOrderId ?? item.PurchaseOrderId;
            if (id != null && !dedupedMap.has(String(id))) {
                dedupedMap.set(String(id), item);
            }
        });

        return {
            totalItems: totalItemsFromApi || dedupedMap.size,
            items: Array.from(dedupedMap.values()),
        };
    }, [filterValues]);

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await fetchAllPages(filterValues);
            const mappedList = (result.items ?? []).map(mapPOItem);

            setList(mappedList);
            setServerTotalItems(result.totalItems ?? mappedList.length);
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không tải được danh sách đơn mua.');
            setList([]);
            setServerTotalItems(0);
        } finally {
            setLoading(false);
        }
    }, [fetchAllPages]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const handleRefresh = () => {
        setPage(0);
        fetchList();
    };

    const handleColumnVisibilityChange = (columnId, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(columnId);
            else next.delete(columnId);

            localStorage.setItem('poVisibleColumnIds', JSON.stringify([...next]));
            return next;
        });
    };

    const handleSelectAllColumns = (checked) => {
        const newSet = checked ? new Set(DEFAULT_VISIBLE_COLUMN_IDS) : new Set();
        setVisibleColumnIds(newSet);
        localStorage.setItem('poVisibleColumnIds', JSON.stringify([...newSet]));
    };

    const visibleColumns = PO_COLUMNS
        .filter((col) => visibleColumnIds.has(col.id))
        .sort((a, b) => {
            if (a.id === 'stt' && b.id !== 'stt') return -1;
            if (b.id === 'stt' && a.id !== 'stt') return 1;
            return columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id);
        });

    const handleSortRequest = (columnId) => {
        if (!SORTABLE_COLUMN_IDS.includes(columnId)) return;

        let nextOrderBy = columnId;
        let nextOrder = 'asc';

        if (orderBy === columnId) {
            if (order === 'asc') {
                nextOrder = 'desc';
            } else {
                nextOrderBy = null;
                nextOrder = 'asc';
            }
        }

        setOrderBy(nextOrderBy);
        setOrder(nextOrder);
        setPage(0);
        localStorage.setItem(
            'poSortConfig',
            JSON.stringify({ orderBy: nextOrderBy, order: nextOrder })
        );
    };

    const filteredAndSortedRows = useMemo(() => {
        const term = searchTerm.trim() ? normalizeText(searchTerm.trim()) : '';
        const selectedApprovalStatus = upper(filterValues.approvalStatus);
        let result = [...list];

        result = result.filter((row) => {
            const status = upper(row.approvalStatus);
            const isOwnDraft =
                status === 'DRAFT' &&
                (String(row.creatorId) === String(currentUserId) ||
                    normalizeText(row.creator) === normalizeText(currentUserName));

            if (!selectedApprovalStatus) {
                return (
                    status === 'APPROVED' ||
                    status === 'REJECTED' ||
                    status === 'PENDING' ||
                    status === 'PENDING_ACC' ||
                    status === 'PENDING_DIR' ||
                    isOwnDraft
                );
            }

            if (selectedApprovalStatus === 'DRAFT') {
                return isOwnDraft;
            }

            return status === selectedApprovalStatus;
        });

        if (term) {
            result = result.filter(
                (row) =>
                    normalizeText(row.orderCode).includes(term) ||
                    normalizeText(row.supplierName).includes(term) ||
                    normalizeText(row.creator).includes(term) ||
                    normalizeText(row.responsiblePerson).includes(term) ||
                    normalizeText(row.warehouseName).includes(term)
            );
        }

        // responsibleUserName: client-side vì backend chưa hỗ trợ
        if (filterValues.responsiblePerson) {
            result = result.filter((row) =>
                normalizeText(row.responsiblePerson).includes(
                    normalizeText(filterValues.responsiblePerson)
                )
            );
        }

        result.sort((a, b) => {
            if (!orderBy) {
                const isOwnDraftCheck = (row) =>
                    upper(row.approvalStatus) === 'DRAFT' &&
                    (String(row.creatorId) === String(currentUserId) ||
                        normalizeText(row.creator) === normalizeText(currentUserName));
                const aIsOwnDraft = isOwnDraftCheck(a);
                const bIsOwnDraft = isOwnDraftCheck(b);

                if (aIsOwnDraft !== bIsOwnDraft) {
                    return aIsOwnDraft ? -1 : 1;
                }

                const timeA = new Date(a.createdAt).getTime() || 0;
                const timeB = new Date(b.createdAt).getTime() || 0;
                return timeB - timeA;
            }

            const aVal = a[orderBy];
            const bVal = b[orderBy];
            const isDate = ['createdAt'].includes(orderBy);
            const isNumber = ['orderValue', 'totalReceivedQuantity'].includes(orderBy);

            let cmp = 0;

            if (isDate) {
                const tA = new Date(aVal).getTime() || 0;
                const tB = new Date(bVal).getTime() || 0;
                cmp = tA - tB;
            } else if (isNumber) {
                cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
            } else {
                cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), 'vi', {
                    sensitivity: 'base',
                });
            }

            return order === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [list, searchTerm, filterValues, orderBy, order, currentUserId, currentUserName]);

    useEffect(() => {
        setPage(0);
    }, [searchTerm, filterValues]);

    const totalCount = filteredAndSortedRows.length;
    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;
    const safePage = Math.min(page, totalPages - 1);
    const rows = filteredAndSortedRows.slice(
        safePage * pageSize,
        (safePage + 1) * pageSize
    );
    const start = totalCount === 0 ? 0 : safePage * pageSize + 1;
    const end = Math.min((safePage + 1) * pageSize, totalCount);

    const handleFilterApply = (values) => {
        setFilterValues(values);
        localStorage.setItem('poFilterValues', JSON.stringify(values));
        setPage(0);
    };

    const renderApprovalStatus = (status) => {
        const style = APPROVAL_STATUS_STYLE[upper(status)] || {
            bgColor: 'rgba(107, 114, 128, 0.2)',
            color: '#4b5563',
            label: status || '-',
        };

        return (
            <Chip
                label={style.label}
                size="small"
                sx={{
                    bgcolor: style.bgColor,
                    color: style.color,
                    fontWeight: 600,
                    fontSize: '12px',
                    borderRadius: '999px',
                }}
            />
        );
    };

    const renderReceivingStatus = (status) => {
        const style = RECEIVING_STATUS_STYLE[status] || {
            bgColor: 'rgba(107, 114, 128, 0.2)',
            color: '#4b5563',
            label: status || '-',
        };

        return (
            <Chip
                label={style.label}
                size="small"
                sx={{
                    bgcolor: style.bgColor,
                    color: style.color,
                    fontWeight: 600,
                    fontSize: '12px',
                    borderRadius: '999px',
                }}
            />
        );
    };

    const renderCellContent = (column, row, index) => {
        switch (column.id) {
            case 'stt':
                return column.getValue(row, index, {
                    pageNumber: safePage + 1,
                    pageSize,
                });

            case 'orderCode':
                return (
                    <Typography
                        component="button"
                        onClick={() => navigate(`/purchase-orders/${row.purchaseOrderId}`)}
                        sx={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            color: '#3b82f6',
                            fontWeight: 500,
                            fontSize: '13px',
                            fontFamily: 'inherit',
                            textDecoration: 'underline',
                            '&:hover': { color: '#1d4ed8' },
                        }}
                    >
                        {column.getValue(row, index, {
                            pageNumber: safePage + 1,
                            pageSize,
                        })}
                    </Typography>
                );

            case 'approvalStatus':
                return renderApprovalStatus(row.approvalStatus);

            case 'receivingStatus':
                return renderReceivingStatus(row.receivingStatus);

            case 'orderValue':
                return formatCurrency(row.orderValue);

            case 'totalReceivedQuantity':
                return Number(row.totalReceivedQuantity || 0).toLocaleString('vi-VN');

            case 'createdAt':
                return formatDate(row.createdAt);

            default:
                return (
                    column.getValue(row, index, {
                        pageNumber: safePage + 1,
                        pageSize,
                    }) || '-'
                );
        }
    };

    const canEditRow = (row) =>
        permissionRole === 'SALE_SUPPORT' &&
        upper(row.approvalStatus) === 'DRAFT' &&
        String(row.creatorId) === String(currentUserId);

    const summarySource = filteredAndSortedRows;
    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    const BODY_CELL_SX = {
        py: 1.75,
        px: 2,
        fontSize: '13px',
        lineHeight: '20px',
        verticalAlign: 'middle',
        borderBottom: '1px solid #f3f4f6',
        color: '#374151',
        whiteSpace: 'nowrap',
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
                    Danh sách đơn mua
                </Typography>

                <Typography
                    variant="body2"
                    sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}
                >
                    Purchase Orders
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
                    <SummaryCard
                        icon={ShoppingCart}
                        label="Đang hiển thị"
                        value={summarySource.length.toLocaleString()}
                        color="#6b7280"
                        bgColor="rgba(107,114,128,0.1)"
                    />
                    <SummaryCard
                        icon={FileText}
                        label="Chờ duyệt"
                        value={summarySource
                            .filter((r) =>
                                ['PENDING', 'PENDING_ACC', 'PENDING_DIR'].includes(
                                    upper(r.approvalStatus)
                                )
                            )
                            .length.toLocaleString()}
                        color="#d97706"
                        bgColor="rgba(245,158,11,0.1)"
                    />
                    <SummaryCard
                        icon={FileText}
                        label="Bản nháp của tôi"
                        value={summarySource
                            .filter(
                                (r) =>
                                    upper(r.approvalStatus) === 'DRAFT' &&
                                    String(r.creatorId) === String(currentUserId)
                            )
                            .length.toLocaleString()}
                        color="#6b7280"
                        bgColor="rgba(107,114,128,0.1)"
                    />
                </Box>
            </Box>

            <PurchaseOrderFilterPopup
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                initialValues={filterValues}
                onApply={handleFilterApply}
            />

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

                            {permissionRole === 'SALE_SUPPORT' && (
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
                        onClose={() => setColumnSelectorAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        slotProps={{
                            paper: {
                                elevation: 0,
                                sx: {
                                    mt: 1,
                                    width: 320,
                                    borderRadius: '14px',
                                    border: '1px solid rgba(0, 0, 0, 0.08)',
                                    boxShadow:
                                        '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
                                    overflow: 'hidden',
                                },
                            },
                        }}
                    >
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6' }}>
                            <Typography
                                variant="subtitle2"
                                fontWeight={600}
                                sx={{ fontSize: '15px', color: '#111827' }}
                            >
                                Chọn cột hiển thị
                            </Typography>
                        </Box>

                        <Box sx={{ px: 2.5, py: 2 }}>
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={visibleColumnIds.size === PO_COLUMNS.length}
                                            indeterminate={
                                                visibleColumnIds.size > 0 &&
                                                visibleColumnIds.size < PO_COLUMNS.length
                                            }
                                            onChange={(e) =>
                                                handleSelectAllColumns(e.target.checked)
                                            }
                                        />
                                    }
                                    label="Tất cả"
                                />

                                {PO_COLUMNS.map((col) => (
                                    <FormControlLabel
                                        key={col.id}
                                        control={
                                            <Checkbox
                                                checked={visibleColumnIds.has(col.id)}
                                                onChange={(e) =>
                                                    handleColumnVisibilityChange(
                                                        col.id,
                                                        e.target.checked
                                                    )
                                                }
                                            />
                                        }
                                        label={col.label}
                                    />
                                ))}
                            </FormGroup>
                        </Box>
                    </Popover>

                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {error && (
                            <Box sx={{ p: 2 }}>
                                <Alert severity="error">{error}</Alert>
                            </Box>
                        )}

                        {loading ? (
                            <Box
                                sx={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 1.5,
                                    color: '#6b7280',
                                }}
                            >
                                <CircularProgress size={22} />
                                <Typography variant="body2">
                                    Đang tải danh sách đơn mua...
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                {visibleColumns.map((column) => (
                                                    <TableCell
                                                        key={column.id}
                                                        sx={{
                                                            bgcolor: '#f9fafb',
                                                            borderBottom: '1px solid #e5e7eb',
                                                            fontWeight: 700,
                                                            color: '#374151',
                                                            py: 1.5,
                                                            px: 2,
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {column.sortable ? (
                                                            <TableSortLabel
                                                                active={orderBy === column.id}
                                                                direction={
                                                                    (orderBy === column.id)
                                                                        ? order
                                                                        : 'asc'
                                                                }
                                                                onClick={() =>
                                                                    handleSortRequest(column.id)
                                                                }
                                                            >
                                                                {column.label}
                                                            </TableSortLabel>
                                                        ) : (
                                                            column.label
                                                        )}
                                                    </TableCell>
                                                ))}

                                            </TableRow>
                                        </TableHead>

                                        <TableBody>
    {rows.length === 0 ? (
        <TableRow>
            <TableCell
                colSpan={visibleColumns.length}
                align="center"
                sx={{ py: 6, color: '#9ca3af' }}
            >
                Không có dữ liệu phù hợp
            </TableCell>
        </TableRow>
    ) : (
        rows.map((row, index) => (
            <TableRow
                key={row.purchaseOrderId}
                hover
                sx={{
                    '&:hover': {
                        bgcolor: '#fafcff',
                    },
                }}
            >
                {visibleColumns.map((column) => (
                    <TableCell
                        key={column.id}
                        sx={BODY_CELL_SX}
                    >
                        {renderCellContent(column, row, index)}
                    </TableCell>
                ))}
            </TableRow>
        ))
    )}
</TableBody>
                                    </Table>
                                </TableContainer>

                                <Box
                                    sx={{
                                        px: 2,
                                        py: 1.5,
                                        borderTop: '1px solid #f3f4f6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 2,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{ color: '#6b7280', fontSize: '13px' }}
                                    >
                                        Hiển thị {start}-{end} / {totalCount} dòng
                                    </Typography>

                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                        }}
                                    >
                                        <FormControl size="small">
                                            <Select
                                                value={pageSize}
                                                onChange={(e) => {
                                                    setPageSize(Number(e.target.value));
                                                    setPage(0);
                                                }}
                                            >
                                                {ROWS_PER_PAGE_OPTIONS.map((size) => (
                                                    <MenuItem key={size} value={size}>
                                                        {size} / trang
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        <Button
                                            variant="outlined"
                                            size="small"
                                            disabled={safePage <= 0}
                                            onClick={() =>
                                                setPage((prev) => Math.max(prev - 1, 0))
                                            }
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Trước
                                        </Button>

                                        <Typography
                                            variant="body2"
                                            sx={{ minWidth: 70, textAlign: 'center' }}
                                        >
                                            {safePage + 1} / {totalPages}
                                        </Typography>

                                        <Button
                                            variant="outlined"
                                            size="small"
                                            disabled={safePage >= totalPages - 1}
                                            onClick={() =>
                                                setPage((prev) =>
                                                    Math.min(prev + 1, totalPages - 1)
                                                )
                                            }
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Sau
                                        </Button>
                                    </Box>
                                </Box>
                            </>
                        )}
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}