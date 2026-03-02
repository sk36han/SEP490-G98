/*
 * ItemDetail (xem chi tiết) – khác với form EditItem (chỉnh sửa).
 * Đã kiểm duyệt với DB: [dbo].[Items] (toàn bộ cột có thể hiển thị), [dbo].[ItemPrices] (Amount→Giá bán),
 * [dbo].[InventoryOnHand] (OnHandQty, ReservedQty).
 * WAREHOUSE_KEEPER: Thông tin chung + block Thông tin tồn kho. Nút Chỉnh sửa chỉ hiện cho Thủ kho.
 * SALE_SUPPORT (SP), SALE_ENGINEER (SE): cũng xem block Thông tin tồn kho (số lượng tồn).
 * ACCOUNTANTS: + block Thông tin kế toán (Tài khoản, Giá bán, Số lượng tồn, Giá trị tồn kho).
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, Grid, IconButton, Chip, Container, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { ArrowLeft, Package, Edit3 } from 'lucide-react';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser, isAccountantView } from '../permissions/roleUtils';

const isWarehouseKeeper = (role) => role === 'WAREHOUSE_KEEPER';
/** SP (SALE_SUPPORT) và SE (SALE_ENGINEER) cũng xem được số lượng tồn (block Thông tin tồn kho). */
const showStockBlockForRole = (role) => role === 'WAREHOUSE_KEEPER' || role === 'SALE_SUPPORT' || role === 'SALE_ENGINEER';
import '../styles/ListView.css';

const formatPrice = (value) => {
    if (value == null || value === '') return '-';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));
};

/** Số lượng có thể bán = OnHandQty - ReservedQty */
const getSellableQty = (row) => {
    const onHand = row.onHandQty != null ? Number(row.onHandQty) : 0;
    const reserved = row.reservedQty != null ? Number(row.reservedQty) : 0;
    return Math.max(0, onHand - reserved);
};

/** Mock – khớp ViewItemList (Item + ItemPrices, InventoryOnHand). */
const MOCK_ITEMS = [
    { itemId: 1, itemCode: 'SP001', itemName: 'iPhone 15 Pro Max 256GB', itemType: 'Product', description: 'Điện thoại iPhone 15 Pro Max bản 256GB', categoryId: 1, brandId: 1, baseUomId: 1, packagingSpecId: 1, packagingSpecName: 'Hộp', requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, defaultWarehouseName: 'Kho chính', inventoryAccount: '1561', revenueAccount: '5111', purchasePrice: 26500000, salePrice: 28500000, onHandQty: 42, reservedQty: 2, categoryName: 'Điện thoại', brandName: 'Apple', baseUomName: 'Cái' },
    { itemId: 2, itemCode: 'SP002', itemName: 'Samsung Galaxy S24 Ultra', itemType: 'Product', description: 'Điện thoại Samsung Galaxy S24 Ultra', categoryId: 1, brandId: 2, baseUomId: 1, packagingSpecId: 1, packagingSpecName: 'Hộp', requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, defaultWarehouseName: 'Kho chính', inventoryAccount: '1561', revenueAccount: '5111', purchasePrice: 24900000, salePrice: 26900000, onHandQty: 28, reservedQty: 0, categoryName: 'Điện thoại', brandName: 'Samsung', baseUomName: 'Cái' },
    { itemId: 3, itemCode: 'SP003', itemName: 'MacBook Pro 14" M3', itemType: 'Product', description: 'Laptop MacBook Pro 14 inch chip M3', categoryId: 2, brandId: 1, baseUomId: 1, packagingSpecId: 2, packagingSpecName: 'Thùng', requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, defaultWarehouseName: 'Kho chính', inventoryAccount: '1561', revenueAccount: '5111', purchasePrice: 39900000, salePrice: 42900000, onHandQty: 15, reservedQty: 1, categoryName: 'Laptop', brandName: 'Apple', baseUomName: 'Cái' },
];

/** Trường hiển thị chung (tất cả role) – bám bảng Item, nhãn tiếng Việt. */
const VIEW_ITEM_FIELDS = [
    { id: 'itemCode', label: 'Mã vật tư', getValue: (item) => item.itemCode },
    { id: 'itemName', label: 'Tên vật tư', getValue: (item) => item.itemName },
    { id: 'itemType', label: 'Dạng vật tư', getValue: (item) => item.itemType },
    { id: 'description', label: 'Mô tả', getValue: (item) => item.description },
    { id: 'category', label: 'Danh mục', getValue: (item) => item.categoryName || item.categoryId },
    { id: 'brand', label: 'Thương hiệu', getValue: (item) => item.brandName || item.brandId },
    { id: 'baseUom', label: 'Đơn vị tính', getValue: (item) => item.baseUomName || item.baseUomId },
    { id: 'packagingSpec', label: 'Quy cách đóng gói', getValue: (item) => item.packagingSpecName || item.packagingSpecId || '–' },
    { id: 'requiresCO', label: 'Yêu cầu CO', getValue: (item) => (item.requiresCO ? 'Có' : 'Không') },
    { id: 'requiresCQ', label: 'Yêu cầu CQ', getValue: (item) => (item.requiresCQ ? 'Có' : 'Không') },
    { id: 'isActive', label: 'Trạng thái', getValue: (item) => (item.isActive ? 'Hoạt động' : 'Tắt') },
    { id: 'defaultWarehouseId', label: 'Kho mặc định', getValue: (item) => item.defaultWarehouseName || item.defaultWarehouseId },
    { id: 'inventoryAccount', label: 'Tài khoản kho', getValue: (item) => item.inventoryAccount },
    { id: 'revenueAccount', label: 'Tài khoản doanh thu', getValue: (item) => item.revenueAccount },
];
const DEFAULT_VISIBLE_FIELD_IDS = VIEW_ITEM_FIELDS.map((f) => f.id);

/** Trường chỉ nhấn mạnh cho Kế toán (ItemDetail): Item.InventoryAccount, Item.RevenueAccount, ItemPrices.Amount (SALE), InventoryOnHand.OnHandQty. */
const ACCOUNTANT_DETAIL_FIELDS = [
    { id: 'inventoryAccount', label: 'Tài khoản kho', getValue: (item) => item.inventoryAccount ?? '-' },
    { id: 'revenueAccount', label: 'Tài khoản doanh thu', getValue: (item) => item.revenueAccount ?? '-' },
    { id: 'salePrice', label: 'Giá bán', getValue: (item) => formatPrice(item.salePrice) },
    { id: 'onHandQty', label: 'Số lượng tồn', getValue: (item) => item.onHandQty != null ? Number(item.onHandQty).toLocaleString('vi-VN') : '-' },
    { id: 'inventoryValue', label: 'Giá trị tồn kho (ước tính)', getValue: (item) => (item.onHandQty != null && item.salePrice != null) ? formatPrice(Number(item.onHandQty) * Number(item.salePrice)) : '-' },
];

/** Trường tồn kho cho WAREHOUSE_KEEPER – từ [dbo].[InventoryOnHand]. */
const WAREHOUSE_KEEPER_DETAIL_FIELDS = [
    { id: 'onHandQty', label: 'Số lượng tồn', getValue: (item) => item.onHandQty != null ? Number(item.onHandQty).toLocaleString('vi-VN') : '–' },
    { id: 'reservedQty', label: 'Số lượng đặt trước', getValue: (item) => item.reservedQty != null ? Number(item.reservedQty).toLocaleString('vi-VN') : '–' },
];

const ViewItemDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const isAccountant = isAccountantView(permissionRole);
    const isWhKeeper = isWarehouseKeeper(permissionRole);
    const showStockBlock = showStockBlockForRole(permissionRole);
    const [item, setItem] = useState(null);

    useEffect(() => {
        const found = MOCK_ITEMS.find((i) => String(i.itemId) === String(id));
        setItem(found || null);
    }, [id]);

    if (item == null) {
        return (
            <Box sx={{ bgcolor: 'grey.50', minHeight: 320, py: 6 }}>
                <Container maxWidth="md">
                    <Stack alignItems="center" spacing={2} textAlign="center">
                        <Box sx={{ width: 64, height: 64, borderRadius: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={32} color="var(--mui-palette-text-disabled)" />
                        </Box>
                        <Typography variant="h6" color="text.secondary">Không tìm thấy vật tư</Typography>
                        <Typography variant="body2" color="text.secondary">Mã hoặc ID không tồn tại. Vui lòng quay lại danh sách.</Typography>
                        <Button variant="outlined" startIcon={<ArrowLeft size={18} />} onClick={() => navigate('/products')} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
                            Quay lại danh sách
                        </Button>
                    </Stack>
                </Container>
            </Box>
        );
    }

    const sellableQty = getSellableQty(item);
    const formatPriceShort = (v) => (v != null && v !== '') ? Number(v).toLocaleString('vi-VN') : '–';

    return (
        <Box sx={{ bgcolor: 'grey.50', pb: 4, minHeight: '100%' }}>
            <Container maxWidth="lg" sx={{ maxWidth: 960 }}>
                {/* Header: Back + Title (tên sản phẩm) */}
                <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
                    <IconButton onClick={() => navigate('/products')} size="medium" sx={{ color: 'text.primary' }} aria-label="Quay lại">
                        <ArrowLeft size={24} />
                    </IconButton>
                    <Typography variant="h5" fontWeight="700" sx={{ color: 'text.primary', flex: 1 }}>
                        {item.itemName}
                    </Typography>
                    {isAccountant && <Chip label="Kế toán" size="small" sx={{ fontWeight: 600, bgcolor: 'success.light', color: 'success.dark' }} />}
                </Stack>

                {/* Card 1: Mô tả sản phẩm – ảnh (placeholder) + Thông tin sản phẩm */}
                <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: (t) => t.shadows[1] }}>
                    <CardContent sx={{ p: 2.5 }}>
                        <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 2, display: 'block' }}>Mô tả sản phẩm</Typography>
                        <Grid container spacing={2} alignItems="flex-start">
                            <Grid item xs={12} sm={4} md={3}>
                                <Stack direction="row" spacing={-1.5} sx={{ alignItems: 'center' }}>
                                    {[0, 1, 2].map((i) => (
                                        <Box
                                            key={i}
                                            sx={{
                                                width: 72,
                                                height: 72,
                                                borderRadius: 2,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                bgcolor: 'grey.100',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 3 - i,
                                                boxShadow: 1,
                                            }}
                                        >
                                            <Package size={28} color="var(--mui-palette-text-disabled)" />
                                        </Box>
                                    ))}
                                </Stack>
                            </Grid>
                            <Grid item xs={12} sm={8} md={9}>
                                <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{ mb: 1 }}>
                                    Thông tin sản phẩm
                                </Typography>
                                <Stack
                                    component="div"
                                    sx={{
                                        m: 0,
                                        pl: 2.5,
                                        '& > *': { mb: 0.5 },
                                    }}
                                >
                                    <Box>
                                        <Typography variant="body2" component="span" color="text.secondary">
                                            Thương hiệu:{' '}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            component="span"
                                            sx={{
                                                color: 'primary.main',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                '&:hover': { textDecoration: 'underline' },
                                            }}
                                        >
                                            {item.brandName || item.brandId || '–'}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" component="span" color="text.secondary">
                                            Loại sản phẩm:{' '}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            component="span"
                                            sx={{
                                                color: 'primary.main',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                '&:hover': { textDecoration: 'underline' },
                                            }}
                                        >
                                            {item.itemType || item.categoryName || '–'}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" component="span" color="text.secondary">
                                            Danh mục:{' '}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            component="span"
                                            sx={{ color: 'primary.main', fontWeight: 500 }}
                                        >
                                            {item.categoryName || '–'}
                                        </Typography>
                                    </Box>
                                    {item.description && (
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {item.description}
                                            </Typography>
                                        </Box>
                                    )}
                                </Stack>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* Card 2: Phiên bản sản phẩm – bảng Ảnh, Mã SKU, Tên phiên bản, Giá bán buôn, Giá bán lẻ, Tồn kho, Có thể bán */}
                <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: (t) => t.shadows[1] }}>
                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight="700">Phiên bản sản phẩm (1 phiên bản)</Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                                <Typography variant="body2" color="text.secondary">Kích thước</Typography>
                                <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500 }}>Tất cả</Typography>
                                <Typography variant="body2" color="text.secondary">/</Typography>
                                <Typography variant="body2" color="text.secondary">Mặc định</Typography>
                            </Stack>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Ảnh</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Mã SKU</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Tên phiên bản</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="right">Giá bán buôn</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="right">Giá bán lẻ</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="right">Tồn kho</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="right">Có thể bán</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow hover>
                                        <TableCell>
                                            <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Package size={20} color="var(--mui-palette-text-disabled)" />
                                            </Box>
                                        </TableCell>
                                        <TableCell>{item.itemCode}</TableCell>
                                        <TableCell>
                                            <Typography component="span" sx={{ color: 'primary.main', fontWeight: 500, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>{item.itemName}</Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatPriceShort(item.purchasePrice)}</TableCell>
                                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatPriceShort(item.salePrice)}</TableCell>
                                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{item.onHandQty != null ? Number(item.onHandQty).toLocaleString('vi-VN') : '–'}</TableCell>
                                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{sellableQty.toLocaleString('vi-VN')}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>

                {/* Block bổ sung theo role: Kế toán, Thủ kho/SP/SE */}
                {isAccountant && (
                    <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: (t) => t.shadows[1], border: '1px solid', borderColor: 'success.light' }}>
                        <Box sx={{ px: 2, py: 1.5, bgcolor: 'success.50', borderBottom: '1px solid', borderColor: 'success.light' }}>
                            <Typography variant="subtitle1" fontWeight="700" sx={{ color: 'success.dark' }}>Thông tin kế toán</Typography>
                        </Box>
                        <CardContent sx={{ p: 2.5 }}>
                            <Grid container spacing={2}>
                                {ACCOUNTANT_DETAIL_FIELDS.map((f) => (
                                    <Grid item xs={12} sm={6} md={4} key={f.id}>
                                        <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'grey.50' }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{f.label}</Typography>
                                            <Typography variant="body1" fontWeight={f.id === 'salePrice' || f.id === 'inventoryValue' ? 600 : 500} sx={{ fontVariantNumeric: (f.id === 'onHandQty' || f.id === 'salePrice' || f.id === 'inventoryValue') ? 'tabular-nums' : undefined }}>{f.getValue(item)}</Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </CardContent>
                    </Card>
                )}

                {showStockBlock && (
                    <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: (t) => t.shadows[1], border: '1px solid', borderColor: 'info.light' }}>
                        <Box sx={{ px: 2, py: 1.5, bgcolor: 'info.50', borderBottom: '1px solid', borderColor: 'info.light' }}>
                            <Typography variant="subtitle1" fontWeight="700" sx={{ color: 'info.dark' }}>Thông tin tồn kho</Typography>
                        </Box>
                        <CardContent sx={{ p: 2.5 }}>
                            <Grid container spacing={2}>
                                {WAREHOUSE_KEEPER_DETAIL_FIELDS.map((f) => (
                                    <Grid item xs={12} sm={6} md={4} key={f.id}>
                                        <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'grey.50' }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{f.label}</Typography>
                                            <Typography variant="body1" sx={{ fontVariantNumeric: 'tabular-nums' }}>{f.getValue(item)}</Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </CardContent>
                    </Card>
                )}

                {/* Nút Chỉnh sửa */}
                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                    {isWhKeeper && (
                        <Button variant="contained" startIcon={<Edit3 size={18} />} onClick={() => navigate(`/items/edit/${item.itemId}`)} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
                            Chỉnh sửa
                        </Button>
                    )}
                </Stack>
            </Container>
        </Box>
    );
};

export default ViewItemDetail;
