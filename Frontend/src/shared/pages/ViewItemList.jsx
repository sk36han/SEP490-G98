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
} from '@mui/material';
import { Package, Download, Eye, Plus, Columns, Filter, Edit, Check, X, Power, RefreshCw } from 'lucide-react';
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
const BASE_DEFAULT_VISIBLE_ITEM_COLUMN_IDS = ['stt', 'thumbnail', 'itemCode', 'itemType', 'sellableQty', 'onHandQty', 'actions'];
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

/** Full quyền Item: tất cả role trừ ADMIN và Giám đốc */
const canCreateOrEditItems = (permissionRole) =>
    ['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS'].includes(permissionRole);
const showAccountantColumnsForRole = (permissionRole) => permissionRole === 'ACCOUNTANTS';

/** Trọng số cột để chia % độ rộng: STT/Ảnh nhỏ, Tên/Mô tả lớn hơn */
const getColumnWeight = (colId) => {
    switch (colId) {
        case 'stt':
            return 0.6;
        case 'thumbnail':
            return 1;
        case 'itemCode':
            return 1.2;
        case 'itemName':
            return 2.2;
        case 'itemType':
            return 1;
        case 'description':
            return 2;
        case 'category':
            return 1.2;
        case 'inventoryAccount':
        case 'revenueAccount':
            return 1.2;
        case 'sellableQty':
        case 'onHandQty':
            return 1.2;
        case 'purchasePrice':
        case 'salePrice':
            return 1.2;
        case 'createdAt':
        case 'updatedAt':
            return 1.2;
        case 'requiresCO':
        case 'requiresCQ':
            return 0.8;
        case 'isActive':
            return 1.4;
        case 'actions':
            return 1.4;
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
            return { ...base, fontWeight: 600 };
        case 'sellableQty':
        case 'onHandQty':
        case 'purchasePrice':
        case 'salePrice':
            return { ...base, fontVariantNumeric: 'tabular-nums' };
        case 'createdAt':
        case 'updatedAt':
            return { ...base, fontSize: '0.8rem', whiteSpace: 'pre-line' };
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
    const [pageSize, setPageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(defaultVisibleIds));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

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

    const visibleColumns = effectiveItemColumns.filter((col) => visibleColumnIds.has(col.id));
    const columnSelectorOpen = Boolean(columnSelectorAnchor);
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
                    onClose={() => setColumnSelectorAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{ paper: { sx: { mt: 1.5, p: 2, minWidth: 220, maxWidth: 520 } } }}
                >
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, whiteSpace: 'nowrap' }}>
                        Chọn cột hiển thị
                    </Typography>

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
                                />
                            }
                            label="Tất cả"
                        />
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateRows: 'repeat(5, auto)',
                                gridAutoFlow: 'column',
                                gap: '2px 20px',
                                alignContent: 'start',
                                mt: 0.5,
                            }}
                        >
                            {effectiveItemColumns.map((col) => (
                                <FormControlLabel
                                    key={col.id}
                                    control={
                                        <Checkbox
                                            checked={visibleColumnIds.has(col.id)}
                                            onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)}
                                        />
                                    }
                                    label={col.label}
                                />
                            ))}
                        </Box>
                    </FormGroup>
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
                                        width: '100%',
                                        tableLayout: 'fixed',
                                    }}
                                >
                                    <TableHead>
                                        <TableRow>
                                            {visibleColumns.map((col) => (
                                                <TableCell
                                                    key={col.id}
                                                    sx={{
                                                        ...getColumnCellSx(col.id, isAccountant, getColWidthPct(col.id)),
                                                        fontWeight: 600,
                                                        fontSize: '12px',
                                                        borderBottom: '2px solid #e5e7eb',
                                                        bgcolor:
                                                            isAccountant && ACCOUNTANT_ONLY_COLUMN_IDS.includes(col.id)
                                                                ? 'success.50'
                                                                : '#fafafa',
                                                    }}
                                                    align={
                                                        col.id === 'thumbnail' || col.id === 'requiresCO' || col.id === 'requiresCQ'
                                                            ? 'center'
                                                            : col.id === 'stt' ||
                                                              col.id === 'salePrice' ||
                                                              col.id === 'purchasePrice' ||
                                                              col.id === 'onHandQty' ||
                                                              col.id === 'sellableQty'
                                                            ? 'center'
                                                            : col.id === 'actions'
                                                            ? 'right'
                                                            : 'left'
                                                    }
                                                >
                                                    {col.label}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        {filteredItems.map((item, index) => (
                                            <TableRow
                                                key={item.itemId != null ? `${item.itemId}-${index}` : `row-${index}`}
                                                hover
                                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                            >
                                                {visibleColumns.map((col) => {
                                                    const opts = { pageNumber: page + 1, pageSize };

                                                    if (col.id === 'stt') {
                                                        return (
                                                            <TableCell
                                                                key={col.id}
                                                                align="center"
                                                                sx={{
                                                                    ...getColumnCellSx(col.id, isAccountant, getColWidthPct(col.id)),
                                                                    fontVariantNumeric: 'tabular-nums',
                                                                }}
                                                            >
                                                                {col.getValue(item, index, opts)}
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'thumbnail') {
                                                        return (
                                                            <TableCell
                                                                key={col.id}
                                                                align="center"
                                                                sx={{ ...getColumnCellSx(col.id, isAccountant, getColWidthPct(col.id)), py: 0.75, verticalAlign: 'middle' }}
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
                                                                        <Package size={22} style={{ color: '#9e9e9e' }} />
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
                                                            <TableCell key={col.id} align="left" sx={getColumnCellSx(col.id, isAccountant, getColWidthPct(col.id))}>
                                                                {item.itemCode}
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'description') {
                                                        return (
                                                            <TableCell
                                                                key={col.id}
                                                                align="left"
                                                                sx={{
                                                                    ...getColumnCellSx(col.id, isAccountant, getColWidthPct(col.id)),
                                                                    whiteSpace: 'nowrap',
                                                                }}
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
                                                                    ...getColumnCellSx(col.id, isAccountant, getColWidthPct(col.id)),
                                                                    whiteSpace: 'nowrap',
                                                                }}
                                                                title={item.itemName ?? '-'}
                                                            >
                                                                {item.itemName ?? '-'}
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'isActive') {
                                                        return (
                                                            <TableCell key={col.id} align="left" sx={getColumnCellSx(col.id, isAccountant, getColWidthPct(col.id))}>
                                                                <Chip
                                                                    label={item.isActive ? 'Đang giao dịch' : 'Tạm dừng'}
                                                                    size="small"
                                                                    color={item.isActive ? 'success' : 'default'}
                                                                    variant="filled"
                                                                    sx={{
                                                                        borderRadius: '999px',
                                                                        fontSize: '12px',
                                                                        height: 24,
                                                                    }}
                                                                />
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'sellableQty' || col.id === 'onHandQty') {
                                                        return (
                                                            <TableCell
                                                                key={col.id}
                                                                align="center"
                                                                sx={{
                                                                    ...getColumnCellSx(col.id, isAccountant, getColWidthPct(col.id)),
                                                                    fontVariantNumeric: 'tabular-nums',
                                                                }}
                                                            >
                                                                {col.getValue(item, index, opts)}
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'createdAt') {
                                                        return (
                                                            <TableCell key={col.id} align="left" sx={getColumnCellSx(col.id, isAccountant, getColWidthPct(col.id))}>
                                                                {formatDate(item.createdAt)}
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'updatedAt') {
                                                        return (
                                                            <TableCell key={col.id} align="left" sx={getColumnCellSx(col.id, isAccountant, getColWidthPct(col.id))}>
                                                                {formatDate(item.updatedAt)}
                                                            </TableCell>
                                                        );
                                                    }

                                                    if (col.id === 'requiresCO' || col.id === 'requiresCQ') {
                                                        const value = col.id === 'requiresCO' ? item.requiresCO : item.requiresCQ;
                                                        return (
                                                            <TableCell key={col.id} align="center" sx={{ ...getColumnCellSx(col.id, isAccountant, getColWidthPct(col.id)), py: 0.5 }}>
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
                                                                    ...getColumnCellSx(col.id, isAccountant, getColWidthPct(col.id)),
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
                                                                    ...getColumnCellSx(col.id, isAccountant, getColWidthPct(col.id)),
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
                                                            <TableCell key={col.id} align="right" sx={getColumnCellSx(col.id, isAccountant, getColWidthPct(col.id))}>
                                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                                                                    <Tooltip title="Xem chi tiết">
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => navigate(`/items/${item.itemId}`)}
                                                                            sx={{
                                                                                color: 'text.secondary',
                                                                                '&:hover': {
                                                                                    color: 'primary.main',
                                                                                    bgcolor: 'primary.lighter',
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
                                                                                    color: 'text.secondary',
                                                                                    '&:hover': {
                                                                                        color: 'primary.main',
                                                                                        bgcolor: 'primary.lighter',
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
                                                        <TableCell key={col.id} align="left" sx={getColumnCellSx(col.id, isAccountant, getColWidthPct(col.id))}>
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