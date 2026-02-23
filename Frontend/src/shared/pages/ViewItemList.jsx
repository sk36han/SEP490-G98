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
} from '@mui/material';
import { Package, Download, Eye, Plus, Columns, Filter, Edit } from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import SearchInput from '../components/SearchInput';
import ItemFilterPopup from '../components/ItemFilterPopup';
import { removeDiacritics } from '../utils/stringUtils';
import '../styles/ListView.css';

/*
 * MOCK DATA - Khớp bảng [dbo].[Items] (MKIWMS5)
 */
const MOCK_ITEMS = [
    { itemId: 1, itemCode: 'SP001', itemName: 'iPhone 15 Pro Max 256GB', itemType: 'Product', description: 'Điện thoại iPhone 15 Pro Max bản 256GB', categoryId: 1, brandId: 1, baseUomId: 1, packagingSpecId: 1, requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', createdAt: '2025-02-14T08:30:00', updatedAt: '2025-02-14T08:30:00', categoryName: 'Điện thoại', brandName: 'Apple', baseUomName: 'Cái', defaultWarehouseName: 'Kho chính' },
    { itemId: 2, itemCode: 'SP002', itemName: 'Samsung Galaxy S24 Ultra', itemType: 'Product', description: 'Điện thoại Samsung Galaxy S24 Ultra', categoryId: 1, brandId: 2, baseUomId: 1, packagingSpecId: 1, requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', createdAt: '2025-02-13T14:20:00', updatedAt: '2025-02-13T14:20:00', categoryName: 'Điện thoại', brandName: 'Samsung', baseUomName: 'Cái', defaultWarehouseName: 'Kho chính' },
    { itemId: 3, itemCode: 'SP003', itemName: 'MacBook Pro 14" M3', itemType: 'Product', description: 'Laptop MacBook Pro 14 inch chip M3', categoryId: 2, brandId: 1, baseUomId: 1, packagingSpecId: 2, requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', createdAt: '2025-02-12T09:15:00', updatedAt: '2025-02-12T09:15:00', categoryName: 'Laptop', brandName: 'Apple', baseUomName: 'Cái', defaultWarehouseName: 'Kho chính' },
    { itemId: 4, itemCode: 'SP004', itemName: 'Tủ lạnh Samsung 234L', itemType: 'Product', description: 'Tủ lạnh Samsung 234 lít', categoryId: 3, brandId: 2, baseUomId: 1, packagingSpecId: 3, requiresCO: true, requiresCQ: false, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', createdAt: '2025-02-10T16:45:00', updatedAt: '2025-02-10T16:45:00', categoryName: 'Điện lạnh', brandName: 'Samsung', baseUomName: 'Cái', defaultWarehouseName: 'Kho chính' },
    { itemId: 5, itemCode: 'SP005', itemName: 'Tai nghe AirPods Pro 2', itemType: 'Product', description: 'Tai nghe không dây AirPods Pro thế hệ 2', categoryId: 4, brandId: 1, baseUomId: 1, packagingSpecId: 1, requiresCO: false, requiresCQ: false, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', createdAt: '2025-02-14T07:00:00', updatedAt: '2025-02-14T07:00:00', categoryName: 'Phụ kiện', brandName: 'Apple', baseUomName: 'Cái', defaultWarehouseName: 'Kho chính' },
    { itemId: 6, itemCode: 'SP006', itemName: 'Cáp sạc USB-C 2m', itemType: 'Product', description: 'Cáp sạc USB-C dài 2 mét', categoryId: 4, brandId: null, baseUomId: 1, packagingSpecId: null, requiresCO: false, requiresCQ: false, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', createdAt: '2025-02-11T11:30:00', updatedAt: '2025-02-11T11:30:00', categoryName: 'Phụ kiện', brandName: null, baseUomName: 'Cái', defaultWarehouseName: 'Kho chính' },
];

const ITEM_LIST_COLUMNS = [
    { id: 'stt', label: 'STT', getValue: (row, index, { pageNumber, pageSize }) => (pageNumber - 1) * pageSize + index + 1 },
    { id: 'itemCode', label: 'Mã vật tư', getValue: (row) => row.itemCode ?? '' },
    { id: 'itemName', label: 'Tên vật tư', getValue: (row) => row.itemName ?? '' },
    { id: 'itemType', label: 'Dạng vật tư', getValue: (row) => row.itemType ?? '-' },
    { id: 'description', label: 'Mô tả', getValue: (row) => row.description ?? '-' },
    { id: 'category', label: 'Category', getValue: (row) => row.categoryName ?? '-' },
    { id: 'createdAt', label: 'Được tạo vào ngày', getValue: (row) => row.createdAt ?? '' },
    { id: 'requiresCO', label: 'RequiresCO', getValue: (row) => (row.requiresCO ? 'Có' : 'Không') },
    { id: 'requiresCQ', label: 'RequiresCQ', getValue: (row) => (row.requiresCQ ? 'Có' : 'Không') },
    { id: 'isActive', label: 'Trạng thái', getValue: (row) => (row.isActive ? 'Hoạt động' : 'Tắt') },
    { id: 'updatedAt', label: 'Cập nhật', getValue: (row) => row.updatedAt ?? '' },
    { id: 'actions', label: 'Hành động', getValue: () => '' },
];
const DEFAULT_VISIBLE_ITEM_COLUMN_IDS = ['stt', 'itemCode', 'itemName', 'itemType', 'category', 'createdAt', 'actions'];
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const ViewItemList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(DEFAULT_VISIBLE_ITEM_COLUMN_IDS));
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
        setVisibleColumnIds(checked ? new Set(DEFAULT_VISIBLE_ITEM_COLUMN_IDS) : new Set());
    };
    const visibleColumns = ITEM_LIST_COLUMNS.filter((col) => visibleColumnIds.has(col.id));
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

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Box sx={{ pt: 0, pb: 2, mt: -3 }}>
            <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Typography variant="h4" component="h1" gutterBottom fontWeight="800" sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
                    Danh sách vật tư
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, wordBreak: 'break-word', overflowWrap: 'break-word' }}>Xem và quản lý tất cả vật tư/sản phẩm. Tìm kiếm theo mã, tên, loại, mô tả, danh mục, thương hiệu.</Typography>
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
                                <Button className="list-page-btn" variant="outlined" startIcon={<Download size={18} />} onClick={handleExport} sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}>Xuất Excel</Button>
                                <Button className="list-page-btn" variant="contained" startIcon={<Plus size={18} />} onClick={() => navigate('/items/create')} sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}>Tạo thêm vật tư</Button>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                <Popover open={columnSelectorOpen} anchorEl={columnSelectorAnchor} onClose={() => setColumnSelectorAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { mt: 1.5, p: 2, minWidth: 220 } } }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, whiteSpace: 'nowrap' }}>Chọn cột hiển thị</Typography>
                    <FormGroup>
                        <FormControlLabel control={<Checkbox checked={visibleColumnIds.size === ITEM_LIST_COLUMNS.length} indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < ITEM_LIST_COLUMNS.length} onChange={(e) => handleSelectAllItemColumns(e.target.checked)} />} label="Tất cả" />
                        {ITEM_LIST_COLUMNS.map((col) => (
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
                                                <TableCell key={col.id} sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }} align={col.id === 'actions' ? 'right' : 'left'}>{col.label}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredItems.map((item, index) => (
                                            <TableRow key={item.itemId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                {visibleColumns.map((col) => {
                                                    const opts = { pageNumber: page + 1, pageSize };
                                                    if (col.id === 'stt') return <TableCell key={col.id} align="left">{col.getValue(item, index, opts)}</TableCell>;
                                                    if (col.id === 'itemCode') return <TableCell key={col.id} align="left" sx={{ fontWeight: 600 }}>{item.itemCode}</TableCell>;
                                                    if (col.id === 'description') return <TableCell key={col.id} align="left" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.description}>{item.description ?? '-'}</TableCell>;
                                                    if (col.id === 'isActive') return <TableCell key={col.id} align="left"><Chip label={item.isActive ? 'Active' : 'Inactive'} size="small" color={item.isActive ? 'success' : 'default'} variant="filled" sx={{ borderRadius: 1.5 }} /></TableCell>;
                                                    if (col.id === 'createdAt') return <TableCell key={col.id} align="left" sx={{ fontSize: '0.8rem' }}>{formatDate(item.createdAt)}</TableCell>;
                                                    if (col.id === 'updatedAt') return <TableCell key={col.id} align="left" sx={{ fontSize: '0.8rem' }}>{formatDate(item.updatedAt)}</TableCell>;
                                                    if (col.id === 'actions') {
                                                        return (
                                                            <TableCell key={col.id} align="right">
                                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                                                    <Tooltip title="Xem chi tiết"><IconButton size="small" onClick={() => navigate(`/items/${item.itemId}`)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'primary.lighter' } }}><Eye size={18} /></IconButton></Tooltip>
                                                                    <Tooltip title="Chỉnh sửa"><IconButton size="small" onClick={() => navigate(`/items/edit/${item.itemId}`)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'primary.lighter' } }}><Edit size={18} /></IconButton></Tooltip>
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
