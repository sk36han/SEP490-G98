import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Container,
    Paper,
    Box,
    Typography,
    TextField,
    Button,
    FormControlLabel,
    Checkbox,
    MenuItem,
    Grid,
} from '@mui/material';
import { ArrowLeft, Save } from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';

const MOCK_ITEMS = [
    { itemId: 1, itemCode: 'SP001', itemName: 'iPhone 15 Pro Max 256GB', itemType: 'Product', description: 'Điện thoại iPhone 15 Pro Max bản 256GB', categoryId: 1, brandId: 1, baseUomId: 1, packagingSpecId: 1, requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111' },
    { itemId: 2, itemCode: 'SP002', itemName: 'Samsung Galaxy S24 Ultra', itemType: 'Product', description: 'Điện thoại Samsung Galaxy S24 Ultra', categoryId: 1, brandId: 2, baseUomId: 1, packagingSpecId: 1, requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111' },
];

const EditItem = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [form, setForm] = useState({
        itemCode: '',
        itemName: '',
        itemType: 'Product',
        description: '',
        categoryId: '',
        brandId: '',
        baseUomId: 1,
        packagingSpecId: '',
        requiresCO: false,
        requiresCQ: false,
        isActive: true,
        defaultWarehouseId: '',
        inventoryAccount: '',
        revenueAccount: '',
    });

    useEffect(() => {
        const item = MOCK_ITEMS.find((i) => String(i.itemId) === String(id));
        if (item) setForm({
            itemCode: item.itemCode,
            itemName: item.itemName,
            itemType: item.itemType || 'Product',
            description: item.description || '',
            categoryId: item.categoryId ?? '',
            brandId: item.brandId ?? '',
            baseUomId: item.baseUomId ?? 1,
            packagingSpecId: item.packagingSpecId ?? '',
            requiresCO: item.requiresCO ?? false,
            requiresCQ: item.requiresCQ ?? false,
            isActive: item.isActive ?? true,
            defaultWarehouseId: item.defaultWarehouseId ?? '',
            inventoryAccount: item.inventoryAccount || '',
            revenueAccount: item.revenueAccount || '',
        });
    }, [id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        showToast('Mock: Cập nhật thành công. Kết nối API khi backend sẵn sàng.', 'success');
        setTimeout(() => navigate('/products'), 1500);
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Button startIcon={<ArrowLeft size={20} />} onClick={() => navigate('/products')} sx={{ textTransform: 'none' }}>
                    Quay lại
                </Button>
            </Box>
            <Typography variant="h5" fontWeight="700" gutterBottom sx={{ color: 'primary.main' }}>
                Chỉnh sửa vật tư (Edit Item) #{id}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Mockup form – load dữ liệu theo ItemId.
            </Typography>

            <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Item Code" name="itemCode" value={form.itemCode} onChange={handleChange} required size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Item Name" name="itemName" value={form.itemName} onChange={handleChange} required size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField select fullWidth label="Item Type" name="itemType" value={form.itemType} onChange={handleChange} size="small">
                                <MenuItem value="Product">Product</MenuItem>
                                <MenuItem value="Material">Material</MenuItem>
                                <MenuItem value="Service">Service</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Description" name="description" value={form.description} onChange={handleChange} multiline rows={2} size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Category ID" name="categoryId" type="number" value={form.categoryId} onChange={handleChange} size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Brand ID" name="brandId" type="number" value={form.brandId} onChange={handleChange} size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Base UOM ID" name="baseUomId" type="number" value={form.baseUomId} onChange={handleChange} required size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Packaging Spec ID" name="packagingSpecId" type="number" value={form.packagingSpecId} onChange={handleChange} size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControlLabel control={<Checkbox name="requiresCO" checked={form.requiresCO} onChange={handleChange} />} label="Requires CO" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControlLabel control={<Checkbox name="requiresCQ" checked={form.requiresCQ} onChange={handleChange} />} label="Requires CQ" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControlLabel control={<Checkbox name="isActive" checked={form.isActive} onChange={handleChange} />} label="Is Active" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Default Warehouse ID" name="defaultWarehouseId" type="number" value={form.defaultWarehouseId} onChange={handleChange} size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Inventory Account" name="inventoryAccount" value={form.inventoryAccount} onChange={handleChange} size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Revenue Account" name="revenueAccount" value={form.revenueAccount} onChange={handleChange} size="small" />
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button type="submit" variant="contained" startIcon={<Save size={18} />} sx={{ textTransform: 'none' }}>Lưu</Button>
                        <Button variant="outlined" onClick={() => navigate('/products')} sx={{ textTransform: 'none' }}>Hủy</Button>
                    </Box>
                </form>
            </Paper>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </Container>
    );
};

export default EditItem;
