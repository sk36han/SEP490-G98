import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
    CircularProgress,
    TableSortLabel,
    Paper,
} from '@mui/material';
import { Package, Download, Plus, Columns, Filter, RefreshCw, GripVertical } from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import SearchInput from '../components/SearchInput';
import ItemFilterPopup from '../components/ItemFilterPopup';
import { removeDiacritics } from '../utils/stringUtils';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser, isAccountantView } from '../permissions/roleUtils';
import { getItemsForDisplay, updateItemStatus } from '../lib/itemService';
import '../styles/ListView.css';

/*
 * Kết nối API: GET /Item/display-all (itemService.getItemsForDisplay), PATCH /Item/{id}/status (updateItemStatus).
 * Cấu trúc bám ItemDisplayResponse: ItemId, ItemCode, ItemName, ItemType, Description, CategoryName, RequiresCo, RequiresCq, IsActive, InventoryAccount, RevenueAccount, CreatedAt, UpdatedAt, PurchasePrice, SalePrice, OnHandQty, ReservedQty, AvailableQty.
 */

const formatPrice = (value) => {
    if (value == null || value === '') return '-';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));
};

const ITEM_LIST_COLUMNS = [
    { id: 'stt', label: 'STT', sortable: false, getValue: (row, index, { pageNumber, pageSize }) => (pageNumber - 1) * pageSize + index + 1 },
    { id: 'itemCode', label: 'Mã vật tư', sortable: true, getValue: (row) => row.itemCode ?? '' },
    { id: 'itemName', label: 'Tên vật tư', sortable: true, getValue: (row) => row.itemName ?? '' },
    { id: 'itemType', label: 'Dạng vật tư', sortable: true, getValue: (row) => row.itemType ?? '-' },
    { id: 'category', label: 'Danh mục', sortable: true, getValue: (row) => row.categoryName ?? '-' },
    { id: 'brand', label: 'Thương hiệu', sortable: true, getValue: (row) => row.brandName ?? '-' },
    { id: 'baseUom', label: 'Đơn vị tính', sortable: true, getValue: (row) => row.baseUomName ?? '-' },
    { id: 'packagingSpec', label: 'Quy cách đóng gói', sortable: true, getValue: (row) => row.packagingSpecName ?? '-' },
    { id: 'spec', label: 'Thông số', sortable: true, getValue: (row) => row.specName ?? '-' },
    { id: 'requiresCO', label: 'CO', sortable: true, getValue: (row) => row.requiresCO ? 'Có' : 'Không' },
    { id: 'requiresCQ', label: 'CQ', sortable: true, getValue: (row) => row.requiresCQ ? 'Có' : 'Không' },
    { id: 'availableQty', label: 'Có thể bán', sortable: true, getValue: (row) => (row.availableQty != null ? Number(row.availableQty).toLocaleString('vi-VN') : '-') },
    { id: 'onHandQty', label: 'Tồn kho', sortable: true, getValue: (row) => (row.onHandQty != null ? Number(row.onHandQty).toLocaleString('vi-VN') : '-') },
    { id: 'purchasePrice', label: 'Giá nhập', sortable: true, getValue: (row) => formatPrice(row.purchasePrice) },
    { id: 'salePrice', label: 'Giá xuất', sortable: true, getValue: (row) => formatPrice(row.salePrice) },
    { id: 'isActive', label: 'Trạng thái', sortable: true, getValue: (row) => (row.isActive ? 'Đang giao dịch' : 'Tạm dừng') },
    { id: 'createdAt', label: 'Ngày tạo', sortable: true, getValue: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : '-' },
];

const ACCOUNTANT_ONLY_COLUMN_IDS = ['purchasePrice', 'salePrice'];
const SORTABLE_COLUMN_IDS = ITEM_LIST_COLUMNS.filter((c) => c.sortable).map((c) => c.id);
const BASE_DEFAULT_VISIBLE_ITEM_COLUMN_IDS = ITEM_LIST_COLUMNS.map((c) => c.id);
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const SELECTION_COLUMN_WIDTH = 52;

const getTableColumnWidth = (colId) => {
    switch (colId) {
        case 'stt':
            return 56;
        case 'itemCode':
            return 230;
        case 'itemName':
            return 220;
        case 'itemType':
            return 140;
        case 'category':
            return 180;
        case 'brand':
            return 160;
        case 'baseUom':
            return 120;
        case 'packagingSpec':
            return 160;
        case 'spec':
            return 140;
        case 'requiresCO':
        case 'requiresCQ':
            return 80;
        case 'availableQty':
        case 'onHandQty':
            return 150;
        case 'purchasePrice':
        case 'salePrice':
            return 150;
        case 'isActive':
            return 180;
        case 'createdAt':
            return 120;
        default:
            return 160;
    }
};

const isCenterAlignedColumn = (colId) =>
    ['stt', 'salePrice', 'purchasePrice', 'onHandQty', 'availableQty', 'requiresCO', 'requiresCQ'].includes(colId);

const headCellBaseSx = {
    fontWeight: 600,
    bgcolor: '#fafafa',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '12px',
    color: '#6b7280',
    height: 48,
    py: 0,
    px: 2,
    verticalAlign: 'middle',
};

const bodyCellBaseSx = {
    color: '#374151',
    fontSize: '13px',
    py: 1.25,
    px: 2,
    verticalAlign: 'middle',
    borderBottom: '1px solid #f3f4f6',
};

const selectionHeadCellSx = {
    ...headCellBaseSx,
    width: SELECTION_COLUMN_WIDTH,
    minWidth: SELECTION_COLUMN_WIDTH,
    maxWidth: SELECTION_COLUMN_WIDTH,
    px: 0,
    textAlign: 'center',
};

const selectionBodyCellSx = {
    ...bodyCellBaseSx,
    width: SELECTION_COLUMN_WIDTH,
    minWidth: SELECTION_COLUMN_WIDTH,
    maxWidth: SELECTION_COLUMN_WIDTH,
    px: 0,
    textAlign: 'center',
};

/** Full quyền Item: tất cả role trừ ADMIN và Giám đốc */
const canCreateOrEditItems = (permissionRole) =>
    ['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS'].includes(permissionRole);
const showAccountantColumnsForRole = (permissionRole) => permissionRole === 'ACCOUNTANTS';

/** Trọng số cột để chia % độ rộng: STT nhỏ, Tên/Mô tả lớn hơn */
const getColumnWeight = (colId) => {
    switch (colId) {
        case 'stt':
            return 0.8;
        case 'itemCode':
            return 1.4;
        case 'itemName':
            return 2.2;
        case 'itemType':
            return 1;
        case 'category':
            return 1.2;
        case 'brand':
            return 1.2;
        case 'baseUom':
            return 1;
        case 'packagingSpec':
            return 1.2;
        case 'spec':
            return 1;
        case 'requiresCO':
        case 'requiresCQ':
            return 0.6;
        case 'availableQty':
        case 'onHandQty':
            return 1.4;
        case 'purchasePrice':
        case 'salePrice':
            return 1.2;
        case 'isActive':
            return 1.4;
        case 'createdAt':
            return 1;
        default:
            return 1;
    }
};

/** Sx cho ô cột: vừa khung (widthPct từ component), không tràn, ellipsis khi dài */
const getColumnCellSx = (colId, isAccountant, widthPct) => {
    const accountantCol = ACCOUNTANT_ONLY_COLUMN_IDS.includes(colId);

    const base = {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        width: `${widthPct}%`,
        maxWidth: `${widthPct}%`,
        boxSizing: 'border-box',
        ...(accountantCol && isAccountant
            ? {
                  bgcolor: 'success.50',
                  borderLeft: '2px solid',
                  borderColor: 'success.main',
              }
            : {}),
    };

    switch (colId) {
        case 'itemCode':
            return { ...base, fontWeight: 600, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' };
        case 'availableQty':
        case 'onHandQty':
        case 'purchasePrice':
        case 'salePrice':
            return { ...base, fontVariantNumeric: 'tabular-nums' };
        case 'createdAt':
        case 'updatedAt':
            return { ...base, fontSize: '0.8rem', whiteSpace: 'pre-line' };
        default:
            return base;
    }
};

const ViewItemList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const location = useLocation();
    const { toast, showToast, clearToast } = useToast();
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const canCreateEdit = canCreateOrEditItems(permissionRole);
    const showAccountantColumns = showAccountantColumnsForRole(permissionRole);
    const isAccountant = isAccountantView(permissionRole);

    const effectiveItemColumns = showAccountantColumns
        ? ITEM_LIST_COLUMNS
        : ITEM_LIST_COLUMNS.filter((c) => !ACCOUNTANT_ONLY_COLUMN_IDS.includes(c.id));

    const defaultVisibleIds = BASE_DEFAULT_VISIBLE_ITEM_COLUMN_IDS;

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(BASE_DEFAULT_VISIBLE_ITEM_COLUMN_IDS));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [orderBy, setOrderBy] = useState(null);
    const [order, setOrder] = useState('asc');
    const [columnOrder, setColumnOrder] = useState(() => {
        const saved = localStorage.getItem('itemColumnOrder');
        return saved ? JSON.parse(saved) : ITEM_LIST_COLUMNS.map(c => c.id);
    });
    const [tempColumnOrder, setTempColumnOrder] = useState(columnOrder);
    const [draggedColumn, setDraggedColumn] = useState(null);
    const [draggedPopupColumn, setDraggedPopupColumn] = useState(null);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await getItemsForDisplay();
            setItems(Array.isArray(list) ? list : []);
        } catch (err) {
            const msg =
                err?.response?.data?.message ??
                err?.response?.data?.detail ??
                err?.message ??
                'Không thể tải danh sách vật tư. Kiểm tra backend (api/Item/display-all) và đăng nhập.';
            setError(msg);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleColumnVisibilityChange = (columnId, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(columnId);
            else next.delete(columnId);
            return next;
        });
    };

    const handleSelectAllItemColumns = (checked) => {
        setVisibleColumnIds(checked ? new Set(effectiveItemColumns.map((c) => c.id)) : new Set());
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
        localStorage.setItem('itemColumnOrder', JSON.stringify(newOrder));
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
        localStorage.setItem('itemColumnOrder', JSON.stringify(tempColumnOrder));
        setColumnSelectorAnchor(null);
    };

    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setColumnSelectorAnchor(null);
    };

    const visibleColumns = effectiveItemColumns.filter((col) => visibleColumnIds.has(col.id))
        .sort((a, b) => {
            // Keep STT column fixed on the left
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
    const totalWeight = visibleColumns.reduce((acc, col) => acc + getColumnWeight(col.id), 0);
    const getColWidthPct = (colId) => (totalWeight > 0 ? (getColumnWeight(colId) / totalWeight) * 100 : 0);

    useEffect(() => {
        const brandNameFromState = location.state?.brandName;
        if (brandNameFromState) {
            queueMicrotask(() => {
                setSearchTerm(String(brandNameFromState));
                setPage(0);
            });
        }
    }, [location.state?.brandName]);

    const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');

    const { filteredItems, totalCount } = useMemo(() => {
        let result = items;

        if (searchTerm.trim()) {
            const lowerTerm = normalize(searchTerm.trim());
            result = result.filter((it) =>
                normalize(it.itemCode).includes(lowerTerm) ||
                normalize(it.itemName).includes(lowerTerm) ||
                normalize(it.itemType).includes(lowerTerm) ||
                normalize(it.description).includes(lowerTerm) ||
                normalize(it.categoryName).includes(lowerTerm) ||
                normalize(it.brandName).includes(lowerTerm) ||
                normalize(it.inventoryAccount).includes(lowerTerm) ||
                normalize(it.revenueAccount).includes(lowerTerm)
            );
        }

        if (filterValues.itemCode) {
            const term = normalize(filterValues.itemCode);
            result = result.filter((it) => normalize(it.itemCode).includes(term));
        }

        if (filterValues.itemName) {
            const term = normalize(filterValues.itemName);
            result = result.filter((it) => normalize(it.itemName).includes(term));
        }

        if (filterValues.itemType) {
            result = result.filter((it) => (it.itemType ?? '') === filterValues.itemType);
        }

        if (filterValues.categoryName) {
            const term = normalize(filterValues.categoryName);
            result = result.filter((it) => normalize(it.categoryName).includes(term));
        }

        if (filterValues.isActive !== null && filterValues.isActive !== undefined) {
            result = result.filter((it) => it.isActive === filterValues.isActive);
        }

        if (filterValues.fromDate) {
            const from = new Date(filterValues.fromDate).getTime();
            result = result.filter((it) => (it.createdAt ? new Date(it.createdAt).getTime() : 0) >= from);
        }

        if (filterValues.toDate) {
            const to = new Date(filterValues.toDate);
            to.setHours(23, 59, 59, 999);
            const toMs = to.getTime();
            result = result.filter((it) => (it.createdAt ? new Date(it.createdAt).getTime() : 0) <= toMs);
        }

        const total = result.length;
        const start = page * pageSize;
        return { filteredItems: result.slice(start, start + pageSize), totalCount: total };
    }, [items, searchTerm, filterValues, page, pageSize]);

    const handleSearchTermChange = (e) => {
        setSearchTerm(e.target.value);
        setPage(0);
    };

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
            setSelectedIds(new Set(filteredItems.map(row => row.itemId)));
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

    const isAllSelected = filteredItems.length > 0 && filteredItems.every(row => selectedIds.has(row.itemId));
    const isSomeSelected = filteredItems.some(row => selectedIds.has(row.itemId)) && !isAllSelected;

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
    };

    const sortedFilteredItems = useMemo(() => {
        if (!orderBy) return filteredItems;

        const sorted = [...filteredItems];
        sorted.sort((a, b) => {
            const aVal = a[orderBy];
            const bVal = b[orderBy];
            const isDate = ['createdAt', 'updatedAt'].includes(orderBy);
            const isNumber = ['availableQty', 'onHandQty', 'purchasePrice', 'salePrice'].includes(orderBy);
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
        return sorted;
    }, [filteredItems, orderBy, order]);

    const rows = sortedFilteredItems.slice(page * pageSize, (page + 1) * pageSize);

    const start = totalCount === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalCount);
    const totalPages = pageSize > 0 ? Math.max(0, Math.ceil(totalCount / pageSize)) : 0;

    const handleExport = () => showToast('Chức năng xuất Excel sẽ được backend triển khai', 'success');

    const handleToggleTransactionStatus = async (itemRow) => {
        const newActive = !itemRow.isActive;
        try {
            await updateItemStatus(itemRow.itemId, newActive);
            setItems((prev) =>
                prev.map((it) => (it.itemId === itemRow.itemId ? { ...it, isActive: newActive } : it))
            );
            showToast(newActive ? 'Đã bật trạng thái giao dịch.' : 'Đã tắt trạng thái giao dịch.', 'success');
        } catch (err) {
            const msg = err?.response?.data?.message ?? err?.message ?? 'Không thể cập nhật trạng thái.';
            showToast(msg, 'error');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return (
            d.toLocaleDateString('vi-VN') +
            '\n' +
            d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        );
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography
                        variant="h5"
                        component="h1"
                        fontWeight="600"
                        sx={{ color: '#111827', lineHeight: 1.3, fontSize: '22px' }}
                    >
                        Danh sách vật tư
                    </Typography>
                </Box>

                <Typography
                    variant="body2"
                    sx={{ color: '#9ca3af', fontSize: '12px', mt: 0.5, fontWeight: 400 }}
                >
                    {isAccountant ? 'Items' : 'Item list'}
                </Typography>
            </Box>

            <ItemFilterPopup
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                initialValues={filterValues}
                onApply={handleFilterApply}
            />

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
                    px: { xs: 2, sm: 2 },
                    pb: 2,
                    boxSizing: 'border-box',
                }}
            >
                {/* Khung bao quanh giống Paper ở ViewPurchaseOrderList */}
                <Box
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
                <Card
                    className="list-filter-card"
                    sx={{
                        mb: 0,
                        borderRadius: '12px 12px 0 0',
                        border: 'none',
                        borderBottom: '1px solid #f3f4f6',
                        boxShadow: 'none',
                    }}
                >
                    <CardContent
                        sx={{
                            '&.MuiCardContent-root:last-child': { pb: 1.5 },
                            pt: 2,
                            px: 2,
                        }}
                    >
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
                                placeholder="Tìm kiếm theo mã, tên, loại, mô tả, danh mục, thương hiệu…"
                                value={searchTerm}
                                onChange={handleSearchTermChange}
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
                                    <Filter size={20} />
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
                                    <Columns size={20} />
                                </IconButton>
                            </Tooltip>

                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 1.5,
                                    alignItems: 'center',
                                    ml: isMobile ? 0 : 'auto',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Tooltip title="Xuất danh sách vật tư ra Excel">
                                    <Button
                                        className="list-page-btn"
                                        variant="outlined"
                                        color="primary"
                                        startIcon={<Download size={18} />}
                                        onClick={handleExport}
                                        sx={{
                                            fontSize: 13,
                                            fontWeight: 500,
                                            textTransform: 'none',
                                            borderRadius: 10,
                                            minHeight: 38,
                                            px: 2.5,
                                        }}
                                    >
                                        Xuất Excel
                                    </Button>
                                </Tooltip>

                                {canCreateEdit && (
                                    <Button
                                        className="list-page-btn"
                                        variant="contained"
                                        startIcon={<Plus size={18} />}
                                        onClick={() => navigate('/items/create')}
                                        sx={{
                                            fontSize: 13,
                                            fontWeight: 500,
                                            textTransform: 'none',
                                            borderRadius: 10,
                                            minHeight: 38,
                                            px: 2.5,
                                            bgcolor: '#0284c7',
                                            boxShadow: '0 1px 2px rgba(2, 132, 199, 0.25)',
                                            '&:hover': {
                                                bgcolor: '#0369a1',
                                                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.30)',
                                            },
                                        }}
                                    >
                                        Tạo thêm vật tư
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

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
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>
                            Chọn cột & Sắp xếp
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                size="small"
                                onClick={handleCancelColumnOrder}
                                sx={{
                                    textTransform: 'none',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: '#6b7280',
                                }}
                            >
                                Hủy
                            </Button>
                            <Button
                                size="small"
                                onClick={handleSaveColumnOrder}
                                sx={{
                                    textTransform: 'none',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: '#0284c7',
                                }}
                            >
                                Lưu
                            </Button>
                        </Box>
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
                                        checked={visibleColumnIds.size === effectiveItemColumns.length} 
                                        indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < effectiveItemColumns.length} 
                                        onChange={(e) => handleSelectAllItemColumns(e.target.checked)}
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
                            {effectiveItemColumns.sort((a, b) => tempColumnOrder.indexOf(a.id) - tempColumnOrder.indexOf(b.id)).map((col) => (
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
                                        cursor: 'grab',
                                        '&:hover': {
                                            bgcolor: '#f9fafb',
                                        },
                                    }}
                                    draggable
                                    onDragStart={(e) => handlePopupDragStart(e, col.id)}
                                    onDragOver={handlePopupDragOver}
                                    onDrop={(e) => handlePopupDrop(e, col.id)}
                                    onDragEnd={handlePopupDragEnd}
                                >
                                    <Box
                                        sx={{
                                            cursor: 'grab',
                                            color: '#9ca3af',
                                            display: 'flex',
                                            alignItems: 'center',
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
                                        sx={{ m: 0 }}
                                    />
                                </Box>
                            ))}
                        </FormGroup>
                    </Box>
                </Popover>

                <Card
                    className="list-grid-card"
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        minWidth: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 0,
                        border: 'none',
                        boxShadow: 'none',
                        p: 0,
                    }}
                >
                    <Box
                        className="list-grid-wrapper"
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            minWidth: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                        }}
                    >
                        {loading ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    py: 8,
                                    color: 'text.secondary',
                                }}
                            >
                                <CircularProgress size={40} sx={{ mb: 2 }} />
                                <Typography variant="body2">Đang tải danh sách vật tư…</Typography>
                            </Box>
                        ) : error ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    py: 6,
                                    color: 'error.main',
                                    textAlign: 'center',
                                    px: 2,
                                }}
                            >
                                <Typography variant="body2" sx={{ mb: 2 }}>
                                    {error}
                                </Typography>
                                <Button variant="outlined" size="small" onClick={() => fetchItems()} sx={{ textTransform: 'none' }}>
                                    Thử lại
                                </Button>
                            </Box>
                        ) : filteredItems.length === 0 ? (
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
                                <Package size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <Typography>Chưa có dữ liệu vật tư</Typography>
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
                                <colgroup>
                                    <col style={{ width: SELECTION_COLUMN_WIDTH }} />
                                    {visibleColumns.map((col) => (
                                        <col key={col.id} style={{ width: getTableColumnWidth(col.id) }} />
                                    ))}
                                </colgroup>
                        
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={selectionHeadCellSx}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '100%',
                                                    height: '100%',
                                                }}
                                            >
                                                <Checkbox
                                                    checked={isAllSelected}
                                                    indeterminate={isSomeSelected}
                                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                                    size="small"
                                                    sx={{
                                                        color: '#9ca3af',
                                                        '&.Mui-checked': { color: '#3b82f6' },
                                                        '&.MuiCheckbox-indeterminate': { color: '#3b82f6' },
                                                    }}
                                                />
                                            </Box>
                                        </TableCell>
                        
                                        {visibleColumns.map((col) => {
                                            const isCenter = isCenterAlignedColumn(col.id);
                        
                                            return (
                                                <TableCell
                                                    key={col.id}
                                                    align={isCenter ? 'center' : 'left'}
                                                    draggable={col.id !== 'stt'}
                                                    onDragStart={(e) => {
                                                        if (col.id !== 'stt') handleDragStart(e, col.id);
                                                    }}
                                                    onDragEnd={handleDragEnd}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, col.id)}
                                                    sx={{
                                                        ...headCellBaseSx,
                                                        cursor: col.id !== 'stt' ? 'grab' : 'default',
                                                        userSelect: 'none',
                                                        opacity: draggedColumn === col.id ? 0.5 : 1,
                                                        ...(col.id === 'stt'
                                                            ? {
                                                                  px: 1,
                                                              }
                                                            : {}),
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: isCenter ? 'center' : 'flex-start',
                                                            gap: col.id === 'itemCode' ? 1.5 : 0.5,
                                                            minWidth: 0,
                                                            width: '100%',
                                                        }}
                                                    >
                                                        {col.id === 'itemCode' && (
                                                            <Box
                                                                sx={{
                                                                    width: 48,
                                                                    height: 48,
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                        )}
                        
                                                        {col.sortable ? (
                                                            <TableSortLabel
                                                                active={orderBy === col.id}
                                                                direction={orderBy === col.id ? order : 'asc'}
                                                                onClick={() => handleSortRequest(col.id)}
                                                                hideSortIcon={false}
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: isCenter ? 'center' : 'flex-start',
                                                                    minWidth: 0,
                                                                    width: isCenter ? 'auto' : '100%',
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
                                                                    width: isCenter ? 'auto' : '100%',
                                                                }}
                                                            >
                                                                {col.label}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                </TableHead>
                        
                                <TableBody>
                                    {rows.map((item, index) => (
                                        <TableRow
                                            key={item.itemId}
                                            hover
                                            sx={{
                                                height: 52,
                                                '&:hover': {
                                                    bgcolor: '#f9fafb',
                                                },
                                            }}
                                        >
                                            <TableCell sx={selectionBodyCellSx}>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '100%',
                                                        height: '100%',
                                                    }}
                                                >
                                                    <Checkbox
                                                        checked={selectedIds.has(item.itemId)}
                                                        onChange={(e) => handleSelectRow(item.itemId, e.target.checked)}
                                                        size="small"
                                                        sx={{
                                                            color: '#9ca3af',
                                                            '&.Mui-checked': { color: '#3b82f6' },
                                                        }}
                                                    />
                                                </Box>
                                            </TableCell>
                        
                                            {visibleColumns.map((col) => {
                                                const opts = { pageNumber: page + 1, pageSize };
                        
                                                if (col.id === 'stt') {
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="center"
                                                            sx={{
                                                                ...bodyCellBaseSx,
                                                                px: 1,
                                                            }}
                                                        >
                                                            {(page + 1 - 1) * pageSize + index + 1}
                                                        </TableCell>
                                                    );
                                                }
                        
                                                if (col.id === 'itemCode') {
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="left"
                                                            sx={{
                                                                ...bodyCellBaseSx,
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 1.5,
                                                                    minWidth: 0,
                                                                    minHeight: 48,
                                                                }}
                                                            >
                                                                <Box
                                                                    sx={{
                                                                        width: 48,
                                                                        height: 48,
                                                                        borderRadius: 1.5,
                                                                        overflow: 'hidden',
                                                                        bgcolor: 'grey.100',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        border: '1px solid',
                                                                        borderColor: 'divider',
                                                                        position: 'relative',
                                                                        flexShrink: 0,
                                                                    }}
                                                                >
                                                                    <Box
                                                                        sx={{
                                                                            position: 'absolute',
                                                                            inset: 0,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                        }}
                                                                    >
                                                                        <Package size={20} style={{ color: '#9e9e9e' }} />
                                                                    </Box>
                                                
                                                                    {item.imageUrl && item.imageUrl.trim() && (
                                                                        <img
                                                                            src={item.imageUrl}
                                                                            alt=""
                                                                            style={{
                                                                                width: '100%',
                                                                                height: '100%',
                                                                                objectFit: 'cover',
                                                                                position: 'relative',
                                                                                zIndex: 1,
                                                                            }}
                                                                            loading="lazy"
                                                                            onError={(e) => {
                                                                                e.target.style.display = 'none';
                                                                            }}
                                                                        />
                                                                    )}
                                                                </Box>
                                                
                                                                <Box
                                                                    sx={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        minHeight: 48,
                                                                        minWidth: 0,
                                                                        flex: 1,
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        onClick={() => navigate(`/items/${item.itemId}`)}
                                                                        sx={{
                                                                            color: '#3b82f6',
                                                                            textDecoration: 'none',
                                                                            fontWeight: 500,
                                                                            cursor: 'pointer',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                            fontSize: '13px',
                                                                            lineHeight: 1.2,
                                                                            display: 'block',
                                                                            minWidth: 0,
                                                                            '&:hover': {
                                                                                textDecoration: 'underline',
                                                                            },
                                                                        }}
                                                                    >
                                                                        {item.itemCode}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        </TableCell>
                                                    );
                                                }
                        
                                                if (col.id === 'itemName') {
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="left"
                                                            sx={{
                                                                ...bodyCellBaseSx,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                            title={item.itemName ?? '-'}
                                                        >
                                                            {item.itemName ?? '-'}
                                                        </TableCell>
                                                    );
                                                }
                        
                                                if (col.id === 'isActive') {
                                                    const isActive = item.isActive;
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="left"
                                                            sx={{
                                                                ...bodyCellBaseSx,
                                                            }}
                                                        >
                                                            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                                                <Chip
                                                                    label={isActive ? '• Đang giao dịch' : '• Tạm dừng'}
                                                                    size="small"
                                                                    sx={{
                                                                        fontWeight: 500,
                                                                        fontSize: '12px',
                                                                        lineHeight: '16px',
                                                                        borderRadius: '999px',
                                                                        minWidth: 120,
                                                                        height: '26px',
                                                                        bgcolor: isActive
                                                                            ? 'rgba(16, 185, 129, 0.2)'
                                                                            : 'rgba(107, 114, 128, 0.2)',
                                                                        color: '#374151',
                                                                        border: 'none',
                                                                        boxShadow: 'none',
                                                                        '& .MuiChip-label': {
                                                                            px: 1.5,
                                                                            py: 0,
                                                                            textAlign: 'left',
                                                                        },
                                                                    }}
                                                                />
                                                            </Box>
                                                        </TableCell>
                                                    );
                                                }

                                                if (col.id === 'requiresCO' || col.id === 'requiresCQ') {
                                                    const value = col.id === 'requiresCO' ? item.requiresCO : item.requiresCQ;
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="center"
                                                            sx={{
                                                                ...bodyCellBaseSx,
                                                            }}
                                                        >
                                                            <Checkbox
                                                                checked={value === true}
                                                                disabled
                                                                size="small"
                                                                sx={{
                                                                    color: '#9ca3af',
                                                                    '&.Mui-checked': { color: '#3b82f6' },
                                                                    '&.Mui-disabled': { color: '#9ca3af', opacity: 0.5 },
                                                                }}
                                                            />
                                                        </TableCell>
                                                    );
                                                }
                        
                                                if (col.id === 'availableQty' || col.id === 'onHandQty') {
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="center"
                                                            sx={{
                                                                ...bodyCellBaseSx,
                                                                fontVariantNumeric: 'tabular-nums',
                                                            }}
                                                        >
                                                            {col.getValue(item, index, opts)}
                                                        </TableCell>
                                                    );
                                                }
                        
                                                if (col.id === 'purchasePrice' || col.id === 'salePrice') {
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="center"
                                                            sx={{
                                                                ...bodyCellBaseSx,
                                                                fontWeight: isAccountant ? 600 : 400,
                                                                fontVariantNumeric: 'tabular-nums',
                                                            }}
                                                        >
                                                            {col.getValue(item, index, opts)}
                                                        </TableCell>
                                                    );
                                                }
                        
                                                return (
                                                    <TableCell
                                                        key={col.id}
                                                        align="left"
                                                        sx={{
                                                            ...bodyCellBaseSx,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                        title={col.getValue(item)}
                                                    >
                                                        {col.getValue(item, index, opts)}
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
                </Card>

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
                {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
                </Box>
            </Box>
        </Box>
    );
};

export default ViewItemList;