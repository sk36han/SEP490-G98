import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Sidebar from '../Sidebar/Sidebar';
import AppHeader from './AppHeader';
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

/**
 * Layout chung cho mọi role sau khi đăng nhập.
 * Bao gồm: Sidebar (menu theo role) + AppHeader (thông báo, avatar, tên, vai trò) + nội dung trang.
 */
const MainLayout = ({ children }) => {
    return (
        <LayoutErrorBoundary>
            <Box sx={{ display: 'flex' }}>
                <Sidebar />
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        minHeight: 0,
                        minWidth: 0,
                        height: '100vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        p: 3,
                    }}
                >
                    <AppHeader />
                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            minWidth: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {children}
                    </Box>
                </Box>
            </Box>
        </LayoutErrorBoundary>
    );
};

export default MainLayout;
