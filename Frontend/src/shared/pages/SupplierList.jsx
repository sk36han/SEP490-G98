import React from 'react';
import { Container, Paper, Box, Typography } from '@mui/material';
import { Truck } from 'lucide-react';

const SupplierList = () => (
    <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Truck size={28} style={{ color: 'var(--mui-palette-primary-main)' }} />
            <Typography variant="h5" fontWeight="700" color="primary.main">
                Quản lý nhà cung cấp
            </Typography>
        </Box>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
            <Typography color="text.secondary">
                Danh sách nhà cung cấp. Nội dung sẽ được bổ sung hoặc kết nối API.
            </Typography>
        </Paper>
    </Container>
);

export default SupplierList;
