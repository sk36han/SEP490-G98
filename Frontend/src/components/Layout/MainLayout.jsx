import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Sidebar from '../Sidebar/Sidebar';
import './MainLayout.css';

class LayoutErrorBoundary extends React.Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box sx={{ p: 3, maxWidth: 600 }}>
                    <Typography variant="h6" color="error" gutterBottom>Đã xảy ra lỗi</Typography>
                    <Typography variant="body2" sx={{ mb: 2, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {this.state.error?.message ?? String(this.state.error)}
                    </Typography>
                    <Button variant="outlined" onClick={() => window.location.href = '/login'}>Về trang đăng nhập</Button>
                </Box>
            );
        }
        return this.props.children;
    }
}

const MainLayout = ({ children }) => {
    return (
        <LayoutErrorBoundary>
            <Box sx={{ display: 'flex' }}>
                <Sidebar />
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 3,
                        minHeight: '100vh',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                    }}
                >
                    {children}
                </Box>
            </Box>
        </LayoutErrorBoundary>
    );
};

export default MainLayout;
