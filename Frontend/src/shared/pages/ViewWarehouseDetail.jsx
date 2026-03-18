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
    useTheme,
    useMediaQuery,
    CircularProgress,
} from '@mui/material';
import { ArrowLeft, History, Package, MapPin, Calendar, Building2 } from 'lucide-react';
import { getWarehouseDetail, getWarehouseHistory } from '../lib/warehouseService';
import '../styles/ListView.css';

// ── Helper Functions ────────────────────────────────────────────────────────────
const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN');
};

const formatNumber = (num) => {
    if (num == null || num === '') return '0';
    return Number(num).toLocaleString('vi-VN');
};

// ── Status Chip Component ─────────────────────────────────────────────────────
const StatusChip = ({ isActive }) => (
    <Chip
        label={isActive ? 'Hoạt động' : 'Tắt'}
        size="small"
        color={isActive ? 'success' : 'error'}
        variant="filled"
        sx={{
            fontWeight: 500,
            fontSize: '12px',
            borderRadius: '6px',
            minWidth: 70,
        }}
    />
);

const ViewWarehouseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [warehouse, setWarehouse] = useState(null);
    const [items, setItems] = useState([]);
    const [historyList, setHistoryList] = useState([]);
    const [showHistory, setShowHistory] = useState(true);
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
                totalItems: data.totalItems ?? 0,
                totalQty: data.totalQty ?? 0,
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
                transactionType: h.transactionType ?? h.TransactionType ?? '',
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
        fetchHistory();
    }, [fetchWarehouseDetail, fetchHistory]);

    const handleRefreshHistory = () => {
        fetchHistory();
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
            <Box sx={{ pt: 0, pb: 2, mt: -3 }}>
            {/* Header */}
            <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Button
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
                            borderColor: '#e5e7eb',
                            color: '#374151',
                            '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' },
                        }}
                    >
                        Quay lại
                    </Button>
                </Box>
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
                            }}
                        >
                            Chi tiết kho: {warehouse.warehouseName}
                        </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                    Mã kho: {warehouse.warehouseCode} • Địa chỉ: {warehouse.address}
                        </Typography>
                </Box>

            {/* Main Content */}
            <Box sx={{
                background: '#fff',
                        borderRadius: 3,
                p: 2.5,
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
                {/* Action Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<History size={18} />}
                        onClick={handleRefreshHistory}
                        sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            textTransform: 'none',
                            borderRadius: 2,
                            bgcolor: '#3b82f6',
                            '&:hover': { bgcolor: '#2563eb' },
                        }}
                    >
                        Lịch sử xuất/nhập kho
                    </Button>
                </Box>

                {/* Warehouse Info Card */}
                <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', boxShadow: 'none', mb: 3 }}>
                    <CardContent sx={{ p: 2.5 }}>
                            <Grid container spacing={3}>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{
                                        width: 40, height: 40, borderRadius: 2,
                                        bgcolor: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Building2 size={20} color="#3b82f6" />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '11px' }}>
                                            Mã kho
                                        </Typography>
                                        <Typography variant="body1" fontWeight={600} sx={{ fontSize: '14px', color: '#111827' }}>
                                            {warehouse.warehouseCode}
                                        </Typography>
                                    </Box>
                                </Box>
                                </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{
                                        width: 40, height: 40, borderRadius: 2,
                                        bgcolor: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Package size={20} color="#10b981" />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '11px' }}>
                                            Tên kho
                                        </Typography>
                                        <Typography variant="body1" fontWeight={600} sx={{ fontSize: '14px', color: '#111827' }}>
                                            {warehouse.warehouseName}
                                        </Typography>
                                    </Box>
                                </Box>
                                </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{
                                        width: 40, height: 40, borderRadius: 2,
                                        bgcolor: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <MapPin size={20} color="#f59e0b" />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '11px' }}>
                                            Địa chỉ
                                        </Typography>
                                        <Typography variant="body1" fontWeight={500} sx={{ fontSize: '14px', color: '#111827', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {warehouse.address}
                                        </Typography>
                                    </Box>
                                </Box>
                                </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{
                                        width: 40, height: 40, borderRadius: 2,
                                        bgcolor: warehouse.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Calendar size={20} color={warehouse.isActive ? '#10b981' : '#ef4444'} />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '11px' }}>
                                            Trạng thái
                                        </Typography>
                                        <StatusChip isActive={warehouse.isActive} />
                                    </Box>
                                </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                {/* Items Table */}
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5, fontSize: '15px', color: '#111827' }}>
                    Danh sách vật tư trong kho
                </Typography>
                <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', boxShadow: 'none', overflow: 'hidden' }}>
                    <TableContainer sx={{ maxHeight: 400 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb', fontSize: '12px', color: '#6b7280', py: 1.5, px: 2 }} align="center">STT</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb', fontSize: '12px', color: '#6b7280', py: 1.5 }}>Mã vật tư</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb', fontSize: '12px', color: '#6b7280', py: 1.5 }}>Tên vật tư</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb', fontSize: '12px', color: '#6b7280', py: 1.5 }}>Danh mục</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb', fontSize: '12px', color: '#6b7280', py: 1.5 }}>Thương hiệu</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb', fontSize: '12px', color: '#6b7280', py: 1.5 }} align="right">Tồn kho</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb', fontSize: '12px', color: '#6b7280', py: 1.5 }} align="right">Đặt trước</TableCell>
                                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb', fontSize: '12px', color: '#6b7280', py: 1.5 }}>Đơn vị</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                            <Typography color="text.secondary" sx={{ fontSize: '13px' }}>Không có vật tư trong kho</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((row, index) => (
                                        <TableRow key={row.itemId} hover sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                                            <TableCell align="center" sx={{ fontSize: '13px', color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{index + 1}</TableCell>
                                            <TableCell sx={{ fontSize: '13px', fontWeight: 500, color: '#3b82f6' }}>{row.itemCode}</TableCell>
                                            <TableCell sx={{ fontSize: '13px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.itemName}>{row.itemName}</TableCell>
                                            <TableCell sx={{ fontSize: '13px', color: '#374151' }}>{row.categoryName || '-'}</TableCell>
                                            <TableCell sx={{ fontSize: '13px', color: '#374151' }}>{row.brandName || '-'}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: '13px', fontWeight: 600, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(row.onHandQty)}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: '13px', color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(row.reservedQty)}</TableCell>
                                            <TableCell sx={{ fontSize: '13px', color: '#6b7280' }}>{row.unitName || '-'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            </Box>

            {/* History Card - Embed like ViewItemDetail */}
            {showHistory && (
                <Card sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: (t) => t.shadows[1], border: '1px solid', borderColor: 'info.light' }}>
                    <Box sx={{ px: 2, py: 1.5, bgcolor: 'info.50', borderBottom: '1px solid', borderColor: 'info.light' }}>
                        <Typography variant="subtitle1" fontWeight="700" sx={{ color: 'info.dark' }}>Lịch sử xuất/nhập kho</Typography>
                    </Box>
                    <CardContent sx={{ p: 2.5 }}>
                        {historyLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <TableContainer sx={{ maxHeight: 300, overflowY: 'auto' }}>
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
                                            <TableCell sx={{ fontWeight: 600 }} align="center">STT</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Mã chứng từ</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Vật tư</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="center">Loại</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">Số lượng</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Ngày</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Người thực hiện</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {historyList.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                                    <Typography color="text.secondary">Không có lịch sử biến động</Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            historyList.map((h, index) => (
                                                <TableRow key={h.id || index} hover>
                                                    <TableCell align="center" sx={{ fontSize: '13px', color: '#6b7280' }}>{index + 1}</TableCell>
                                                    <TableCell sx={{ fontSize: '13px', fontWeight: 500, color: '#3b82f6' }}>{h.voucherCode || '-'}</TableCell>
                                                    <TableCell sx={{ fontSize: '13px', color: '#374151', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.itemName || '-'}</TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={h.transactionType || 'IN/OUT'}
                                                            size="small"
                                                            sx={{
                                                                fontSize: '11px',
                                                                height: 22,
                                                                bgcolor: (h.transactionType || '').toUpperCase().includes('IN') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                                color: (h.transactionType || '').toUpperCase().includes('IN') ? '#10b981' : '#ef4444',
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#374151' }}>{formatNumber(h.quantity)}</TableCell>
                                                    <TableCell sx={{ fontSize: '13px', color: '#6b7280' }}>{h.transactionDate ? formatDateTime(h.transactionDate) : '-'}</TableCell>
                                                    <TableCell sx={{ fontSize: '13px', color: '#374151' }}>{h.approverName || '-'}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default ViewWarehouseDetail;
