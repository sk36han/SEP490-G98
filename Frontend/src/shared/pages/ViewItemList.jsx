import React, { useState, useEffect } from 'react';
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
    Switch,
} from '@mui/material';
import { Package, Download, Eye, Plus, Columns, Filter, Edit, Check, X } from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import SearchInput from '../components/SearchInput';
import ItemFilterPopup from '../components/ItemFilterPopup';
import { removeDiacritics } from '../utils/stringUtils';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser, isAccountantView } from '../permissions/roleUtils';
import '../styles/ListView.css';

/*
 * MOCKUP THEO SCHEMA SQL (KHÔNG KẾT NỐI API).
 * Cấu trúc bám bảng: [dbo].[Items], [dbo].[ItemPrices] (PriceType=SALE → salePrice), [dbo].[InventoryOnHand] (OnHandQty → onHandQty).
 * Trường hiển thị cho Kế toán: InventoryAccount, RevenueAccount, Số lượng tồn, Giá nhập (ItemPrices PURCHASE), Giá xuất (ItemPrices SALE).
 */
const MOCK_ITEMS = [
    { itemId: 1, itemCode: 'SP001', itemName: 'iPhone 15 Pro Max 256GB', itemType: 'Product', description: 'Điện thoại iPhone 15 Pro Max bản 256GB', categoryId: 1, brandId: 1, baseUomId: 1, packagingSpecId: 1, requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', purchasePrice: 26500000, salePrice: 28500000, onHandQty: 42, reservedQty: 2, createdAt: '2025-02-14T08:30:00', updatedAt: '2025-02-14T08:30:00', categoryName: 'Điện thoại', brandName: 'Apple', baseUomName: 'Cái', defaultWarehouseName: 'Kho chính', imageUrl: 'https://placehold.co/64x64/e2e8f0/64748b?text=SP001' },
    { itemId: 2, itemCode: 'SP002', itemName: 'Samsung Galaxy S24 Ultra', itemType: 'Product', description: 'Điện thoại Samsung Galaxy S24 Ultra', categoryId: 1, brandId: 2, baseUomId: 1, packagingSpecId: 1, requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', purchasePrice: 24900000, salePrice: 26900000, onHandQty: 28, reservedQty: 0, createdAt: '2025-02-13T14:20:00', updatedAt: '2025-02-13T14:20:00', categoryName: 'Điện thoại', brandName: 'Samsung', baseUomName: 'Cái', defaultWarehouseName: 'Kho chính', imageUrl: 'https://placehold.co/64x64/e2e8f0/64748b?text=SP002' },
    { itemId: 3, itemCode: 'SP003', itemName: 'MacBook Pro 14" M3', itemType: 'Product', description: 'Laptop MacBook Pro 14 inch chip M3', categoryId: 2, brandId: 1, baseUomId: 1, packagingSpecId: 2, requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', purchasePrice: 39900000, salePrice: 42900000, onHandQty: 15, reservedQty: 1, createdAt: '2025-02-12T09:15:00', updatedAt: '2025-02-12T09:15:00', categoryName: 'Laptop', brandName: 'Apple', baseUomName: 'Cái', defaultWarehouseName: 'Kho chính', imageUrl: 'https://placehold.co/64x64/e2e8f0/64748b?text=SP003' },
    { itemId: 4, itemCode: 'SP004', itemName: 'Tủ lạnh Samsung 234L', itemType: 'Product', description: 'Tủ lạnh Samsung 234 lít', categoryId: 3, brandId: 2, baseUomId: 1, packagingSpecId: 3, requiresCO: true, requiresCQ: false, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', purchasePrice: 7990000, salePrice: 8990000, onHandQty: 8, reservedQty: 0, createdAt: '2025-02-10T16:45:00', updatedAt: '2025-02-10T16:45:00', categoryName: 'Điện lạnh', brandName: 'Samsung', baseUomName: 'Cái', defaultWarehouseName: 'Kho chính', imageUrl: 'https://placehold.co/64x64/e2e8f0/64748b?text=SP004' },
    { itemId: 5, itemCode: 'SP005', itemName: 'Tai nghe AirPods Pro 2', itemType: 'Product', description: 'Tai nghe không dây AirPods Pro thế hệ 2', categoryId: 4, brandId: 1, baseUomId: 1, packagingSpecId: 1, requiresCO: false, requiresCQ: false, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', purchasePrice: 5190000, salePrice: 5990000, onHandQty: 120, reservedQty: 5, createdAt: '2025-02-14T07:00:00', updatedAt: '2025-02-14T07:00:00', categoryName: 'Phụ kiện', brandName: 'Apple', baseUomName: 'Cái', defaultWarehouseName: 'Kho chính', imageUrl: 'https://placehold.co/64x64/e2e8f0/64748b?text=SP005' },
    { itemId: 6, itemCode: 'SP006', itemName: 'Cáp sạc USB-C 2m', itemType: 'Product', description: 'Cáp sạc USB-C dài 2 mét', categoryId: 4, brandId: null, baseUomId: 1, packagingSpecId: null, requiresCO: false, requiresCQ: false, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', purchasePrice: 89000, salePrice: 189000, onHandQty: 350, reservedQty: 0, createdAt: '2025-02-11T11:30:00', updatedAt: '2025-02-11T11:30:00', categoryName: 'Phụ kiện', brandName: null, baseUomName: 'Cái', defaultWarehouseName: 'Kho chính', imageUrl: null },
];

const formatPrice = (value) => {
    if (value == null || value === '') return '-';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));
};

/** Số lượng có thể bán = OnHandQty - ReservedQty (InventoryOnHand). */
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
/** Cột chỉ hiển thị cho Kế toán (ACCOUNTANTS): có thể bật trong chọn cột. */
const ACCOUNTANT_ONLY_COLUMN_IDS = ['inventoryAccount', 'revenueAccount', 'purchasePrice', 'salePrice'];
/** Cột mặc định: Ảnh luôn hiển thị; Được tạo vào (createdAt) ẩn, bật qua "Chọn cột" khi cần. */
const BASE_DEFAULT_VISIBLE_ITEM_COLUMN_IDS = ['stt', 'thumbnail', 'itemCode', 'itemName', 'itemType', 'category', 'sellableQty', 'onHandQty', 'isActive', 'actions'];
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

/** Chỉ Thủ kho được tạo/sửa vật tư (khớp route /items/create, /items/edit/:id). Các role khác chỉ xem. */
const canCreateOrEditItems = (permissionRole) => permissionRole === 'WAREHOUSE_KEEPER';

/** Chỉ Kế toán (ACCOUNTANTS) được xem cột Tài khoản kho, Tài khoản doanh thu, Giá bán; các role khác ẩn. */
const showAccountantColumnsForRole = (permissionRole) => permissionRole === 'ACCOUNTANTS';

const ViewItemList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const canCreateEdit = canCreateOrEditItems(permissionRole);
    const showAccountantColumns = showAccountantColumnsForRole(permissionRole);
    const isAccountant = isAccountantView(permissionRole);
    const effectiveItemColumns = showAccountantColumns
        ? ITEM_LIST_COLUMNS
        : ITEM_LIST_COLUMNS.filter((c) => !ACCOUNTANT_ONLY_COLUMN_IDS.includes(c.id));
    /* Cột mặc định chung cho mọi role; Kế toán có thêm cột ẩn (Tài khoản, Giá nhập/xuất) có thể bật qua "Chọn cột". */
    const defaultVisibleIds = BASE_DEFAULT_VISIBLE_ITEM_COLUMN_IDS;
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(defaultVisibleIds));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

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

    const loadItems = () => setItems(MOCK_ITEMS);

    useEffect(() => { loadItems(); }, []);

    useEffect(() => {
        let result = items;
        const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');
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
        setTotalCount(result.length);
        const start = page * pageSize;
        setFilteredItems(result.slice(start, start + pageSize));
    }, [items, searchTerm, filterValues, page, pageSize]);

    useEffect(() => { setPage(0); }, [searchTerm, filterValues]);

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

    const handleToggleTransactionStatus = (itemRow) => {
        setItems((prev) =>
            prev.map((it) => (it.itemId === itemRow.itemId ? { ...it, isActive: !it.isActive } : it))
        );
        showToast(itemRow.isActive ? 'Đã tắt trạng thái giao dịch.' : 'Đã bật trạng thái giao dịch.', 'success');
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Box sx={{ pt: 0, pb: 2, mt: -3 }}>
            <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
                    <Typography variant="h4" component="h1" fontWeight="800" sx={{ background: isAccountant ? 'linear-gradient(45deg, #2E7D32 20%, #66BB6A 90%)' : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap' }}>
                        Danh sách vật tư
                    </Typography>
                    {isAccountant && (
                        <Chip label="Kế toán" size="small" sx={{ fontWeight: 600, bgcolor: 'success.light', color: 'success.dark', border: '1px solid', borderColor: 'success.main' }} />
                    )}
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
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

            <Box
                className="list-view"
                sx={{
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
                            <SearchInput placeholder="Tìm kiếm theo mã, tên, loại, mô tả, danh mục, thương hiệu…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ flex: '1 1 200px', minWidth: isMobile ? '100%' : 200, maxWidth: isMobile ? '100%' : 480 }} />
                            <Tooltip title="Bộ lọc">
                                <IconButton color="primary" onClick={() => setFilterOpen(true)} aria-label="Bộ lọc" sx={{ border: 1, borderColor: 'divider' }}>
                                    <Filter size={20} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton color="primary" onClick={(e) => setColumnSelectorAnchor(e.currentTarget)} aria-label="Chọn cột" sx={{ border: 1, borderColor: 'divider' }}><Columns size={20} /></IconButton>
                            </Tooltip>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                <Tooltip title={isAccountant ? 'Xuất Excel để báo cáo (Kế toán)' : 'Xuất danh sách vật tư ra Excel'}>
                                    <Button
                                        className="list-page-btn"
                                        variant={isAccountant ? 'contained' : 'outlined'}
                                        color={isAccountant ? 'success' : 'primary'}
                                        startIcon={<Download size={18} />}
                                        onClick={handleExport}
                                        sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}
                                    >
                                        Xuất Excel
                                    </Button>
                                </Tooltip>
                                {canCreateEdit && (
                                    <Button className="list-page-btn" variant="contained" startIcon={<Plus size={18} />} onClick={() => navigate('/items/create')} sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}>Tạo thêm vật tư</Button>
                                )}
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                <Popover open={columnSelectorOpen} anchorEl={columnSelectorAnchor} onClose={() => setColumnSelectorAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { mt: 1.5, p: 2, minWidth: 220 } } }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, whiteSpace: 'nowrap' }}>Chọn cột hiển thị</Typography>
                    <FormGroup>
                        <FormControlLabel control={<Checkbox checked={effectiveItemColumns.every((c) => visibleColumnIds.has(c.id))} indeterminate={visibleColumnIds.size > 0 && !effectiveItemColumns.every((c) => visibleColumnIds.has(c.id))} onChange={(e) => handleSelectAllItemColumns(e.target.checked)} />} label="Tất cả" />
                        {effectiveItemColumns.map((col) => (
                            <FormControlLabel key={col.id} control={<Checkbox checked={visibleColumnIds.has(col.id)} onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)} />} label={col.label} />
                        ))}
                    </FormGroup>
                </Popover>

                <Card className="list-grid-card" sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.12)', boxShadow: (t) => t.shadows[1], p: 1 }}>
                    <Box className="list-grid-wrapper" sx={{ position: 'relative', minHeight: 'calc(100vh - 220px)' }}>
                        {filteredItems.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, color: 'text.secondary' }}>
                                <Package size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <Typography>Chưa có dữ liệu vật tư</Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ maxHeight: 'calc(100vh - 240px)', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, overflow: 'auto' }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {visibleColumns.map((col) => (
                                                <TableCell
                                                    key={col.id}
                                                    sx={{
                                                        fontWeight: 600,
                                                        bgcolor: isAccountant && ACCOUNTANT_ONLY_COLUMN_IDS.includes(col.id) ? 'success.50' : 'grey.50',
                                                        whiteSpace: 'nowrap',
                                                        borderLeft: isAccountant && ACCOUNTANT_ONLY_COLUMN_IDS.includes(col.id) ? '2px solid' : 'none',
                                                        borderColor: 'success.main',
                                                    }}
                                                    align={col.id === 'thumbnail' || col.id === 'requiresCO' || col.id === 'requiresCQ' ? 'center' : col.id === 'actions' || col.id === 'salePrice' || col.id === 'purchasePrice' || col.id === 'onHandQty' || col.id === 'sellableQty' ? 'right' : 'left'}
                                                >
                                                    {col.label}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredItems.map((item, index) => (
                                            <TableRow key={item.itemId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                {visibleColumns.map((col) => {
                                                    const opts = { pageNumber: page + 1, pageSize };
                                                    if (col.id === 'stt') return <TableCell key={col.id} align="left">{col.getValue(item, index, opts)}</TableCell>;
                                                    if (col.id === 'thumbnail') {
                                                        return (
                                                            <TableCell key={col.id} align="center" sx={{ width: 72, minWidth: 72, py: 0.75, verticalAlign: 'middle' }}>
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
                                                                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <Package size={22} sx={{ color: 'text.disabled' }} />
                                                                    </Box>
                                                                    {item.imageUrl && item.imageUrl.trim() && (
                                                                        <img
                                                                            src={item.imageUrl}
                                                                            alt=""
                                                                            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
                                                                            loading="lazy"
                                                                            onError={(e) => { e.target.style.display = 'none'; }}
                                                                        />
                                                                    )}
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }
                                                    if (col.id === 'itemCode') return <TableCell key={col.id} align="left" sx={{ fontWeight: 600 }}>{item.itemCode}</TableCell>;
                                                    if (col.id === 'description') return <TableCell key={col.id} align="left" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.description}>{item.description ?? '-'}</TableCell>;
                                                    if (col.id === 'isActive') return <TableCell key={col.id} align="left"><Chip label={item.isActive ? 'Đang giao dịch' : 'Tạm dừng'} size="small" color={item.isActive ? 'success' : 'default'} variant="filled" sx={{ borderRadius: 1.5 }} /></TableCell>;
                                                    if (col.id === 'sellableQty' || col.id === 'onHandQty') return <TableCell key={col.id} align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{col.getValue(item, index, opts)}</TableCell>;
                                                    if (col.id === 'createdAt') return <TableCell key={col.id} align="left" sx={{ fontSize: '0.8rem' }}>{formatDate(item.createdAt)}</TableCell>;
                                                    if (col.id === 'updatedAt') return <TableCell key={col.id} align="left" sx={{ fontSize: '0.8rem' }}>{formatDate(item.updatedAt)}</TableCell>;
                                                    if (col.id === 'requiresCO' || col.id === 'requiresCQ') {
                                                        const value = col.id === 'requiresCO' ? item.requiresCO : item.requiresCQ;
                                                        return (
                                                            <TableCell key={col.id} align="center" sx={{ py: 0.5 }}>
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
                                                                align="right"
                                                                sx={{
                                                                    fontSize: '0.8rem',
                                                                    whiteSpace: 'nowrap',
                                                                    fontWeight: isAccountant ? 600 : 400,
                                                                    fontVariantNumeric: 'tabular-nums',
                                                                    bgcolor: isAccountant ? 'success.50' : 'inherit',
                                                                    borderLeft: isAccountant ? '2px solid' : 'none',
                                                                    borderColor: 'success.main',
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
                                                                align={isNumericCol ? 'right' : 'left'}
                                                                sx={{
                                                                    whiteSpace: 'nowrap',
                                                                    fontVariantNumeric: isNumericCol ? 'tabular-nums' : undefined,
                                                                    fontWeight: col.id === 'purchasePrice' || col.id === 'salePrice' ? (isAccountant ? 600 : 400) : 400,
                                                                    bgcolor: isAccountant ? 'success.50' : 'inherit',
                                                                    borderLeft: isAccountant ? '2px solid' : 'none',
                                                                    borderColor: 'success.main',
                                                                }}
                                                            >
                                                                {col.getValue(item, index, { pageNumber: page + 1, pageSize })}
                                                            </TableCell>
                                                        );
                                                    }
                                                    if (col.id === 'actions') {
                                                        return (
                                                            <TableCell key={col.id} align="right">
                                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                                                                    <Tooltip title="Xem chi tiết"><IconButton size="small" onClick={() => navigate(`/items/${item.itemId}`)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'primary.lighter' } }}><Eye size={18} /></IconButton></Tooltip>
                                                                    <Tooltip title={item.isActive ? 'Tắt trạng thái giao dịch' : 'Bật trạng thái giao dịch'}>
                                                                        <Switch size="small" checked={!!item.isActive} onChange={() => handleToggleTransactionStatus(item)} color="primary" />
                                                                    </Tooltip>
                                                                    {canCreateEdit && (
                                                                        <Tooltip title="Chỉnh sửa"><IconButton size="small" onClick={() => navigate(`/items/edit/${item.itemId}`)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'primary.lighter' } }}><Edit size={18} /></IconButton></Tooltip>
                                                                    )}
                                                                </Box>
                                                            </TableCell>
                                                        );
                                                    }
                                                    return <TableCell key={col.id} align="left">{col.getValue(item, index, opts)}</TableCell>;
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                </Card>

                {/* Pagination – gom hết bên phải: Số dòng/trang + dropdown + range + Trước/Sau */}
                <Box
                    sx={{
                        mt: 0,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 2,
                    }}
                >
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
                    <Button
                        size="small"
                        variant="outlined"
                        disabled={page <= 0}
                        onClick={() => handlePageChange(page - 1)}
                        sx={{ minWidth: 36, textTransform: 'none' }}
                    >
                        Trước
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        disabled={end >= totalCount || totalCount === 0}
                        onClick={() => handlePageChange(page + 1)}
                        sx={{ minWidth: 36, textTransform: 'none' }}
                    >
                        Sau
                    </Button>
                </Box>

                {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
            </Box>
        </Box>
    );
};

export default ViewItemList;
