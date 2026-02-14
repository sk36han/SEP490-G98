import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Paper,
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
    IconButton,
    Tooltip,
} from '@mui/material';
import { Plus, FileText, Eye, Edit } from 'lucide-react';

const MOCK_POS = [
    { purchaseOrderId: 1, pocode: 'PO-2025-001', supplierId: 1, supplierName: 'Công ty A', requestedDate: '2025-02-10', status: 'Draft', currentStageNo: 0, createdAt: '2025-02-10T08:00:00' },
    { purchaseOrderId: 2, pocode: 'PO-2025-002', supplierId: 2, supplierName: 'Công ty B', requestedDate: '2025-02-12', status: 'Submitted', currentStageNo: 1, createdAt: '2025-02-12T09:00:00' },
    { purchaseOrderId: 3, pocode: 'PO-2025-003', supplierId: 1, supplierName: 'Công ty A', requestedDate: '2025-02-14', status: 'Approved', currentStageNo: 2, createdAt: '2025-02-14T10:00:00' },
];

const PurchaseOrderList = () => {
    const navigate = useNavigate();
    const [list, setList] = useState([]);

    useEffect(() => setList(MOCK_POS), []);

    const statusColor = (s) => (s === 'Approved' ? 'success' : s === 'Submitted' ? 'info' : 'default');

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <Typography variant="h4" component="h1" fontWeight="800" sx={{ color: 'primary.main' }}>
                    Đơn mua hàng (Purchase Orders)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Danh sách đơn mua hàng – mockup.
                </Typography>
            </Box>

            <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => navigate('/purchase-orders/create')} sx={{ textTransform: 'none' }}>
                        Tạo đơn mua hàng
                    </Button>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>PO Code</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Nhà cung cấp</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Ngày yêu cầu</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {list.map((po) => (
                                <TableRow key={po.purchaseOrderId} hover>
                                    <TableCell>{po.pocode}</TableCell>
                                    <TableCell>{po.supplierName}</TableCell>
                                    <TableCell>{po.requestedDate}</TableCell>
                                    <TableCell><Chip label={po.status} size="small" color={statusColor(po.status)} /></TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Xem"><IconButton size="small" onClick={() => navigate(`/purchase-orders/${po.purchaseOrderId}`)}><Eye size={18} /></IconButton></Tooltip>
                                        <Tooltip title="Sửa"><IconButton size="small" onClick={() => navigate(`/purchase-orders/edit/${po.purchaseOrderId}`)}><Edit size={18} /></IconButton></Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Container>
    );
};

export default PurchaseOrderList;
