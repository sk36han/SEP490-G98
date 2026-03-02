import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Grid,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { ArrowLeft, History } from 'lucide-react';
import '../styles/ListView.css';

/** Mock thông tin kho theo id */
const MOCK_WAREHOUSES = {
    1: { warehouseId: 1, warehouseCode: 'WH001', warehouseName: 'Kho chính', address: '123 Đường A, Quận 1, TP.HCM', isActive: true },
    2: { warehouseId: 2, warehouseCode: 'WH002', warehouseName: 'Kho phụ', address: '456 Đường B, Quận 2, TP.HCM', isActive: true },
    3: { warehouseId: 3, warehouseCode: 'WH003', warehouseName: 'Kho lạnh', address: '789 Đường C, Quận 7, TP.HCM', isActive: true },
    4: { warehouseId: 4, warehouseCode: 'WH004', warehouseName: 'Kho tạm ngưng', address: '321 Đường D, Quận Bình Thạnh', isActive: false },
};

/** Mock danh sách vật tư trong kho (name, category, quantity) */
const MOCK_WAREHOUSE_ITEMS = [
    { itemId: 1, itemCode: 'SP001', itemName: 'iPhone 15 Pro Max 256GB', categoryName: 'Điện thoại', quantity: 120, uomName: 'Cái' },
    { itemId: 2, itemCode: 'SP002', itemName: 'Samsung Galaxy S24 Ultra', categoryName: 'Điện thoại', quantity: 85, uomName: 'Cái' },
    { itemId: 3, itemCode: 'SP003', itemName: 'MacBook Pro 14" M3', categoryName: 'Laptop', quantity: 42, uomName: 'Cái' },
    { itemId: 4, itemCode: 'SP004', itemName: 'Tủ lạnh Samsung 234L', categoryName: 'Điện lạnh', quantity: 28, uomName: 'Cái' },
    { itemId: 5, itemCode: 'SP005', itemName: 'Tai nghe AirPods Pro 2', categoryName: 'Phụ kiện', quantity: 256, uomName: 'Cái' },
    { itemId: 6, itemCode: 'SP006', itemName: 'Cáp sạc USB-C 2m', categoryName: 'Phụ kiện', quantity: 500, uomName: 'Cái' },
];

/** Mock lịch sử xuất/nhập kho */
const MOCK_STOCK_HISTORY = [
    { id: 1, type: 'Nhập', documentCode: 'GRN-2025-001', date: '2025-02-15', itemName: 'iPhone 15 Pro Max 256GB', quantity: 20, uomName: 'Cái' },
    { id: 2, type: 'Xuất', documentCode: 'GDN-2025-003', date: '2025-02-14', itemName: 'Samsung Galaxy S24 Ultra', quantity: 5, uomName: 'Cái' },
    { id: 3, type: 'Nhập', documentCode: 'GRN-2025-002', date: '2025-02-13', itemName: 'MacBook Pro 14" M3', quantity: 10, uomName: 'Cái' },
    { id: 4, type: 'Xuất', documentCode: 'GDN-2025-002', date: '2025-02-12', itemName: 'Tai nghe AirPods Pro 2', quantity: 30, uomName: 'Cái' },
    { id: 5, type: 'Nhập', documentCode: 'GRN-2025-003', date: '2025-02-10', itemName: 'Cáp sạc USB-C 2m', quantity: 100, uomName: 'Cái' },
];

const ViewWarehouseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [warehouse, setWarehouse] = useState(null);
    const [items, setItems] = useState([]);
    const [historyOpen, setHistoryOpen] = useState(false);

    useEffect(() => {
        const wh = MOCK_WAREHOUSES[Number(id)] || {
            warehouseId: Number(id),
            warehouseCode: `WH${String(id).padStart(3, '0')}`,
            warehouseName: `Kho #${id}`,
            address: '-',
            isActive: true,
        };
        setWarehouse(wh);
        setItems(MOCK_WAREHOUSE_ITEMS);
    }, [id]);

    if (!warehouse) return null;

    return (
        <>
            <Box sx={{ pt: 0, pb: 2, mt: -3 }}>
                {/* Header: nút Quay lại bên trái, tiêu đề và mô tả */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'stretch' : 'center',
                        gap: 2,
                        mb: 2,
                    }}
                >
                    <Button
                        className="list-page-btn"
                        variant="outlined"
                        startIcon={<ArrowLeft size={20} />}
                        onClick={() => navigate('/inventory')}
                        sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            textTransform: 'none',
                            borderRadius: 2,
                            minHeight: 36,
                            px: 2,
                            alignSelf: isMobile ? 'flex-start' : 'center',
                            flexShrink: 0,
                        }}
                    >
                        Quay lại
                    </Button>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant="h4"
                            component="h1"
                            fontWeight="800"
                            sx={{
                                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                                backgroundClip: 'text',
                                textFillColor: 'transparent',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            Chi tiết kho: {warehouse.warehouseName}
                        </Typography>
                        <Typography
                            variant="body1"
                            color="text.secondary"
                            sx={{ mt: 0.25, wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        >
                            Mã kho: {warehouse.warehouseCode} · Địa chỉ: {warehouse.address}
                        </Typography>
                    </Box>
                </Box>

                <Box
                    className="view-detail-view"
                    sx={{
                        width: '100%',
                        maxWidth: '100%',
                        background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.97) 100%)',
                        borderRadius: 3,
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: (t) => t.shadows[1],
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Hàng nút: Xem lịch sử căn phải */}
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            mb: 2,
                        }}
                    >
                        <Button
                            className="list-page-btn"
                            variant="contained"
                            startIcon={<History size={18} />}
                            onClick={() => setHistoryOpen(true)}
                            sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}
                        >
                            Xem lịch sử xuất/nhập kho
                        </Button>
                    </Box>

                    {/* Thông tin kho */}
                    <Card
                        className="list-filter-card"
                        sx={{
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: 'none',
                            mb: 2.5,
                            overflow: 'hidden',
                        }}
                    >
                        <CardContent sx={{ py: 2, px: 2, '&.MuiCardContent-root:last-child': { pb: 2 } }}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>Mã kho</Typography>
                                    <Typography variant="body1" fontWeight={500}>{warehouse.warehouseCode}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>Tên kho</Typography>
                                    <Typography variant="body1" fontWeight={500}>{warehouse.warehouseName}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>Địa chỉ</Typography>
                                    <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>{warehouse.address || '—'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Trạng thái</Typography>
                                    <Chip
                                        label={warehouse.isActive ? 'Hoạt động' : 'Tắt'}
                                        size="small"
                                        color={warehouse.isActive ? 'success' : 'error'}
                                        variant="filled"
                                        sx={{ borderRadius: 2 }}
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Bảng vật tư */}
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Danh sách vật tư trong kho</Typography>
                    <Card
                        className="list-grid-card"
                        sx={{
                            borderRadius: 2,
                            overflow: 'hidden',
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: 'none',
                        }}
                    >
                        <TableContainer sx={{ overflow: 'hidden' }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }} align="left">STT</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }} align="left">Tên vật tư</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }} align="left">Danh mục</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }} align="right">Số lượng</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }} align="left">Đơn vị</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {items.map((row, index) => (
                                        <TableRow key={row.itemId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell align="left">{index + 1}</TableCell>
                                            <TableCell align="left">{row.itemName}</TableCell>
                                            <TableCell align="left">{row.categoryName}</TableCell>
                                            <TableCell align="right">{row.quantity}</TableCell>
                                            <TableCell align="left">{row.uomName}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                </Box>
            </Box>

            <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
                <DialogTitle>Lịch sử xuất/nhập kho</DialogTitle>
                <DialogContent>
                    <TableContainer sx={{ mt: 0 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>Loại</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>Mã chứng từ</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>Ngày</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>Vật tư</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }} align="right">Số lượng</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>Đơn vị</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {MOCK_STOCK_HISTORY.map((h) => (
                                    <TableRow key={h.id} hover>
                                        <TableCell>{h.type}</TableCell>
                                        <TableCell>{h.documentCode}</TableCell>
                                        <TableCell>{h.date}</TableCell>
                                        <TableCell>{h.itemName}</TableCell>
                                        <TableCell align="right">{h.quantity}</TableCell>
                                        <TableCell>{h.uomName}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHistoryOpen(false)} variant="contained" sx={{ textTransform: 'none' }}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ViewWarehouseDetail;
