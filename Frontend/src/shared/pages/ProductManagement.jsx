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
 * MOCK DATA - API SPEC FOR BACKEND TEAM
 * =====================================
 * Endpoint: GET /api/products (hoặc /api/inventory/products)
 * Query params: pageNumber, pageSize, searchTerm?, categoryId?
 * Response: ApiResponse<PagedResult<Product>>
 *
 * Product model:
 * - productId: number
 * - productCode: string
 * - productName: string
 * - categoryName: string
 * - quantity: number
 * - unit: string (Cái, Hộp, Thùng, Kg...)
 * - minQuantity: number (số lượng tối thiểu cảnh báo)
 * - status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
 * - location: string (vị trí trong kho)
 * - lastUpdated: string (ISO date)
 * - isActive: boolean
 */

const MOCK_PRODUCTS = [
    {
        productId: 1,
        productCode: 'SP001',
        productName: 'iPhone 15 Pro Max 256GB',
        categoryName: 'Điện thoại',
        quantity: 45,
        minQuantity: 10,
        unit: 'Cái',
        status: 'IN_STOCK',
        location: 'Kệ A1-01',
        lastUpdated: '2025-02-14T08:30:00',
        isActive: true,
    },
    {
        productId: 2,
        productCode: 'SP002',
        productName: 'Samsung Galaxy S24 Ultra',
        categoryName: 'Điện thoại',
        quantity: 32,
        minQuantity: 10,
        unit: 'Cái',
        status: 'IN_STOCK',
        location: 'Kệ A1-02',
        lastUpdated: '2025-02-13T14:20:00',
        isActive: true,
    },
    {
        productId: 3,
        productCode: 'SP003',
        productName: 'MacBook Pro 14" M3',
        categoryName: 'Laptop',
        quantity: 8,
        minQuantity: 5,
        unit: 'Cái',
        status: 'LOW_STOCK',
        location: 'Kệ B2-01',
        lastUpdated: '2025-02-12T09:15:00',
        isActive: true,
    },
    {
        productId: 4,
        productCode: 'SP004',
        productName: 'Tủ lạnh Samsung 234L',
        categoryName: 'Điện lạnh',
        quantity: 0,
        minQuantity: 3,
        unit: 'Cái',
        status: 'OUT_OF_STOCK',
        location: 'Kệ C3-02',
        lastUpdated: '2025-02-10T16:45:00',
        isActive: true,
    },
    {
        productId: 5,
        productCode: 'SP005',
        productName: 'Tai nghe AirPods Pro 2',
        categoryName: 'Phụ kiện',
        quantity: 120,
        minQuantity: 20,
        unit: 'Cái',
        status: 'IN_STOCK',
        location: 'Kệ D4-01',
        lastUpdated: '2025-02-14T07:00:00',
        isActive: true,
    },
    {
        productId: 6,
        productCode: 'SP006',
        productName: 'Cáp sạc USB-C 2m',
        categoryName: 'Phụ kiện',
        quantity: 250,
        minQuantity: 50,
        unit: 'Cái',
        status: 'IN_STOCK',
        location: 'Kệ D4-05',
        lastUpdated: '2025-02-11T11:30:00',
        isActive: true,
    },
];

const STATUS_CONFIG = {
    IN_STOCK: { label: 'Còn hàng', color: 'success' },
    LOW_STOCK: { label: 'Sắp hết', color: 'warning' },
    OUT_OF_STOCK: { label: 'Hết hàng', color: 'error' },
};

const ProductManagement = () => {
    const { toast, showToast, clearToast } = useToast();
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    // Load mock data - replace with API call when backend is ready
    const loadProducts = () => {
        // TODO: const response = await productService.getProducts({ pageNumber: 1, pageSize: 1000, searchTerm });
        setProducts(MOCK_PRODUCTS);
    };

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        let result = products;
        if (searchTerm.trim()) {
            const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');
            const lowerTerm = normalize(searchTerm.trim());
            result = products.filter(
                (p) =>
                    normalize(p.productCode).includes(lowerTerm) ||
                    normalize(p.productName).includes(lowerTerm) ||
                    normalize(p.categoryName).includes(lowerTerm) ||
                    normalize(p.location).includes(lowerTerm)
            );
        }
        setTotalCount(result.length);
        const start = (pageNumber - 1) * pageSize;
        setFilteredProducts(result.slice(start, start + pageSize));
    }, [products, searchTerm, pageNumber, pageSize]);

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
                    Xem và quản lý tất cả sản phẩm trong kho. Tìm kiếm theo mã, tên, danh mục hoặc vị trí.
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
                        placeholder="Tìm kiếm theo mã, tên, danh mục, vị trí..."
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

                <TableContainer sx={{ maxHeight: 600 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>
                                    STT
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>
                                    Mã SP
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>
                                    Tên sản phẩm
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>
                                    Danh mục
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }} align="right">
                                    Số lượng
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>
                                    Đơn vị
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>
                                    Trạng thái
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>
                                    Vị trí
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>
                                    Cập nhật
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }} align="right">
                                    Hành động
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                color: 'text.secondary',
                                            }}
                                        >
                                            <Package size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                            <Typography>Không tìm thấy sản phẩm nào</Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProducts.map((product, index) => {
                                    const statusConfig = STATUS_CONFIG[product.status] || STATUS_CONFIG.IN_STOCK;
                                    return (
                                        <TableRow
                                            key={product.productId}
                                            hover
                                            sx={{
                                                '&:last-child td, &:last-child th': { border: 0 },
                                                transition: 'background-color 0.2s',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(25, 118, 210, 0.04) !important',
                                                },
                                            }}
                                        >
                                            <TableCell>{(pageNumber - 1) * pageSize + index + 1}</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>{product.productCode}</TableCell>
                                            <TableCell>{product.productName}</TableCell>
                                            <TableCell>{product.categoryName}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 500 }}>
                                                {product.quantity}
                                            </TableCell>
                                            <TableCell>{product.unit}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={statusConfig.label}
                                                    size="small"
                                                    color={statusConfig.color}
                                                    variant="filled"
                                                    sx={{ fontWeight: 600, borderRadius: 1.5 }}
                                                />
                                            </TableCell>
                                            <TableCell>{product.location}</TableCell>
                                            <TableCell sx={{ fontSize: '0.875rem' }}>
                                                {formatDate(product.lastUpdated)}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                                    <Tooltip title="Xem chi tiết">
                                                        <IconButton
                                                            size="small"
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
                                                    <Tooltip title="Chỉnh sửa">
                                                        <IconButton
                                                            size="small"
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
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
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
