import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    TextField,
    Chip,
    IconButton,
    Tooltip,
    Box,
    Typography,
    Pagination,
    InputAdornment,
    Container,
} from '@mui/material';
import { Search, Edit, Package, Download, Eye } from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import { removeDiacritics } from '../utils/stringUtils';

/*
 * MOCK DATA - Khớp bảng [dbo].[Items] (MKIWMS5)
 * =============================================
 * ItemId, ItemCode, ItemName, ItemType, Description, CategoryId, BrandId,
 * BaseUomId, PackagingSpecId, RequiresCO, RequiresCQ, IsActive,
 * DefaultWarehouseId, InventoryAccount, RevenueAccount, CreatedAt, UpdatedAt
 */

const MOCK_ITEMS = [
    {
        itemId: 1,
        itemCode: 'SP001',
        itemName: 'iPhone 15 Pro Max 256GB',
        itemType: 'Product',
        description: 'Điện thoại iPhone 15 Pro Max bản 256GB',
        categoryId: 1,
        brandId: 1,
        baseUomId: 1,
        packagingSpecId: 1,
        requiresCO: true,
        requiresCQ: true,
        isActive: true,
        defaultWarehouseId: 1,
        inventoryAccount: '1561',
        revenueAccount: '5111',
        createdAt: '2025-02-14T08:30:00',
        updatedAt: '2025-02-14T08:30:00',
        categoryName: 'Điện thoại',
        brandName: 'Apple',
        baseUomName: 'Cái',
        defaultWarehouseName: 'Kho chính',
    },
    {
        itemId: 2,
        itemCode: 'SP002',
        itemName: 'Samsung Galaxy S24 Ultra',
        itemType: 'Product',
        description: 'Điện thoại Samsung Galaxy S24 Ultra',
        categoryId: 1,
        brandId: 2,
        baseUomId: 1,
        packagingSpecId: 1,
        requiresCO: true,
        requiresCQ: true,
        isActive: true,
        defaultWarehouseId: 1,
        inventoryAccount: '1561',
        revenueAccount: '5111',
        createdAt: '2025-02-13T14:20:00',
        updatedAt: '2025-02-13T14:20:00',
        categoryName: 'Điện thoại',
        brandName: 'Samsung',
        baseUomName: 'Cái',
        defaultWarehouseName: 'Kho chính',
    },
    {
        itemId: 3,
        itemCode: 'SP003',
        itemName: 'MacBook Pro 14" M3',
        itemType: 'Product',
        description: 'Laptop MacBook Pro 14 inch chip M3',
        categoryId: 2,
        brandId: 1,
        baseUomId: 1,
        packagingSpecId: 2,
        requiresCO: true,
        requiresCQ: true,
        isActive: true,
        defaultWarehouseId: 1,
        inventoryAccount: '1561',
        revenueAccount: '5111',
        createdAt: '2025-02-12T09:15:00',
        updatedAt: '2025-02-12T09:15:00',
        categoryName: 'Laptop',
        brandName: 'Apple',
        baseUomName: 'Cái',
        defaultWarehouseName: 'Kho chính',
    },
    {
        itemId: 4,
        itemCode: 'SP004',
        itemName: 'Tủ lạnh Samsung 234L',
        itemType: 'Product',
        description: 'Tủ lạnh Samsung 234 lít',
        categoryId: 3,
        brandId: 2,
        baseUomId: 1,
        packagingSpecId: 3,
        requiresCO: true,
        requiresCQ: false,
        isActive: true,
        defaultWarehouseId: 1,
        inventoryAccount: '1561',
        revenueAccount: '5111',
        createdAt: '2025-02-10T16:45:00',
        updatedAt: '2025-02-10T16:45:00',
        categoryName: 'Điện lạnh',
        brandName: 'Samsung',
        baseUomName: 'Cái',
        defaultWarehouseName: 'Kho chính',
    },
    {
        itemId: 5,
        itemCode: 'SP005',
        itemName: 'Tai nghe AirPods Pro 2',
        itemType: 'Product',
        description: 'Tai nghe không dây AirPods Pro thế hệ 2',
        categoryId: 4,
        brandId: 1,
        baseUomId: 1,
        packagingSpecId: 1,
        requiresCO: false,
        requiresCQ: false,
        isActive: true,
        defaultWarehouseId: 1,
        inventoryAccount: '1561',
        revenueAccount: '5111',
        createdAt: '2025-02-14T07:00:00',
        updatedAt: '2025-02-14T07:00:00',
        categoryName: 'Phụ kiện',
        brandName: 'Apple',
        baseUomName: 'Cái',
        defaultWarehouseName: 'Kho chính',
    },
    {
        itemId: 6,
        itemCode: 'SP006',
        itemName: 'Cáp sạc USB-C 2m',
        itemType: 'Product',
        description: 'Cáp sạc USB-C dài 2 mét',
        categoryId: 4,
        brandId: null,
        baseUomId: 1,
        packagingSpecId: null,
        requiresCO: false,
        requiresCQ: false,
        isActive: true,
        defaultWarehouseId: 1,
        inventoryAccount: '1561',
        revenueAccount: '5111',
        createdAt: '2025-02-11T11:30:00',
        updatedAt: '2025-02-11T11:30:00',
        categoryName: 'Phụ kiện',
        brandName: null,
        baseUomName: 'Cái',
        defaultWarehouseName: 'Kho chính',
    },
];

const ProductManagement = () => {
    const { toast, showToast, clearToast } = useToast();
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    // Load mock data - replace with API call when backend is ready
    const loadItems = () => {
        // TODO: const response = await itemService.getItems({ pageNumber: 1, pageSize: 1000, searchTerm });
        setItems(MOCK_ITEMS);
    };

    useEffect(() => {
        loadItems();
    }, []);

    useEffect(() => {
        let result = items;
        if (searchTerm.trim()) {
            const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');
            const lowerTerm = normalize(searchTerm.trim());
            result = items.filter(
                (it) =>
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
        setTotalCount(result.length);
        const start = (pageNumber - 1) * pageSize;
        setFilteredItems(result.slice(start, start + pageSize));
    }, [items, searchTerm, pageNumber, pageSize]);

    useEffect(() => {
        setPageNumber(1);
    }, [searchTerm]);

    const handleExport = () => {
        // TODO: await productService.exportExcel();
        showToast('Chức năng xuất Excel sẽ được backend triển khai', 'success');
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box
                sx={{
                    mb: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                }}
            >
                <Typography
                    variant="h4"
                    component="h1"
                    gutterBottom
                    fontWeight="800"
                    sx={{
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        backgroundClip: 'text',
                        textFillColor: 'transparent',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    Quản lý sản phẩm
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                    Xem và quản lý tất cả vật tư/sản phẩm (Items). Tìm kiếm theo mã, tên, loại, mô tả, danh mục, thương hiệu, tài khoản.
                </Typography>
            </Box>

            <Paper
                elevation={3}
                sx={{
                    p: 3,
                    borderRadius: 4,
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
            >
                <Box
                    sx={{
                        mb: 4,
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                    }}
                >
                    <TextField
                        placeholder="Tìm kiếm theo mã, tên, loại, mô tả, danh mục, thương hiệu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        size="small"
                        sx={{
                            flexGrow: 1,
                            maxWidth: 500,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 3,
                                backgroundColor: 'white',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                '& fieldset': { borderColor: 'transparent' },
                                '&:hover fieldset': { borderColor: 'primary.main' },
                                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                            },
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search size={20} className="text-gray-400" />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Button
                        variant="outlined"
                        startIcon={<Download size={18} />}
                        onClick={handleExport}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    >
                        Xuất Excel
                    </Button>
                </Box>

                <TableContainer sx={{ maxHeight: 600, overflowX: 'auto' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>STT</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>ItemId</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>ItemCode</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>ItemName</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>ItemType</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap', maxWidth: 120 }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>CategoryId</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>BrandId</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>BaseUomId</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>PackagingSpecId</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>RequiresCO</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>RequiresCQ</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>IsActive</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>DefaultWarehouseId</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>InventoryAccount</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>RevenueAccount</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>CreatedAt</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }}>UpdatedAt</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary', whiteSpace: 'nowrap' }} align="right">Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={18} align="center" sx={{ py: 8 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'text.secondary' }}>
                                            <Package size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                            <Typography>Không tìm thấy item nào</Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredItems.map((item, index) => (
                                    <TableRow
                                        key={item.itemId}
                                        hover
                                        sx={{
                                            '&:last-child td, &:last-child th': { border: 0 },
                                            transition: 'background-color 0.2s',
                                            '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04) !important' },
                                        }}
                                    >
                                        <TableCell>{(pageNumber - 1) * pageSize + index + 1}</TableCell>
                                        <TableCell>{ item.itemId }</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>{ item.itemCode }</TableCell>
                                        <TableCell>{ item.itemName }</TableCell>
                                        <TableCell>{ item.itemType ?? '-' }</TableCell>
                                        <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.description}>{ item.description ?? '-' }</TableCell>
                                        <TableCell>{ item.categoryId ?? '-' }</TableCell>
                                        <TableCell>{ item.brandId ?? '-' }</TableCell>
                                        <TableCell>{ item.baseUomId }</TableCell>
                                        <TableCell>{ item.packagingSpecId ?? '-' }</TableCell>
                                        <TableCell>{ item.requiresCO ? 'Có' : 'Không' }</TableCell>
                                        <TableCell>{ item.requiresCQ ? 'Có' : 'Không' }</TableCell>
                                        <TableCell>
                                            <Chip label={item.isActive ? 'Active' : 'Inactive'} size="small" color={item.isActive ? 'success' : 'default'} variant="filled" sx={{ borderRadius: 1.5 }} />
                                        </TableCell>
                                        <TableCell>{ item.defaultWarehouseId ?? '-' }</TableCell>
                                        <TableCell>{ item.inventoryAccount ?? '-' }</TableCell>
                                        <TableCell>{ item.revenueAccount ?? '-' }</TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem' }}>{ formatDate(item.createdAt) }</TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem' }}>{ formatDate(item.updatedAt) }</TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                                <Tooltip title="Xem chi tiết"><IconButton size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'primary.lighter' } }}><Eye size={18} /></IconButton></Tooltip>
                                                <Tooltip title="Chỉnh sửa"><IconButton size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'primary.lighter' } }}><Edit size={18} /></IconButton></Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {totalPages > 1 && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                        count={totalPages}
                        page={pageNumber}
                        onChange={(e, page) => setPageNumber(page)}
                        color="primary"
                        showFirstButton
                        showLastButton
                    />
                </Box>
            )}

            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={clearToast} />
            )}
        </Container>
    );
};

export default ProductManagement;
