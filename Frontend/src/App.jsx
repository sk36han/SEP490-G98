import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './app/theme';
import AppRoutes from './app/routes';
import { AuthProvider } from './app/context/AuthContext';
import { NotificationProvider } from './app/context/NotificationContext';
import { ToastProvider, useToastContext } from './app/context/ToastContext';
import { MasterDataProvider } from './app/context/MasterDataContext';
import { RoleProvider } from './app/context/RoleContext';
import { ToastContainer } from './components/Toast/ToastContainer';
import authService from './shared/lib/authService';
import { handleSessionExpired, isSessionExpiryBeingHandled } from './shared/lib/sessionLifecycle';
import { registerGlobalToastHandler } from './shared/lib/toastBridge';
import './App.css';

function ToastBridgeSync() {
    const { showToast } = useToastContext();

    useEffect(() => {
        return registerGlobalToastHandler(showToast);
    }, [showToast]);

    return null;
}

function SessionExpiryWatcher() {
    useEffect(() => {
        const checkSessionExpiry = () => {
            const token = authService.getToken();
            if (!token) return;
            if (window.location.pathname === '/login') return;
            if (localStorage.getItem('pendingUserId')) return;
            if (isSessionExpiryBeingHandled()) return;

            if (authService.isTokenExpired()) {
                handleSessionExpired({
                    redirectToLogin: true,
                    skipIfOtpPending: true,
                });
            }
        };

        checkSessionExpiry();
        const timerId = window.setInterval(checkSessionExpiry, 15000);
        return () => window.clearInterval(timerId);
    }, []);

    return null;
}

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <ToastProvider>
                <AuthProvider>
                    <NotificationProvider>
                        <MasterDataProvider>
                            <RoleProvider>
                                <ToastBridgeSync />
                                <ToastContainer />
                                <SessionExpiryWatcher />
                                <Router>
                                    <AppRoutes />
                                </Router>
                            </RoleProvider>
                        </MasterDataProvider>
                    </NotificationProvider>
                </AuthProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
