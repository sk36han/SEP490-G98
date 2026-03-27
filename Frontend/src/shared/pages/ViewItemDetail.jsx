/*
 * ItemDetail (xem chi tiết) – khác với form EditItem (chỉnh sửa).
 * Đã kiểm duyệt với DB: [dbo].[Items] (toàn bộ cột có thể hiển thị), [dbo].[ItemPrices] (Amount→Giá bán),
 * [dbo].[InventoryOnHand] (OnHandQty, ReservedQty).
 * Full quyền Item (xem/sửa): WAREHOUSE_KEEPER, SALE_SUPPORT, SALE_ENGINEER, ACCOUNTANTS (trừ ADMIN, Giám đốc). Nút Chỉnh sửa hiện cho các role này.
 * SALE_SUPPORT (SP), SALE_ENGINEER (SE): cũng xem block Thông tin tồn kho (số lượng tồn).
 * ACCOUNTANTS: + block Thông tin kế toán (Tài khoản, Giá bán, Số lượng tồn, Giá trị tồn kho).
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, Grid, IconButton, Chip, Container, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress } from '@mui/material';
import { ArrowLeft, Package, Edit3 } from 'lucide-react';
import authService from '../lib/authService';
import { getItemDetail } from '../lib/itemService';
import { getPermissionRole, getRawRoleFromUser, isAccountantView } from '../permissions/roleUtils';

const isWarehouseKeeper = (role) => role === 'WAREHOUSE_KEEPER';
/** Full quyền Item (tạo/sửa): tất cả role trừ ADMIN và Giám đốc. */
const canEditItem = (role) => ['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS'].includes(role);
/** Chỉ Accountant và Director được xem Giá nhập, Giá trung bình kho, Giá xuất kho; role khác chỉ thấy Giá trung bình trong kho. */
const canSeeFullPrices = (role) => role === 'ACCOUNTANTS' || role === 'DIRECTOR';
/** Bảng lịch sử item hiển thị cho toàn bộ role nghiệp vụ có quyền xem item detail. */
const showStockBlockForRole = (role) => ['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS', 'DIRECTOR'].includes(role);
import '../styles/ListView.css';

const formatPrice = (value) => {
    if (value == null || value === '') return '-';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));
};

/** Giá trung bình trong kho (mock: trung bình giá nhập và giá bán). */
const getAverageWarehousePrice = (item) => {
    const p = item?.purchasePrice != null ? Number(item.purchasePrice) : 0;
    const s = item?.salePrice != null ? Number(item.salePrice) : 0;
    if (p === 0 && s === 0) return null;
    return (p + s) / 2;
};

/** Số lượng có thể bán = OnHandQty - ReservedQty */
const getSellableQty = (row) => {
    const onHand = row.onHandQty != null ? Number(row.onHandQty) : 0;
    const reserved = row.reservedQty != null ? Number(row.reservedQty) : 0;
    return Math.max(0, onHand - reserved);
};

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

// UTC-safe: parse API datetime strings as UTC to avoid timezone shift
const parseUtcDate = (v) => {
    if (v == null || v === '') return null;
    const d = new Date(v + (v.endsWith('Z') ? '' : 'Z'));
    return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateTime = (v) => {
    if (v == null || v === '') return '–';
    const d = parseUtcDate(v);
    return !d ? String(v) : d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

/** Định dạng đầy đủ cho lịch sử tồn kho: dd/MM/yyyy - HH:mm:ss */
const formatDateTimeFull = (v) => {
    if (v == null || v === '') return '–';
    const d = parseUtcDate(v);
    if (!d) return String(v);
    const date = d.toLocaleDateString('vi-VN');
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${date} - ${time}`;
};

/** Toàn bộ trường Item hiển thị cho Thủ kho – thông tin đầy đủ. */
const FULL_WAREHOUSE_KEEPER_FIELDS = [
    { id: 'itemCode', label: 'Mã vật tư', getValue: (item) => item.itemCode ?? '–' },
    { id: 'itemName', label: 'Tên vật tư', getValue: (item) => item.itemName ?? '–' },
    { id: 'itemType', label: 'Dạng vật tư', getValue: (item) => item.itemType ?? '–' },
    { id: 'description', label: 'Mô tả', getValue: (item) => item.description || '–' },
    { id: 'categoryName', label: 'Danh mục', getValue: (item) => (item.categoryName || item.categoryId) ?? '–' },
    { id: 'brandName', label: 'Thương hiệu', getValue: (item) => (item.brandName || item.brandId) ?? '–' },
    { id: 'baseUomName', label: 'Đơn vị tính', getValue: (item) => (item.baseUomName || item.baseUomId) ?? '–' },
    { id: 'packagingSpec', label: 'Quy cách đóng gói', getValue: (item) => (item.packagingSpecName || item.packagingSpecId) ?? '–' },
    { id: 'requiresCO', label: 'Yêu cầu CO', getValue: (item) => (item.requiresCO ? 'Có' : 'Không') },
    { id: 'requiresCQ', label: 'Yêu cầu CQ', getValue: (item) => (item.requiresCQ ? 'Có' : 'Không') },
    { id: 'isActive', label: 'Trạng thái giao dịch', getValue: (item) => (item.isActive ? 'Đang giao dịch' : 'Tạm dừng') },
    { id: 'defaultWarehouseName', label: 'Kho mặc định', getValue: (item) => (item.defaultWarehouseName || item.defaultWarehouseId) ?? '–' },
    { id: 'inventoryAccount', label: 'Tài khoản kho', getValue: (item) => item.inventoryAccount ?? '–' },
    { id: 'revenueAccount', label: 'Tài khoản doanh thu', getValue: (item) => item.revenueAccount ?? '–' },
    { id: 'purchasePrice', label: 'Giá nhập', getValue: (item) => formatPrice(item.purchasePrice) },
    { id: 'salePrice', label: 'Giá bán', getValue: (item) => formatPrice(item.salePrice) },
    { id: 'onHandQty', label: 'Số lượng tồn kho', getValue: (item) => item.onHandQty != null ? Number(item.onHandQty).toLocaleString('vi-VN') : '–' },
    { id: 'reservedQty', label: 'Số lượng đặt trước', getValue: (item) => item.reservedQty != null ? Number(item.reservedQty).toLocaleString('vi-VN') : '–' },
    { id: 'sellableQty', label: 'Số lượng có thể bán', getValue: (item) => getSellableQty(item).toLocaleString('vi-VN') },
    { id: 'createdAt', label: 'Ngày tạo', getValue: (item) => formatDateTime(item.createdAt) },
    { id: 'updatedAt', label: 'Ngày cập nhật', getValue: (item) => formatDateTime(item.updatedAt) },
];
/** Bốn trường hiển thị cùng hàng với ảnh: Mã, Tên, Dạng, Thương hiệu (Mô tả luôn là dòng cuối riêng) */
const TOP_ROW_FIELD_IDS = ['itemCode', 'itemName', 'itemType', 'brandName'];
/** Trường giá: chỉ ACCOUNTANTS/DIRECTOR thấy đủ; role khác chỉ thấy Giá trung bình trong kho */
const PRICE_FIELD_IDS = ['purchasePrice', 'salePrice'];

const ViewItemDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const isAccountant = isAccountantView(permissionRole);
    const isWhKeeper = isWarehouseKeeper(permissionRole);
    const canEdit = canEditItem(permissionRole);
    const showStockBlock = showStockBlockForRole(permissionRole);
    const canViewItemHistory = showStockBlock || isAccountant;
    const showFullPrices = canSeeFullPrices(permissionRole);
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        setLoading(true);
        setFetchError(null);
        setItem(null);
        getItemDetail(Number(id))
            .then((data) => setItem(data))
            .catch((err) => {
                console.error('[ViewItemDetail] fetch error:', err);
                setFetchError(err?.response?.data?.message || err.message || 'Không thể tải chi tiết vật tư');
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <Box sx={{ bgcolor: 'grey.50', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (fetchError) {
        return (
            <Box sx={{ bgcolor: 'grey.50', minHeight: 320, py: 6 }}>
                <Container maxWidth="md">
                    <Stack alignItems="center" spacing={2} textAlign="center">
                        <Box sx={{ width: 64, height: 64, borderRadius: 2, bgcolor: 'error.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={32} color="var(--mui-palette-text-disabled)" />
                        </Box>
                        <Typography variant="h6" color="error">{fetchError}</Typography>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowLeft size={18} />}
                            onClick={() => navigate('/products')}
                            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                        >
                            Quay lại danh sách
                        </Button>
                    </Stack>
                </Container>
            </Box>
        );
    }

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

    const stockHistory = item.inventoryHistory ?? [];
    const itemWarehouses =
        (item.inventoryByWarehouse ?? []).length > 0
            ? item.inventoryByWarehouse
            : [
                { warehouseName: item.defaultWarehouseName || 'Kho chính', onHandQty: item.onHandQty ?? 0, reservedQty: item.reservedQty ?? 0 },
              ];
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

                {/* Card 1: Mô tả sản phẩm – ảnh (placeholder) + Thông tin sản phẩm (đủ trường cho Thủ kho, gọn cho role khác) */}
                <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: (t) => t.shadows[1] }}>
                    <CardContent sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="700" sx={{ mb: 1.5, display: 'block' }}>Mô tả sản phẩm</Typography>
                        {isWhKeeper ? (
                            (() => {
                                const valueSx = (f) => ({
                                    color: 'text.primary',
                                    fontWeight: 600,
                                    fontVariantNumeric: (f.id === 'inventoryAccount' || f.id === 'revenueAccount') ? 'tabular-nums' : undefined,
                                });
                                const EXCLUDED_FROM_DESC = ['description', 'defaultWarehouseName', 'onHandQty', 'reservedQty', 'sellableQty', ...PRICE_FIELD_IDS];
                                const accountIds = ['inventoryAccount', 'revenueAccount'];
                                const baseForDesc = FULL_WAREHOUSE_KEEPER_FIELDS.filter(
                                    (f) => !TOP_ROW_FIELD_IDS.includes(f.id) && !EXCLUDED_FROM_DESC.includes(f.id) && (showFullPrices || !accountIds.includes(f.id))
                                );
                                const allDescFields = [...FULL_WAREHOUSE_KEEPER_FIELDS.filter((f) => TOP_ROW_FIELD_IDS.includes(f.id)), ...baseForDesc];
                                const COLS_PER_GROUP = 5;
                                const chunks = [];
                                for (let i = 0; i < allDescFields.length; i += COLS_PER_GROUP) {
                                    chunks.push(allDescFields.slice(i, i + COLS_PER_GROUP));
                                }
                                const underFifteen = allDescFields.length < 15;
                                return (
                                    <Box>
                                        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 1.5, flexWrap: { xs: 'wrap', sm: underFifteen ? 'nowrap' : 'wrap' } }}>
                                            <Box
                                                sx={{
                                                    width: 120,
                                                    minWidth: 120,
                                                    height: 120,
                                                    borderRadius: 3,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    bgcolor: 'grey.100',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    overflow: 'hidden',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <Package size={40} color="var(--mui-palette-text-disabled)" />
                                            </Box>
                                            {underFifteen ? (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, flex: 1, minWidth: 0 }}>
                                                    {chunks.map((group, colIndex) => (
                                                        <Stack key={colIndex} component="ul" sx={{ m: 0, pl: 2, minWidth: 0, flex: '1 1 140px', '& li': { mb: 0.25 } }}>
                                                            {group.map((f) => (
                                                                <li key={f.id}>
                                                                    <Typography variant="body2" component="span" color="text.secondary">{f.label}: </Typography>
                                                                    <Typography variant="body2" component="span" sx={valueSx(f)}>{f.getValue(item)}</Typography>
                                                                </li>
                                                            ))}
                                                        </Stack>
                                                    ))}
                                                </Box>
                                            ) : (
                                                <>
                                                    <Stack component="ul" sx={{ m: 0, pl: 2, flex: 1, minWidth: 0, '& li': { mb: 0.25 } }}>
                                                        {chunks[0]?.map((f) => (
                                                            <li key={f.id}>
                                                                <Typography variant="body2" component="span" color="text.secondary">{f.label}: </Typography>
                                                                <Typography variant="body2" component="span" sx={valueSx(f)}>{f.getValue(item)}</Typography>
                                                            </li>
                                                        ))}
                                                    </Stack>
                                                </>
                                            )}
                                        </Box>
                                        {!underFifteen && chunks.length > 1 && (
                                            <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                                {chunks.slice(1).map((group, colIndex) => (
                                                    <Stack key={colIndex} component="ul" sx={{ m: 0, pl: 2, minWidth: 0, flex: '1 1 140px', '& li': { mb: 0.25 } }}>
                                                        {group.map((f) => (
                                                            <li key={f.id}>
                                                                <Typography variant="body2" component="span" color="text.secondary">{f.label}: </Typography>
                                                                <Typography variant="body2" component="span" sx={valueSx(f)}>{f.getValue(item)}</Typography>
                                                            </li>
                                                        ))}
                                                    </Stack>
                                                ))}
                                            </Box>
                                        )}
                                        {item.description && (
                                            <Box
                                                sx={{
                                                    mt: 1.25,
                                                    flexBasis: '100%',
                                                    width: '100%',
                                                    minHeight: 72,
                                                    height: 80,
                                                    p: 1.5,
                                                    borderRadius: 1.5,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    bgcolor: 'grey.50',
                                                    boxSizing: 'border-box',
                                                }}
                                            >
                                                <Typography variant="caption" component="div" color="text.secondary" sx={{ mb: 0.5 }}>
                                                    Mô tả
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    component="div"
                                                    sx={{
                                                        color: 'text.primary',
                                                        fontWeight: 600,
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word',
                                                        overflow: 'auto',
                                                        height: 'calc(100% - 20px)',
                                                    }}
                                                >
                                                    {item.description}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })()
                        ) : (
                            <Grid container spacing={2} alignItems="flex-start">
                                <Grid item xs={12} sm={4} md={3}>
                                    <Box
                                        sx={{
                                            width: 140,
                                            height: 140,
                                            borderRadius: 3,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            bgcolor: 'grey.100',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <Package size={40} color="var(--mui-palette-text-disabled)" />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={8} md={9}>
                                    <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{ mb: 1 }}>Thông tin sản phẩm</Typography>
                                    <Stack component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 0.25 } }}>
                                        <li>
                                            <Typography variant="body2" component="span" color="text.secondary">Thương hiệu: </Typography>
                                            <Typography variant="body2" component="span" sx={{ color: 'text.primary', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>{item.brandName || item.brandId || '–'}</Typography>
                                        </li>
                                        <li>
                                            <Typography variant="body2" component="span" color="text.secondary">Loại sản phẩm: </Typography>
                                            <Typography variant="body2" component="span" sx={{ color: 'text.primary', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>{item.itemType || item.categoryName || '–'}</Typography>
                                        </li>
                                        <li>
                                            <Typography variant="body2" component="span" color="text.secondary">Danh mục: </Typography>
                                            <Typography variant="body2" component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{item.categoryName || '–'}</Typography>
                                        </li>
                                        {item.description && (
                                            <li>
                                                <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>{item.description}</Typography>
                                            </li>
                                        )}
                                    </Stack>
                                </Grid>
                            </Grid>
                        )}
                    </CardContent>
                </Card>

                {/* Card 2: Tổng quan tồn kho theo kho */}
                <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: (t) => t.shadows[1] }}>
                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                        <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight="700">Số lượng sản phẩm trong kho</Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                                <Typography variant="body2" color="text.secondary">Kích thước</Typography>
                                <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500 }}>Tất cả</Typography>
                                <Typography variant="body2" color="text.secondary">/</Typography>
                                <Typography variant="body2" color="text.secondary">Mặc định</Typography>
                            </Stack>
                        </Box>
                        <TableContainer sx={{ maxHeight: 260, overflowY: 'auto' }}>
                            <Table
                                size="small"
                                sx={{
                                    '& .MuiTableCell-root': {
                                        borderRight: '1px solid',
                                        borderColor: 'divider',
                                    },
                                    '& .MuiTableCell-root:last-of-type': {
                                        borderRight: 'none',
                                    },
                                }}
                            >
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Ảnh</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Mã SKU</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Tên phiên bản</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="right">Tồn kho</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="right">Có thể bán</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="right">Đang giao dịch/Đặt trước</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Kho chứa hàng</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {itemWarehouses.map((wh, idx) => {
                                        const onHand = wh.onHandQty ?? 0;
                                        const reserved = wh.reservedQty ?? 0;
                                        const available = wh.availableQty ?? Math.max(0, onHand - reserved);
                                        const preOrder = wh.preOrderQty ?? 0;
                                        const isDefault = wh.isDefaultWarehouse ?? false;
                                        return (
                                            <TableRow key={idx} hover>
                                                <TableCell>
                                                    <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Package size={20} color="var(--mui-palette-text-disabled)" />
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{wh.sku || item.itemCode}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Typography component="span" sx={{ color: 'primary.main', fontWeight: 500 }}>{wh.variantName || item.itemName}</Typography>
                                                        {isDefault && (
                                                            <Chip label="Mặc định" size="small" sx={{ height: 16, fontSize: '10px', fontWeight: 600, bgcolor: 'primary.light', color: 'primary.dark' }} />
                                                        )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                                    {onHand.toLocaleString('vi-VN')}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: '#16a34a', fontWeight: 600 }}>
                                                    {available.toLocaleString('vi-VN')}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: '#d97706', fontWeight: 600 }}>
                                                    {preOrder > 0 ? preOrder.toLocaleString('vi-VN') : (reserved > 0 ? reserved.toLocaleString('vi-VN') : '–')}
                                                </TableCell>
                                                <TableCell>{wh.warehouseName}</TableCell>
                                            </TableRow>
                                        );
                                    })}
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

                {canViewItemHistory && (
                <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: (t) => t.shadows[1], border: '1px solid', borderColor: 'info.light' }}>
                        <Box sx={{ px: 2, py: 1.5, bgcolor: 'info.50', borderBottom: '1px solid', borderColor: 'info.light' }}>
                            <Typography variant="subtitle1" fontWeight="700" sx={{ color: 'info.dark' }}>Lịch sử item</Typography>
                        </Box>
                        <CardContent sx={{ p: 2.5 }}>
                            {stockHistory.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    Chưa có lịch sử item.
                                </Typography>
                            ) : (
                                <>
                                    <TableContainer sx={{ maxHeight: 320, overflowY: 'auto' }}>
                                        <Table
                                            size="small"
                                            stickyHeader
                                            sx={{
                                                '& .MuiTableCell-root': {
                                                    borderRight: '1px solid',
                                                    borderColor: 'divider',
                                                },
                                                '& .MuiTableCell-root:last-of-type': {
                                                    borderRight: 'none',
                                                },
                                                '& .MuiTableHead-root .MuiTableCell-root': {
                                                    bgcolor: 'grey.50',
                                                },
                                            }}
                                        >
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Mã phiếu</TableCell>
                                                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Loại phiếu</TableCell>
                                                    <TableCell sx={{ fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>+/-</TableCell>
                                                    <TableCell sx={{ fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>Số lượng</TableCell>
                                                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Người thực hiện</TableCell>
                                                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Thời gian</TableCell>
                                                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Ghi chú</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {stockHistory.map((h, idx) => {
                                                    const sign = h.movementSign ?? '+';
                                                    const isIn = sign === '+' || sign === 'IN';
                                                    const isOut = sign === '-' || sign === 'OUT';
                                                    const signColor = isIn ? '#16a34a' : isOut ? '#dc2626' : 'text.primary';
                                                    const signBg = isIn ? '#f0fdf4' : isOut ? '#fef2f2' : 'transparent';

                                                    const sourceLabel = {
                                                        'GRN': 'Nhập kho',
                                                        'GDN': 'Xuất kho',
                                                        'ADJ': 'Điều chỉnh',
                                                        'STK': 'Kiểm kê',
                                                    }[h.sourceType] ?? h.sourceType ?? '–';

                                                    const sourceColor = {
                                                        'GRN': '#2563eb',
                                                        'GDN': '#d97706',
                                                        'ADJ': '#7c3aed',
                                                        'STK': '#0891b2',
                                                    }[h.sourceType] ?? 'text.secondary';

                                                    return (
                                                        <TableRow key={idx} hover>
                                                            <TableCell sx={{ fontWeight: 500, color: 'primary.main' }}>{h.docNo ?? '–'}</TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={sourceLabel}
                                                                    size="small"
                                                                    sx={{
                                                                        fontSize: '11px',
                                                                        fontWeight: 600,
                                                                        bgcolor: `${sourceColor}15`,
                                                                        color: sourceColor,
                                                                        border: `1px solid ${sourceColor}40`,
                                                                        height: '20px',
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 700, color: signColor, bgcolor: signBg }}>
                                                                {sign}
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                                                {Number(h.qty ?? 0).toLocaleString('vi-VN')}
                                                            </TableCell>
                                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{h.actorName ?? '–'}</TableCell>
                                                            <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '12px' }}>{formatDateTimeFull(h.transactionAt)}</TableCell>
                                                            <TableCell sx={{ fontSize: '12px', color: 'text.secondary', maxWidth: 160 }}>
                                                                {h.note ? (
                                                                    <Typography variant="body2" sx={{ fontSize: '12px', color: 'text.secondary', wordBreak: 'break-word' }}>
                                                                        {h.note}
                                                                    </Typography>
                                                                ) : '–'}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Nút Chỉnh sửa – full quyền Item: Thủ kho, Sale Support, Sale Engineer, Kế toán */}
                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                    {canEdit && (
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
