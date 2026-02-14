import React from 'react';
import { Container, Paper, Box, Typography } from '@mui/material';
import { Bell } from 'lucide-react';

const AdminNotifications = () => (
    <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Bell size={28} style={{ color: 'var(--mui-palette-primary-main)' }} />
            <Typography variant="h5" fontWeight="700" color="primary.main">
                Cài đặt thông báo
            </Typography>
        </Box>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
            <Typography color="text.secondary">
                Trang cài đặt thông báo (Admin). Nội dung sẽ được bổ sung.
            </Typography>
        </Paper>
    </Container>
);

export default AdminNotifications;
