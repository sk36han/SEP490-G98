import React, { useState, useEffect, useCallback } from 'react';
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
    CircularProgress,
} from '@mui/material';
import { ArrowLeft, History } from 'lucide-react';
import { getWarehouseDetail, getWarehouseHistory } from '../lib/warehouseService';
import '../styles/ListView.css';

const ViewWarehouseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [warehouse, setWarehouse] = useState(null);
    const [items, setItems] = useState([]);
    const [historyList, setHistoryList] = useState([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [error, setError] = useState(null);

    // Lấy chi tiết kho
    const fetchWarehouseDetail = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getWarehouseDetail(Number(id));
            setWarehouse({
                warehouseId: data.warehouseId ?? data.WarehouseId,
                warehouseCode: data.warehouseCode ?? data.WarehouseCode ?? '',
                warehouseName: data.warehouseName ?? data.WarehouseName ?? '',
                address: data.address ?? data.Address ?? '-',
                isActive: data.isActive ?? data.IsActive ?? true,
                createdAt: data.createdAt ?? data.CreatedAt,
            });
            // Map items từ API
            const warehouseItems = (data.items ?? data.Items ?? []).map((item) => ({
                itemId: item.itemId ?? item.ItemId,
                itemCode: item.itemCode ?? item.ItemCode ?? '',
                itemName: item.itemName ?? item.ItemName ?? '',
                categoryName: item.categoryName ?? item.CategoryName ?? '',
                brandName: item.brandName ?? item.BrandName ?? '',
                unitName: item.unitName ?? item.UnitName ?? '',
                onHandQty: item.onHandQty ?? item.OnHandQty ?? 0,
                reservedQty: item.reservedQty ?? item.ReservedQty ?? 0,
            }));
            setItems(warehouseItems);
        } catch (err) {
            console.error('Error fetching warehouse detail:', err);
            setError(err?.message || 'Không thể tải thông tin kho');
        } finally {
            setLoading(false);
        }
    }, [id]);

    // Lấy lịch sử biến động kho
    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const result = await getWarehouseHistory({
                pageNumber: 1,
                pageSize: 50,
                warehouseId: Number(id),
            });
            const mappedHistory = (result.items ?? []).map((h, index) => ({
                id: index + 1,
                voucherCode: h.voucherCode ?? h.VoucherCode ?? '',
                itemName: h.itemName ?? h.ItemName ?? '',
                quantity: h.quantity ?? h.Quantity ?? 0,
                transactionDate: h.transactionDate ?? h.TransactionDate ?? h.transactionDate ?? '',
                approverName: h.approverName ?? h.ApproverName ?? '',
            }));
            setHistoryList(mappedHistory);
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setHistoryLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchWarehouseDetail();
    }, [fetchWarehouseDetail]);

    const handleOpenHistory = () => {
        setHistoryOpen(true);
        if (historyList.length === 0) {
            fetchHistory();
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="error">{error}</Typography>
                <Button onClick={() => navigate('/inventory')} sx={{ mt: 2 }}>
                    Quay lại
                </Button>
            </Box>
        );
    }

    if (!warehouse) return null;

    return (
        <>
            <Box sx={{ pt: 0, pb: 2, mt: -3 }}>
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
                            onClick={handleOpenHistory}
                            sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}
                        >
                            Xem lịch sử xuất/nhập kho
                        </Button>
                    </Box>

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
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }} align="left">Mã vật tư</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }} align="left">Tên vật tư</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }} align="left">Danh mục</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }} align="right">Tồn kho</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }} align="right">Đặt trước</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }} align="left">Đơn vị</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {items.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">Không có vật tư trong kho</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        items.map((row, index) => (
                                        <TableRow key={row.itemId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell align="left">{index + 1}</TableCell>
                                                <TableCell align="left">{row.itemCode}</TableCell>
                                            <TableCell align="left">{row.itemName}</TableCell>
                                            <TableCell align="left">{row.categoryName}</TableCell>
                                                <TableCell align="right">{row.onHandQty}</TableCell>
                                                <TableCell align="right">{row.reservedQty}</TableCell>
                                                <TableCell align="left">{row.unitName}</TableCell>
                                        </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                </Box>
            </Box>

            <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
                <DialogTitle>Lịch sử xuất/nhập kho</DialogTitle>
                <DialogContent>
                    {historyLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                    <TableContainer sx={{ mt: 0 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>STT</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>Mã chứng từ</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>Vật tư</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }} align="right">Số lượng</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>Ngày</TableCell>
                                        <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>Người duyệt</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                    {historyList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">Không có lịch sử biến động</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        historyList.map((h, index) => (
                                            <TableRow key={h.id || index} hover>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{h.voucherCode}</TableCell>
                                        <TableCell>{h.itemName}</TableCell>
                                        <TableCell align="right">{h.quantity}</TableCell>
                                                <TableCell>{h.transactionDate ? new Date(h.transactionDate).toLocaleDateString('vi-VN') : '—'}</TableCell>
                                                <TableCell>{h.approverName || '—'}</TableCell>
                                    </TableRow>
                                        ))
                                    )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHistoryOpen(false)} variant="contained" sx={{ textTransform: 'none' }}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ViewWarehouseDetail;
