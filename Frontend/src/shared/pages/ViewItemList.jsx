import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
    Paper,
} from '@mui/material';
import {
    Package,
    Download,
    Eye,
    Plus,
    Columns,
    Filter,
    Edit,
    Check,
    X,
    Power,
    RefreshCw,
    GripVertical,
} from 'lucide-react';
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

const getSellableQty = (row) => {
    const onHand = row.onHandQty != null ? Number(row.onHandQty) : 0;
    const reserved = row.reservedQty != null ? Number(row.reservedQty) : 0;
    return Math.max(0, onHand - reserved);
};

const ITEM_LIST_COLUMNS = [
    { id: 'stt', label: 'STT', getValue: (row, index, { pageNumber, pageSize }) => (pageNumber - 1) * pageSize + index + 1 },
    { id: 'thumbnail', label: 'Ảnh', getValue: () => '' },
    { id: 'itemCode', label: 'Mã vật tư', getValue: (row) => row.itemCode ?? '' },
    { id: 'itemName', label: 'Tên vật tư', getValue: (row) => row.itemName ?? '' },
    { id: 'itemType', label: 'Dạng vật tư', getValue: (row) => row.itemType ?? '-' },
    { id: 'description', label: 'Mô tả', getValue: (row) => row.description ?? '-' },
    { id: 'category', label: 'Category', getValue: (row) => row.categoryName ?? '-' },
    { id: 'inventoryAccount', label: 'Tài khoản kho', getValue: (row) => row.inventoryAccount ?? '-' },
    { id: 'revenueAccount', label: 'Tài khoản doanh thu', getValue: (row) => row.revenueAccount ?? '-' },
    { id: 'sellableQty', label: 'Số lượng có thể bán', getValue: (row) => getSellableQty(row).toLocaleString('vi-VN') },
    { id: 'onHandQty', label: 'Số lượng tồn kho', getValue: (row) => (row.onHandQty != null ? Number(row.onHandQty).toLocaleString('vi-VN') : '-') },
    { id: 'purchasePrice', label: 'Giá nhập', getValue: (row) => formatPrice(row.purchasePrice) },
    { id: 'salePrice', label: 'Giá xuất', getValue: (row) => formatPrice(row.salePrice) },
    { id: 'createdAt', label: 'Được tạo vào', getValue: (row) => row.createdAt ?? '' },
    { id: 'requiresCO', label: 'RequiresCO', getValue: (row) => (row.requiresCO ? 'Có' : 'Không') },
    { id: 'requiresCQ', label: 'RequiresCQ', getValue: (row) => (row.requiresCQ ? 'Có' : 'Không') },
    { id: 'isActive', label: 'Trạng thái giao dịch', getValue: (row) => (row.isActive ? 'Đang giao dịch' : 'Tạm dừng') },
    { id: 'updatedAt', label: 'Cập nhật', getValue: (row) => row.updatedAt ?? '' },
    { id: 'actions', label: 'Thao tác', getValue: () => '' },
];

const ACCOUNTANT_ONLY_COLUMN_IDS = ['inventoryAccount', 'revenueAccount', 'purchasePrice', 'salePrice'];
const BASE_DEFAULT_VISIBLE_ITEM_COLUMN_IDS = ['stt', 'thumbnail', 'itemName', 'itemType', 'sellableQty', 'onHandQty', 'actions'];
const ROWS_PER_PAGE_OPTIONS = [7, 10, 20, 50, 100];
const LS_COL_ORDER = 'itemColumnOrder';

const COLUMN_BORDER = '1px solid #e5e7eb';

const SELECTION_COL_WIDTH = 56;
const STT_COL_WIDTH = 60;
const THUMBNAIL_COL_WIDTH = 120;
const ACTIONS_COL_WIDTH = 136;

const FIXED_COLUMN_WIDTHS = {
    stt: STT_COL_WIDTH,
    thumbnail: THUMBNAIL_COL_WIDTH,
    actions: ACTIONS_COL_WIDTH,
};

const BODY_CELL_SX = {
    py: 1.25,
    px: 2,
    fontSize: '13px',
    lineHeight: '20px',
    verticalAlign: 'middle',
    borderBottom: '1px solid #f3f4f6',
    borderRight: COLUMN_BORDER,
    color: '#374151',
    boxSizing: 'border-box',
};

const CHECKBOX_CELL_SX = {
    ...BODY_CELL_SX,
    width: SELECTION_COL_WIDTH,
    minWidth: SELECTION_COL_WIDTH,
    maxWidth: SELECTION_COL_WIDTH,
    px: 1.5,
};

const STT_COLUMN_SX = {
    width: STT_COL_WIDTH,
    minWidth: STT_COL_WIDTH,
    maxWidth: STT_COL_WIDTH,
    fontVariantNumeric: 'tabular-nums',
    boxSizing: 'border-box',
};

const canCreateOrEditItems = (permissionRole) =>
    ['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS'].includes(permissionRole);

const showAccountantColumnsForRole = (permissionRole) => permissionRole === 'ACCOUNTANTS';

const getColumnWeight = (colId) => {
    switch (colId) {
        case 'itemCode':
            return 1.3;
        case 'itemName':
            return 3.5;
        case 'itemType':
            return 1.8;
        case 'description':
            return 2.4;
        case 'category':
            return 1.4;
        case 'inventoryAccount':
        case 'revenueAccount':
            return 1.4;
        case 'sellableQty':
        case 'onHandQty':
            return 0.65;
        case 'purchasePrice':
        case 'salePrice':
            return 1.7;
        case 'createdAt':
        case 'updatedAt':
            return 1.7;
        case 'requiresCO':
        case 'requiresCQ':
            return 1;
        case 'isActive':
            return 1.8;
        default:
            return 1;
    }
};

// Chỉ căn giữa cho cột số và cột đặc biệt (stt, ảnh, Có/Không). Cột text căn trái.
const getColumnAlign = (colId) => {
    if (colId === 'actions') return 'right';
    if (
        [
            'stt',
            'thumbnail',
            'requiresCO',
            'requiresCQ',
            'sellableQty',
            'onHandQty',
            'purchasePrice',
            'salePrice',
        ].includes(colId)
    ) {
        return 'center';
    }
    return 'left';
};

const getHeaderJustifyContent = (colId) => {
    if (colId === 'actions') return 'center'; // Tên cột "Thao tác" nằm giữa cột
    const align = getColumnAlign(colId);
    if (align === 'center') return 'center';
    if (align === 'right') return 'flex-end';
    return 'flex-start';
};

const getColumnCellSx = (colId, isAccountant) => {
    if (colId === 'stt') return STT_COLUMN_SX;

    const accountantCol = ACCOUNTANT_ONLY_COLUMN_IDS.includes(colId);

    const base = {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
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
            return { ...base, fontWeight: 600 };
        case 'itemName':
            return { ...base, fontWeight: 500 };
        case 'sellableQty':
        case 'onHandQty':
        case 'purchasePrice':
        case 'salePrice':
            return { ...base, fontVariantNumeric: 'tabular-nums' };
        case 'createdAt':
        case 'updatedAt':
            return { ...base, fontSize: '0.8rem' };
        case 'actions':
            return { ...base, overflow: 'visible' };
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
    const [pageSize, setPageSize] = useState(7);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const activeFilterCount = useMemo(
        () => Object.values(filterValues || {}).filter((v) => v !== undefined && v !== null && v !== '').length,
        [filterValues],
    );
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(defaultVisibleIds));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [columnOrder, setColumnOrder] = useState(() => {
        try {
            const allIds = ITEM_LIST_COLUMNS.map((c) => c.id);
            const saved = JSON.parse(localStorage.getItem(LS_COL_ORDER));
            if (Array.isArray(saved) && saved.length > 0) {
                const validIds = new Set(allIds);
                const filtered = saved.filter((id) => validIds.has(id));
                const missing = allIds.filter((id) => !filtered.includes(id));
                return [...filtered, ...missing];
            }
            return allIds;
        } catch {
            return ITEM_LIST_COLUMNS.map((c) => c.id);
        }
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

    useEffect(() => {
        setPage(0);
        setSelectedIds(new Set());
    }, [searchTerm, filterValues]);

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

    const visibleColumns = useMemo(
        () =>
            columnOrder
                .map((id) => effectiveItemColumns.find((c) => c.id === id))
                .filter((c) => c && visibleColumnIds.has(c.id)),
        [columnOrder, effectiveItemColumns, visibleColumnIds]
    );

    const flexVisibleColumns = useMemo(
        () => visibleColumns.filter((col) => !FIXED_COLUMN_WIDTHS[col.id]),
        [visibleColumns]
    );

    const totalFlexWeight = useMemo(
        () => flexVisibleColumns.reduce((sum, col) => sum + getColumnWeight(col.id), 0),
        [flexVisibleColumns]
    );

    const getColumnWidthStyle = useCallback(
        (colId) => {
            if (FIXED_COLUMN_WIDTHS[colId]) {
                return { width: `${FIXED_COLUMN_WIDTHS[colId]}px` };
            }

            const pct = totalFlexWeight > 0 ? (getColumnWeight(colId) / totalFlexWeight) * 100 : 0;
            return { width: `${pct}%` };
        },
        [totalFlexWeight]
    );

    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    useEffect(() => {
        if (columnSelectorOpen) setTempColumnOrder(columnOrder);
    }, [columnSelectorOpen, columnOrder]);

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

    const handleSelectAll = (checked) => {
        setSelectedIds(checked ? new Set(filteredItems.map((it) => it.itemId)) : new Set());
    };

    const handleSelectRow = (id, checked) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    };

    const isAllSelected = filteredItems.length > 0 && filteredItems.every((it) => selectedIds.has(it.itemId));
    const isSomeSelected = filteredItems.some((it) => selectedIds.has(it.itemId)) && !isAllSelected;

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
        localStorage.setItem(LS_COL_ORDER, JSON.stringify(tempColumnOrder));
        setColumnSelectorAnchor(null);
    };

    const handleCancelColumnOrder = () => {
        setTempColumnOrder(columnOrder);
        setColumnSelectorAnchor(null);
    };

    useEffect(() => {
        const brandNameFromState = location.state?.brandName;
        const categoryNameFromState = location.state?.categoryName;

        if (brandNameFromState) {
            queueMicrotask(() => {
                setSearchTerm(String(brandNameFromState));
                setPage(0);
            });
        }

        if (categoryNameFromState) {
            queueMicrotask(() => {
                setFilterValues((prev) => ({ ...prev, categoryName: String(categoryNameFromState) }));
                setPage(0);
            });
        }
    }, [location.state?.brandName, location.state?.categoryName]);

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
        return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Box
            sx={{
                height: '100%',
                minHeight: 0,
                minWidth: 0,
                overflow: 'visible',
                display: 'flex',
                flexDirection: 'column',
                pt: 0,
                pb: 2,
                width: '100%',
                maxWidth: '100%',
                ml: 0,
                mr: 0,
                boxSizing: 'border-box',
            }}
        >
            <Box
                sx={{
                    flexShrink: 0,
                    mb: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
                    <Typography
                        variant="h4"
                        component="h1"
                        fontWeight="800"
                        sx={{
                            background: isAccountant
                                ? 'linear-gradient(45deg, #2E7D32 20%, #66BB6A 90%)'
                                : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                            backgroundClip: 'text',
                            textFillColor: 'transparent',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Danh sách vật tư
                    </Typography>

                    {isAccountant && (
                        <Chip
                            label="Kế toán"
                            size="small"
                            sx={{
                                fontWeight: 600,
                                bgcolor: 'success.light',
                                color: 'success.dark',
                                border: '1px solid',
                                borderColor: 'success.main',
                            }}
                        />
                    )}
                </Box>

                <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ maxWidth: 600, wordBreak: 'break-word', overflowWrap: 'break-word' }}
                >
                    {isAccountant
                        ? 'Xem danh sách vật tư và giá bán. Tìm kiếm, lọc và xuất Excel để báo cáo.'
                        : 'Xem và quản lý tất cả vật tư/sản phẩm. Tìm kiếm theo mã, tên, loại, mô tả, danh mục, thương hiệu.'}
                </Typography>
            </Box>

            <ItemFilterPopup
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                initialValues={filterValues}
                onApply={handleFilterApply}
            />

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
                                    '& fieldset': { border: 'none' },
                                    '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                    '&.Mui-focused': {
                                        bgcolor: '#ffffff',
                                        borderColor: '#0284c7',
                                        boxShadow: '0 0 0 3px rgba(2,132,199,0.10)',
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
                                    position: 'relative',
                                    '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
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
                                    '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                }}
                            >
                                <Columns size={18} />
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
                            <Tooltip title={isAccountant ? 'Xuất Excel để báo cáo (Kế toán)' : 'Xuất danh sách vật tư ra Excel'}>
                                <Button
                                    variant={isAccountant ? 'contained' : 'outlined'}
                                    color={isAccountant ? 'success' : 'primary'}
                                    startIcon={<Download size={18} />}
                                    onClick={handleExport}
                                    sx={{
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        textTransform: 'none',
                                        borderRadius: '10px',
                                        height: 38,
                                        px: 2.5,
                                        borderColor: isAccountant ? undefined : '#e5e7eb',
                                        '&:hover': { bgcolor: isAccountant ? undefined : '#f9fafb' },
                                    }}
                                >
                                    Xuất Excel
                                </Button>
                            </Tooltip>

                            <Tooltip title="Làm mới danh sách">
                                <IconButton
                                    onClick={() => fetchItems()}
                                    disabled={loading}
                                    aria-label="Làm mới"
                                    sx={{
                                        border: '1px solid #e5e7eb',
                                        bgcolor: '#ffffff',
                                        borderRadius: '10px',
                                        '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' },
                                    }}
                                >
                                    <RefreshCw size={18} />
                                </IconButton>
                            </Tooltip>

                            {canCreateEdit && (
                                <Button
                                    variant="contained"
                                    startIcon={<Plus size={18} />}
                                    onClick={() => navigate('/items/create')}
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
                                            boxShadow: '0 4px 12px rgba(2,132,199,0.30)',
                                        },
                                    }}
                                >
                                    Tạo thêm vật tư
                                </Button>
                            )}
                        </Box>
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
                                boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                            },
                        },
                    }}
                >
                    <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
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
                            '&::-webkit-scrollbar': { width: '6px' },
                            '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px' },
                        }}
                    >
                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={effectiveItemColumns.every((c) => visibleColumnIds.has(c.id))}
                                        indeterminate={
                                            visibleColumnIds.size > 0 &&
                                            !effectiveItemColumns.every((c) => visibleColumnIds.has(c.id))
                                        }
                                        onChange={(e) => handleSelectAllItemColumns(e.target.checked)}
                                        sx={{
                                            color: '#9ca3af',
                                            '&.Mui-checked': { color: '#0284c7' },
                                            '&.MuiCheckbox-indeterminate': { color: '#0284c7' },
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

                            {effectiveItemColumns
                                .slice()
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
                                                    sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#0284c7' } }}
                                                />
                                            }
                                            label={<Typography sx={{ fontSize: '13px', color: '#374151' }}>{col.label}</Typography>}
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
                                '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' },
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
                                '&:hover': { bgcolor: '#0369a1', boxShadow: '0 2px 8px rgba(2,132,199,0.25)' },
                            }}
                        >
                            Lưu
                        </Button>
                    </Box>
                </Popover>

                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, py: 8 }}>
                            <Typography sx={{ fontSize: '14px', color: '#9ca3af' }}>Đang tải…</Typography>
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
                            <Package size={40} style={{ color: '#d1d5db' }} />
                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                                Không thể tải danh sách vật tư
                            </Typography>
                            <Typography sx={{ fontSize: '13px', color: '#9ca3af' }}>{error}</Typography>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={fetchItems}
                                sx={{
                                    mt: 0.5,
                                    fontSize: '13px',
                                    textTransform: 'none',
                                    borderRadius: '8px',
                                    borderColor: 'rgba(2,132,199,0.30)',
                                    color: '#0284c7',
                                    '&:hover': { bgcolor: 'rgba(2,132,199,0.06)' },
                                }}
                            >
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
                                flex: 1,
                                gap: 1,
                                color: 'text.secondary',
                            }}
                        >
                            <Package size={48} style={{ marginBottom: 8, opacity: 0.35 }} />
                            <Typography sx={{ fontSize: '13px' }}>Chưa có dữ liệu vật tư</Typography>
                        </Box>
                    ) : (
                        <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                            <Table size="small" stickyHeader sx={{ width: '100%', minWidth: 1080, tableLayout: 'fixed' }}>
                                <colgroup>
                                    <col style={{ width: `${SELECTION_COL_WIDTH}px` }} />
                                    {visibleColumns.map((col) => (
                                        <col key={col.id} style={getColumnWidthStyle(col.id)} />
                                    ))}
                                </colgroup>

                                <TableHead>
                                    <TableRow>
                                        <TableCell
                                            padding="checkbox"
                                            sx={{
                                                fontWeight: 600,
                                                bgcolor: '#fafafa',
                                                width: SELECTION_COL_WIDTH,
                                                minWidth: SELECTION_COL_WIDTH,
                                                maxWidth: SELECTION_COL_WIDTH,
                                                borderBottom: '2px solid #e5e7eb',
                                                borderRight: COLUMN_BORDER,
                                                fontSize: '12px',
                                                px: 1.5,
                                            }}
                                        >
                                            <Checkbox
                                                checked={isAllSelected}
                                                indeterminate={isSomeSelected}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                size="small"
                                            />
                                        </TableCell>

                                        {visibleColumns.map((col) => {
                                            const align = getColumnAlign(col.id);

                                            return (
                                                <TableCell
                                                    key={col.id}
                                                    align={align}
                                                    sx={{
                                                        fontWeight: 600,
                                                        bgcolor: draggedColumn === col.id ? '#f3f4f6' : '#fafafa',
                                                        whiteSpace: 'nowrap',
                                                        opacity: draggedColumn === col.id ? 0.5 : 1,
                                                        transition: 'all 0.2s',
                                                        borderBottom: '2px solid #e5e7eb',
                                                        borderRight: COLUMN_BORDER,
                                                        fontSize: '12px',
                                                        color: '#6b7280',
                                                        py: 1.5,
                                                        px: 2,
                                                    }}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, col.id)}
                                                >
                                                    <Box
                                                        sx={{
                                                            position: 'relative',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: getHeaderJustifyContent(col.id),
                                                            width: '100%',
                                                            minHeight: 20,
                                                            '&:hover .drag-icon': { opacity: 0.6 },
                                                        }}
                                                    >
                                                        <Box
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, col.id)}
                                                            onDragEnd={handleDragEnd}
                                                            className="drag-icon"
                                                            sx={{
                                                                position: 'absolute',
                                                                left: 0,
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

                                                        <Typography
                                                            variant="inherit"
                                                            sx={{
                                                                flex: align === 'left' ? 1 : 'unset',
                                                                textAlign: align,
                                                            }}
                                                        >
                                                            {col.label}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {filteredItems.map((item, index) => (
                                        <TableRow
                                            key={item.itemId}
                                            hover
                                            sx={{
                                                '&:last-child td': { borderBottom: 0 },
                                                '&:hover': { bgcolor: '#f9fafb' },
                                                '& .MuiTableCell-root': BODY_CELL_SX,
                                                '& .MuiTableCell-paddingCheckbox': CHECKBOX_CELL_SX,
                                            }}
                                        >
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    checked={selectedIds.has(item.itemId)}
                                                    onChange={(e) => handleSelectRow(item.itemId, e.target.checked)}
                                                    size="small"
                                                />
                                            </TableCell>

                                            {visibleColumns.map((col) => {
                                                const opts = { pageNumber: page + 1, pageSize };

                                                if (col.id === 'stt') {
                                                    return (
                                                        <TableCell key={col.id} align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                                            {col.getValue(item, index, opts)}
                                                        </TableCell>
                                                    );
                                                }

                                                if (col.id === 'thumbnail') {
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="center"
                                                            sx={{
                                                                ...getColumnCellSx(col.id, isAccountant),
                                                                py: 1,
                                                                px: 2,
                                                                verticalAlign: 'middle',
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    width: 56,
                                                                    height: 56,
                                                                    borderRadius: 1.5,
                                                                    overflow: 'hidden',
                                                                    bgcolor: 'grey.100',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    border: '1px solid',
                                                                    borderColor: 'divider',
                                                                    position: 'relative',
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
                                                                    <Package size={28} style={{ color: '#9e9e9e' }} />
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
                                                        </TableCell>
                                                    );
                                                }

                                                if (col.id === 'itemCode') {
                                                    return (
                                                        <TableCell key={col.id} align="left" sx={{ ...getColumnCellSx(col.id, isAccountant), px: 1.5 }}>
                                                            {item.itemCode ?? '-'}
                                                        </TableCell>
                                                    );
                                                }

                                                if (col.id === 'description') {
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="left"
                                                            sx={getColumnCellSx(col.id, isAccountant)}
                                                            title={item.description ?? '-'}
                                                        >
                                                            {item.description ?? '-'}
                                                        </TableCell>
                                                    );
                                                }

                                                if (col.id === 'itemName') {
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="left"
                                                            sx={{
                                                                ...getColumnCellSx(col.id, isAccountant),
                                                                px: 2,
                                                                minWidth: 0,
                                                            }}
                                                            title={item.itemName ?? '-'}
                                                        >
                                                            {item.itemName ?? '-'}
                                                        </TableCell>
                                                    );
                                                }

                                                if (col.id === 'itemType') {
                                                    return (
                                                        <TableCell key={col.id} align="left" sx={getColumnCellSx(col.id, isAccountant)}>
                                                            {item.itemType ?? '-'}
                                                        </TableCell>
                                                    );
                                                }

                                                if (col.id === 'isActive') {
                                                    return (
                                                        <TableCell key={col.id} align="left" sx={getColumnCellSx(col.id, isAccountant)}>
                                                            <Chip
                                                                label={item.isActive ? 'Đang giao dịch' : 'Tạm dừng'}
                                                                size="small"
                                                                color={item.isActive ? 'success' : 'default'}
                                                                variant="filled"
                                                                sx={{ borderRadius: 1.5 }}
                                                            />
                                                        </TableCell>
                                                    );
                                                }

                                                if (col.id === 'sellableQty' || col.id === 'onHandQty') {
                                                    return (
                                                        <TableCell key={col.id} align="center" sx={getColumnCellSx(col.id, isAccountant)}>
                                                            {col.getValue(item, index, opts)}
                                                        </TableCell>
                                                    );
                                                }

                                                if (col.id === 'createdAt') {
                                                    return (
                                                        <TableCell key={col.id} align="left" sx={getColumnCellSx(col.id, isAccountant)}>
                                                            {formatDate(item.createdAt)}
                                                        </TableCell>
                                                    );
                                                }

                                                if (col.id === 'updatedAt') {
                                                    return (
                                                        <TableCell key={col.id} align="left" sx={getColumnCellSx(col.id, isAccountant)}>
                                                            {formatDate(item.updatedAt)}
                                                        </TableCell>
                                                    );
                                                }

                                                if (col.id === 'requiresCO' || col.id === 'requiresCQ') {
                                                    const value = col.id === 'requiresCO' ? item.requiresCO : item.requiresCQ;
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="center"
                                                            sx={{ ...getColumnCellSx(col.id, isAccountant), py: 0.75 }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    width: 28,
                                                                    height: 28,
                                                                    borderRadius: 1,
                                                                    border: '1px solid',
                                                                    borderColor: 'divider',
                                                                    bgcolor: 'background.paper',
                                                                    color: value ? 'grey.700' : 'grey.500',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                }}
                                                            >
                                                                {value ? (
                                                                    <Check size={18} strokeWidth={2.5} style={{ color: 'inherit' }} />
                                                                ) : (
                                                                    <X size={18} strokeWidth={2.5} style={{ color: 'inherit' }} />
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                    );
                                                }

                                                if (col.id === 'salePrice') {
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align="center"
                                                            sx={{
                                                                ...getColumnCellSx(col.id, isAccountant),
                                                                fontWeight: isAccountant ? 600 : 400,
                                                            }}
                                                        >
                                                            {formatPrice(item.salePrice)}
                                                        </TableCell>
                                                    );
                                                }

                                                if (ACCOUNTANT_ONLY_COLUMN_IDS.includes(col.id)) {
                                                    const isNumericCol = col.id === 'purchasePrice' || col.id === 'salePrice';
                                                    return (
                                                        <TableCell
                                                            key={col.id}
                                                            align={isNumericCol ? 'center' : 'left'}
                                                            sx={{
                                                                ...getColumnCellSx(col.id, isAccountant),
                                                                fontWeight:
                                                                    col.id === 'purchasePrice' || col.id === 'salePrice'
                                                                        ? isAccountant
                                                                            ? 600
                                                                            : 400
                                                                        : 400,
                                                            }}
                                                        >
                                                            {col.getValue(item, index, { pageNumber: page + 1, pageSize })}
                                                        </TableCell>
                                                    );
                                                }

                                                if (col.id === 'actions') {
                                                    return (
                                                        <TableCell key={col.id} align="right" sx={getColumnCellSx(col.id, isAccountant)}>
                                                            <Box
                                                                sx={{
                                                                    display: 'inline-flex',
                                                                    width: '100%',
                                                                    justifyContent: 'flex-end',
                                                                    alignItems: 'center',
                                                                    gap: 0.5,
                                                                }}
                                                            >
                                                                <Tooltip title="Xem chi tiết">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => navigate(`/items/${item.itemId}`)}
                                                                        sx={{
                                                                            p: 0.5,
                                                                            color: 'text.secondary',
                                                                            '&:hover': {
                                                                                color: 'primary.main',
                                                                                bgcolor: 'rgba(2,132,199,0.08)',
                                                                            },
                                                                        }}
                                                                    >
                                                                        <Eye size={18} />
                                                                    </IconButton>
                                                                </Tooltip>

                                                                {canCreateEdit && (
                                                                    <Tooltip title={item.isActive ? 'Tắt trạng thái giao dịch' : 'Bật trạng thái giao dịch'}>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => handleToggleTransactionStatus(item)}
                                                                            sx={{
                                                                                p: 0.5,
                                                                                color: item.isActive ? 'success.main' : 'text.disabled',
                                                                                '&:hover': {
                                                                                    color: item.isActive ? 'error.main' : 'success.main',
                                                                                    bgcolor: 'action.hover',
                                                                                },
                                                                            }}
                                                                            aria-label={item.isActive ? 'Tắt trạng thái giao dịch' : 'Bật trạng thái giao dịch'}
                                                                        >
                                                                            <Power size={18} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                )}

                                                                {canCreateEdit && (
                                                                    <Tooltip title="Chỉnh sửa">
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => navigate(`/items/edit/${item.itemId}`)}
                                                                            sx={{
                                                                                p: 0.5,
                                                                                color: 'text.secondary',
                                                                                '&:hover': {
                                                                                    color: 'primary.main',
                                                                                    bgcolor: 'rgba(2,132,199,0.08)',
                                                                                },
                                                                            }}
                                                                        >
                                                                            <Edit size={18} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                    );
                                                }

                                                return (
                                                    <TableCell
                                                        key={col.id}
                                                        align="left"
                                                        sx={getColumnCellSx(col.id, isAccountant)}
                                                        title={String(col.getValue(item, index, opts) ?? '')}
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
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.1)' },
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
                            borderColor: 'rgba(0,0,0,0.1)',
                            '&:hover': { borderColor: 'rgba(0,0,0,0.2)' },
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
                            borderColor: 'rgba(0,0,0,0.1)',
                            '&:hover': { borderColor: 'rgba(0,0,0,0.2)' },
                        }}
                    >
                        Sau
                    </Button>
                </Box>
            </Paper>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </Box>
    );
};

export default ViewItemList;