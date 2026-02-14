import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Paper, Box, Typography, Button, Grid } from '@mui/material';
import { ArrowLeft } from 'lucide-react';

const MOCK_ITEMS = [
    { itemId: 1, itemCode: 'SP001', itemName: 'iPhone 15 Pro Max 256GB', itemType: 'Product', description: 'Điện thoại iPhone 15 Pro Max bản 256GB', categoryId: 1, brandId: 1, baseUomId: 1, packagingSpecId: 1, requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', categoryName: 'Điện thoại', brandName: 'Apple', baseUomName: 'Cái' },
    { itemId: 2, itemCode: 'SP002', itemName: 'Samsung Galaxy S24 Ultra', itemType: 'Product', description: 'Điện thoại Samsung Galaxy S24 Ultra', categoryId: 1, brandId: 2, baseUomId: 1, packagingSpecId: 1, requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', categoryName: 'Điện thoại', brandName: 'Samsung', baseUomName: 'Cái' },
];

const ViewItem = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [item, setItem] = useState(null);

    useEffect(() => {
        const found = MOCK_ITEMS.find((i) => String(i.itemId) === String(id));
        setItem(found || null);
    }, [id]);

    if (item == null) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Typography color="text.secondary">Không tìm thấy item.</Typography>
                <Button startIcon={<ArrowLeft size={20} />} onClick={() => navigate('/products')} sx={{ mt: 2, textTransform: 'none' }}>Quay lại</Button>
            </Container>
        );
    }

    const rows = [
        { label: 'Item Code', value: item.itemCode },
        { label: 'Item Name', value: item.itemName },
        { label: 'Item Type', value: item.itemType },
        { label: 'Description', value: item.description },
        { label: 'Category', value: item.categoryName || item.categoryId },
        { label: 'Brand', value: item.brandName || item.brandId },
        { label: 'Base UOM', value: item.baseUomName || item.baseUomId },
        { label: 'Requires CO', value: item.requiresCO ? 'Có' : 'Không' },
        { label: 'Requires CQ', value: item.requiresCQ ? 'Có' : 'Không' },
        { label: 'Is Active', value: item.isActive ? 'Active' : 'Inactive' },
        { label: 'Default Warehouse ID', value: item.defaultWarehouseId },
        { label: 'Inventory Account', value: item.inventoryAccount },
        { label: 'Revenue Account', value: item.revenueAccount },
    ];

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Button startIcon={<ArrowLeft size={20} />} onClick={() => navigate('/products')} sx={{ textTransform: 'none' }}>Quay lại</Button>
            </Box>
            <Typography variant="h5" fontWeight="700" gutterBottom sx={{ color: 'primary.main' }}>
                Chi tiết vật tư (View Item) #{item.itemId}
            </Typography>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
                <Grid container spacing={2}>
                    {rows.map((r) => (
                        <Grid item xs={12} sm={6} key={r.label}>
                            <Typography variant="caption" color="text.secondary">{r.label}</Typography>
                            <Typography variant="body1">{r.value ?? '-'}</Typography>
                        </Grid>
                    ))}
                </Grid>
                <Box sx={{ mt: 3 }}>
                    <Button variant="outlined" onClick={() => navigate(`/items/edit/${item.itemId}`)} sx={{ textTransform: 'none' }}>Chỉnh sửa</Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default ViewItem;
