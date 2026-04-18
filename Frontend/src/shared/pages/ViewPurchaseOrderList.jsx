import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePolling } from '../hooks/usePolling';
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
    TableSortLabel,
    Paper,
} from '@mui/material';
import { StatusBadge } from '@ui/badges';
import {
    FileText,
    Filter,
    Columns,
    Plus,
    RefreshCw,
    ShoppingCart,
    CloudOff,
    GripVertical,
} from 'lucide-react';
import { removeDiacritics } from '../utils/stringUtils';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import PurchaseOrderFilterPopup from '../components/PurchaseOrderFilterPopup';
import { getPurchaseOrders } from '../lib/purchaseOrderService';
import { formatDateTimeUtc, utcTimestamp } from '../lib/dateUtils';
import '../styles/ListView.css';

const LS_COL_ORDER = 'poColumnOrder';
const LS_SORT = 'poSortConfig';
const LS_VISIBLE_COLUMNS = 'poVisibleColumnIds';
const LS_FILTER = 'poFilterValues';

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

const PO_COLUMNS = [
    {
        id: 'stt',
        label: 'STT',
        sortable: false,
        getValue: (row, index, { pageNumber, pageSize }) =>
            (pageNumber - 1) * pageSize + index + 1,
    },
    {
        id: 'orderCode',
        label: 'Mã đơn đặt hàng nhập',
        sortable: true,
        getValue: (row) => row.orderCode ?? '',
    },
    {
        id: 'warehouseName',
        label: 'Kho nhận',
        sortable: true,
        getValue: (row) => row.warehouseName ?? '',
    },
    {
        id: 'approvalStatus',
        label: 'Trạng thái duyệt',
        sortable: true,
        getValue: (row) => row.approvalStatus ?? '',
    },
    {
        id: 'receivingStatus',
        label: 'Trạng thái nhập hàng',
        sortable: true,
        getValue: (row) => row.receivingStatus ?? '',
    },
    {
        id: 'supplierName',
        label: 'Nhà cung cấp',
        sortable: true,
        getValue: (row) => row.supplierName ?? '',
    },
    {
        id: 'creator',
        label: 'Nhân viên tạo',
        sortable: true,
        getValue: (row) => row.creator ?? '',
    },
    {
        id: 'responsiblePerson',
        label: 'Nhân viên phụ trách',
        sortable: true,
        getValue: (row) => row.responsiblePerson ?? '',
    },
    {
        id: 'totalReceivedQuantity',
        label: 'Số lượng đã nhập',
        sortable: true,
        getValue: (row) => row.totalReceivedQuantity ?? 0,
    },
    {
        id: 'orderValue',
        label: 'Giá trị đơn',
        sortable: true,
        getValue: (row) => row.orderValue ?? 0,
    },
    {
        id: 'createdAt',
        label: 'Ngày tạo',
        sortable: true,
        getValue: (row) => row.createdAt ?? '',
    },
];

const DEFAULT_VISIBLE_COLUMN_IDS = PO_COLUMNS.map((c) => c.id);
const SORTABLE_COLUMN_IDS = PO_COLUMNS.filter((c) => c.sortable).map((c) => c.id);

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

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(Number(value) || 0);

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

    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState(() => {
        const saved = localStorage.getItem(LS_FILTER);
        return saved ? JSON.parse(saved) : {};
    });

    const activeFilterCount = useMemo(
        () =>
            Object.values(filterValues).filter(
                (v) => v !== undefined && v !== null && v !== ''
            ).length,
        [filterValues]
    );

    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(LS_VISIBLE_COLUMNS));
            return Array.isArray(saved)
                ? new Set(saved)
                : new Set(DEFAULT_VISIBLE_COLUMN_IDS);
        } catch {
            return new Set(DEFAULT_VISIBLE_COLUMN_IDS);
        }
    });

    const [columnOrder, setColumnOrder] = useState(() => {
        try {
            const allIds = PO_COLUMNS.map((c) => c.id);
            const saved = JSON.parse(localStorage.getItem(LS_COL_ORDER));
            if (Array.isArray(saved) && saved.length > 0) {
                const validIds = new Set(allIds);
                const filtered = saved.filter((id) => validIds.has(id));
                const missing = allIds.filter((id) => !filtered.includes(id));
                return [...filtered, ...missing];
            }
            return allIds;
        } catch {
            return PO_COLUMNS.map((c) => c.id);
        }
    });

    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [tempVisibleColumnIds, setTempVisibleColumnIds] = useState(
        () => new Set(visibleColumnIds)
    );
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);

    const [orderBy, setOrderBy] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(LS_SORT));
            return saved?.orderBy || null;
        } catch {
            return null;
        }
    });

    const [order, setOrder] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(LS_SORT));
            return saved?.order || 'asc';
        } catch {
            return 'asc';
        }
    });

    const [selectedIds, setSelectedIds] = useState(new Set());

    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    useEffect(() => {
        if (columnSelectorOpen) {
            setTempColumnOrder(columnOrder);
            setTempVisibleColumnIds(new Set(visibleColumnIds));
        }
    }, [columnSelectorOpen, columnOrder, visibleColumnIds]);

    useEffect(() => {
        const status = location.state?.approvalStatus;
        if (status !== undefined) {
            setFilterValues((prev) => {
                const next = {
                    ...prev,
                    approvalStatus: status || undefined,
                };
                localStorage.setItem(LS_FILTER, JSON.stringify(next));
                return next;
            });
        }
    }, [location.state?.approvalStatus]);

    const fetchAllPages = useCallback(async (filters) => {
        const allItems = [];
        let currentPage = 1;
        let totalItemsFromApi = 0;

        while (currentPage <= MAX_API_PAGES) {
            const result = await getPurchaseOrders({
                page: currentPage,
                pageSize: API_PAGE_SIZE,
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
    }, []);

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await fetchAllPages(filterValues);
            const mappedList = (result.items ?? []).map(mapPOItem);
            setList(mappedList);
        } catch (err) {
            setError(
                err?.response?.data?.message ||
                err?.message ||
                'Không tải được danh sách đơn mua.'
            );
            setList([]);
        } finally {
            setLoading(false);
        }
    }, [fetchAllPages, filterValues]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    // ── Polling ────────────────────────────────────────────────────
    const fetchListRef = useRef(fetchList);
    useEffect(() => { fetchListRef.current = fetchList; }, [fetchList]);
    usePolling('purchaseOrders', () => fetchListRef.current?.());

    const handleRefresh = () => {
        setPage(0);
        fetchList();
    };

    const visibleColumns = useMemo(
        () =>
            columnOrder
                .map((id) => PO_COLUMNS.find((c) => c.id === id))
                .filter((c) => c && visibleColumnIds.has(c.id)),
        [columnOrder, visibleColumnIds]
    );

    const handleDragStart = (e, colId) => {
        setDraggedColumn(colId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colId);
    };

    const handleDragEnd = () => setDraggedColumn(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetId) => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('text/plain') || draggedColumn;

        if (!sourceId || sourceId === targetId) {
            setDraggedColumn(null);
            return;
        }

        const arr = [...columnOrder];
        const from = arr.indexOf(sourceId);
        const to = arr.indexOf(targetId);

        if (from === -1 || to === -1) {
            setDraggedColumn(null);
            return;
        }

        arr.splice(from, 1);
        arr.splice(to, 0, sourceId);
        setColumnOrder(arr);
        localStorage.setItem(LS_COL_ORDER, JSON.stringify(arr));
        setDraggedColumn(null);
    };

    const handlePopupDragStart = (e, colId) => {
        setDraggedPopupColumn(colId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colId);
    };

    const handlePopupDragEnd = () => setDraggedPopupColumn(null);

    const handlePopupDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handlePopupDrop = (e, targetId) => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('text/plain') || draggedPopupColumn;

        if (!sourceId || sourceId === targetId) {
            setDraggedPopupColumn(null);
            return;
        }

        const arr = [...tempColumnOrder];
        const from = arr.indexOf(sourceId);
        const to = arr.indexOf(targetId);

        if (from === -1 || to === -1) {
            setDraggedPopupColumn(null);
            return;
        }

        arr.splice(from, 1);
        arr.splice(to, 0, sourceId);
        setTempColumnOrder(arr);
        setDraggedPopupColumn(null);
    };

    const handleSaveColumnOrder = () => {
        setColumnOrder(tempColumnOrder);
        setVisibleColumnIds(new Set(tempVisibleColumnIds));
        localStorage.setItem(LS_COL_ORDER, JSON.stringify(tempColumnOrder));
        localStorage.setItem(
            LS_VISIBLE_COLUMNS,
            JSON.stringify([...tempVisibleColumnIds])
        );
        setColumnSelectorAnchor(null);
    };

    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setTempVisibleColumnIds(new Set(visibleColumnIds));
        setColumnSelectorAnchor(null);
    };

    const handleSortRequest = (columnId) => {
        if (!SORTABLE_COLUMN_IDS.includes(columnId)) return;

        let nextOrderBy;
        let nextOrder;

        if (orderBy === columnId) {
            if (order === 'asc') {
                nextOrderBy = columnId;
                nextOrder = 'desc';
            } else {
                nextOrderBy = null;
                nextOrder = 'asc';
            }
        } else {
            nextOrderBy = columnId;
            nextOrder = 'asc';
        }

        setOrderBy(nextOrderBy);
        setOrder(nextOrder);
        setPage(0);
        localStorage.setItem(
            LS_SORT,
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

        if (filterValues.responsiblePerson) {
            result = result.filter((row) =>
                normalizeText(row.responsiblePerson).includes(
                    normalizeText(filterValues.responsiblePerson)
                )
            );
        }

        result.sort((a, b) => {
            // Mặc định: mới nhất → cũ nhất (không ghim bản nháp lên đầu)
            if (!orderBy) {
                const timeA = utcTimestamp(a.createdAt);
                const timeB = utcTimestamp(b.createdAt);
                return timeB - timeA;
            }

            const aVal = a[orderBy];
            const bVal = b[orderBy];
            const isDate = ['createdAt'].includes(orderBy);
            const isNumber = ['orderValue', 'totalReceivedQuantity'].includes(orderBy);

            let cmp = 0;

            if (isDate) {
                const tA = utcTimestamp(aVal);
                const tB = utcTimestamp(bVal);
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
        setSelectedIds(new Set());
    }, [searchTerm, filterValues]);

    const totalCount = filteredAndSortedRows.length;
    const totalPages = pageSize > 0 ? Math.max(0, Math.ceil(totalCount / pageSize)) : 0;
    const safePage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
    const rows = filteredAndSortedRows.slice(
        safePage * pageSize,
        (safePage + 1) * pageSize
    );
    const start = totalCount === 0 ? 0 : safePage * pageSize + 1;
    const end = Math.min((safePage + 1) * pageSize, totalCount);

    const handleFilterApply = (values) => {
        setFilterValues(values);
        localStorage.setItem(LS_FILTER, JSON.stringify(values));
        setPage(0);
    };

    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setPage(0);
    };

    const handleSelectAll = (checked) => {
        setSelectedIds(checked ? new Set(rows.map((r) => r.purchaseOrderId)) : new Set());
    };

    const handleSelectRow = (id, checked) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const isAllSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.purchaseOrderId));
    const isSomeSelected =
        rows.some((r) => selectedIds.has(r.purchaseOrderId)) && !isAllSelected;

    const renderApprovalStatus = (status) => (
        <StatusBadge status={status} dot="•" variant="dot" />
    );

    const renderReceivingStatus = (status) => (
        <StatusBadge status={status} dot="•" variant="dot" />
    );

    const renderCellContent = (column, row, index) => {
        switch (column.id) {
            case 'stt':
                return column.getValue(row, index, {
                    pageNumber: safePage + 1,
                    pageSize,
                });

            case 'orderCode':
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <Box
                            component="a"
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate(`/purchase-orders/${row.purchaseOrderId}`);
                            }}
                            sx={{
                                color: '#3b82f6',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                '&:hover': { textDecoration: 'underline' },
                            }}
                            title={row.orderCode ?? ''}
                        >
                            {row.orderCode ?? ''}
                        </Box>
                    </Box>
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
                return formatDateTimeUtc(row.createdAt);

            default: {
                const value =
                    column.getValue(row, index, {
                        pageNumber: safePage + 1,
                        pageSize,
                    }) || '-';

                return (
                    <Box
                        sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                        title={String(value)}
                    >
                        {value}
                    </Box>
                );
            }
        }
    };

    const summarySource = filteredAndSortedRows;

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
                                    (String(r.creatorId) === String(currentUserId) ||
                                        normalizeText(r.creator) ===
                                        normalizeText(currentUserName))
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
                                        '& fieldset': { border: 'none' },
                                        '&:hover': {
                                            bgcolor: '#f9fafb',
                                            borderColor: '#d1d5db',
                                        },
                                        '&.Mui-focused': {
                                            bgcolor: '#ffffff',
                                            borderColor: '#0284c7',
                                            boxShadow:
                                                '0 0 0 3px rgba(2,132,199,0.10)',
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
                                        position: 'relative',
                                        '&:hover': {
                                            bgcolor: '#f9fafb',
                                            borderColor: '#d1d5db',
                                        },
                                    }}
                                >
                                    <Filter size={18} />
                                    {activeFilterCount > 0 && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 4,
                                                right: 4,
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                bgcolor: '#0284c7',
                                            }}
                                        />
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
                                            boxShadow: '0 1px 2px rgba(2,132,199,0.25)',
                                            '&:hover': {
                                                bgcolor: '#0369a1',
                                                boxShadow:
                                                    '0 4px 12px rgba(2,132,199,0.30)',
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
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    boxShadow:
                                        '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
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
                            <Typography
                                variant="subtitle2"
                                fontWeight={600}
                                sx={{ fontSize: '15px', color: '#111827' }}
                            >
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
                                '&::-webkit-scrollbar': { width: '6px' },
                                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                                '&::-webkit-scrollbar-thumb': {
                                    bgcolor: '#d1d5db',
                                    borderRadius: '3px',
                                    '&:hover': { bgcolor: '#9ca3af' },
                                },
                            }}
                        >
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={
                                                tempVisibleColumnIds.size === PO_COLUMNS.length
                                            }
                                            indeterminate={
                                                tempVisibleColumnIds.size > 0 &&
                                                tempVisibleColumnIds.size < PO_COLUMNS.length
                                            }
                                            onChange={(e) =>
                                                setTempVisibleColumnIds(
                                                    e.target.checked
                                                        ? new Set(DEFAULT_VISIBLE_COLUMN_IDS)
                                                        : new Set()
                                                )
                                            }
                                            sx={{
                                                color: '#9ca3af',
                                                '&.Mui-checked': { color: '#0284c7' },
                                                '&.MuiCheckbox-indeterminate': {
                                                    color: '#0284c7',
                                                },
                                            }}
                                        />
                                    }
                                    label={
                                        <Typography
                                            sx={{
                                                fontSize: '13px',
                                                fontWeight: 500,
                                                color: '#374151',
                                            }}
                                        >
                                            Tất cả
                                        </Typography>
                                    }
                                    sx={{ mb: 1, py: 0.5 }}
                                />

                                {PO_COLUMNS.slice()
                                    .sort(
                                        (a, b) =>
                                            tempColumnOrder.indexOf(a.id) -
                                            tempColumnOrder.indexOf(b.id)
                                    )
                                    .map((col) => (
                                        <Box
                                            key={col.id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                bgcolor:
                                                    draggedPopupColumn === col.id
                                                        ? '#f9fafb'
                                                        : 'transparent',
                                                opacity:
                                                    draggedPopupColumn === col.id ? 0.5 : 1,
                                                transition: 'all 0.2s',
                                                borderRadius: '8px',
                                                px: 0.75,
                                                py: 0.25,
                                                '&:hover': { bgcolor: '#f9fafb' },
                                            }}
                                            onDragOver={handlePopupDragOver}
                                            onDrop={(e) => handlePopupDrop(e, col.id)}
                                        >
                                            <Box
                                                draggable
                                                onDragStart={(e) =>
                                                    handlePopupDragStart(e, col.id)
                                                }
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
                                                        checked={tempVisibleColumnIds.has(
                                                            col.id
                                                        )}
                                                        onChange={(e) => {
                                                            setTempVisibleColumnIds((prev) => {
                                                                const next = new Set(prev);
                                                                if (e.target.checked) {
                                                                    next.add(col.id);
                                                                } else {
                                                                    next.delete(col.id);
                                                                }
                                                                return next;
                                                            });
                                                        }}
                                                        sx={{
                                                            color: '#9ca3af',
                                                            '&.Mui-checked': {
                                                                color: '#0284c7',
                                                            },
                                                        }}
                                                    />
                                                }
                                                label={
                                                    <Typography
                                                        sx={{
                                                            fontSize: '13px',
                                                            color: '#374151',
                                                        }}
                                                    >
                                                        {col.label}
                                                    </Typography>
                                                }
                                                sx={{ flex: 1, m: 0, py: 0.5 }}
                                            />
                                        </Box>
                                    ))}
                            </FormGroup>
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
                                        boxShadow:
                                            '0 2px 8px rgba(2,132,199,0.25)',
                                    },
                                }}
                            >
                                Lưu
                            </Button>
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
                        {loading ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    flex: 1,
                                    py: 8,
                                }}
                            >
                                <Typography
                                    sx={{ fontSize: '14px', color: '#9ca3af' }}
                                >
                                    Đang tải…
                                </Typography>
                            </Box>
                        ) : error ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flex: 1,
                                    gap: 1.5,
                                }}
                            >
                                <CloudOff size={40} style={{ color: '#d1d5db' }} />
                                <Typography
                                    sx={{
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: '#374151',
                                    }}
                                >
                                    Không thể kết nối đến máy chủ
                                </Typography>
                                <Typography
                                    sx={{ fontSize: '13px', color: '#9ca3af' }}
                                >
                                    {error}
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={fetchList}
                                    sx={{
                                        mt: 0.5,
                                        fontSize: '13px',
                                        textTransform: 'none',
                                        borderRadius: '8px',
                                        borderColor: 'rgba(2,132,199,0.30)',
                                        color: '#0284c7',
                                        '&:hover': {
                                            bgcolor: 'rgba(2,132,199,0.06)',
                                        },
                                    }}
                                >
                                    Thử lại
                                </Button>
                            </Box>
                        ) : rows.length === 0 ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flex: 1,
                                    gap: 1,
                                    color: 'text.secondary',
                                }}
                            >
                                <CloudOff
                                    size={48}
                                    style={{ marginBottom: 8, opacity: 0.35 }}
                                />
                                <Typography sx={{ fontSize: '13px' }}>
                                    Không có dữ liệu phù hợp
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                                <Table stickyHeader size="small">
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
                                                    onChange={(e) =>
                                                        handleSelectAll(e.target.checked)
                                                    }
                                                    size="small"
                                                />
                                            </TableCell>

                                            {visibleColumns.map((column) => (
                                                <TableCell
                                                    key={column.id}
                                                    sx={{
                                                        fontWeight: 600,
                                                        bgcolor:
                                                            draggedColumn === column.id
                                                                ? 'action.hover'
                                                                : '#fafafa',
                                                        whiteSpace: 'nowrap',
                                                        opacity:
                                                            draggedColumn === column.id
                                                                ? 0.5
                                                                : 1,
                                                        transition: 'all 0.2s',
                                                        borderBottom:
                                                            '2px solid #e5e7eb',
                                                        fontSize: '12px',
                                                        color: '#6b7280',
                                                        py: 1.5,
                                                        px: 2,
                                                    }}
                                                    align={
                                                        column.id === 'stt'
                                                            ? 'center'
                                                            : 'left'
                                                    }
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, column.id)}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            '&:hover .drag-icon': {
                                                                opacity: 0.6,
                                                            },
                                                        }}
                                                    >
                                                        <Box
                                                            draggable
                                                            onDragStart={(e) =>
                                                                handleDragStart(
                                                                    e,
                                                                    column.id
                                                                )
                                                            }
                                                            onDragEnd={handleDragEnd}
                                                            className="drag-icon"
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                cursor: 'grab',
                                                                '&:active': {
                                                                    cursor: 'grabbing',
                                                                },
                                                                color: '#9ca3af',
                                                                opacity: 0,
                                                                transition:
                                                                    'opacity 0.2s',
                                                            }}
                                                        >
                                                            <GripVertical size={14} />
                                                        </Box>

                                                        {column.sortable ? (
                                                            <TableSortLabel
                                                                active={orderBy === column.id}
                                                                direction={
                                                                    orderBy === column.id
                                                                        ? order
                                                                        : 'asc'
                                                                }
                                                                onClick={() =>
                                                                    handleSortRequest(
                                                                        column.id
                                                                    )
                                                                }
                                                                sx={{
                                                                    flex: 1,
                                                                    '& .MuiTableSortLabel-icon':
                                                                    {
                                                                        fontSize:
                                                                            '14px',
                                                                        opacity:
                                                                            orderBy ===
                                                                                column.id
                                                                                ? 1
                                                                                : 0,
                                                                    },
                                                                }}
                                                                hideSortIcon={false}
                                                            >
                                                                {column.label}
                                                            </TableSortLabel>
                                                        ) : (
                                                            <Typography
                                                                variant="inherit"
                                                                sx={{ flex: 1 }}
                                                            >
                                                                {column.label}
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
                                                    '&:last-child td': {
                                                        borderBottom: 0,
                                                    },
                                                    '&:hover': {
                                                        bgcolor: '#f9fafb',
                                                    },
                                                    '& .MuiTableCell-root': BODY_CELL_SX,
                                                    '& .MuiTableCell-paddingCheckbox':
                                                        CHECKBOX_CELL_SX,
                                                }}
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={selectedIds.has(
                                                            row.purchaseOrderId
                                                        )}
                                                        onChange={(e) =>
                                                            handleSelectRow(
                                                                row.purchaseOrderId,
                                                                e.target.checked
                                                            )
                                                        }
                                                        size="small"
                                                    />
                                                </TableCell>

                                                {visibleColumns.map((column) => (
                                                    <TableCell
                                                        key={column.id}
                                                        align={
                                                            column.id === 'stt'
                                                                ? 'center'
                                                                : 'left'
                                                        }
                                                        sx={
                                                            column.id === 'stt'
                                                                ? {
                                                                    fontVariantNumeric:
                                                                        'tabular-nums',
                                                                }
                                                                : column.id ===
                                                                    'approvalStatus' ||
                                                                    column.id ===
                                                                    'receivingStatus'
                                                                    ? undefined
                                                                    : {
                                                                        maxWidth: 220,
                                                                        overflow:
                                                                            'hidden',
                                                                        textOverflow:
                                                                            'ellipsis',
                                                                        whiteSpace:
                                                                            'nowrap',
                                                                    }
                                                        }
                                                    >
                                                        {renderCellContent(
                                                            column,
                                                            row,
                                                            index
                                                        )}
                                                    </TableCell>
                                                ))}
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
                                        borderColor: 'rgba(0,0,0,0.1)',
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
                            {start}–{end} / {totalCount} (Tổng {totalPages} trang)
                        </Typography>

                        <Button
                            size="small"
                            variant="outlined"
                            disabled={safePage <= 0}
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            sx={{
                                minWidth: 36,
                                textTransform: 'none',
                                fontSize: '13px',
                                borderRadius: '8px',
                                borderColor: 'rgba(0,0,0,0.1)',
                                '&:hover': {
                                    borderColor: 'rgba(0,0,0,0.2)',
                                },
                            }}
                        >
                            Trước
                        </Button>

                        <Button
                            size="small"
                            variant="outlined"
                            disabled={safePage >= totalPages - 1 || totalCount === 0}
                            onClick={() =>
                                setPage((p) => Math.min(totalPages - 1, p + 1))
                            }
                            sx={{
                                minWidth: 36,
                                textTransform: 'none',
                                fontSize: '13px',
                                borderRadius: '8px',
                                borderColor: 'rgba(0,0,0,0.1)',
                                '&:hover': {
                                    borderColor: 'rgba(0,0,0,0.2)',
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