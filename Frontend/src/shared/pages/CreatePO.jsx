import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Paper,
    Box,
    Typography,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Grid,
} from '@mui/material';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';

const CreatePO = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [header, setHeader] = useState({
        pocode: '',
        supplierId: '',
        requestedDate: new Date().toISOString().slice(0, 10),
        justification: '',
    });
    const [lines, setLines] = useState([
        { itemId: '', itemCode: '', itemName: '', orderedQty: 1, uomId: 1, uomName: 'Cái', note: '' },
    ]);

    const handleHeaderChange = (e) => {
        const { name, value } = e.target;
        setHeader((prev) => ({ ...prev, [name]: value }));
    };

    const addLine = () => setLines((prev) => [...prev, { itemId: '', itemCode: '', itemName: '', orderedQty: 1, uomId: 1, uomName: 'Cái', note: '' }]);

    const updateLine = (index, field, value) => {
        setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
    };

    const removeLine = (index) => {
        if (lines.length <= 1) return;
        setLines((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        showToast('Mock: Tạo đơn mua hàng thành công. Kết nối API khi backend sẵn sàng.', 'success');
        setTimeout(() => navigate('/purchase-orders'), 1500);
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Button startIcon={<ArrowLeft size={20} />} onClick={() => navigate('/purchase-orders')} sx={{ textTransform: 'none' }}>Quay lại</Button>
            </Box>
            <Typography variant="h5" fontWeight="700" gutterBottom sx={{ color: 'primary.main' }}>
                Tạo đơn mua hàng (Create PO)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Mockup form – PO header + dòng đơn hàng.
            </Typography>

            <Paper elevation={3} sx={{ p: 3, borderRadius: 4, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>Thông tin chung</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="PO Code" name="pocode" value={header.pocode} onChange={handleHeaderChange} size="small" placeholder="PO-2025-XXX" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Supplier ID" name="supplierId" type="number" value={header.supplierId} onChange={handleHeaderChange} size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Ngày yêu cầu" name="requestedDate" type="date" value={header.requestedDate} onChange={handleHeaderChange} size="small" InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Lý do / Ghi chú" name="justification" value={header.justification} onChange={handleHeaderChange} multiline rows={2} size="small" />
                    </Grid>
                </Grid>
            </Paper>

            <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="600">Chi tiết dòng (Lines)</Typography>
                    <Button size="small" startIcon={<Plus size={16} />} onClick={addLine} sx={{ textTransform: 'none' }}>Thêm dòng</Button>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Item Code</TableCell>
                                <TableCell>Tên vật tư</TableCell>
                                <TableCell align="right">Số lượng</TableCell>
                                <TableCell>Đơn vị</TableCell>
                                <TableCell>Ghi chú</TableCell>
                                <TableCell width={60}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.map((line, index) => (
                                <TableRow key={index}>
                                    <TableCell><TextField size="small" value={line.itemCode} onChange={(e) => updateLine(index, 'itemCode', e.target.value)} placeholder="SP001" sx={{ width: 100 }} /></TableCell>
                                    <TableCell><TextField size="small" value={line.itemName} onChange={(e) => updateLine(index, 'itemName', e.target.value)} placeholder="Tên item" fullWidth /></TableCell>
                                    <TableCell align="right"><TextField size="small" type="number" value={line.orderedQty} onChange={(e) => updateLine(index, 'orderedQty', e.target.value)} sx={{ width: 80 }} /></TableCell>
                                    <TableCell><TextField size="small" value={line.uomName} onChange={(e) => updateLine(index, 'uomName', e.target.value)} sx={{ width: 80 }} /></TableCell>
                                    <TableCell><TextField size="small" value={line.note} onChange={(e) => updateLine(index, 'note', e.target.value)} placeholder="Ghi chú" /></TableCell>
                                    <TableCell><IconButton size="small" onClick={() => removeLine(index)} disabled={lines.length <= 1}><Trash2 size={16} /></IconButton></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button variant="contained" startIcon={<Save size={18} />} onClick={handleSubmit} sx={{ textTransform: 'none' }}>Lưu đơn mua hàng</Button>
                    <Button variant="outlined" onClick={() => navigate('/purchase-orders')} sx={{ textTransform: 'none' }}>Hủy</Button>
                </Box>
            </Paper>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </Container>
    );
};

export default CreatePO;
