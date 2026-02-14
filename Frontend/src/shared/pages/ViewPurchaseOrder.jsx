import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Container,
    Paper,
    Box,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Grid,
} from '@mui/material';
import { ArrowLeft, Edit } from 'lucide-react';

const MOCK_PO = {
    purchaseOrderId: 1,
    pocode: 'PO-2025-001',
    requestedBy: 1,
    supplierId: 1,
    supplierName: 'Công ty TNHH ABC',
    requestedDate: '2025-02-10',
    justification: 'Nhập kho theo kế hoạch Q1',
    status: 'Draft',
    currentStageNo: 0,
    createdAt: '2025-02-10T08:00:00',
    submittedAt: null,
    updatedAt: '2025-02-10T08:00:00',
};

const MOCK_LINES = [
    { purchaseOrderLineId: 1, itemId: 1, itemCode: 'SP001', itemName: 'iPhone 15 Pro Max 256GB', orderedQty: 10, uomId: 1, uomName: 'Cái', note: '' },
    { purchaseOrderLineId: 2, itemId: 2, itemCode: 'SP002', itemName: 'Samsung Galaxy S24 Ultra', orderedQty: 5, uomId: 1, uomName: 'Cái', note: 'Giao trước 20/02' },
];

const ViewPurchaseOrder = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [po, setPo] = useState(null);
    const [lines, setLines] = useState([]);

    useEffect(() => {
        setPo({ ...MOCK_PO, purchaseOrderId: Number(id), pocode: `PO-2025-${String(id).padStart(3, '0')}` });
        setLines(MOCK_LINES.map((l, i) => ({ ...l, purchaseOrderLineId: i + 1 })));
    }, [id]);

    if (!po) return null;

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Button startIcon={<ArrowLeft size={20} />} onClick={() => navigate('/purchase-orders')} sx={{ textTransform: 'none' }}>Quay lại</Button>
            </Box>
            <Typography variant="h5" fontWeight="700" gutterBottom sx={{ color: 'primary.main' }}>
                Xem đơn mua hàng (View Purchase Order)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                PO Code: {po.pocode} · Trạng thái: {po.status}
            </Typography>

            <Paper elevation={3} sx={{ p: 3, borderRadius: 4, mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">PO Code</Typography><Typography>{po.pocode}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Nhà cung cấp</Typography><Typography>{po.supplierName}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Ngày yêu cầu</Typography><Typography>{po.requestedDate}</Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Trạng thái</Typography><Typography>{po.status}</Typography></Grid>
                    <Grid item xs={12}><Typography variant="caption" color="text.secondary">Lý do / Ghi chú</Typography><Typography>{po.justification || '-'}</Typography></Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                    <Button variant="outlined" startIcon={<Edit size={18} />} onClick={() => navigate(`/purchase-orders/edit/${po.purchaseOrderId}`)} sx={{ textTransform: 'none' }}>Chỉnh sửa</Button>
                </Box>
            </Paper>

            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>Chi tiết dòng (Lines)</Typography>
            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Item Code</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Tên vật tư</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Số lượng</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Đơn vị</TableCell>
                            <TableCell>Ghi chú</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {lines.map((line) => (
                            <TableRow key={line.purchaseOrderLineId}>
                                <TableCell>{line.itemCode}</TableCell>
                                <TableCell>{line.itemName}</TableCell>
                                <TableCell align="right">{line.orderedQty}</TableCell>
                                <TableCell>{line.uomName}</TableCell>
                                <TableCell>{line.note || '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
};

export default ViewPurchaseOrder;
