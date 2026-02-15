import React from 'react';
import { Container, Paper, Box, Typography } from '@mui/material';
import { ClipboardList } from 'lucide-react';

const AdminAuditLog = () => (
    <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <ClipboardList size={28} style={{ color: 'var(--mui-palette-primary-main)' }} />
            <Typography variant="h5" fontWeight="700" color="primary.main">
                Audit Log hệ thống
            </Typography>
        </Box>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
            <Typography color="text.secondary">
                Trang Audit Log hệ thống (Admin). Nhật ký hoạt động sẽ được hiển thị tại đây.
            </Typography>
        </Paper>
    </Container>
);

export default AdminAuditLog;
